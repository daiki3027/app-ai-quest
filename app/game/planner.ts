// Calls the OpenAI Responses API and turns the reply into a list of actions.
// Shared by the Next.js route (app/api/ai/route.ts) and the evaluation script (scripts/eval-agent.ts).
import { buildStateSummary, toPlan, toProposal, AiPlanStep } from "./ai";
import { DEFAULT_MODEL, estimateCostUsd, ModelId, TokenUsage } from "./cost";
import { GameState } from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const TIMEOUT_MS = 120_000;

// v1: the prompt the app shipped with. Its example says dy:1 is "north", but in this
// game dy:1 moves DOWN (y grows downward). Kept as-is so the evaluation measures the app.
export const SYSTEM_PROMPT_V1 = `あなたはシンプルなドット絵RPGの案内役です。返答は必ずJSONのみ。
ゲームの目的: 宝箱に到達して開ける。
可能なアクション:
- MOVE: dx, dy を -1,0,1 のいずれかで指定して1マス移動する（斜め不可）。
- INTERACT: 隣接マスのNPC/敵/宝箱/ドア/門/武器を調べる。
禁止: 壁やNPC/敵/宝箱/門/ドアの上には移動できない。
state.recentLog には直近のイベント/NPC会話が入っているので参考にすること。
state.talked は NPCごとの会話済みフラグ。
state.npcs, state.entrances, state.weapon, state.enemy, state.treasure を使い、
まだ話していないNPCが近くにいれば優先して話しに行く。
武器未取得なら武器の位置に移動→取得。その後は敵を倒し、門/ドアを抜けて宝箱へ向かう。
返答は10手のリストをJSONで返すこと。
形式例:
{"plan":[{"type":"MOVE","dx":0,"dy":1,"reason":"北へ進む"},{"type":"INTERACT","reason":"宝箱を開ける"}]}
type は "MOVE" か "INTERACT" のどちらかのみ。dx, dy が無い場合は 0 とすること。`;

// v2: same as v1, plus an explicit coordinate convention and a corrected example.
export const SYSTEM_PROMPT_V2 = SYSTEM_PROMPT_V1.replace(
  '{"plan":[{"type":"MOVE","dx":0,"dy":1,"reason":"北へ進む"},{"type":"INTERACT","reason":"宝箱を開ける"}]}',
  '{"plan":[{"type":"MOVE","dx":0,"dy":-1,"reason":"上（北）へ進む"},{"type":"INTERACT","reason":"宝箱を開ける"}]}'
) + `
座標系: x は右に行くほど大きく、y は下に行くほど大きい。dy:-1 が上（北）、dy:1 が下（南）、dx:-1 が左（西）、dx:1 が右（東）。
state.nearby は上下左右の隣のマスの中身。"empty" 以外（wall, npc など）の方向には移動できない。`;

export const PROMPTS = { v1: SYSTEM_PROMPT_V1, v2: SYSTEM_PROMPT_V2 } as const;
export type PromptId = keyof typeof PROMPTS;

export type PlanOk = {
  ok: true;
  steps: AiPlanStep[];
  usage: TokenUsage;
  costUsd: number;
  latencyMs: number;
  request: unknown;
  rawText: string;
  response: unknown;
};

export type PlanError = {
  ok: false;
  error: string;
  detail?: string;
  usage?: TokenUsage;
  costUsd?: number;
  request: unknown;
  rawText?: string;
  response?: unknown;
};

export type RequestPlanOptions = {
  apiKey: string;
  model?: ModelId;
  prompt?: PromptId;
  timeoutMs?: number;
};

const extractText = (data: any): string => {
  const messageContent = data.output?.find((o: any) => o?.type === "message")?.content ?? [];
  const outputTextEntry = Array.isArray(messageContent)
    ? messageContent.find((c: any) => c?.type === "output_text")
    : null;
  const firstContent = data.output?.[0]?.content?.[0];
  const candidates = [
    data.output_text,
    typeof outputTextEntry?.text === "string" ? outputTextEntry.text : undefined,
    typeof firstContent === "string" ? firstContent : undefined,
    Array.isArray(firstContent?.text) ? firstContent?.text?.[0]?.value : undefined,
    Array.isArray(firstContent?.text) ? firstContent?.text?.[0] : undefined,
    firstContent?.text?.value,
    firstContent?.text?.content,
    firstContent?.text,
    firstContent?.output_text,
    data.choices?.[0]?.message?.content,
  ].filter((v) => v !== undefined && v !== null);
  const raw = candidates[0] ?? "";
  return typeof raw === "string" ? raw : JSON.stringify(raw);
};

export const requestPlan = async (
  state: GameState,
  { apiKey, model = DEFAULT_MODEL, prompt = "v1", timeoutMs = TIMEOUT_MS }: RequestPlanOptions
): Promise<PlanOk | PlanError> => {
  const summary = buildStateSummary(state);
  const request = {
    model,
    input: [
      { role: "system", content: PROMPTS[prompt] },
      {
        role: "user",
        content: `現状サマリ: ${JSON.stringify(summary)}\nJSONのみで次の一手を提案してください。`,
      },
    ],
    // Responses API 2024-09+ では response_format -> text.format に変更されたが schema は未サポート
    text: { format: { type: "json_object" } },
  };

  // 接続タイムアウトを自前で管理（undiciデフォルト10sだと落ちるケースがあるため）
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    return {
      ok: false,
      error: isAbort ? "AIリクエストがタイムアウトしました。" : "AIリクエストに失敗しました。",
      detail: isAbort ? `timeout ${timeoutMs}ms` : String(err),
      request,
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    return { ok: false, error: "AIリクエストに失敗しました。", detail: await res.text(), request };
  }

  const data = await res.json();
  const latencyMs = Date.now() - started;
  const usage: TokenUsage = {
    inputTokens: Number(data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? 0),
    outputTokens: Number(data.usage?.output_tokens ?? data.usage?.completion_tokens ?? 0),
  };
  if (data.usage?.cached_input_tokens !== undefined) {
    usage.cachedInputTokens = Number(data.usage.cached_input_tokens);
  }
  const costUsd = estimateCostUsd(usage, model);
  const rawText = extractText(data);

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "AI応答のJSON解析に失敗しました。", usage, costUsd, request, rawText, response: data };
  }

  const plan = toPlan(parsed, usage, costUsd);
  const proposal = toProposal({ ...parsed, usage, cost_usd: costUsd });
  const steps = plan?.steps ?? (proposal ? [{ ...proposal.action, reason: proposal.reason }] : []);
  if (!steps.length) {
    return { ok: false, error: "提案の生成に失敗しました。", usage, costUsd, request, rawText, response: data };
  }
  return { ok: true, steps, usage, costUsd, latencyMs, request, rawText, response: data };
};
