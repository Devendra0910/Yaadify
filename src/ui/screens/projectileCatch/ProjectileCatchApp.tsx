import { useState } from "react";
import { ProjectileCatchSave } from "../../../game/systems/ProjectileCatchSave";
import { ProjectileCatchHome } from "./ProjectileCatchHome";
import { ProjectileCatchGameScreen, type ProjectileCatchRunResult } from "./ProjectileCatchGameScreen";
import { ProjectileCatchResults } from "./ProjectileCatchResults";

type Screen = "home" | "game" | "results";

export function ProjectileCatchApp({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [save, setSave] = useState(() => ProjectileCatchSave.load());
  const [lastResult, setLastResult] = useState<ProjectileCatchRunResult | null>(null);
  const [runKey, setRunKey] = useState(0);

  function refreshSave() {
    setSave(ProjectileCatchSave.load());
  }

  function startRun() {
    setRunKey((k) => k + 1);
    setScreen("game");
  }

  if (screen === "home") {
    return (
      <ProjectileCatchHome
        best={save}
        onPlay={startRun}
        onExit={onExit}
        onResetProgress={() => {
          ProjectileCatchSave.reset();
          refreshSave();
        }}
      />
    );
  }

  if (screen === "game") {
    return (
      <ProjectileCatchGameScreen
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
      <ProjectileCatchResults
        stats={lastResult.stats}
        bestScore={Math.max(save.bestScore, lastResult.stats.streak)}
        isNewBest={lastResult.isNewBest}
        onReplay={startRun}
        onHome={() => setScreen("home")}
      />
    );
  }

  return null;
}
