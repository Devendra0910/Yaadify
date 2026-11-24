import { useEffect, useRef } from "react";
import { useMindFlipRun, type MindFlipRunStats } from "../../../game/systems/useMindFlipRun";
import { PauseMenu } from "../PauseMenu";
import { GameHUD } from "./components/GameHUD";
import { QuestionCard } from "./components/QuestionCard";
import { ColorButtons } from "./components/ColorButtons";

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export interface MindFlipRunResult {
  score: number;
  stats: MindFlipRunStats;
  isNewBest: boolean;
}

export function MindFlipGameScreen({
  reduceMotion,
  onFinished,
  onExitToHome,
}: {
  reduceMotion: boolean;
  onFinished: (result: MindFlipRunResult) => void;
  onExitToHome: () => void;
}) {
  const engine = useMindFlipRun();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      engine.startRun();
    }
    // Intentionally runs once on mount — this screen is remounted fresh per run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (engine.phase === "gameOver") {
      onFinished({ score: engine.score, stats: engine.stats, isNewBest: engine.isNewBest });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.phase]);

  if (!engine.question) return null;

  return (
    <div className="overlay mf-game-overlay">
      <GameHUD
        modeName="Time Rush"
        score={engine.score}
        streak={engine.streak}
        timerLabel={formatClock(engine.sessionTimeLeft)}
        timerWarn={engine.sessionTimeLeft <= 10}
        onPause={engine.pause}
      />

      <div className="mf-play-area">
        <p className="mf-match-hint">Do they match?</p>
        <QuestionCard
          question={engine.question}
          feedback={engine.lastResult}
          feedbackKey={engine.stats.attempted}
          reduceMotion={reduceMotion}
        />
      </div>

      <ColorButtons onPick={engine.answer} disabled={engine.phase !== "playing"} />

      {engine.phase === "paused" && (
        <PauseMenu
          onResume={engine.resume}
          onRestart={() => {
            engine.resume();
            engine.startRun();
          }}
          onQuit={onExitToHome}
        />
      )}
    </div>
  );
}
