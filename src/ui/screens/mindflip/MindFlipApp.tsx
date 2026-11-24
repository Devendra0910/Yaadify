import { useState } from "react";
import { MindFlipSave } from "../../../game/systems/MindFlipSave";
import { MindFlipHome } from "./MindFlipHome";
import { MindFlipTutorial } from "./MindFlipTutorial";
import { MindFlipGameScreen, type MindFlipRunResult } from "./MindFlipGameScreen";
import { MindFlipResults } from "./MindFlipResults";

type Screen = "home" | "tutorial" | "game" | "results";

export function MindFlipApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(() => MindFlipSave.load());
  const [lastResult, setLastResult] = useState<MindFlipRunResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  function refreshSave() {
    setSave(MindFlipSave.load());
  }

  function startRun() {
    setRunKey((k) => k + 1);
    setScreen("game");
  }

  if (screen === "home") {
    return (
      <MindFlipHome
        best={save}
        onPlay={startRun}
        onHowToPlay={() => setScreen("tutorial")}
        onExit={onExit}
        onToggleReduceMotion={() => {
          MindFlipSave.setReduceMotion(!save.reduceMotion);
          refreshSave();
        }}
        onResetProgress={() => {
          MindFlipSave.reset();
          refreshSave();
        }}
      />
    );
  }

  if (screen === "tutorial") {
    return <MindFlipTutorial onDone={() => setScreen("home")} />;
  }

  if (screen === "game") {
    return (
      <MindFlipGameScreen
        key={runKey}
        reduceMotion={save.reduceMotion}
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
      <MindFlipResults
        score={lastResult.score}
        stats={lastResult.stats}
        isNewBest={lastResult.isNewBest}
        onReplay={startRun}
        onHome={() => setScreen("home")}
      />
    );
  }

  return null;
}
