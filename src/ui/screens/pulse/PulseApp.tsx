import { useState } from "react";
import { PulseSave } from "../../../game/systems/PulseSave";
import { PulseHome } from "./PulseHome";
import { PulseGameScreen, type PulseRunResult } from "./PulseGameScreen";
import { PulseResults } from "./PulseResults";

type Screen = "home" | "game" | "results";

export function PulseApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(() => PulseSave.load());
  const [lastResult, setLastResult] = useState<PulseRunResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  function refreshSave() {
    setSave(PulseSave.load());
  }

  function startRun() {
    setRunKey((k) => k + 1);
    setScreen("game");
  }

  if (screen === "home") {
    return (
      <PulseHome
        best={save}
        onPlay={startRun}
        onExit={onExit}
        onResetProgress={() => {
          PulseSave.reset();
          refreshSave();
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <PulseGameScreen
        key={runKey}
        onFinished={(result) => {
          setLastResult(result);
          refreshSave();
          setScreen("results");
        }}
      />
    );
  }

  if (screen === "results" && lastResult) {
    return (
      <PulseResults
        totalScore={lastResult.totalScore}
        stats={lastResult.stats}
        bestScore={Math.max(save.bestScore, lastResult.totalScore)}
        isNewBest={lastResult.isNewBest}
        onReplay={startRun}
        onHome={() => setScreen("home")}
      />
    );
  }

  return null;
}
