import { NextRequest, NextResponse } from "next/server";
import { requestPlan } from "@/app/game/planner";
import { DEFAULT_MODEL, TokenUsage } from "@/app/game/cost";
import { GameState } from "@/app/game/types";

const MODEL = DEFAULT_MODEL; // gpt-5-mini

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

  const result = await requestPlan(body.state, { apiKey: process.env.OPENAI_API_KEY, model: MODEL });
  if (result.usage && result.costUsd !== undefined) {
    pricingLog(result.usage, result.costUsd);
  }

  if (!result.ok) {
    console.error("[AI]", result.error, result.detail ?? result.rawText ?? "");
    return NextResponse.json(
      {
        error: result.error,
        detail: result.detail,
        debug_request: result.request,
        debug_response_raw: result.rawText,
        debug_response: result.response,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    proposed_plan: result.steps,
    usage: result.usage,
    cost_usd: result.costUsd,
    debug_request: result.request,
    debug_response_raw: result.rawText,
    debug_response: result.response,
  });
}
