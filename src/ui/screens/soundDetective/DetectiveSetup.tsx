import { useEffect, useState } from "react";
import type { RefObject } from "react";
import { MODES } from "../../../game/soundDetective/challenges";
import { SESSION_SECONDS } from "../../../game/soundDetective/session";
import { detectiveActiveScore } from "../../../game/soundDetective/save";
import type { DetectiveSave } from "../../../game/soundDetective/save";
import { Volume, Wave } from "./SoundControls";

type SetupProps = {
  settings: DetectiveSave;
  heading: RefObject<HTMLHeadingElement | null>;
  error: string;
  changeVolume: (volume: number) => void;
  onStart: () => void;
  onPractice: () => void;
};

export function DetectiveSetup({ settings, heading, error, changeVolume, onStart, onPractice }: SetupProps) {
  const [simulation, setSimulation] = useState("");
  const [activeScore, setActiveScore] = useState(() => detectiveActiveScore(settings));

  useEffect(() => {
    const refreshScore = () => setActiveScore(detectiveActiveScore(settings));
    const interval = window.setInterval(refreshScore, 15_000);
    window.addEventListener("focus", refreshScore);
    window.addEventListener("storage", refreshScore);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshScore);
      window.removeEventListener("storage", refreshScore);
    };
  }, [settings]);

  return (
    <>
      <div className="sd-hero">
        <div className="sd-hero-copy">
          <h1 ref={heading} tabIndex={-1}>Sound Detective</h1>
          <p>{MODES.identify.name}</p>
          <span className="sd-library-label">Synthesized demo audio</span>
        </div>
        <div className="sd-hero-art" aria-hidden="true"><div className="sd-ring sd-ring--outer" /><div className="sd-ring sd-ring--inner" /><Wave /></div>
        <div className="sd-hero-best"><span aria-hidden="true">★</span><div><small>Active score</small><strong>{activeScore} <small>pts</small></strong></div></div>
      </div>

      <div className="sd-setup-grid grid gap-5">
        <section className="sd-card sd-options">
          <h2>Set up your session</h2>
          <p className="sd-detail">A correct answer earns points equal to your level and moves you up. A wrong answer moves you down one level.</p>
          <p className="sd-detail">{SESSION_SECONDS} seconds. The clock starts when the first sound plays. You can finish early.</p>
          <Volume value={settings.volume} onChange={changeVolume} />
          {error && <p role="alert">{error}</p>}
          <button className="sd-text-button" onClick={onPractice}>Practice</button>
        </section>
      </div>
      <div className="sd-start">
        <button className="sd-primary w-full" onClick={onStart}>Start listening <span aria-hidden="true">→</span></button>
      </div>
      <footer className="sd-footer">Listening and memory practice · {settings.sessions} {settings.sessions === 1 ? "session" : "sessions"} completed</footer>
      {import.meta.env.DEV && new URLSearchParams(window.location.search).has("soundQA") && (
        <section className="sd-card">
          <button className="sd-secondary" onClick={async () => {
            const { simulateSessions } = await import("../../../game/soundDetective/simulate");
            const report = simulateSessions();
            setSimulation(`${report.passed}/${report.sessions} sessions passed · ${report.challenges} challenges · ${report.errors.length} errors. ${report.errors.slice(0, 5).join("\n")}`);
          }}>Simulate 1,000 sessions</button>
          {simulation && <p role="status" className="sd-simulation">{simulation}</p>}
        </section>
      )}
    </>
  );
}
