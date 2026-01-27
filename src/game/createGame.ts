import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { PlayScene } from './PlayScene';

export const createGame = (parent: string | HTMLElement) => {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 360,
    height: 480,
    backgroundColor: '#0f172a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, PlayScene],
  });
};
