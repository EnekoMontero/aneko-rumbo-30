/* Pantalla "Próximamente" para nodos cuyo minijuego aún no está hecho. */
(function (G) {
  class SoonScene extends Phaser.Scene {
    constructor() { super('Soon'); }
    create({ index = 0 }) {
      const n = G.MAP.nodes[index];
      const { width: W, height: H } = this.scale;
      G.showTiltButton(false);
      this.add.rectangle(0, 0, W, H, 0x1b1430).setOrigin(0);
      for (let i = 0; i < 40; i++) {
        const s = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), 2, 2, 0xffffff, Math.random());
        this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(600, 1600), yoyo: true, repeat: -1 });
      }
      const top = G.safe.top, bottom = H - G.safe.bottom;
      G.ui.text(this, W / 2, top + H * 0.14, `Día ${n.day}`, 12, '#9fd3ff');
      G.ui.text(this, W / 2, top + H * 0.14 + 34, n.game, 16, '#ffd23f', { wrap: 320 });
      const icon = this.add.image(W / 2, H * 0.44, n.icon).setScale(2);
      this.tweens.add({ targets: icon, y: icon.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      G.ui.text(this, W / 2, H * 0.62, n.final ? '¡Sorpresa!' : 'Próximamente', 20, '#ffffff', { strokeThickness: 7 });
      G.ui.text(this, W / 2, H * 0.62 + 40, n.final ? 'Algo despega muy pronto...' : 'Este juego está en obras', 9, '#cccccc');
      G.ui.button(this, W / 2, bottom - 70, 'Volver al mapa', () => this.scene.start('Map'), 220, 44);
    }
  }
  G.coreScenes.push(SoonScene);
})(window.AneGame);
