import { useCallback, useEffect, useRef, useState } from "react";
import {
  createGameState,
  resolveDifficulty,
  setLane,
  step,
  type FailReason,
  type GameState,
  type RoadId,
  type Tier,
} from "../../../game/dualDrive/engine";
import { DualDriveSave } from "../../../game/dualDrive/save";
import type { DualDriveSaveData } from "../../../game/dualDrive/save";
import { SoundManager } from "../../../game/systems/SoundManager";
import "./dualDrive.css";

type Screen = "setup" | "countdown" | "playing" | "paused" | "gameOver";

const TIERS: { id: Tier; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Slow start, plenty of room" },
  { id: "medium", label: "Medium", hint: "Both roads need attention" },
  { id: "hard", label: "Hard", hint: "Fast, frequent switches" },
];

const CAR_COLORS: Record<RoadId, string> = { red: "#e5533d", blue: "#2e7fd9" };
const MAX_DT_MS = 50;
const LANE_EASE = 0.28;

function failMessage(reason: FailReason | null): string {
  switch (reason) {
    case "red-collision": return "The red car hit a square.";
    case "blue-collision": return "The blue car hit a square.";
    case "red-missed": return "The red car missed a circle.";
    case "blue-missed": return "The blue car missed a circle.";
    default: return "";
  }
}

export function DualDriveApp({ onExit }: { onExit: () => void }) {
  const [settings, setSettings] = useState<DualDriveSaveData>(DualDriveSave.load);
  const [screen, setScreen] = useState<Screen>("setup");
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState<{ score: number; survivalMs: number; best: number; isNewBest: boolean; reason: FailReason | null }>(
    { score: 0, survivalMs: 0, best: settings.bestScore, isNewBest: false, reason: null },
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const visualLaneRef = useRef<{ red: number; blue: number }>({ red: 0, blue: 0 });
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const screenRef = useRef<Screen>("setup");
  screenRef.current = screen;

  const vibrate = useCallback((pattern: number | number[]) => {
    if (settings.vibrationOn && navigator.vibrate) navigator.vibrate(pattern);
  }, [settings.vibrationOn]);

  const toggle = useCallback((road: RoadId) => {
    const state = stateRef.current;
    if (!state || screenRef.current !== "playing") return;
    const nextLane = state[road].car.lane === 0 ? 1 : 0;
    setLane(state, road, nextLane);
  }, []);

  // ---------- input handling ----------

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    toggle(x < rect.width / 2 ? "red" : "blue");
  }, [toggle]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      if (key === "a") toggle("red");
      else if (key === "l") toggle("blue");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  // ---------- rendering ----------

  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const state = stateRef.current;
    if (!state) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#0e3a20";
    ctx.fillRect(0, 0, width, height);

    const laneW = width / 4;
    const carY = height - Math.max(96, height * 0.14);
    const trackTop = -40;

    // lane dividers
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.setLineDash(i === 2 ? [] : [10, 10]);
      ctx.lineWidth = i === 2 ? 4 : 2;
      ctx.strokeStyle = i === 2 ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.14)";
      ctx.moveTo(i * laneW, 0);
      ctx.lineTo(i * laneW, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const laneCenterX = (road: RoadId, lane: 0 | 1) => {
      const base = road === "red" ? 0 : 2;
      return (base + lane + 0.5) * laneW;
    };

    for (const road of ["red", "blue"] as const) {
      const roadState = state[road];
      for (const event of roadState.events) {
        const objY = carY - (event.hitTime - state.now) * event.speed;
        if (objY < trackTop - 40 || objY > height + 40) continue;
        for (const lane of [0, 1] as const) {
          const shape = lane === 0 ? event.lane0 : event.lane1;
          if (!shape) continue;
          const cx = laneCenterX(road, lane);
          if (shape === "circle") {
            ctx.beginPath();
            ctx.fillStyle = "#f2a93a";
            ctx.arc(cx, objY, laneW * 0.22, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            const s = laneW * 0.38;
            ctx.fillStyle = "#c23b3b";
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 2;
            const rx = cx - s / 2;
            const ry = objY - s / 2;
            const r = 6;
            ctx.beginPath();
            ctx.moveTo(rx + r, ry);
            ctx.arcTo(rx + s, ry, rx + s, ry + s, r);
            ctx.arcTo(rx + s, ry + s, rx, ry + s, r);
            ctx.arcTo(rx, ry + s, rx, ry, r);
            ctx.arcTo(rx, ry, rx + s, ry, r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        }
      }

      // car
      const targetLane = roadState.car.lane;
      const visual = visualLaneRef.current[road];
      visualLaneRef.current[road] += (targetLane - visual) * LANE_EASE;
      const carX = laneCenterX(road, 0) + (laneCenterX(road, 1) - laneCenterX(road, 0)) * visualLaneRef.current[road];
      const carW = laneW * 0.52;
      const carH = carW * 1.5;
      ctx.fillStyle = CAR_COLORS[road];
      const cx0 = carX - carW / 2;
      const cy0 = carY - carH / 2;
      const r = 10;
      ctx.beginPath();
      ctx.moveTo(cx0 + r, cy0);
      ctx.arcTo(cx0 + carW, cy0, cx0 + carW, cy0 + carH, r);
      ctx.arcTo(cx0 + carW, cy0 + carH, cx0, cy0 + carH, r);
      ctx.arcTo(cx0, cy0 + carH, cx0, cy0, r);
      ctx.arcTo(cx0, cy0, cx0 + carW, cy0, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(cx0 + carW * 0.18, cy0 + carH * 0.18, carW * 0.64, carH * 0.22);
    }

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "700 26px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(state.score), width / 2, 46);
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("A", laneW, height - 14);
    ctx.fillText("L", laneW * 3, height - 14);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // ---------- game loop ----------

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const finishRun = useCallback(() => {
    const state = stateRef.current;
    if (!state) return;
    stopLoop();
    vibrate([40, 60, 40]);
    const saved = DualDriveSave.recordRun(state.score, state.now);
    setSettings(DualDriveSave.load());
    setResult({ score: state.score, survivalMs: state.now, best: Math.max(saved.isNewBest ? state.score : settings.bestScore, state.score), isNewBest: saved.isNewBest, reason: state.failReason });
    setScreen("gameOver");
  }, [settings.bestScore, stopLoop, vibrate]);

  const loop = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    const state = stateRef.current;
    if (!canvas || !state) return;
    const dt = lastFrameRef.current === 0 ? 16 : Math.min(MAX_DT_MS, timestamp - lastFrameRef.current);
    lastFrameRef.current = timestamp;
    const prevScore = state.score;
    step(state, dt);
    if (state.score > prevScore) {
      if (settings.soundOn) SoundManager.pickupCorrect();
      vibrate(12);
    }
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (ctx) render(ctx, canvas.width / dpr, canvas.height / dpr);
    if (state.gameOver) {
      if (settings.soundOn) SoundManager.pickupWrong();
      finishRun();
      return;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [finishRun, render, settings.soundOn, vibrate]);

  const startLoop = useCallback(() => {
    lastFrameRef.current = 0;
    stopLoop();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop, stopLoop]);

  const begin = useCallback(() => {
    stateRef.current = createGameState(settings.startTier);
    visualLaneRef.current = { red: 0, blue: 0 };
    let n = 3;
    setCountdown(n);
    setScreen("countdown");
    if (settings.soundOn) SoundManager.countdownTick();
    const tick = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(tick);
        setScreen("playing");
        requestAnimationFrame(() => {
          resizeCanvas();
          requestAnimationFrame(startLoop);
        });
        return;
      }
      setCountdown(n);
      if (settings.soundOn) SoundManager.countdownTick();
    }, 700);
  }, [resizeCanvas, settings.soundOn, settings.startTier, startLoop]);

  const pause = useCallback(() => {
    if (screenRef.current !== "playing") return;
    stopLoop();
    setScreen("paused");
  }, [stopLoop]);

  const resume = useCallback(() => {
    if (screenRef.current !== "paused") return;
    setScreen("playing");
    startLoop();
  }, [startLoop]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && screenRef.current === "playing") pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pause]);

  useEffect(() => stopLoop, [stopLoop]);

  function selectTier(tier: Tier) {
    DualDriveSave.setStartTier(tier);
    setSettings((prev) => ({ ...prev, startTier: tier }));
  }

  function dismissTutorial() {
    DualDriveSave.setTutorialSeen();
    setSettings((prev) => ({ ...prev, tutorialSeen: true }));
    begin();
  }

  return (
    <div className="dd-root">
      {screen === "setup" && (
        <div className="overlay overlay--opaque">
          <button className="btn btn--round btn--ghost" style={{ color: "white" }} onClick={onExit} aria-label="Back to hub">←</button>
          <div className="menu-logo">
            <span className="emoji">🏎️</span>
            <h1 className="title-xl">Dual Drive</h1>
            <p className="subtitle" style={{ color: "rgba(255,255,255,0.85)" }}>Steer two cars at once. Collect every circle, dodge every square.</p>
          </div>
          <div className="card" style={{ margin: "16px auto 0", maxWidth: 340, width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div className="result-row-label">Best Score</div>
                <div className="title-md">{settings.bestScore}</div>
              </div>
            </div>
            <div className="dd-tier-grid">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  className={`dd-tier-btn ${settings.startTier === tier.id ? "dd-tier-btn--active" : ""}`}
                  onClick={() => selectTier(tier.id)}
                >
                  <strong>{tier.label}</strong>
                  <span>{tier.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="menu-actions">
            <button className="btn btn--primary btn--block" onClick={begin}>
              ▶ Play
            </button>
          </div>
        </div>
      )}

      {screen === "setup" && !settings.tutorialSeen && (
        <div className="overlay overlay--dim">
          <div className="card dd-tutorial-card">
            <h2 className="title-md">How to play</h2>
            <p>Tap the <strong>left</strong> half of the screen to switch the <strong style={{ color: CAR_COLORS.red }}>red</strong> car's lane.</p>
            <p>Tap the <strong>right</strong> half to switch the <strong style={{ color: CAR_COLORS.blue }}>blue</strong> car's lane.</p>
            <p>On desktop: <strong>A</strong> switches red, <strong>L</strong> switches blue.</p>
            <p>Collect every circle. Avoid every square. One mistake ends the run.</p>
            <button className="btn btn--primary btn--block" onClick={dismissTutorial}>Got it, let's go</button>
          </div>
        </div>
      )}

      {screen === "countdown" && (
        <div className="overlay overlay--opaque overlay--center">
          <div className="dd-countdown">{countdown > 0 ? countdown : "GO"}</div>
        </div>
      )}

      {(screen === "playing" || screen === "paused") && (
        <div className="dd-game-screen">
          <canvas ref={canvasRef} className="dd-canvas" onPointerDown={onPointerDown} />
          <button className="btn btn--round btn--ghost dd-pause-btn" onClick={pause} aria-label="Pause">⏸</button>
          {screen === "paused" && (
            <div className="overlay overlay--dim">
              <div className="card dd-pause-card">
                <h2 className="title-md">Paused</h2>
                <button className="btn btn--primary btn--block" onClick={resume}>▶ Resume</button>
                <button className="btn btn--outline btn--block" onClick={onExit}>Exit to Hub</button>
              </div>
            </div>
          )}
        </div>
      )}

      {screen === "gameOver" && (
        <div className="overlay overlay--opaque overlay--center">
          <div className="card dd-results">
            <h1 className="title-md">{result.isNewBest ? "New personal best!" : "Run over"}</h1>
            <p className="dd-fail-reason">{failMessage(result.reason)}</p>
            <div className="dd-stats-grid">
              <div><small>Score</small><strong>{result.score}</strong></div>
              <div><small>Best</small><strong>{Math.max(result.best, settings.bestScore)}</strong></div>
              <div><small>Survived</small><strong>{(result.survivalMs / 1000).toFixed(1)}s</strong></div>
            </div>
            <button className="btn btn--primary btn--block" onClick={begin}>↻ Play again</button>
            <button className="btn btn--outline btn--block" onClick={() => setScreen("setup")}>Change difficulty</button>
            <button className="btn btn--outline btn--block" onClick={onExit}>Exit to Hub</button>
          </div>
        </div>
      )}
    </div>
  );
}
