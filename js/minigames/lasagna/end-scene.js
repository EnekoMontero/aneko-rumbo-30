/* Final de "Torre de lasagna": victoria (vuelve al mapa) o derrumbe (reintentar). */
(function (G) {
  const MG = G.minigames.lasagna, CFG = MG.config;

  class LasagnaEnd extends Phaser.Scene {
    constructor() { super('LasagnaEnd'); }
    create({ win, layers = 0, perfects = 0 } = {}) {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      MG.drawBackdrop(this, 0.45);
      const ty = top + Math.max(80, H * 0.12);
      const aneY = bottom - 150;
      // la lasagna resultante (ganada: gratinada)
      const n = Math.max(1, Math.min(layers, CFG.TARGET));
      const lx = W / 2 + 70, ly = aneY;
      // a media escala; si la torre no cabe bajo los textos (móvil bajo), un poco más pequeña
      const room = ly - (ty + 136);
      const sc = Math.max(0.3, Math.min(0.5, room / (n * CFG.LAYER_H + 50)));   // 50 = fuente + costra
      const offsets = win ? [] : Array.from({ length: n }, (_, i) => (i ? Phaser.Math.Between(-10, 10) : 0));
      const mini = MG.miniLasagna(this, lx, ly - 36 * sc, { n, gratin: win, scale: sc, offsets });
      const topY = mini.y + (mini.topY - 6) * sc, halfW = CFG.START_W * sc / 2;
      if (win) {
        const t = G.ui.text(this, W / 2, ty, '¡Lasagna\nperfecta!', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
        this.tweens.add({ targets: t, scale: 1.05, duration: 400, yoyo: true, repeat: -1 });
        G.ui.text(this, W / 2, ty + 62, `${layers} capas · ${perfects} perfectas`, 10, '#ffffff');
        G.ui.text(this, W / 2, ty + 98, 'Gratinada en el horno de leña,\ncon vistas al Coliseo', 9, '#9fe3ff', { lineSpacing: 8 });
        this.time.addEvent({ delay: 140, loop: true, callback: () => {
          const p = this.add.image(Phaser.Math.Between(lx - halfW + 4, lx + halfW - 4), topY, 'ls-steam').setAlpha(0.6);
          this.tweens.add({ targets: p, y: p.y - 50, alpha: 0, scale: 2, duration: 1000, onComplete: () => p.destroy() });
        } });
        const ane = G.ui.ane(this, W / 2 - 50, aneY, 'celebrate', 1.0);
        let f = 0;
        this.time.addEvent({ delay: 280, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'jump' : 'celebrate'); ane.y = aneY - (f ? 14 : 0); } });
        this.confetti(W, H);
        G.ui.button(this, W / 2, bottom - 96, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44).setDepth(5);
        const again = G.ui.text(this, W / 2, bottom - 50, 'Cocinar otra vez', 10, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        again.on('pointerup', () => this.scene.start('LasagnaGame'));
      } else {
        G.ui.text(this, W / 2, ty, '¡Se ha caído!', 20, '#ff5a5a', { strokeThickness: 8 });
        G.ui.text(this, W / 2, ty + 44, `Capas: ${layers}/${CFG.TARGET}`, 10, '#ffffff');
        G.ui.text(this, W / 2, ty + 94, 'Consejo: suelta la capa justo\ncuando esté encima\nde la anterior', 9, '#9fe3ff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2 - 50, aneY, 'tired', 1.2);
        this.tweens.add({ targets: ane, scaleY: 1.26, duration: 500, yoyo: true, repeat: -1 });
        G.ui.button(this, W / 2, bottom - 96, 'Reintentar', () => this.scene.start('LasagnaGame'), 190, 44).setDepth(5);
        const back = G.ui.text(this, W / 2, bottom - 50, 'Volver al mapa', 10, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        back.on('pointerup', () => this.scene.start('Map'));
      }
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start(win ? 'Map' : 'LasagnaGame', win ? { completed: CFG.id } : {}));
    }
    confetti(W, H) {
      const colors = [0x2f8a3c, 0xffffff, 0xce2b37, 0xffd23f];
      this.time.addEvent({ delay: 60, loop: true, callback: () => {
        const c = this.add.rectangle(Phaser.Math.Between(0, W), -6, 4, 4, Phaser.Utils.Array.GetRandom(colors)).setDepth(4);
        this.tweens.add({ targets: c, y: H + 10, x: c.x + Phaser.Math.Between(-40, 40), angle: 360,
          duration: Phaser.Math.Between(1800, 3000), onComplete: () => c.destroy() });
      } });
    }
  }
  MG.scenes.push(LasagnaEnd);
})(window.AneGame);
