/*
 * Evaluate the AI planner headlessly: let it play the game from the start, approving
 * every proposed step (as if the user pressed "実行（承認）" each time), and measure
 * how well its plans hold up.
 *
 * Usage:
 *   OPENAI_API_KEY=... npx tsx scripts/eval-agent.ts --model gpt-5-mini --prompt v1 --episodes 5
 *   npx tsx scripts/eval-agent.ts --report      # results/summary.md from results/runs/
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyAction } from "../app/game/rules";
import { createInitialState } from "../app/game/reducer";
import { shortestSolution } from "../app/game/oracle";
import { PromptId, requestPlan } from "../app/game/planner";
import { ModelId } from "../app/game/cost";
import { Action, GameState } from "../app/game/types";

const RESULTS = join(__dirname, "..", "results");
const RUNS = join(RESULTS, "runs");

type StepRecord = {
  call: number;
  index: number; // position within the plan
  action: Action;
  reason: string;
  outcome: "progress" | "talk" | "blocked" | "no_effect";
  map: string;
};

type Episode = {
  model: ModelId;
  prompt: PromptId;
  episode: number;
  cleared: boolean;
  stopReason: "cleared" | "max_calls" | "max_actions" | "budget";
  calls: number;
  failedCalls: number;
  actions: number;
  optimalActions: number;
  blocked: number;
  noEffect: number;
  firstBadIndex: (number | null)[]; // per call: index of the first blocked / no-effect step
  milestones: { weapon: boolean; enemy: boolean; fieldB: boolean };
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number[];
  steps: StepRecord[];
  errors: string[];
};

const same = (a: GameState, b: GameState) =>
  a.currentMap === b.currentMap &&
  a.playerPos.x === b.playerPos.x &&
  a.playerPos.y === b.playerPos.y &&
  a.hasWeapon === b.hasWeapon &&
  a.enemyDefeated === b.enemyDefeated &&
  a.gameClear === b.gameClear;

export const classify = (before: GameState, after: GameState, action: Action): StepRecord["outcome"] => {
  const talkedMore = Object.values(after.talked).filter(Boolean).length > Object.values(before.talked).filter(Boolean).length;
  if (!same(before, after)) return "progress";
  if (talkedMore) return "talk";
  return action.type === "MOVE" ? "blocked" : "no_effect";
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const get = (name: string, fallback: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
  };
  return {
    report: args.includes("--report"),
    model: get("model", "gpt-5-mini") as ModelId,
    prompt: get("prompt", "v1") as PromptId,
    episodes: Number(get("episodes", "5")),
    maxCalls: Number(get("max-calls", "15")),
    maxActions: Number(get("max-actions", "120")),
    budgetUsd: Number(get("budget-usd", "1.0")),
  };
};

const runEpisode = async (
  n: number,
  opts: ReturnType<typeof parseArgs>,
  apiKey: string,
  spentSoFar: () => number
): Promise<Episode> => {
  let state = createInitialState();
  const ep: Episode = {
    model: opts.model, prompt: opts.prompt, episode: n, cleared: false, stopReason: "max_calls",
    calls: 0, failedCalls: 0, actions: 0, optimalActions: shortestSolution()!.length,
    blocked: 0, noEffect: 0, firstBadIndex: [],
    milestones: { weapon: false, enemy: false, fieldB: false },
    costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: [], steps: [], errors: [],
  };

  while (!state.gameClear) {
    if (ep.calls >= opts.maxCalls) { ep.stopReason = "max_calls"; break; }
    if (ep.actions >= opts.maxActions) { ep.stopReason = "max_actions"; break; }
    if (spentSoFar() + ep.costUsd >= opts.budgetUsd) { ep.stopReason = "budget"; break; }

    ep.calls += 1;
    const result = await requestPlan(state, { apiKey, model: opts.model, prompt: opts.prompt });
    ep.costUsd += result.costUsd ?? 0;
    ep.inputTokens += result.usage?.inputTokens ?? 0;
    ep.outputTokens += result.usage?.outputTokens ?? 0;
    if (!result.ok) {
      ep.failedCalls += 1;
      ep.errors.push(`${result.error} ${result.detail ?? ""}`.slice(0, 300));
      ep.firstBadIndex.push(null);
      continue;
    }
    ep.latencyMs.push(result.latencyMs);

    let firstBad: number | null = null;
    for (let index = 0; index < result.steps.length; index++) {
      const step = result.steps[index];
      const action: Action = step.type === "MOVE" ? { type: "MOVE", dx: step.dx, dy: step.dy } : { type: "INTERACT" };
      const before = state;
      state = applyAction(state, action);
      const outcome = classify(before, state, action);
      ep.actions += 1;
      if (outcome === "blocked") ep.blocked += 1;
      if (outcome === "no_effect") ep.noEffect += 1;
      if ((outcome === "blocked" || outcome === "no_effect") && firstBad === null) firstBad = index;
      ep.steps.push({ call: ep.calls, index, action, reason: step.reason, outcome, map: state.currentMap });
      ep.milestones.weapon ||= state.hasWeapon;
      ep.milestones.enemy ||= state.enemyDefeated;
      ep.milestones.fieldB ||= state.currentMap === "fieldB";
      if (state.gameClear || ep.actions >= opts.maxActions) break;
    }
    ep.firstBadIndex.push(firstBad);
  }
  if (state.gameClear) { ep.cleared = true; ep.stopReason = "cleared"; }
  return ep;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

const report = (): string => {
  const eps: Episode[] = readdirSync(RUNS).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(RUNS, f), "utf8")));
  const groups = new Map<string, Episode[]>();
  for (const e of eps) {
    const k = `${e.model} / ${e.prompt}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const optimal = eps[0]?.optimalActions ?? shortestSolution()!.length;
  const lines = [
    `最短手数（BFS で求めた最適解）: ${optimal} 手`,
    "",
    "| モデル / プロンプト | 回数 | クリア率 | クリアまでの手数（中央値） | LLM 呼び出し（中央値） | 実行できない移動の割合 | 何も起きない「調べる」の割合 | 計画が最初に崩れる位置（中央値） | 武器 | 敵を倒す | 外B到達 | 1回あたりの費用 | 応答時間（中央値） |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const [k, es] of Array.from(groups.entries()).sort()) {
    const cleared = es.filter((e) => e.cleared);
    const actions = es.reduce((a, e) => a + e.actions, 0);
    const bad = es.flatMap((e) => e.firstBadIndex).filter((x): x is number => x !== null);
    const lat = es.flatMap((e) => e.latencyMs);
    lines.push(
      `| ${k} | ${es.length} | ${pct(cleared.length / es.length)} | ${cleared.length ? median(cleared.map((e) => e.actions)) : "-"} | ` +
        `${median(es.map((e) => e.calls))} | ${pct(es.reduce((a, e) => a + e.blocked, 0) / actions)} | ` +
        `${pct(es.reduce((a, e) => a + e.noEffect, 0) / actions)} | ${bad.length ? `${median(bad) + 1} 手目` : "-"} | ` +
        `${pct(avg(es.map((e) => +e.milestones.weapon)))} | ${pct(avg(es.map((e) => +e.milestones.enemy)))} | ${pct(avg(es.map((e) => +e.milestones.fieldB)))} | ` +
        `$${avg(es.map((e) => e.costUsd)).toFixed(4)} | ${(median(lat) / 1000).toFixed(1)} 秒 |`
    );
  }
  const out = lines.join("\n") + "\n";
  writeFileSync(join(RESULTS, "summary.md"), out);
  return out;
};

const main = async () => {
  const opts = parseArgs();
  if (opts.report) {
    console.log(report());
    return;
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  mkdirSync(RUNS, { recursive: true });
  let spent = 0;
  for (let n = 1; n <= opts.episodes; n++) {
    const ep = await runEpisode(n, opts, apiKey, () => spent);
    spent += ep.costUsd;
    const file = join(RUNS, `${opts.model}_${opts.prompt}_${String(n).padStart(2, "0")}.json`);
    writeFileSync(file, JSON.stringify(ep, null, 1));
    console.log(
      `${opts.model} ${opts.prompt} #${n}: ${ep.cleared ? "CLEAR" : ep.stopReason} actions=${ep.actions} calls=${ep.calls} ` +
        `blocked=${ep.blocked} noEffect=${ep.noEffect} cost=$${ep.costUsd.toFixed(4)} (total $${spent.toFixed(4)})`
    );
    if (spent >= opts.budgetUsd) {
      console.log(`budget $${opts.budgetUsd} reached, stopping`);
      break;
    }
  }
};

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
