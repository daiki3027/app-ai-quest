// Breadth-first search over the game's state space. Gives the minimum number of
// actions needed to clear the game, used as the yardstick for the AI agent.
import { applyAction } from "./rules";
import { createInitialState } from "./reducer";
import { Action, GameState } from "./types";

export const ALL_ACTIONS: Action[] = [
  { type: "MOVE", dx: 0, dy: -1 },
  { type: "MOVE", dx: 0, dy: 1 },
  { type: "MOVE", dx: -1, dy: 0 },
  { type: "MOVE", dx: 1, dy: 0 },
  { type: "INTERACT" },
];

const keyOf = (s: GameState) =>
  `${s.currentMap}:${s.playerPos.x},${s.playerPos.y}:${s.hasWeapon ? 1 : 0}${s.enemyDefeated ? 1 : 0}${s.gameClear ? 1 : 0}`;

export const shortestSolution = (start: GameState = createInitialState()): Action[] | null => {
  const queue: { state: GameState; path: Action[] }[] = [{ state: start, path: [] }];
  const seen = new Set([keyOf(start)]);
  while (queue.length) {
    const { state, path } = queue.shift()!;
    if (state.gameClear) return path;
    for (const action of ALL_ACTIONS) {
      const next = applyAction(state, action);
      const key = keyOf(next);
      if (!seen.has(key)) {
        seen.add(key);
        queue.push({ state: next, path: [...path, action] });
      }
    }
  }
  return null;
};
