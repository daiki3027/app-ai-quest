export type MapId = "village" | "house" | "fieldA" | "fieldB";

export type TileType = "grass" | "wall" | "wood" | "path" | "dirt" | "stone";

export interface Position {
  x: number;
  y: number;
}

export type NpcId = "A" | "B" | "C";

export interface Npc {
  id: NpcId;
  position: Position;
}

export interface Entrance {
  x: number;
  y: number;
  target: MapId;
  targetPos: Position;
  label: string;
  requirement?: "enemyDefeated";
}

export interface MapData {
  id: MapId;
  width: number;
  height: number;
  tiles: TileType[][];
  npcs?: Npc[];
  weapon?: Position;
  enemy?: Position;
  treasure?: Position;
  entrances: Entrance[];
}

export interface GameState {
  currentMap: MapId;
  playerPos: Position;
  hasWeapon: boolean;
  enemyDefeated: boolean;
  talked: Record<NpcId, boolean>;
  log: string[];
  gameClear: boolean;
}

export type Action =
  | { type: "MOVE"; dx: number; dy: number }
  | { type: "INTERACT" }
  | { type: "RESET" };
