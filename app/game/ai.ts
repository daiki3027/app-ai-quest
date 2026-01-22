import { getMap } from "./maps";
import { estimateCostUsd, TokenUsage } from "./cost";
import { Action, GameState, Position, NpcId } from "./types";

export type NearbyLabel =
  | "empty"
  | "wall"
  | "npc"
  | "enemy"
  | "treasure"
  | "door"
  | "gate"
  | "weapon"
  | "exit";

export type AiStateSummary = {
  map: string;
  mapSize: { width: number; height: number };
  player: Position;
  hasWeapon: boolean;
  enemyDefeated: boolean;
  gameClear: boolean;
  nearby: Record<"up" | "down" | "left" | "right", NearbyLabel>;
  talked: Record<NpcId, boolean>;
  recentLog: string[];
  npcs: { id: NpcId; position: Position; talked: boolean }[];
  entrances: { label: string; x: number; y: number; target: string; requirement?: string }[];
  weapon?: { position: Position; available: boolean };
  enemy?: { position: Position; alive: boolean };
  treasure?: { position: Position };
  goal: string;
};

export type ProposedAction = Exclude<Action, { type: "RESET" }>;

export type AiProposal = {
  action: ProposedAction;
  reason: string;
  usage: TokenUsage;
  costUsd: number;
};

export type AiPlanStep = ProposedAction & { reason: string };

export type AiPlan = {
  steps: AiPlanStep[];
  usage: TokenUsage;
  costUsd: number;
};

const toDirectionDelta = (dir: string | undefined): { dx: number; dy: number } | null => {
  if (!dir) return null;
  switch (dir.toLowerCase()) {
    case "up":
    case "north":
      return { dx: 0, dy: -1 };
    case "down":
    case "south":
      return { dx: 0, dy: 1 };
    case "left":
    case "west":
      return { dx: -1, dy: 0 };
    case "right":
    case "east":
      return { dx: 1, dy: 0 };
    default:
      return null;
  }
};

const describeNeighbor = (state: GameState, pos: Position): NearbyLabel => {
  const map = getMap(state.currentMap);
  if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) {
    return "wall";
  }
  const tile = map.tiles[pos.y][pos.x];
  if (tile === "wall") return "wall";

  if (map.treasure && pos.x === map.treasure.x && pos.y === map.treasure.y) {
    return "treasure";
  }
  if (map.enemy && !state.enemyDefeated && pos.x === map.enemy.x && pos.y === map.enemy.y) {
    return "enemy";
  }
  if (map.weapon && !state.hasWeapon && pos.x === map.weapon.x && pos.y === map.weapon.y) {
    return "weapon";
  }
  const npc = map.npcs?.find((n) => n.position.x === pos.x && n.position.y === pos.y);
  if (npc) return "npc";

  const entrance = map.entrances.find((e) => e.x === pos.x && e.y === pos.y);
  if (entrance) {
    const isGate = entrance.target === "fieldA" || entrance.target === "fieldB";
    return isGate ? "gate" : "door";
  }

  return "empty";
};

export const buildStateSummary = (state: GameState): AiStateSummary => {
  const { x, y } = state.playerPos;
  const map = getMap(state.currentMap);
  return {
    map: state.currentMap,
    mapSize: { width: map.width, height: map.height },
    player: { x, y },
    hasWeapon: state.hasWeapon,
    enemyDefeated: state.enemyDefeated,
    gameClear: state.gameClear,
    nearby: {
      up: describeNeighbor(state, { x, y: y - 1 }),
      down: describeNeighbor(state, { x, y: y + 1 }),
      left: describeNeighbor(state, { x: x - 1, y }),
      right: describeNeighbor(state, { x: x + 1, y }),
    },
    talked: state.talked,
    recentLog: state.log.slice(-5),
    npcs:
      map.npcs?.map((n) => ({
        id: n.id,
        position: { ...n.position },
        talked: state.talked[n.id],
      })) ?? [],
    entrances: map.entrances.map((e) => ({
      label: e.label,
      x: e.x,
      y: e.y,
      target: e.target,
      requirement: e.requirement,
    })),
    weapon: map.weapon
      ? {
          position: { ...map.weapon },
          available: !state.hasWeapon,
        }
      : undefined,
    enemy: map.enemy
      ? {
          position: { ...map.enemy },
          alive: !state.enemyDefeated,
        }
      : undefined,
    treasure: map.treasure ? { position: { ...map.treasure } } : undefined,
    goal: "宝箱を開けてクリア",
  };
};

const parseAction = (raw: any): ProposedAction | null => {
  if (!raw || typeof raw !== "object") return null;
  const pick = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null);

  const rawType =
    pick(
      raw.type,
      raw.action?.type,
      raw.action?.kind,
      raw.action,
      raw.actionType,
      raw.action_name,
      raw.act?.type,
      raw.act
    ) ?? "";
  const normalizedType = String(rawType).toUpperCase();

  const isMove =
    normalizedType === "MOVE" ||
    normalizedType === "GO" ||
    normalizedType === "WALK" ||
    normalizedType === "STEP";
  const isInteract =
    normalizedType === "INTERACT" ||
    normalizedType === "CHECK" ||
    normalizedType === "INSPECT" ||
    normalizedType === "OPEN" ||
    normalizedType === "USE" ||
    normalizedType === "TALK";

  const dir = pick(raw.direction, raw.dir, raw.move, raw.action?.direction);
  const dirDelta = toDirectionDelta(typeof dir === "string" ? dir : undefined);
  const dxVal = pick(raw.dx, raw.x, raw.action?.dx, raw.action?.x, dirDelta?.dx);
  const dyVal = pick(raw.dy, raw.y, raw.action?.dy, raw.action?.y, dirDelta?.dy);

  const action: ProposedAction | null = isInteract
    ? { type: "INTERACT" }
    : isMove || dxVal !== undefined || dyVal !== undefined
    ? {
        type: "MOVE",
        dx: Number(dxVal ?? 0),
        dy: Number(dyVal ?? 0),
      }
    : null;

  if (
    !action ||
    (action.type === "MOVE" && (isNaN(action.dx) || isNaN(action.dy))) ||
    (!isMove && !isInteract && dxVal === undefined && dyVal === undefined && !dirDelta)
  ) {
    return null;
  }

  return action;
};

export const toProposal = (raw: any): AiProposal | null => {
  const action = parseAction(raw);
  if (!action) return null;
  const usage: TokenUsage = {
    inputTokens: Number(raw.usage?.input_tokens ?? raw.usage?.inputTokens ?? 0),
    outputTokens: Number(raw.usage?.output_tokens ?? raw.usage?.outputTokens ?? 0),
  };
  if (raw.usage?.cached_input_tokens ?? raw.usage?.cachedInputTokens) {
    usage.cachedInputTokens = Number(
      raw.usage?.cached_input_tokens ?? raw.usage?.cachedInputTokens ?? 0
    );
  }
  const costUsd =
    typeof raw.cost_usd === "number"
      ? raw.cost_usd
      : raw.usage
      ? estimateCostUsd(usage)
      : 0;

  return {
    action,
    reason: String(raw.reason ?? raw.comment ?? "提案理由なし"),
    usage,
    costUsd,
  };
};

export const toPlan = (raw: any, usage: TokenUsage, costUsd: number): AiPlan | null => {
  const stepsRaw: any[] =
    (Array.isArray(raw?.plan) && raw.plan) ||
    (Array.isArray(raw?.steps) && raw.steps) ||
    (Array.isArray(raw?.actions) && raw.actions) ||
    (raw?.plan && Array.isArray(raw?.plan?.steps) ? raw.plan.steps : []) ||
    [];

  const steps: AiPlanStep[] = stepsRaw
    .map((s) => {
      const action = parseAction(s);
      if (!action) return null;
      return {
        ...action,
        reason: String(s.reason ?? s.comment ?? raw.reason ?? "理由なし"),
      } as AiPlanStep;
    })
    .filter((s): s is AiPlanStep => Boolean(s));

  if (steps.length === 0) return null;

  return { steps, usage, costUsd };
};
