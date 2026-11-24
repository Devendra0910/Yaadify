import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { DetectiveAudio } from "../../../game/soundDetective/audio";
import { isCorrect, makeIdentifyChallenge, MODES, validChallenge } from "../../../game/soundDetective/challenges";
import type { Challenge } from "../../../game/soundDetective/challenges";
import { loadDetective, recordDetective, saveDetective } from "../../../game/soundDetective/save";
import type { DetectiveSave } from "../../../game/soundDetective/save";
import { EMPTY_STATS, isComplete, SESSION_SECONDS, resultSummary, scoreAnswer, secondsLeft, sessionDeadline } from "../../../game/soundDetective/session";
import type { Stats } from "../../../game/soundDetective/session";
import type { SoundId } from "../../../game/soundDetective/soundPack";
import { DetectiveSetup } from "./DetectiveSetup";
import { Volume, Wave } from "./SoundControls";
import "./tailwind.css";
import "./soundDetective.css";

type Screen = "setup" | "practice" | "play" | "results";
type Playback = "ready" | "loading" | "playing" | "heard" | "failed";
export function SoundDetectiveApp({ onExit }: { onExit?: () => void }) {
  const [settings, setSettings] = useState(loadDetective);
  const [screen, setScreen] = useState<Screen>("setup");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [playback, setPlayback] = useState<Playback>("ready");
  const [hasHeard, setHasHeard] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [result, setResult] = useState({ best: 0, newBest: false });
  const [error, setError] = useState("");
  const [audio] = useState(() => new DetectiveAudio(`${import.meta.env.BASE_URL}audio/sound-detective/`));
  const recent = useRef<SoundId[]>([]);
  const deadline = useRef<number | null>(null);
  const finished = useRef(false);
  const revision = useRef(0);
  const playbackBusy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const scrollArea = useRef<HTMLElement>(null);
  const playing = screen === "play";
  const mode = MODES.identify;

  useEffect(() => () => {
    revision.current++;
    audio.dispose();
  }, [audio]);

  useEffect(() => {
    if (scrollArea.current) scrollArea.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [screen, challenge]);

  function update(patch: Partial<DetectiveSave>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveDetective(next);
  }

  function changeVolume(volume: number) {
    audio.setVolume(volume);
    update({ volume });
  }

  function cancelPlayback() {
    revision.current++;
    playbackBusy.current = false;
    audio.stop();
  }

  const interruptWhenHidden = useEffectEvent(() => {
    if (document.hidden && playbackBusy.current) {
      cancelPlayback();
      setPlayback(hasHeard ? "heard" : "ready");
    }
  });

  useEffect(() => {
    document.addEventListener("visibilitychange", interruptWhenHidden);
    return () => document.removeEventListener("visibilitychange", interruptWhenHidden);
  }, []);

  function newQuestion(nextStats: Stats, practice = false) {
    cancelPlayback();
    const next = makeIdentifyChallenge(practice ? 1 : nextStats.level, recent.current);
    setSelectedId(null);
    setFeedback(null);
    setPlayback("ready");
    setHasHeard(false);
    if (!validChallenge(next)) {
      setChallenge(null);
      setError("This challenge could not be prepared. Please try again.");
      setScreen("setup");
      return;
    }
    setChallenge(next);
    setError("");
    audio.preload(next.clips.flat());
    if (!practice) {
      recent.current = [...recent.current, ...new Set(next.clips.flat())].slice(-8);
    }
  }

  function begin(practice = false) {
    audio.setVolume(settings.volume);
    void audio.prepare().then(() => audio.preload()).catch(() => {});
    setStats(EMPTY_STATS);
    setRemaining(SESSION_SECONDS);
    deadline.current = null;
    finished.current = false;
    recent.current = [];
    setScreen(practice ? "practice" : "play");
    newQuestion(EMPTY_STATS, practice);
  }

  function finish(finalStats: Stats) {
    if (finished.current) return;
    finished.current = true;
    cancelPlayback();
    const saved = recordDetective(settings, finalStats);
    setSettings(saved.updated);
    setResult({ best: saved.best, newBest: saved.newBest });
    setScreen("results");
  }

  const tick = useEffectEvent(() => {
    const now = performance.now();
    const seconds = secondsLeft(deadline.current, now);
    setRemaining(seconds);
    if (seconds === 0) finish(stats);
  });

  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(tick, 125);
    return () => window.clearInterval(interval);
  }, [playing]);

  function completed() {
    return isComplete(deadline.current, performance.now());
  }

  async function listen() {
    if (!challenge || playbackBusy.current || finished.current) return;
    if (playing && completed()) {
      finish(stats);
      return;
    }
    playbackBusy.current = true;
    const request = ++revision.current;
    setPlayback("loading");
    try {
      const heard = await audio.play(challenge, () => {
        if (request !== revision.current) return;
        if (playing && deadline.current === null) deadline.current = sessionDeadline(performance.now());
        setPlayback("playing");
      });
      if (request !== revision.current || !heard) return;
      setHasHeard(true);
      setPlayback("heard");
    } catch {
      if (request === revision.current) setPlayback("failed");
    } finally {
      if (request === revision.current) playbackBusy.current = false;
    }
  }

  function choose(id: string) {
    if (!challenge || !hasHeard || playbackBusy.current || feedback !== null || finished.current) return;
    if (playing && completed()) {
      finish(stats);
      return;
    }
    const correct = isCorrect(challenge, [id]);
    setSelectedId(id);
    setFeedback(correct);
    if (screen === "play") setStats(scoreAnswer(stats, correct));
  }

  function skip() {
    if (screen === "practice") {
      startAfterPractice();
      return;
    }
    const next = { ...stats, skipped: stats.skipped + 1, streak: 0 };
    setStats(next);
    if (completed()) finish(next);
    else newQuestion(next);
  }

  function advance() {
    if (completed()) finish(stats);
    else newQuestion(stats);
  }

  function startAfterPractice() {
    update({ tutorials: { ...settings.tutorials, identify: true } });
    begin();
  }

  function goSetup() {
    cancelPlayback();
    setScreen("setup");
  }

  const handleBack = useEffectEvent(() => {
    if (screen !== "setup") goSetup();
    else if (Capacitor.isNativePlatform()) void CapacitorApp.exitApp();
  });

  useEffect(() => {
    if (onExit) return;
    const keyboardBack = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleBack();
    };
    window.addEventListener("keydown", keyboardBack);
    const nativeBack = Capacitor.isNativePlatform()
      ? CapacitorApp.addListener("backButton", () => handleBack())
      : null;
    return () => {
      window.removeEventListener("keydown", keyboardBack);
      void nativeBack?.then((listener) => listener.remove());
    };
  }, [onExit]);

  const summary = resultSummary(stats);
  const ready = hasHeard && playback !== "playing" && playback !== "loading";
  const answerLabel = challenge?.choices.find((choice) => choice.id === challenge.solution[0])?.label;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <main ref={scrollArea} className="sd-screen" aria-label="Sound Detective">
      <div className="sd-wrap">
        <header className="sd-header flex items-center justify-between gap-3">
          {screen === "setup" && !onExit ? (
            <div className="sd-brand"><span aria-hidden="true">◉</span> Yaadify</div>
          ) : (
            <>
              <button className="sd-back" onClick={screen === "setup" ? onExit : goSetup}>
                <span aria-hidden="true">←</span> {screen === "setup" ? "Yaadify" : "Setup"}
              </button>
              <div className="sd-brand"><span aria-hidden="true">◉</span> Sound Detective</div>
            </>
          )}
        </header>

        {screen === "setup" && (
          <DetectiveSetup settings={settings} heading={heading} error={error}
            changeVolume={changeVolume} onStart={() => begin(!settings.tutorials.identify)}
            onPractice={() => begin(true)} />
        )}

        {(screen === "practice" || screen === "play") && challenge && (
          <div className="sd-round">
            <div className="sd-round-top flex items-center justify-between gap-3">
              <div><span className="sd-kicker">{screen === "practice" ? "Practice" : `Challenge ${stats.attempted + stats.skipped + (feedback === null ? 1 : 0)}`}</span><h1 ref={heading} tabIndex={-1}>{mode.name}</h1></div>
              {playing && <span className="sd-timer" aria-label={`${minutes} minutes and ${seconds} seconds left`}>{minutes}:{String(seconds).padStart(2, "0")}</span>}
            </div>
            {screen === "play" && (
              <div className="sd-stats grid grid-cols-4 gap-2">
                <div><small>Score</small><strong>{stats.score}</strong></div>
                <div><small>Accuracy</small><strong>{summary.accuracy}%</strong></div>
                <div><small>Streak</small><strong>{stats.streak}</strong></div>
                <div><small>Level</small><strong>{stats.level}</strong></div>
              </div>
            )}
            {playing && <progress className="sd-progress" aria-label="Time remaining" max={SESSION_SECONDS} value={remaining} />}
            <div className="sd-player">
              <Wave moving={playback === "playing"} />
              <div className="sd-player-action">
                <button className="sd-primary" disabled={playback === "loading" || playback === "playing"} onClick={listen}>
                  <span aria-hidden="true">{hasHeard ? "↻" : "▶"}</span> {playback === "loading" ? "Loading sound…" : playback === "playing" ? "Playing sound…" : playback === "failed" ? "Try audio again" : hasHeard ? "Replay sound" : "Play sound"}
                </button>
                <p aria-live="polite" role={playback === "failed" ? "alert" : undefined}>
                  {playback === "failed" ? "This clip couldn’t play. Try again or skip it."
                    : settings.volume === 0 ? "Game audio is muted. Use the slider to turn it up."
                      : ready && feedback === null ? "Your turn. Choose your answer below." : mode.hint}
                </p>
              </div>
              <Volume value={settings.volume} onChange={changeVolume} />
            </div>

            <section className="sd-answer-area">
              <div className="sd-answer-head flex flex-wrap items-center justify-between gap-2">
                <h2>{mode.prompt}</h2>
              </div>
              {screen === "practice" && !hasHeard && <p className="sd-detail">Try one example before your session.</p>}
              <div className="sd-answer-grid grid gap-3">
                {challenge.choices.map((choice) => {
                  const correctChoice = feedback !== null && choice.id === challenge.solution[0];
                  const incorrectChoice = feedback === false && selectedId === choice.id;
                  return (
                    <button key={choice.id} className={`sd-answer ${correctChoice ? "sd-answer--correct" : ""} ${incorrectChoice ? "sd-answer--wrong" : ""}`}
                      disabled={!ready || feedback !== null} onClick={() => choose(choice.id)}>
                      <span className="sd-answer-icon" aria-hidden="true">{choice.icon}</span>
                      <span>{choice.label}</span>
                      {correctChoice && <span className="sd-feedback-mark" aria-label="Correct choice">✓</span>}
                      {incorrectChoice && <span className="sd-feedback-mark" aria-label="Incorrect choice">×</span>}
                    </button>
                  );
                })}
              </div>
              {feedback !== null && (
                <div className={`sd-feedback ${feedback ? "sd-feedback--correct" : ""}`} role="status">
                  <strong>{feedback ? "✓ Nicely heard!" : "Good try. Here’s what played."}</strong>
                  {!feedback && <span>{answerLabel}</span>}
                  {feedback && playing && <span>+{stats.level - 1} {stats.level === 2 ? "point" : "points"}</span>}
                </div>
              )}
              <div className="sd-round-actions flex flex-wrap gap-3">
                {feedback !== null && playing && <button className="sd-primary" onClick={advance}>Next challenge <span aria-hidden="true">→</span></button>}
                {playing && stats.attempted > 0 && <button className="sd-secondary" onClick={() => finish(stats)}>Finish session</button>}
                {screen === "practice" && <button className={feedback !== null ? "sd-primary" : "sd-secondary"} onClick={startAfterPractice}>{feedback !== null ? "Start session" : "Skip practice"}</button>}
                {playback === "failed" && feedback === null && screen === "play" && <button className="sd-secondary" onClick={skip}>Skip this sound</button>}
              </div>
            </section>
          </div>
        )}

        {screen === "results" && (
          <section className="sd-card sd-results">
            <div className="sd-stars" aria-label={`${summary.stars} of 3 stars`}>
              {[1, 2, 3].map((star) => <span key={star} aria-hidden="true">{star <= summary.stars ? "★" : "☆"}</span>)}
            </div>
            <h1 ref={heading} tabIndex={-1}>{result.newBest ? "New personal best!" : "Session complete"}</h1>
            <p>{stats.correct} of {stats.attempted} answers correct{stats.skipped ? ` · ${stats.skipped} skipped` : ""}</p>
            <div className="sd-stats grid grid-cols-2 gap-3">
              <div><small>Score</small><strong>{stats.score}</strong></div>
              <div><small>Accuracy</small><strong>{summary.accuracy}%</strong></div>
              <div><small>Best streak</small><strong>{stats.bestStreak}</strong></div>
              <div><small>Personal best</small><strong>{result.best}</strong></div>
            </div>
            <button className="sd-primary w-full" onClick={() => begin()}>Play again <span aria-hidden="true">↻</span></button>
            <button className="sd-text-button" onClick={goSetup}>Change settings</button>
          </section>
        )}
      </div>
    </main>
  );
}
