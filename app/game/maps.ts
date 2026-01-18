import { Entrance, MapData, MapId, Position, TileType } from "./types";

const createGrid = (width: number, height: number, fill: TileType): TileType[][] =>
  Array.from({ length: height }, () => Array.from({ length: width }, () => fill));

const addBorderWalls = (tiles: TileType[][]) => {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (isEdge) {
        tiles[y][x] = "wall";
      }
    }
  }
};

const carvePath = (tiles: TileType[][], points: Position[]) => {
  points.forEach(({ x, y }) => {
    if (tiles[y] && tiles[y][x]) {
      tiles[y][x] = "path";
    }
  });
};

const maps: Record<MapId, MapData> = (() => {
  // Village
  const villageTiles = createGrid(15, 11, "grass");
  addBorderWalls(villageTiles);
  carvePath(
    villageTiles,
    [
      { x: 7, y: 0 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 8, y: 8 },
      { x: 9, y: 8 },
      { x: 10, y: 8 },
      { x: 11, y: 8 },
      { x: 12, y: 8 },
      { x: 13, y: 8 },
      { x: 13, y: 7 },
      { x: 13, y: 6 },
      { x: 13, y: 5 },
    ]
  );
  villageTiles[0][7] = "path"; // gate
  villageTiles[5][13] = "path"; // door

  const villageEntrances: Entrance[] = [
    {
      x: 7,
      y: 0,
      target: "fieldA",
      targetPos: { x: 7, y: 7 },
      label: "外へ続く門",
    },
    {
      x: 13,
      y: 5,
      target: "house",
      targetPos: { x: 1, y: 3 },
      label: "家のドア",
    },
  ];

  // Weapon house
  const houseTiles = createGrid(9, 7, "wood");
  addBorderWalls(houseTiles);
  carvePath(
    houseTiles,
    [
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
    ]
  );
  houseTiles[3][0] = "path";

  const houseEntrances: Entrance[] = [
    {
      x: 0,
      y: 3,
      target: "village",
      targetPos: { x: 12, y: 5 },
      label: "村へ戻るドア",
    },
  ];

  // Field A
  const fieldATiles = createGrid(15, 9, "dirt");
  addBorderWalls(fieldATiles);
  carvePath(
    fieldATiles,
    [
      { x: 7, y: 8 },
      { x: 7, y: 7 },
      { x: 7, y: 6 },
      { x: 7, y: 5 },
      { x: 7, y: 4 },
      { x: 8, y: 4 },
      { x: 9, y: 4 },
      { x: 10, y: 4 },
      { x: 11, y: 4 },
      { x: 12, y: 4 },
      { x: 13, y: 4 },
    ]
  );
  fieldATiles[8][7] = "path"; // from village gate
  fieldATiles[4][14] = "path"; // to fieldB gate

  const fieldAEntrances: Entrance[] = [
    {
      x: 7,
      y: 8,
      target: "village",
      targetPos: { x: 7, y: 1 },
      label: "村への門",
    },
    {
      x: 14,
      y: 4,
      target: "fieldB",
      targetPos: { x: 1, y: 4 },
      label: "先の地域",
      requirement: "enemyDefeated",
    },
  ];

  // Field B
  const fieldBTiles = createGrid(11, 9, "stone");
  addBorderWalls(fieldBTiles);
  carvePath(
    fieldBTiles,
    [
      { x: 0, y: 4 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 7, y: 4 },
      { x: 8, y: 4 },
      { x: 9, y: 4 },
    ]
  );
  fieldBTiles[4][0] = "path";

  const fieldBEntrances: Entrance[] = [
    {
      x: 0,
      y: 4,
      target: "fieldA",
      targetPos: { x: 13, y: 4 },
      label: "外Aへ戻る",
    },
  ];

  const data: Record<MapId, MapData> = {
    village: {
      id: "village",
      width: 15,
      height: 11,
      tiles: villageTiles,
      npcs: [
        { id: "A", position: { x: 5, y: 6 } },
        { id: "B", position: { x: 7, y: 6 } },
        { id: "C", position: { x: 9, y: 6 } },
      ],
      entrances: villageEntrances,
    },
    house: {
      id: "house",
      width: 9,
      height: 7,
      tiles: houseTiles,
      weapon: { x: 6, y: 2 },
      entrances: houseEntrances,
    },
    fieldA: {
      id: "fieldA",
      width: 15,
      height: 9,
      tiles: fieldATiles,
      enemy: { x: 9, y: 4 },
      entrances: fieldAEntrances,
    },
    fieldB: {
      id: "fieldB",
      width: 11,
      height: 9,
      tiles: fieldBTiles,
      treasure: { x: 9, y: 4 },
      entrances: fieldBEntrances,
    },
  };

  return data;
})();

export const getMap = (id: MapId): MapData => maps[id];

export const initialPlayerPosition: Position = { x: 7, y: 8 };
