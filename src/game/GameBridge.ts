import Phaser from "phaser";
import type {
  GameOverPayload,
  MemorizeBeginPayload,
  PickupFeedbackPayload,
  RunStatsPayload,
  ShoppingBeginPayload,
  ShoppingTickPayload,
} from "./types";

/**
 * Shared event bus between the Phaser logic scene (StoreScene, which owns
 * the run: current level, cumulative score, strikes, timers) and the React
 * UI layer (menus, HUD, the tappable shopping grid).
 */
export const gameBridge = new Phaser.Events.EventEmitter();

export const BridgeEvents = {
  // Phaser -> React
  MemorizeBegin: "memorize:begin",
  MemorizeTick: "memorize:tick",
  ShoppingBegin: "shopping:begin",
  ShoppingTick: "shopping:tick",
  PickupFeedback: "pickup:feedback",
  RunStats: "run:stats",
  GameOver: "run:gameOver",
  SceneReady: "scene:ready",

  // React -> Phaser
  StartRun: "cmd:startRun",
  MemorizeReady: "cmd:memorizeReady",
  CollectProduct: "cmd:collectProduct",
  RequestPause: "cmd:requestPause",
  RequestResume: "cmd:requestResume",
} as const;

export type BridgePayloads = {
  [BridgeEvents.MemorizeBegin]: MemorizeBeginPayload;
  [BridgeEvents.MemorizeTick]: { remaining: number };
  [BridgeEvents.ShoppingBegin]: ShoppingBeginPayload;
  [BridgeEvents.ShoppingTick]: ShoppingTickPayload;
  [BridgeEvents.PickupFeedback]: PickupFeedbackPayload;
  [BridgeEvents.RunStats]: RunStatsPayload;
  [BridgeEvents.GameOver]: GameOverPayload;
  [BridgeEvents.SceneReady]: undefined;
  [BridgeEvents.StartRun]: undefined;
  [BridgeEvents.MemorizeReady]: undefined;
  [BridgeEvents.CollectProduct]: { productId: string };
  [BridgeEvents.RequestPause]: undefined;
  [BridgeEvents.RequestResume]: undefined;
};
