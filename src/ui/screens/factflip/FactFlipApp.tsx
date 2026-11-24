import { useState } from "react";
import { FactFlipSave } from "../../../game/systems/FactFlipSave";
import { FactFlipHome } from "./FactFlipHome";
import { FactFlipGameScreen, type FactFlipRunResult } from "./FactFlipGameScreen";
import { FactFlipResults } from "./FactFlipResults";

type Screen = "home" | "game" | "results";

const PENALTY_CYCLE = [0, 5, 10];

export function FactFlipApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(() => FactFlipSave.load());
  const [lastResult, setLastResult] = useState<FactFlipRunResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  function refreshSave() {
    setSave(FactFlipSave.load());
  }

  function startRun() {
    setRunKey((k) => k + 1);
    setScreen("game");
  }

  if (screen === "home") {
    return (
      <FactFlipHome
        best={save}
        onPlay={startRun}
        onExit={onExit}
        onToggleTimePenalty={() => {
          const idx = PENALTY_CYCLE.indexOf(save.wrongAnswerPenaltySeconds);
          const next = PENALTY_CYCLE[(idx + 1) % PENALTY_CYCLE.length] ?? 0;
          FactFlipSave.setWrongAnswerPenalty(next);
          refreshSave();
        }}
        onResetProgress={() => {
          FactFlipSave.reset();
          refreshSave();
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <FactFlipGameScreen
        key={runKey}
        wrongAnswerPenaltySeconds={save.wrongAnswerPenaltySeconds}
        onFinished={(result) => {
          setLastResult(result);
          refreshSave();
          setScreen("results");
        }}
        onExitToHome={() => setScreen("home")}
      />
    );
  }

  if (screen === "results" && lastResult) {
    return (
      <FactFlipResults
        score={lastResult.score}
        level={lastResult.level}
        stats={lastResult.stats}
        bestScore={Math.max(save.bestScore, lastResult.score)}
        isNewBest={lastResult.isNewBest}
        onReplay={startRun}
        onHome={() => setScreen("home")}
      />
    );
  }

  return null;
}
