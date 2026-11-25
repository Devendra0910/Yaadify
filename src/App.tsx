import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { GameCanvas } from "./ui/GameCanvas";
import { GameHub } from "./ui/screens/GameHub";
import { MainMenu } from "./ui/screens/MainMenu";
import { MemorizeScreen } from "./ui/screens/MemorizeScreen";
import { ShoppingHUD } from "./ui/screens/ShoppingHUD";
import { ShoppingGrid } from "./ui/screens/ShoppingGrid";
import { GameOverScreen } from "./ui/screens/GameOverScreen";
import { PauseMenu } from "./ui/screens/PauseMenu";
import { MindFlipApp } from "./ui/screens/mindflip/MindFlipApp";
import { TimeDetectiveApp } from "./ui/screens/timeDetective/TimeDetectiveApp";
import { SoundDetectiveApp } from "./ui/screens/soundDetective/SoundDetectiveApp";
import { detectiveBest, loadDetective, resetDetective, SOUND_DETECTIVE_ID } from "./game/soundDetective/save";
import { DualDriveApp } from "./ui/screens/dualDrive/DualDriveApp";
import { DualDriveSave, dualDriveHubScore, DUAL_DRIVE_ID } from "./game/dualDrive/save";
import { readHubScores, resetUnlocked } from "./game/systems/HubScores";
import { gameBridge, BridgeEvents } from "./game/GameBridge";
import { GAME_NODES, isGameUnlocked } from "./game/data/games";
import { SaveSystem } from "./game/systems/SaveSystem";
import { MindFlipSave, mindflipHubScore } from "./game/systems/MindFlipSave";
import { TimeDetectiveSave, timeDetectiveHubScore } from "./game/systems/TimeDetectiveSave";
import { SoundManager } from "./game/systems/SoundManager";
import type {
  GameOverPayload,
  MemorizeBeginPayload,
  PickupFeedbackPayload,
  ProductDef,
  RunStatsPayload,
  SaveData,
  ShoppingBeginPayload,
  ShoppingTickPayload,
} from "./game/types";

type Screen = "loading" | "hub" | "menu" | "memorize" | "shopping" | "gameOver" | "mindflip" | "timeDetective" | "soundDetective" | "dualDrive";

function loadGameScores() {
  return readHubScores({
    memomart: SaveSystem.load().bestRunScore,
    timedetective: timeDetectiveHubScore(TimeDetectiveSave.load()),
    game3: mindflipHubScore(MindFlipSave.load()),
    [SOUND_DETECTIVE_ID]: detectiveBest(loadDetective()),
    [DUAL_DRIVE_ID]: dualDriveHubScore(DualDriveSave.load()),
  });
}

export default function App() {
  const [gameScores, setGameScores] = useState(loadGameScores);
  const [screen, setScreen] = useState<Screen>(() => {
    const params = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && params.has("soundQA")) return "soundDetective";
    const detective = GAME_NODES.find((game) => game.id === SOUND_DETECTIVE_ID);
    const total = Object.values(gameScores).reduce((sum, score) => sum + score, 0);
    return params.get("game") === "sound-detective" && detective && isGameUnlocked(detective, total)
      ? "soundDetective"
      : "loading";
  });
  const [save, setSave] = useState<SaveData>(() => SaveSystem.load());

  const [memorizeData, setMemorizeData] = useState<MemorizeBeginPayload | null>(null);
  const [memorizeRemaining, setMemorizeRemaining] = useState(0);
  const [shoppingItems, setShoppingItems] = useState<ProductDef[]>([]);
  const [collectedIds, setCollectedIds] = useState<Set<string>>(new Set());
  const [shoppingTick, setShoppingTick] = useState<ShoppingTickPayload | null>(null);
  const [toast, setToast] = useState<PickupFeedbackPayload | null>(null);
  const [runStats, setRunStats] = useState<RunStatsPayload | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverPayload | null>(null);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hubMessage, setHubMessage] = useState<string | null>(null);

  const toastTimeout = useRef<number | null>(null);
  const hubMessageTimeout = useRef<number | null>(null);

  useEffect(() => {
    const onSceneReady = () => {
      setScreen((s) => (s === "loading" ? "hub" : s));
    };
    const onMemorizeBegin = (payload: MemorizeBeginPayload) => {
      setMemorizeData(payload);
      setMemorizeRemaining(payload.memorizeTime);
      setScreen("memorize");
      SoundManager.memorizeStart();
    };
    const onMemorizeTick = ({ remaining }: { remaining: number }) => {
      setMemorizeRemaining(remaining);
      if (remaining > 0 && remaining <= 5) SoundManager.countdownTick();
    };
    const onShoppingBegin = (payload: ShoppingBeginPayload) => {
      setShoppingItems(payload.items);
      setCollectedIds(new Set());
      setScreen("shopping");
      setToast(null);
    };
    const onShoppingTick = (payload: ShoppingTickPayload) => {
      setShoppingTick(payload);
      if (payload.remaining > 0 && payload.remaining <= 10) SoundManager.countdownTick();
    };
    const onPickupFeedback = (payload: PickupFeedbackPayload) => {
      setToast(payload);
      setCollectedIds((prev) => new Set(prev).add(payload.productId));
      if (payload.outcome === "correct") SoundManager.pickupCorrect();
      else SoundManager.pickupWrong();

      if (toastTimeout.current) window.clearTimeout(toastTimeout.current);
      toastTimeout.current = window.setTimeout(() => setToast(null), 1400);
    };
    const onRunStats = (payload: RunStatsPayload) => setRunStats(payload);
    const onGameOver = (payload: GameOverPayload) => {
      setGameOverData(payload);
      setScreen("gameOver");
      setSave(SaveSystem.load());
      SoundManager.timeUp();
    };

    gameBridge.on(BridgeEvents.SceneReady, onSceneReady);
    gameBridge.on(BridgeEvents.MemorizeBegin, onMemorizeBegin);
    gameBridge.on(BridgeEvents.MemorizeTick, onMemorizeTick);
    gameBridge.on(BridgeEvents.ShoppingBegin, onShoppingBegin);
    gameBridge.on(BridgeEvents.ShoppingTick, onShoppingTick);
    gameBridge.on(BridgeEvents.PickupFeedback, onPickupFeedback);
    gameBridge.on(BridgeEvents.RunStats, onRunStats);
    gameBridge.on(BridgeEvents.GameOver, onGameOver);

    return () => {
      gameBridge.off(BridgeEvents.SceneReady, onSceneReady);
      gameBridge.off(BridgeEvents.MemorizeBegin, onMemorizeBegin);
      gameBridge.off(BridgeEvents.MemorizeTick, onMemorizeTick);
      gameBridge.off(BridgeEvents.ShoppingBegin, onShoppingBegin);
      gameBridge.off(BridgeEvents.ShoppingTick, onShoppingTick);
      gameBridge.off(BridgeEvents.PickupFeedback, onPickupFeedback);
      gameBridge.off(BridgeEvents.RunStats, onRunStats);
      gameBridge.off(BridgeEvents.GameOver, onGameOver);
    };
  }, []);

  // Unlock Web Audio on first user gesture (browser autoplay policy).
  useEffect(() => {
    const unlock = () => {
      SoundManager.unlock();
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  function pauseGame() {
    gameBridge.emit(BridgeEvents.RequestPause);
    setPaused(true);
  }
  function resumeGame() {
    gameBridge.emit(BridgeEvents.RequestResume);
    setPaused(false);
  }

  function startRun() {
    gameBridge.emit(BridgeEvents.StartRun);
  }

  function showHubMessage(message: string) {
    setHubMessage(message);
    SoundManager.uiTap();
    if (hubMessageTimeout.current) window.clearTimeout(hubMessageTimeout.current);
    hubMessageTimeout.current = window.setTimeout(() => setHubMessage(null), 1800);
  }

  // Shared "back" handling for the desktop Escape key and, once packaged,
  // Android's hardware/gesture back button.
  function leaveDetective() {
    const url = new URL(window.location.href);
    if (url.searchParams.get("game") === "sound-detective") {
      url.searchParams.delete("game");
      history.replaceState(history.state, "", url);
    }
    setScreen("hub");
  }

  function handleBack() {
    if (paused) {
      resumeGame();
    } else if (screen === "gameOver") {
      setScreen("menu");
    } else if (screen === "shopping") {
      pauseGame();
    } else if (screen === "soundDetective") {
      leaveDetective();
    } else if (screen === "menu" || screen === "mindflip" || screen === "timeDetective" || screen === "dualDrive") {
      setScreen("hub");
    } else if (screen === "hub" && Capacitor.isNativePlatform()) {
      void CapacitorApp.exitApp();
    }
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleBack();
    };
    window.addEventListener("keydown", onKeyDown);

    if (!Capacitor.isNativePlatform()) return () => window.removeEventListener("keydown", onKeyDown);

    const backHandle = CapacitorApp.addListener("backButton", handleBack);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      void backHandle.then((h) => h.remove());
    };
  }, [paused, screen]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    SoundManager.setMuted(next);
  }

  useEffect(() => {
    if (screen !== "hub") return;
    const refresh = () => setGameScores(loadGameScores());
    setSave(SaveSystem.load());
    refresh();
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [screen]);

  const totalScore = Object.values(gameScores).reduce((a, b) => a + b, 0);

  return (
    <div className="app-root">
    <div className="phone-frame">
      <GameCanvas />

      {screen === "loading" && (
        <div className="overlay overlay--opaque overlay--center">
          <div className="menu-logo">
            <span className="emoji">🛒</span>
            <h1 className="title-xl">Yaadify</h1>
            <p className="subtitle" style={{ color: "rgba(255,255,255,0.8)" }}>
              Loading…
            </p>
          </div>
        </div>
      )}

      {screen === "hub" && (
        <GameHub
          gameScores={gameScores}
          totalScore={totalScore}
          onSelectGame={(gameId) => {
            if (gameId === "memomart") setScreen("menu");
            else if (gameId === "timedetective") setScreen("timeDetective");
            else if (gameId === "game3") setScreen("mindflip");
            else if (gameId === SOUND_DETECTIVE_ID) setScreen("soundDetective");
            else if (gameId === DUAL_DRIVE_ID) setScreen("dualDrive");
          }}
          onLockedTap={showHubMessage}
          onResetAll={() => {
            SaveSystem.reset();
            TimeDetectiveSave.reset();
            MindFlipSave.reset();
            resetDetective();
            DualDriveSave.reset();
            resetUnlocked();
            setSave(SaveSystem.load());
            setGameScores(loadGameScores());
            showHubMessage("All progress reset!");
          }}
        />
      )}

      {screen === "mindflip" && <MindFlipApp onExit={() => setScreen("hub")} />}

      {screen === "timeDetective" && <TimeDetectiveApp onExit={() => setScreen("hub")} />}

      {screen === "dualDrive" && <DualDriveApp onExit={() => setScreen("hub")} />}

      {screen === "menu" && (
        <MainMenu
          save={save}
          onPlay={startRun}
          onBack={() => setScreen("hub")}
          onResetProgress={() => {
            SaveSystem.reset();
            setSave(SaveSystem.load());
          }}
        />
      )}

      {screen === "memorize" && memorizeData && (
        <MemorizeScreen
          data={memorizeData}
          remaining={memorizeRemaining}
          onReady={() => gameBridge.emit(BridgeEvents.MemorizeReady)}
        />
      )}

      {screen === "shopping" && (
        <>
          <ShoppingGrid
            items={shoppingItems}
            collectedIds={collectedIds}
            onCollect={(productId) => gameBridge.emit(BridgeEvents.CollectProduct, { productId })}
          />
          <ShoppingHUD
            tick={shoppingTick}
            toast={toast}
            runStats={runStats}
            muted={muted}
            onPause={pauseGame}
            onToggleMute={toggleMute}
          />
        </>
      )}

      {screen === "gameOver" && gameOverData && (
        <GameOverScreen data={gameOverData} onPlayAgain={startRun} onMenu={() => setScreen("menu")} />
      )}

      {paused && (
        <PauseMenu
          onResume={resumeGame}
          onRestart={() => {
            setPaused(false);
            startRun();
          }}
          onQuit={() => {
            setPaused(false);
            setScreen("menu");
          }}
        />
      )}

      {hubMessage && (
        <div className="overlay" style={{ background: "transparent", pointerEvents: "none" }}>
          <div className="hud-toast hud-toast--bonus" style={{ top: "auto", bottom: 90 }}>
            {hubMessage}
          </div>
        </div>
      )}

    </div>
    {screen === "soundDetective" && <SoundDetectiveApp onExit={leaveDetective} />}
    </div>
  );
}
