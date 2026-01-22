"use client";

import { useEffect, useReducer, useState } from "react";
import { createInitialState, reducer } from "../game/reducer";
import { Action } from "../game/types";
import { AiPlanStep } from "../game/ai";
import { TokenUsage, USD_TO_JPY } from "../game/cost";
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

type Mode = "manual" | "ai";

const emptyUsage: TokenUsage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };

const describeAction = (action: Exclude<Action, { type: "RESET" }>) => {
  if (action.type === "INTERACT") return "調べる（INTERACT）";
  const dir =
    action.dx === 1
      ? "右へ1"
      : action.dx === -1
        ? "左へ1"
        : action.dy === -1
          ? "上へ1"
          : action.dy === 1
            ? "下へ1"
            : "その場";
  return `MOVE: ${dir}`;
};

const Game = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [mode, setMode] = useState<Mode>("manual");
  const [aiPlan, setAiPlan] = useState<AiPlanStep[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDebug, setAiDebug] = useState<{
    request?: any;
    responseRaw?: string;
    response?: any;
    errorDetail?: any;
  } | null>(null);
  const [usageLast, setUsageLast] = useState<TokenUsage>(emptyUsage);
  const [usageTotal, setUsageTotal] = useState<TokenUsage>(emptyUsage);
  const [callCount, setCallCount] = useState(0);
  const [costLast, setCostLast] = useState(0);
  const [costTotal, setCostTotal] = useState(0);
  const [planUsage, setPlanUsage] = useState<TokenUsage>(emptyUsage);
  const [planCost, setPlanCost] = useState(0);

  const formatJpy = (usd: number) => (usd * USD_TO_JPY).toFixed(2);

  useKeyboard(dispatch, state.gameClear || mode === "ai");

  const statusItems = [
    { label: "現在地", value: mapLabels[state.currentMap] ?? state.currentMap },
    { label: "武器", value: state.hasWeapon ? "所持" : "なし" },
    { label: "外Aの敵", value: state.enemyDefeated ? "撃破済み" : "未撃破" },
    { label: "NPC会話", value: `A:${state.talked.A ? "済" : "未"} / B:${state.talked.B ? "済" : "未"} / C:${state.talked.C ? "済" : "未"}` },
    { label: "状態", value: state.gameClear ? "クリア！" : "探索中" },
  ];

  const addUsage = (usage: TokenUsage, costUsd: number) => {
    setUsageLast(usage);
    setCostLast(costUsd);
    setUsageTotal((prev) => ({
      inputTokens: prev.inputTokens + (usage.inputTokens ?? 0),
      outputTokens: prev.outputTokens + (usage.outputTokens ?? 0),
      cachedInputTokens: (prev.cachedInputTokens ?? 0) + (usage.cachedInputTokens ?? 0),
    }));
    setCostTotal((prev) => prev + costUsd);
    setCallCount((prev) => prev + 1);
  };

  const requestProposal = async () => {
    if (state.gameClear || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiPlan(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiDebug({
          request: data?.debug_request,
          responseRaw: data?.debug_response_raw ?? data?.detail,
          response: data?.debug_response ?? data,
          errorDetail: data?.detail,
        });
        throw new Error(data?.error ?? "AI提案の取得に失敗しました。");
      }
      const usage: TokenUsage = {
        inputTokens: data.usage?.inputTokens ?? data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.outputTokens ?? data.usage?.output_tokens ?? 0,
        cachedInputTokens:
          data.usage?.cachedInputTokens ?? data.usage?.cached_input_tokens ?? 0,
      };
      const costUsd = data.cost_usd ?? 0;
      const plan = Array.isArray(data.proposed_plan) ? (data.proposed_plan as AiPlanStep[]) : [];
      if (!plan.length) {
        setAiDebug({
          request: data.debug_request,
          responseRaw: data.debug_response_raw ?? data.detail,
          response: data.debug_response ?? data,
        });
        throw new Error("AI提案（プラン）の取得に失敗しました。");
      }
      setAiPlan(plan);
      setPlanUsage(usage);
      setPlanCost(costUsd);
      addUsage(usage, costUsd);
      setAiDebug({
        request: data.debug_request,
        responseRaw: data.debug_response_raw,
        response: data.debug_response ?? data,
      });
    } catch (e: any) {
      const msg = e?.message ?? "AI提案の取得に失敗しました。";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const executeProposal = () => {
    if (!aiPlan || aiPlan.length === 0) return;
    const [next, ...rest] = aiPlan;
    dispatch(next);
    setAiPlan(rest.length ? rest : null);
  };

  const rejectProposal = () => {
    setAiPlan(null);
    setAiError(null);
  };

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

        <div className="sidebar left">
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
          <div className="panel">
            <h3>モード</h3>
            <div className="modes">
              <label>
                <input
                  type="radio"
                  name="mode"
                  value="manual"
                  checked={mode === "manual"}
                  onChange={() => setMode("manual")}
                />
                手動
              </label>
              <label>
                <input
                  type="radio"
                  name="mode"
                  value="ai"
                  checked={mode === "ai"}
                  onChange={() => setMode("ai")}
                />
                AI提案（承認実行）
              </label>
            </div>
            {mode === "ai" && (
              <p className="note">提案→承認で1手進む。キー操作は無効化されています。</p>
            )}
          </div>
          <div className="panel log">
            <h3>メッセージ</h3>
            <div className="log-window">
              {state.log.map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar right">
          <div className="panel ai">
            <h3>AI提案</h3>
            <div className="ai-actions">
              <button
                onClick={requestProposal}
                disabled={aiLoading || state.gameClear || mode !== "ai"}
                className="primary"
              >
                {aiLoading ? "提案中..." : "AIに提案させる"}
              </button>
              <button
                onClick={executeProposal}
                disabled={!aiPlan || aiPlan.length === 0 || state.gameClear || mode !== "ai"}
              >
                実行（承認）次の1手
              </button>
              <button onClick={rejectProposal} disabled={!aiPlan || mode !== "ai"}>
                却下
              </button>
            </div>
            {aiError && <p className="error">{aiError}</p>}
            {aiPlan && aiPlan.length > 0 ? (
              <div className="proposal">
                <p className="action">次の一手: {describeAction(aiPlan[0])}</p>
                <p className="reason">理由: {aiPlan[0].reason}</p>
                <p className="cost">
                  プラン取得コスト: ${planCost.toFixed(6)}（¥{formatJpy(planCost)})
                </p>
                <div className="plan-list">
                  <p className="debug-title">残りプラン（先頭から実行）</p>
                  <ol>
                    {aiPlan.map((step, idx) => (
                      <li key={idx}>
                        <span className="action">{describeAction(step)}</span>
                        <span className="reason"> / {step.reason}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ) : (
              <p className="muted">未提案です。「AIに提案させる」を押してください。</p>
            )}
            {aiDebug && (
              <div className="debug">
                <p className="debug-title">デバッグ: 送信ペイロード</p>
                <pre>{JSON.stringify(aiDebug.request, null, 2)}</pre>
                <p className="debug-title">デバッグ: 生レスポンス</p>
                <pre>{aiDebug.responseRaw ?? "(なし)"}</pre>
                <p className="debug-title">デバッグ: レスポンスオブジェクト</p>
                <pre>{JSON.stringify(aiDebug.response, null, 2)}</pre>
              </div>
            )}
          </div>
          <div className="panel cost">
            <h3>AIコスト</h3>
            <div className="cost-block">
              <p>最終リクエスト: in {usageLast.inputTokens} / out {usageLast.outputTokens} / cached {usageLast.cachedInputTokens ?? 0}</p>
              <p>
                最終コスト: ${costLast.toFixed(6)}（¥{formatJpy(costLast)}）
              </p>
            </div>
            <div className="cost-block">
              <p>累積: in {usageTotal.inputTokens} / out {usageTotal.outputTokens} / cached {usageTotal.cachedInputTokens ?? 0}</p>
              <p>
                累積コスト: ${costTotal.toFixed(6)}（¥{formatJpy(costTotal)} / {callCount}回呼び出し）
              </p>
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
          grid-template-columns: 1.2fr 0.9fr 0.9fr;
          gap: 12px;
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
        .sidebar.right .panel.ai {
          flex: 1;
          display: flex;
          flex-direction: column;
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
        .modes {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 8px;
        }
        .modes label {
          display: flex;
          gap: 6px;
          align-items: center;
          font-size: 13px;
        }
        .note {
          margin-top: 6px;
          font-size: 12px;
          color: #2f3c4c;
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
        .ai-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin: 8px 0;
        }
        .ai-actions button {
          padding: 6px;
          font-size: 13px;
        }
        .ai-actions .primary {
          background: #1f2a3b;
          color: #ffe66d;
          border: 2px solid #0d1421;
        }
        .proposal {
          background: #0d1b2c;
          color: #ffffff;
          border: 1px solid #5fa2ff;
          padding: 8px;
          font-size: 13px;
        }
        .proposal .action {
          font-weight: 700;
          color: #ffffff;
        }
        .proposal .reason {
          color: #ffffff;
        }
        .proposal .cost {
          margin-top: 4px;
          color: #ffd160;
        }
        .muted {
          font-size: 12px;
          color: #546070;
        }
        .debug {
          margin-top: 10px;
          background: #0b1624;
          color: #e7f4ff;
          border: 1px solid #5fa2ff;
          padding: 8px;
          font-size: 12px;
          max-height: 220px;
          overflow: auto;
          white-space: pre-wrap;
        }
        .debug pre {
          margin: 4px 0 8px;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .debug-title {
          margin: 6px 0 2px;
          font-weight: 700;
          font-size: 12px;
          color: #ffd160;
        }
        .error {
          color: #ff6b6b;
          font-size: 12px;
        }
        .cost-block {
          background: #e4f0ff;
          padding: 6px;
          margin: 6px 0;
          border: 1px solid #9ab8de;
          font-size: 12px;
        }
        @media (max-width: 1100px) {
          .content {
            grid-template-columns: 1fr;
          }
          .board {
            order: -1;
          }
          .sidebar.right .panel.ai {
            min-height: unset;
          }
        }
      `}</style>
    </main>
  );
};

export default Game;
