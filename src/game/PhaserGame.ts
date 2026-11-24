import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { StoreScene } from "./scenes/StoreScene";
import { REFERENCE_WIDTH, REFERENCE_HEIGHT } from "./constants";

export { REFERENCE_WIDTH, REFERENCE_HEIGHT };

export function createPhaserGame(parent: HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#cfe3c8",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: REFERENCE_WIDTH,
      height: REFERENCE_HEIGHT,
    },
    render: {
      pixelArt: false,
      antialias: true,
      roundPixels: true,
    },
    scene: [BootScene, StoreScene],
  };

  return new Phaser.Game(config);
}
