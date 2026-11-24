import Phaser from "phaser";

/**
 * All visuals (shopping grid, product icons, HUD) are plain React/HTML now
 * — StoreScene only owns the phase timers / basket / scoring state machine,
 * so there's nothing to preload or draw here. Kept as a scene (rather than
 * folded into StoreScene) so the Boot -> Store lifecycle stays extensible
 * if a future minigame wants real Phaser-rendered visuals again.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    this.scene.start("StoreScene");
  }
}
