import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#0f172a');
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'One Minute Combo', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '24px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5);

    this.time.delayedCall(600, () => {
      this.scene.start('PlayScene');
    });
  }
}
