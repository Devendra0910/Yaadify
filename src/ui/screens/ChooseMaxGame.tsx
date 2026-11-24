import { useEffect, useRef, useState } from "react";
import { generateRound, type ChooseMaxOption } from "../../game/systems/chooseMaxRound";
import { ChooseMaxSave } from "../../game/systems/ChooseMaxSave";
import { SoundManager } from "../../game/systems/SoundManager";

type Phase = "menu" | "playing" | "roundResult" | "gameOver";

const SESSION_SECONDS = 60; // 60-second cap on the whole run

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/**
 * No per-round timer and no lives — the only clock is the 60-second session
 * total. Answer correctly and the level (and the points it's worth) climbs;
 * answer wrong and it steps back down a level plus a flat -1, so the game
 * self-balances to your actual skill instead of ending in one bad streak.
 */
export function ChooseMaxGame({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>("menu");
  const [best, setBest] = useState(() => ChooseMaxSave.load());

  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<ChooseMaxOption[]>([]);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(SESSION_SECONDS);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [peakLevel, setPeakLevel] = useState(1);

  const advanceTimeout = useRef<number | null>(null);
  const sessionTimeRef = useRef(SESSION_SECONDS);

  function startRun() {
    setLevel(1);
    setPeakLevel(1);
    setScore(0);
    setOptions(generateRound(1));
    setPickedIndex(null);
    sessionTimeRef.current = SESSION_SECONDS;
    setSessionTimeLeft(SESSION_SECONDS);
    setLastResult(null);
    setPhase("playing");
  }

  function endRun(finalScore: number, finalPeakLevel: number) {
    const { isNewBestScore, isNewBestRound } = ChooseMaxSave.recordRun(finalPeakLevel, finalScore);
    setBest(ChooseMaxSave.load());
    setPhase("gameOver");
    if (isNewBestScore || isNewBestRound) SoundManager.checkoutSuccess();
    else SoundManager.timeUp();
  }

  function pick(index: number) {
    if (phase !== "playing") return;
    const maxValue = Math.max(...options.map((o) => o.value));
    const correct = options[index]!.value === maxValue;

    setPickedIndex(index);
    setLastResult(correct ? "correct" : "wrong");
    setPhase("roundResult");

    const nextLevel = correct ? level + 1 : Math.max(1, level - 1);
    const nextScore = correct ? score + level : Math.max(0, score - 1);
    setScore(nextScore);
    setLevel(nextLevel);
    setPeakLevel((p) => Math.max(p, nextLevel));
    if (correct) SoundManager.pickupCorrect();
    else SoundManager.pickupWrong();

    if (advanceTimeout.current) window.clearTimeout(advanceTimeout.current);
    advanceTimeout.current = window.setTimeout(() => {
      setOptions(generateRound(nextLevel));
      setPickedIndex(null);
      setLastResult(null);
      setPhase("playing");
    }, 500);
  }

  // The only clock in the game — runs continuously through both "playing"
  // and the brief "roundResult" pause, so a 3-minute run is a real 3
  // minutes regardless of how many rounds happen inside it.
  useEffect(() => {
    if (phase === "menu" || phase === "gameOver") return;
    const id = window.setInterval(() => {
      sessionTimeRef.current = Math.max(0, sessionTimeRef.current - 0.1);
      setSessionTimeLeft(sessionTimeRef.current);
      if (sessionTimeRef.current <= 0) {
        window.clearInterval(id);
        setScore((sc) => {
          setPeakLevel((p) => {
            endRun(sc, p);
            return p;
          });
          return sc;
        });
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (advanceTimeout.current) window.clearTimeout(advanceTimeout.current);
    };
  }, []);

  if (phase === "menu") {
    return (
      <div className="overlay overlay--opaque">
        <button className="btn btn--round btn--ghost" style={{ color: "white" }} onClick={onExit}>
          ←
        </button>
        <div className="menu-logo">
          <span className="emoji">🔢</span>
          <h1 className="title-xl">ChooseMax</h1>
          <p className="subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
            60 seconds. Tap the biggest value!
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div className="result-row-label">Best Level</div>
              <div className="title-md">{best.bestRound}</div>
            </div>
            <div>
              <div className="result-row-label">Best Score</div>
              <div className="title-md">{best.bestScore}</div>
            </div>
          </div>
        </div>
        <div className="menu-actions">
          <button className="btn btn--primary btn--block" onClick={startRun}>
            ▶ Play
          </button>
          <button
            className="btn btn--ghost btn--block"
            style={{ color: "white" }}
            onClick={() => {
              ChooseMaxSave.reset();
              setBest(ChooseMaxSave.load());
            }}
          >
            Reset Progress
          </button>
        </div>
      </div>
    );
  }

  if (phase === "gameOver") {
    return (
      <div className="overlay overlay--dim">
        <div className="card" style={{ width: "100%", maxWidth: 360, textAlign: "center" }}>
          <span style={{ fontSize: 40 }}>⏰</span>
          <h2 className="title-md">Time's Up!</h2>
          <div className="score-big">{score} pts</div>
          <p className="subtitle">Reached Level {peakLevel}</p>
          <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={startRun}>
            ▶ Play Again
          </button>
          <button className="btn btn--outline btn--block" style={{ marginTop: 10 }} onClick={onExit}>
            Menu
          </button>
        </div>
      </div>
    );
  }

  // playing / roundResult
  const maxValue = Math.max(...options.map((o) => o.value));
  return (
    <div className="overlay" style={{ background: "transparent" }}>
      <div className="hud-top">
        <div className={`hud-pill ${sessionTimeLeft <= 20 ? "hud-pill--warn" : ""}`}>⏳ {formatClock(sessionTimeLeft)}</div>
        <div className="hud-top-buttons">
          <button className="hud-icon-btn" onClick={onExit} aria-label="Exit">
            ✕
          </button>
        </div>
      </div>

      <div className="hud-run-row">
        <div className="hud-pill">Lvl {level}</div>
        <div className="hud-pill">⭐ {score}</div>
      </div>

      <div className="choosemax-grid">
        {options.map((opt, i) => {
          const isPicked = pickedIndex === i;
          const revealCorrect = phase === "roundResult" && opt.value === maxValue;
          const revealWrong = phase === "roundResult" && isPicked && opt.value !== maxValue;
          return (
            <button
              key={i}
              className={`choosemax-card ${revealCorrect ? "choosemax-card--correct" : ""} ${revealWrong ? "choosemax-card--wrong" : ""}`}
              disabled={phase !== "playing"}
              onClick={() => pick(i)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {phase === "roundResult" && (
        <div
          className={`hud-toast ${lastResult === "correct" ? "hud-toast--correct" : "hud-toast--wrong"}`}
          style={{ top: "auto", bottom: 90 }}
        >
          {lastResult === "correct" ? `✓ Correct! +${level - 1}` : `✗ Not the max! -1`}
        </div>
      )}
    </div>
  );
}
