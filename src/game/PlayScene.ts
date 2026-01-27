import Phaser from 'phaser';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#111827');
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Tap to start!', {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
      })
      .setOrigin(0.5);
  }
}
