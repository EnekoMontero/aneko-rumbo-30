/* Final de "Nadar en Bali": victoria (vuelve al mapa) o sin vidas (reintentar). */
(function (G) {
  const MG = G.minigames.bali, CFG = MG.config;

  class BaliEnd extends Phaser.Scene {
    constructor() { super('BaliEnd'); }
    create({ win, turtles = 0, secs = 0, lives = 0 } = {}) {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      MG.drawBackdrop(this, 0.4);
      const ty = top + Math.max(80, H * 0.12);
      const aneY = bottom - 150;
      if (win) {
        const t = G.ui.text(this, W / 2, ty, '¡Amiga de\nlas tortugas!', 20, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
        this.tweens.add({ targets: t, scale: 1.05, duration: 400, yoyo: true, repeat: -1 });
        G.ui.text(this, W / 2, ty + 62, `${turtles} tortugas en ${secs} segundos`, 10, '#ffffff');
        G.ui.text(this, W / 2, ty + 102, (lives >= CFG.LIVES ? '¡Ni un mordisco de\ndragones de Komodo!' : `Te sobraron ${lives} ${lives === 1 ? 'vida' : 'vidas'}.\n¡Los dragones se quedan\nen la playa!`), 9, '#9fe3ff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2, aneY, 'celebrate', 1.0);
        let f = 0;
        this.time.addEvent({ delay: 280, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'jump' : 'celebrate'); ane.y = aneY - (f ? 14 : 0); } });
        [[-100, 0, 1], [100, -10, 2], [-70, -70, 2], [80, -80, 1]].forEach(([dx, dy, k], i) => {
          const tt = this.add.image(W / 2 + dx, aneY - 40 + dy, 'bl-turtle' + k).setScale(0.8);
          this.tweens.add({ targets: tt, angle: i % 2 ? -10 : 10, y: tt.y - 8, duration: 600 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        });
        this.confetti(W, H);
        G.ui.button(this, W / 2, bottom - 96, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44).setDepth(5);
        const again = G.ui.text(this, W / 2, bottom - 50, 'Nadar otra vez', 10, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        again.on('pointerup', () => this.scene.start('BaliGame'));
      } else {
        G.ui.text(this, W / 2, ty, '¡Sin vidas!', 22, '#ff5a5a', { strokeThickness: 8 });
        G.ui.text(this, W / 2, ty + 44, `Tortugas: ${turtles}/${CFG.TURTLES}`, 10, '#ffffff');
        G.ui.text(this, W / 2, ty + 94, 'Consejo: cuando veas el "!"\nen la playa, apártate\nde esa fila', 9, '#9fe3ff', { lineSpacing: 8 });
        const kd = this.add.image(W / 2 + 90, aneY - 30, 'bl-komodo1').setScale(0.8).setAngle(-90);
        this.time.addEvent({ delay: 260, loop: true, callback: () => kd.setTexture(kd.texture.key === 'bl-komodo1' ? 'bl-komodo2' : 'bl-komodo1') });
        const ane = G.ui.ane(this, W / 2 - 20, aneY, 'tired', 1.2);
        this.tweens.add({ targets: ane, scaleY: 1.26, duration: 500, yoyo: true, repeat: -1 });
        G.ui.button(this, W / 2, bottom - 96, 'Reintentar', () => this.scene.start('BaliGame'), 190, 44).setDepth(5);
        const back = G.ui.text(this, W / 2, bottom - 50, 'Volver al mapa', 10, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        back.on('pointerup', () => this.scene.start('Map'));
      }
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start(win ? 'Map' : 'BaliGame', win ? { completed: CFG.id } : {}));
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
  MG.scenes.push(BaliEnd);
})(window.AneGame);
