export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
};

export const USD_TO_JPY = 160;

export type ModelId = "gpt-5" | "gpt-5-mini" | "gpt-5-nano";

// USD per 1M tokens (input / cached input / output)
export const PRICING_PER_MILLION: Record<ModelId, { input: number; cachedInput: number; output: number }> = {
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10.0 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2.0 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
};

export const DEFAULT_MODEL: ModelId = "gpt-5-mini";

export const estimateCostUsd = (usage: TokenUsage, model: ModelId = DEFAULT_MODEL): number => {
  const pricing = PRICING_PER_MILLION[model];
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const cachedCost =
    usage.cachedInputTokens !== undefined
      ? (usage.cachedInputTokens / 1_000_000) * pricing.cachedInput
      : 0;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + cachedCost + outputCost).toFixed(6));
};

export const estimateCostJpy = (usage: TokenUsage, model: ModelId = DEFAULT_MODEL): number => {
  const usd = estimateCostUsd(usage, model);
  return Math.round(usd * USD_TO_JPY);
};
