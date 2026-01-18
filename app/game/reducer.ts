import { initialPlayerPosition } from "./maps";
import { applyAction } from "./rules";
import { Action, GameState } from "./types";

export const createInitialState = (): GameState => ({
  currentMap: "village",
  playerPos: { ...initialPlayerPosition },
  hasWeapon: false,
  enemyDefeated: false,
  talked: { A: false, B: false, C: false },
  log: ["村にやってきた。"],
  gameClear: false,
});

export const reducer = (state: GameState, action: Action): GameState => {
  if (action.type === "RESET") return createInitialState();
  return applyAction(state, action);
};
