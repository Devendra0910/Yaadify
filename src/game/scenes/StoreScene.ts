import Phaser from "phaser";
import { gameBridge, BridgeEvents } from "../GameBridge";
import { getLevelConfig } from "../data/levels";
import { getProductById } from "../data/products";
import { generateShoppingSet, type ShoppingSet } from "../systems/ShoppingSetGenerator";
import { SaveSystem } from "../systems/SaveSystem";

type Phase = "idle" | "memorize" | "shopping" | "gameOver";

const MAX_STRIKES = 3;

/**
 * Owns the run state machine: an endless sequence of levels (1, 2, 3, ...)
 * with a single shared score and a strike counter. Levels no longer end in
 * a pass/fail screen — clearing the list (or running out of time) just
 * rolls straight into the next, harder level. Only a wrong tap costs a
 * strike; 3 strikes ends the run. Shopping is a tappable product grid
 * rendered by React (ShoppingGrid), so this class has no visual output.
 *
 * Scoring is deliberately simple and immediate: a correct tap is worth the
 * current level number (so later levels are worth more), a wrong tap always
 * costs a flat 1 point — so the number on screen always moves by an amount
 * you can predict the instant you tap.
 */
export class StoreScene extends Phaser.Scene {
  private shoppingSet?: ShoppingSet;
  private collectedIds = new Set<string>();
  private correctCollectedIds = new Set<string>();

  private phase: Phase = "idle";
  private currentLevelId = 1;
  private runScore = 0;
  private strikesUsed = 0;

  private memorizeRemaining = 0;
  private shoppingRemaining = 0;
  private shoppingTimeLimit = 0;
  private lastEmittedSecond = -1;

  constructor() {
    super("StoreScene");
  }

  create(): void {
    this.registerBridgeListeners();
    // gameBridge is a module-level singleton that outlives this scene (e.g.
    // across a Vite HMR teardown/recreate of the Phaser game), so listeners
    // registered with `.on` must be explicitly removed when this scene goes
    // away — otherwise a stale scene keeps handling events after teardown.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.unregisterBridgeListeners, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.unregisterBridgeListeners, this);
    gameBridge.emit(BridgeEvents.SceneReady);
  }

  private onStartRun = () => this.startRun();
  private onMemorizeReady = () => {
    if (this.phase === "memorize") this.beginShopping();
  };
  private onCollectProduct = ({ productId }: { productId: string }) => this.collectProduct(productId);
  private onRequestPause = () => this.scene.pause();
  private onRequestResume = () => this.scene.resume();

  private registerBridgeListeners(): void {
    gameBridge.on(BridgeEvents.StartRun, this.onStartRun);
    gameBridge.on(BridgeEvents.MemorizeReady, this.onMemorizeReady);
    gameBridge.on(BridgeEvents.CollectProduct, this.onCollectProduct);
    gameBridge.on(BridgeEvents.RequestPause, this.onRequestPause);
    gameBridge.on(BridgeEvents.RequestResume, this.onRequestResume);
  }

  private unregisterBridgeListeners(): void {
    gameBridge.off(BridgeEvents.StartRun, this.onStartRun);
    gameBridge.off(BridgeEvents.MemorizeReady, this.onMemorizeReady);
    gameBridge.off(BridgeEvents.CollectProduct, this.onCollectProduct);
    gameBridge.off(BridgeEvents.RequestPause, this.onRequestPause);
    gameBridge.off(BridgeEvents.RequestResume, this.onRequestResume);
  }

  private startRun(): void {
    if (this.scene.isPaused()) this.scene.resume();
    this.currentLevelId = 1;
    this.runScore = 0;
    this.strikesUsed = 0;
    this.buildLevel(this.currentLevelId);
  }

  private buildLevel(levelId: number): void {
    const cfg = getLevelConfig(levelId);
    this.shoppingSet = generateShoppingSet(cfg);
    this.collectedIds = new Set();
    this.correctCollectedIds = new Set();

    this.memorizeRemaining = cfg.memorizeTime;
    this.shoppingTimeLimit = cfg.timeLimit;
    this.shoppingRemaining = cfg.timeLimit;
    this.lastEmittedSecond = -1;
    this.phase = "memorize";

    this.emitRunStats();
    gameBridge.emit(BridgeEvents.MemorizeBegin, {
      levelId,
      items: this.shoppingSet.shoppingList,
      memorizeTime: cfg.memorizeTime,
    });
  }

  private beginShopping(): void {
    this.phase = "shopping";
    this.lastEmittedSecond = -1;
    gameBridge.emit(BridgeEvents.ShoppingBegin, {
      timeLimit: this.shoppingTimeLimit,
      items: this.shoppingSet?.placedProducts ?? [],
    });
  }

  private emitRunStats(): void {
    gameBridge.emit(BridgeEvents.RunStats, {
      level: this.currentLevelId,
      score: this.runScore,
      strikesUsed: this.strikesUsed,
      maxStrikes: MAX_STRIKES,
    });
  }

  /** Clearing the list, or the timer running out, both just move on to the
   * next (harder) level — score was already settled tap-by-tap. */
  private advanceLevel(): void {
    this.currentLevelId += 1;
    this.buildLevel(this.currentLevelId);
  }

  private endRun(): void {
    this.phase = "gameOver";
    const { isNewBestScore, isNewBestLevel } = SaveSystem.recordRun(this.currentLevelId, this.runScore);
    gameBridge.emit(BridgeEvents.GameOver, {
      finalScore: this.runScore,
      levelReached: this.currentLevelId,
      isNewBestScore,
      isNewBestLevel,
    });
  }

  private collectProduct(productId: string): void {
    if (this.phase !== "shopping") return;
    if (this.collectedIds.has(productId)) return; // already tapped off the grid
    this.collectedIds.add(productId);

    const product = getProductById(productId);
    const isOnList = this.shoppingSet?.shoppingList.some((p) => p.id === product.id) ?? false;

    gameBridge.emit(BridgeEvents.PickupFeedback, {
      productId: product.id,
      productName: product.name,
      outcome: isOnList ? "correct" : "wrong",
    });

    if (isOnList) {
      this.runScore += this.currentLevelId;
      this.correctCollectedIds.add(product.id);
      this.emitRunStats();

      const listComplete = this.shoppingSet?.shoppingList.every((p) => this.correctCollectedIds.has(p.id)) ?? false;
      if (listComplete) {
        const timeBonus = Math.floor(this.shoppingRemaining / 30);
        if (timeBonus > 0) {
          this.runScore += timeBonus;
          gameBridge.emit(BridgeEvents.PickupFeedback, {
            productId: `__time_bonus_${this.currentLevelId}__`,
            productName: `Time Bonus +${timeBonus}`,
            outcome: "bonus",
          });
          this.emitRunStats();
        }
        this.advanceLevel();
      }
      return;
    }

    this.runScore = Math.max(0, this.runScore - 1);
    this.strikesUsed += 1;
    this.emitRunStats();
    if (this.strikesUsed >= MAX_STRIKES) this.endRun();
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    if (this.phase === "memorize") {
      this.memorizeRemaining -= dt;
      const sec = Math.max(0, Math.ceil(this.memorizeRemaining));
      if (sec !== this.lastEmittedSecond) {
        this.lastEmittedSecond = sec;
        gameBridge.emit(BridgeEvents.MemorizeTick, { remaining: sec });
      }
      if (this.memorizeRemaining <= 0) this.beginShopping();
      return;
    }

    if (this.phase === "shopping") {
      this.shoppingRemaining -= dt;
      const sec = Math.max(0, Math.ceil(this.shoppingRemaining));
      if (sec !== this.lastEmittedSecond) {
        this.lastEmittedSecond = sec;
        gameBridge.emit(BridgeEvents.ShoppingTick, {
          remaining: sec,
          basketCount: this.collectedIds.size,
          listSize: this.shoppingSet?.shoppingList.length ?? 0,
        });
      }
      if (this.shoppingRemaining <= 0) this.advanceLevel();
    }
  }
}
