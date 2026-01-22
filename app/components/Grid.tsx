import { getMap } from "../game/maps";
import { MapData, Position } from "../game/types";
import DoorIcon from "./icons/DoorIcon";
import EnemyIcon from "./icons/EnemyIcon";
import GateIcon from "./icons/GateIcon";
import NpcIcon from "./icons/NpcIcon";
import PlayerIcon from "./icons/PlayerIcon";
import PlayerIconWithSword from "./icons/PlayerIconWithSword";
import TreasureIcon from "./icons/TreasureIcon";
import WeaponIcon from "./icons/WeaponIcon";

type Props = {
  mapId: MapData["id"];
  playerPos: Position;
  hasWeapon: boolean;
  enemyDefeated: boolean;
};

const tileSize = 36;

const tileClass = (tile: string) => {
  switch (tile) {
    case "grass":
      return "grass";
    case "wood":
      return "wood";
    case "path":
      return "path";
    case "dirt":
      return "dirt";
    case "stone":
      return "stone";
    default:
      return "wall";
  }
};

const Grid = ({ mapId, playerPos, hasWeapon, enemyDefeated }: Props) => {
  const map = getMap(mapId);

  const renderEntity = (x: number, y: number) => {
    if (playerPos.x === x && playerPos.y === y) {
      return hasWeapon ? <PlayerIconWithSword /> : <PlayerIcon />;
    }
    if (map.weapon && !hasWeapon && map.weapon.x === x && map.weapon.y === y) {
      return <WeaponIcon />;
    }
    if (map.enemy && !enemyDefeated && map.enemy.x === x && map.enemy.y === y) {
      return <EnemyIcon />;
    }
    if (map.treasure && map.treasure.x === x && map.treasure.y === y) {
      return <TreasureIcon />;
    }
    const npc = map.npcs?.find((n) => n.position.x === x && n.position.y === y);
    if (npc) {
      return <NpcIcon label={`NPC ${npc.id}`} />;
    }
    const entrance = map.entrances.find((e) => e.x === x && e.y === y);
    if (entrance) {
      const isGate = entrance.target === "fieldA" || entrance.target === "fieldB";
      return isGate ? <GateIcon /> : <DoorIcon />;
    }
    return null;
  };

  return (
    <div className="grid" role="presentation">
      {map.tiles.map((row, y) =>
        row.map((tile, x) => (
          <div key={`${x}-${y}`} className={`tile ${tileClass(tile)}`}>
            {renderEntity(x, y)}
          </div>
        ))
      )}
      <style jsx>{`
        .grid {
          display: grid;
          grid-template-columns: repeat(${map.width}, ${tileSize}px);
          grid-template-rows: repeat(${map.height}, ${tileSize}px);
          gap: 1px;
          background: #3c4b5b;
          padding: 8px;
          border-radius: 14px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16), inset 0 0 0 1px #9db3c7;
        }
        .tile {
          width: ${tileSize}px;
          height: ${tileSize}px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
          image-rendering: pixelated;
        }
        .tile :global(svg) {
          shape-rendering: crispEdges;
        }
        .grass {
          background:
            radial-gradient(circle at 25% 30%, rgba(255, 255, 255, 0.18), transparent 55%),
            radial-gradient(circle at 70% 70%, rgba(255, 255, 255, 0.12), transparent 50%),
            repeating-linear-gradient(0deg, #a9e07c 0 2px, #a1d86f 2px 4px);
        }
        .wood {
          background:
            repeating-linear-gradient(90deg, #c29b64 0 3px, #b78b52 3px 6px),
            linear-gradient(180deg, rgba(0, 0, 0, 0.08), transparent 60%);
        }
        .path {
          background:
            repeating-linear-gradient(0deg, #f0e3a2 0 3px, #e6d78c 3px 6px),
            linear-gradient(135deg, rgba(0, 0, 0, 0.07), transparent 55%);
        }
        .dirt {
          background:
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.14), transparent 40%),
            repeating-linear-gradient(0deg, #d4b071 0 3px, #c89e5b 3px 6px);
        }
        .stone {
          background:
            radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.18), transparent 50%),
            repeating-linear-gradient(0deg, #c8d3e2 0 3px, #b7c4d6 3px 6px);
        }
        .wall {
          background:
            repeating-linear-gradient(90deg, #4f5e72 0 3px, #3d4a5d 3px 6px),
            linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent 70%);
        }
      `}</style>
    </div>
  );
};

export default Grid;
