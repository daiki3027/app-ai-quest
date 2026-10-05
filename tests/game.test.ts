import { test } from "node:test";
import assert from "node:assert/strict";
import { applyAction } from "../app/game/rules";
import { createInitialState } from "../app/game/reducer";
import { shortestSolution } from "../app/game/oracle";
import { buildStateSummary, toPlan } from "../app/game/ai";
import { estimateCostUsd } from "../app/game/cost";
import { SYSTEM_PROMPT_V1, SYSTEM_PROMPT_V2 } from "../app/game/planner";
import { classify } from "../scripts/eval-agent";
import { Action } from "../app/game/types";

test("the BFS solution actually clears the game", () => {
  const solution = shortestSolution();
  assert.ok(solution);
  let state = createInitialState();
  for (const action of solution) state = applyAction(state, action);
  assert.equal(state.gameClear, true);
  assert.equal(solution.length, 50);
});

test("the enemy cannot be defeated without the weapon", () => {
  // Walk the optimal route but skip the weapon pickup: the game must not be clearable.
  const solution = shortestSolution()!;
  let state = createInitialState();
  for (const action of solution) {
    state = applyAction(state, action);
    if (state.hasWeapon) state = { ...state, hasWeapon: false };
  }
  assert.equal(state.enemyDefeated, false);
  assert.equal(state.gameClear, false);
});

test("moving into a wall leaves the state unchanged and is classified as blocked", () => {
  // Walk left until the border wall stops us.
  const left: Action = { type: "MOVE", dx: -1, dy: 0 };
  let state = createInitialState();
  for (let i = 0; i < 20; i++) {
    const next = applyAction(state, left);
    if (next.playerPos.x === state.playerPos.x) {
      assert.equal(buildStateSummary(state).nearby.left, "wall");
      assert.equal(classify(state, next, left), "blocked");
      return;
    }
    assert.equal(classify(state, next, left), "progress");
    state = next;
  }
  assert.fail("never hit a wall");
});

test("interacting next to nothing is classified as no_effect", () => {
  const start = createInitialState();
  const after = applyAction(start, { type: "INTERACT" });
  assert.equal(classify(start, after, { type: "INTERACT" }), "no_effect");
});

test("toPlan accepts the documented format and common variants", () => {
  const usage = { inputTokens: 0, outputTokens: 0 };
  const plan = toPlan(
    { plan: [{ type: "MOVE", dx: 0, dy: -1, reason: "up" }, { type: "INTERACT", reason: "open" }, { action: "WALK", direction: "east" }] },
    usage,
    0
  );
  assert.ok(plan);
  assert.deepEqual(
    plan.steps.map(({ reason, ...a }) => a),
    [{ type: "MOVE", dx: 0, dy: -1 }, { type: "INTERACT" }, { type: "MOVE", dx: 1, dy: 0 }]
  );
  assert.equal(toPlan({ plan: [{ foo: 1 }] }, usage, 0), null);
});

test("cost is computed per model", () => {
  const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 };
  assert.equal(estimateCostUsd(usage, "gpt-5-mini"), 2.25);
  assert.equal(estimateCostUsd(usage, "gpt-5-nano"), 0.45);
});

test("prompt v2 fixes the direction in the example and keeps the rest of v1", () => {
  assert.match(SYSTEM_PROMPT_V1, /"dy":1,"reason":"北へ進む"/);
  assert.doesNotMatch(SYSTEM_PROMPT_V2, /"dy":1,"reason":"北へ進む"/);
  assert.match(SYSTEM_PROMPT_V2, /dy:-1 が上（北）/);
  assert.ok(SYSTEM_PROMPT_V2.startsWith(SYSTEM_PROMPT_V1.slice(0, 200)));
});
