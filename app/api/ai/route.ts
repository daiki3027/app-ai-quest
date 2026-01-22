import { NextRequest, NextResponse } from "next/server";
import { buildStateSummary, toPlan, toProposal } from "@/app/game/ai";
import { estimateCostUsd, TokenUsage } from "@/app/game/cost";
import { GameState } from "@/app/game/types";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

// gpt-5	    $1.25	$0.125	$10.00
// gpt-5-mini	$0.25	$0.025	$2.00
// gpt-5-nano	$0.05	$0.005	$0.40
// const MODEL = "gpt-5";
const MODEL = "gpt-5-mini";
// const MODEL = "gpt-5-nano";

const TIMEOUT_MS = 120_000;

const systemPrompt = `あなたはシンプルなドット絵RPGの案内役です。返答は必ずJSONのみ。
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

const schema = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["MOVE", "INTERACT"] },
    dx: { type: "number" },
    dy: { type: "number" },
    reason: { type: "string" },
  },
  required: ["type", "reason"],
  additionalProperties: false,
};

const pricingLog = (usage: TokenUsage, costUsd: number) => {
  console.log(
    `[AI] tokens input=${usage.inputTokens} cached=${usage.cachedInputTokens ?? 0} output=${
      usage.outputTokens
    } cost=$${costUsd}`
  );
};

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEYが設定されていません。" }, { status: 500 });
  }

  const body = (await req.json().catch(() => null)) as { state?: GameState } | null;
  if (!body?.state) {
    return NextResponse.json({ error: "state が必要です。" }, { status: 400 });
  }

  const summary = buildStateSummary(body.state);

  const payload = {
    model: MODEL,
    input: [
      { role: "system", content: systemPrompt },
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
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    const isAbort = err?.name === "AbortError";
    const detail = isAbort ? `timeout ${TIMEOUT_MS}ms` : String(err);
    console.error("[AI] fetch failed:", err);
    return NextResponse.json(
      {
        error: isAbort ? "AIリクエストがタイムアウトしました。" : "AIリクエストに失敗しました。",
        detail,
        debug_request: payload,
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text();
    console.error("[AI] request failed:", res.status, text);
    return NextResponse.json(
      { error: "AIリクエストに失敗しました。", detail: text, debug_request: payload },
      { status: 500 }
    );
  }

  const data = await res.json();
  const messageContent =
    data.output?.find((o: any) => o?.type === "message")?.content ?? [];
  const outputTextEntry = Array.isArray(messageContent)
    ? messageContent.find((c: any) => c?.type === "output_text")
    : null;
  const firstContent = data.output?.[0]?.content?.[0];

  const rawTextCandidates = [
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
  const rawText = rawTextCandidates[0] ?? "";
  const rawTextDebug = typeof rawText === "string" ? rawText : JSON.stringify(rawText);
  if (!rawTextDebug) {
    console.error("[AI] rawText empty, full response:", JSON.stringify(data, null, 2));
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawTextDebug);
  } catch (e) {
    console.error("[AI] JSON parse failed", rawTextDebug);
    return NextResponse.json(
      {
        error: "AI応答のJSON解析に失敗しました。",
        debug_request: payload,
        debug_response_raw: rawTextDebug,
        debug_response: data,
      },
      { status: 500 }
    );
  }

  const usage: TokenUsage = {
    inputTokens: Number(data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? 0),
    outputTokens: Number(data.usage?.output_tokens ?? data.usage?.completion_tokens ?? 0),
  };
  if (data.usage?.cached_input_tokens !== undefined) {
    usage.cachedInputTokens = Number(data.usage.cached_input_tokens);
  }
  const costUsd = estimateCostUsd(usage);
  pricingLog(usage, costUsd);

  const proposal = toProposal({
    ...parsed,
    usage,
    cost_usd: costUsd,
  });

  const plan = toPlan(parsed, usage, costUsd);
  const planSteps = plan?.steps ?? (proposal ? [{ ...proposal.action, reason: proposal.reason }] : []);

  if (!planSteps.length) {
    return NextResponse.json(
      {
        error: "提案の生成に失敗しました。",
        debug_request: payload,
        debug_response_raw: rawTextDebug,
        debug_response: data,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    proposed_plan: planSteps,
    usage,
    cost_usd: costUsd,
    debug_request: payload,
    debug_response_raw: rawTextDebug,
    debug_response: data,
  });
}
