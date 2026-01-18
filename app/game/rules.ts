import { getMap } from "./maps";
import { Action, GameState, Position } from "./types";

const LOG_LIMIT = 50;

const npcMessages: Record<string, string> = {
  A: "村の外には敵がいるぞ。",
  B: "敵には武器が必要だ。",
  C: "武器はこの村の家にある。",
};

const addLog = (log: string[], message: string): string[] => {
  const next = [...log, message];
  if (next.length > LOG_LIMIT) {
    return next.slice(next.length - LOG_LIMIT);
  }
  return next;
};

const isInside = (pos: Position, width: number, height: number) =>
  pos.x >= 0 && pos.y >= 0 && pos.x < width && pos.y < height;

const isSamePos = (a: Position, b: Position) => a.x === b.x && a.y === b.y;

const isAdjacent = (a: Position, b: Position) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

const isBlocked = (state: GameState, pos: Position) => {
  const map = getMap(state.currentMap);
  if (!isInside(pos, map.width, map.height)) return true;

  const tile = map.tiles[pos.y]?.[pos.x];
  if (tile === "wall") return true;

  const blockingEntities: Position[] = [];

  if (map.npcs) {
    blockingEntities.push(...map.npcs.map((n) => n.position));
  }

  if (map.enemy && !state.enemyDefeated) {
    blockingEntities.push(map.enemy);
  }

  if (map.treasure) {
    blockingEntities.push(map.treasure);
  }

  map.entrances.forEach((e) => blockingEntities.push({ x: e.x, y: e.y }));

  return blockingEntities.some((b) => isSamePos(b, pos));
};

const handleMove = (state: GameState, dx: number, dy: number): GameState => {
  if (state.gameClear) return state;
  const map = getMap(state.currentMap);
  const target: Position = { x: state.playerPos.x + dx, y: state.playerPos.y + dy };
  if (isBlocked(state, target)) return state;
  let nextState: GameState = { ...state, playerPos: target };
  let nextLog = state.log;

  if (map.weapon && !state.hasWeapon && isSamePos(target, map.weapon)) {
    nextState = { ...nextState, hasWeapon: true };
    nextLog = addLog(nextLog, "武器を手に入れた！");
  }

  return { ...nextState, log: nextLog };
};

const handleInteract = (state: GameState): GameState => {
  if (state.gameClear) return state;
  const map = getMap(state.currentMap);
  let nextLog = state.log;
  let nextState: GameState = { ...state };

  const push = (msg: string) => {
    nextLog = addLog(nextLog, msg);
  };

  if (map.treasure && isAdjacent(state.playerPos, map.treasure)) {
    push("宝箱を開けた！クリア！");
    nextState = { ...nextState, gameClear: true };
    return { ...nextState, log: nextLog };
  }

  const nearWeapon = map.weapon && !state.hasWeapon;
  if (
    nearWeapon &&
    map.weapon &&
    (isAdjacent(state.playerPos, map.weapon) || isSamePos(state.playerPos, map.weapon))
  ) {
    push("武器を手に入れた！");
    nextState = { ...nextState, hasWeapon: true };
    return { ...nextState, log: nextLog };
  }

  if (map.enemy && !state.enemyDefeated && isAdjacent(state.playerPos, map.enemy)) {
    if (state.hasWeapon) {
      push("敵を倒した！");
      nextState = { ...nextState, enemyDefeated: true };
    } else {
      push("攻撃が弾かれた！武器が必要だ。");
    }
    return { ...nextState, log: nextLog };
  }

  const npc = map.npcs?.find((n) => isAdjacent(state.playerPos, n.position));
  if (npc) {
    push(npcMessages[npc.id] ?? "こんにちは！");
    nextState = { ...nextState, talked: { ...nextState.talked, [npc.id]: true } };
    return { ...nextState, log: nextLog };
  }

  const entrance = map.entrances.find((e) => isAdjacent(state.playerPos, { x: e.x, y: e.y }));
  if (entrance) {
    if (entrance.requirement === "enemyDefeated" && !state.enemyDefeated) {
      push("敵が通路を塞いでいる。先に倒そう。");
      return { ...state, log: nextLog };
    }
    push(`${entrance.label}へ移動した。`);
    nextState = {
      ...nextState,
      currentMap: entrance.target,
      playerPos: { ...entrance.targetPos },
    };
    return { ...nextState, log: nextLog };
  }

  push("特に何も起きない。");
  return { ...nextState, log: nextLog };
};

export const applyAction = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case "MOVE":
      return handleMove(state, action.dx, action.dy);
    case "INTERACT":
      return handleInteract(state);
    default:
      return state;
  }
};
