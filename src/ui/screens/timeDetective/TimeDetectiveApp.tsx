import { useState } from "react";
import { TimeDetectiveSave } from "../../../game/systems/TimeDetectiveSave";
import { TimeDetectiveHome } from "./TimeDetectiveHome";
import { TimeDetectiveGameScreen, type TimeDetectiveRunResult } from "./TimeDetectiveGameScreen";
import { TimeDetectiveResults } from "./TimeDetectiveResults";

type Screen = "home" | "game" | "results";

export function TimeDetectiveApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(() => TimeDetectiveSave.load());
  const [lastResult, setLastResult] = useState<TimeDetectiveRunResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  function refreshSave() {
    setSave(TimeDetectiveSave.load());
  }

  function startRun() {
    setRunKey((k) => k + 1);
    setScreen("game");
  }

  if (screen === "home") {
    return (
      <TimeDetectiveHome
        best={save}
        onPlay={startRun}
        onExit={onExit}
        onResetProgress={() => {
          TimeDetectiveSave.reset();
          refreshSave();
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <TimeDetectiveGameScreen
        key={runKey}
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
      <TimeDetectiveResults
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
