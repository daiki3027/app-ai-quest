export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
};

export const USD_TO_JPY = 160;

const PRICING_PER_MILLION = {
  // gpt-5	$1.25	$0.125	$10.00
  // input: 1.25,
  // cachedInput: 0.125,
  // output: 10.00,

  // gpt-5-mini	$0.25	$0.025	$2.00
  input: 0.25,
  cachedInput: 0.025,
  output: 2.00,

  // gpt-5-nano	$0.05	$0.005	$0.40
  // input: 0.05,
  // cachedInput: 0.005,
  // output: 0.4,
};

export const estimateCostUsd = (usage: TokenUsage): number => {
  const inputCost = (usage.inputTokens / 1_000_000) * PRICING_PER_MILLION.input;
  const cachedCost =
    usage.cachedInputTokens !== undefined
      ? (usage.cachedInputTokens / 1_000_000) * PRICING_PER_MILLION.cachedInput
      : 0;
  const outputCost = (usage.outputTokens / 1_000_000) * PRICING_PER_MILLION.output;
  return Number((inputCost + cachedCost + outputCost).toFixed(6));
};

export const estimateCostJpy = (usage: TokenUsage): number => {
  const usd = estimateCostUsd(usage);
  return Math.round(usd * USD_TO_JPY);
};
