import { useState } from "react";
import { InvisibleCatchSave } from "../../../game/systems/InvisibleCatchSave";
import { InvisibleCatchHome } from "./InvisibleCatchHome";
import { InvisibleCatchGameScreen, type InvisibleCatchRunResult } from "./InvisibleCatchGameScreen";
import { InvisibleCatchResults } from "./InvisibleCatchResults";

type Screen = "home" | "game" | "results";

export function InvisibleCatchApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(() => InvisibleCatchSave.load());
  const [lastResult, setLastResult] = useState<InvisibleCatchRunResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  function refreshSave() {
    setSave(InvisibleCatchSave.load());
  }

  function startRun() {
    setRunKey((k) => k + 1);
    setScreen("game");
  }

  if (screen === "home") {
    return (
      <InvisibleCatchHome
        best={save}
        onPlay={startRun}
        onExit={onExit}
        onResetProgress={() => {
          InvisibleCatchSave.reset();
          refreshSave();
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <InvisibleCatchGameScreen
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
      <InvisibleCatchResults
        score={lastResult.score}
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
