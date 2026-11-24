/* Final del corredor: victoria en San Mamés (vuelve al mapa) o agotada (reintentar). */
(function (G) {
  const MG = G.minigames.corredor, CFG = MG.config;

  class CorredorEnd extends Phaser.Scene {
    constructor() { super('CorredorEnd'); }
    create({ win, secs = 0, km = 0 }) {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      const { ground } = MG.drawBackdrop(this, W, H, win ? 'r-sanmames' : null);
      if (win) {
        G.sfx.win();
        const t = G.ui.text(this, W / 2, top + H * 0.12, '¡Has llegado\na San Mamés!', 18, '#ffd23f', { strokeThickness: 7, lineSpacing: 12 });
        this.tweens.add({ targets: t, scale: 1.05, duration: 400, yoyo: true, repeat: -1 });
        G.ui.text(this, W / 2, top + H * 0.12 + 58, `${CFG.GOAL_M / 1000} km por la ría\nen ${secs} segundos`, 9, '#ffffff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2, ground, 'celebrate', 0.9);
        let f = 0;
        this.time.addEvent({ delay: 280, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'jump' : 'celebrate'); ane.y = ground - (f ? 14 : 0); } });
        this.confetti(W, H);
        G.ui.button(this, W / 2, ground - 160, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44).setDepth(5);
        const again = G.ui.text(this, W / 2, bottom - 40, 'Correr otra vez', 9, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        again.on('pointerup', () => this.scene.start('CorredorGame'));
      } else {
        G.sfx.gameOver();
        G.ui.text(this, W / 2, top + H * 0.14, '¡Agotada!', 24, '#ff5a5a', { strokeThickness: 8 });
        G.ui.text(this, W / 2, top + H * 0.14 + 44, `Has corrido ${km.toFixed(1).replace('.', ',')} km\nde ${CFG.GOAL_M / 1000}`, 10, '#ffffff', { lineSpacing: 8 });
        G.ui.text(this, W / 2, top + H * 0.14 + 92, 'Consejo: no te saltes\nninguna botella de agua', 9, '#9fe3ff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2, ground, 'tired', 1.1);
        this.tweens.add({ targets: ane, angle: { from: -2, to: 2 }, duration: 400, yoyo: true, repeat: -1 });
        G.ui.button(this, W / 2, ground - 160, 'Reintentar', () => this.scene.start('CorredorGame'), 190, 44);
        const back = G.ui.text(this, W / 2, bottom - 40, 'Volver al mapa', 9, '#ffffff').setInteractive({ useHandCursor: true });
        back.on('pointerup', () => this.scene.start('Map'));
      }
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start(win ? 'Map' : 'CorredorGame', win ? { completed: CFG.id } : {}));
    }
    confetti(W, H) {
      const colors = [0xff3b5c, 0xffffff, 0xffd23f, 0x3bd16f, 0x3b9dff];
      this.time.addEvent({ delay: 60, loop: true, callback: () => {
        const c = this.add.rectangle(Phaser.Math.Between(0, W), -6, 4, 4, Phaser.Utils.Array.GetRandom(colors)).setDepth(4);
        this.tweens.add({ targets: c, y: H + 10, x: c.x + Phaser.Math.Between(-40, 40), angle: 360,
          duration: Phaser.Math.Between(1800, 3000), onComplete: () => c.destroy() });
      } });
    }
  }
  MG.scenes.push(CorredorEnd);
})(window.AneGame);
