"use client";

import { useEffect, useReducer } from "react";
import { createInitialState, reducer } from "../game/reducer";
import { Action } from "../game/types";
import Grid from "./Grid";

const mapLabels: Record<string, string> = {
  village: "村",
  house: "武器の家",
  fieldA: "外A",
  fieldB: "外B",
};

const useKeyboard = (dispatch: React.Dispatch<Action>, disabled: boolean) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabled) return;
      let action: Action | null = null;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          action = { type: "MOVE", dx: 0, dy: -1 };
          break;
        case "ArrowDown":
        case "s":
        case "S":
          action = { type: "MOVE", dx: 0, dy: 1 };
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          action = { type: "MOVE", dx: -1, dy: 0 };
          break;
        case "ArrowRight":
        case "d":
        case "D":
          action = { type: "MOVE", dx: 1, dy: 0 };
          break;
        case "Enter":
        case " ":
          action = { type: "INTERACT" };
          break;
        default:
          break;
      }
      if (action) {
        e.preventDefault();
        dispatch(action);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, disabled]);
};

const Game = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useKeyboard(dispatch, state.gameClear);

  const statusItems = [
    { label: "現在地", value: mapLabels[state.currentMap] ?? state.currentMap },
    { label: "武器", value: state.hasWeapon ? "所持" : "なし" },
    { label: "外Aの敵", value: state.enemyDefeated ? "撃破済み" : "未撃破" },
    { label: "NPC会話", value: `A:${state.talked.A ? "済" : "未"} / B:${state.talked.B ? "済" : "未"} / C:${state.talked.C ? "済" : "未"}` },
    { label: "状態", value: state.gameClear ? "クリア！" : "探索中" },
  ];

  return (
    <main className="page">
      <section className="hero">
        <div>
          <h1>ミニ探索ゲーム</h1>
          <p>矢印 / WASD で移動、Enter / Space で調べる。隣接して会話・戦闘・宝箱。</p>
        </div>
        <button className="reset" onClick={() => dispatch({ type: "RESET" })}>
          リセット
        </button>
      </section>

      <section className="content">
        <div className="board">
          <Grid
            mapId={state.currentMap}
            playerPos={state.playerPos}
            hasWeapon={state.hasWeapon}
            enemyDefeated={state.enemyDefeated}
          />
        </div>

        <div className="sidebar">
          <div className="panel">
            <h3>状態</h3>
            <ul className="status">
              {statusItems.map((item) => (
                <li key={item.label}>
                  <span className="label">{item.label}</span>
                  <span className="value">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel log">
            <h3>メッセージ</h3>
            <div className="log-window">
              {state.log.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
          {state.gameClear && <div className="clear">おめでとう！宝箱を開けた。</div>}
        </div>
      </section>

      <style jsx>{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px;
          color: #0f1b2b;
        }
        .hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 14px;
          padding: 10px 12px;
          background: linear-gradient(90deg, #ffe66d, #ffd160);
          border: 2px solid #1f2a3b;
          box-shadow: 0 8px 0 #1f2a3b;
        }
        h1 {
          font-size: 26px;
          letter-spacing: 0.4px;
        }
        p {
          margin-top: 6px;
          color: #2f3c4c;
          font-size: 14px;
        }
        .content {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 14px;
        }
        .board {
          display: flex;
          justify-content: center;
          background: #dff3ff;
          border: 3px solid #1f2a3b;
          box-shadow: 0 10px 0 #1f2a3b, 0 18px 24px rgba(0, 0, 0, 0.18);
          padding: 10px;
        }
        .sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .panel {
          background: #f7fbff;
          border: 3px solid #1f2a3b;
          box-shadow: 0 8px 0 #1f2a3b;
          padding: 12px 14px;
        }
        .panel h3 {
          margin: 0;
          font-size: 16px;
          letter-spacing: 0.5px;
        }
        .status {
          list-style: none;
          padding: 0;
          margin: 8px 0 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
        }
        .status li {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #e4f0ff;
          padding: 6px 8px;
          border: 2px solid #9ab8de;
          box-shadow: inset 0 0 0 1px #ffffff;
        }
        .label {
          color: #304561;
          font-weight: 600;
        }
        .value {
          text-align: right;
        }
        .log {
          flex: 1;
        }
        .log-window {
          margin-top: 8px;
          background: linear-gradient(180deg, #0d1b2c, #0f2338);
          color: #ffffff;
          border: 2px solid #5fa2ff;
          box-shadow: inset 0 0 0 2px #0d1b2c, 0 6px 0 #1f2a3b;
          padding: 10px;
          height: 260px;
          overflow-y: auto;
          font-size: 13px;
          line-height: 1.4;
        }
        .log p {
          margin: 0 0 6px;
          color: #ffffff;
        }
        .reset {
          background: #1f2a3b;
          color: #ffe66d;
          border: 2px solid #0d1421;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 6px 0 #0d1421, inset 0 0 0 2px #ffe66d;
          transition: transform 0.05s ease;
        }
        .reset:hover {
          transform: translateY(1px);
        }
        .clear {
          padding: 10px;
          text-align: center;
          background: #fff9d9;
          border: 2px solid #f1d24a;
          box-shadow: 0 6px 0 #c6a200;
          font-weight: 700;
        }
        @media (max-width: 920px) {
          .content {
            grid-template-columns: 1fr;
          }
          .board {
            order: -1;
          }
        }
      `}</style>
    </main>
  );
};

export default Game;
