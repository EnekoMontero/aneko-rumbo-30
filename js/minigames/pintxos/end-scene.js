/* Pantalla final: Game Over (Reintentar) o celebración al llegar al objetivo. */
(function (G) {
  const MG = G.minigames.pintxos, CFG = MG.config;

  class PintxosEnd extends Phaser.Scene {
    constructor() { super('PintxosEnd'); }

    create({ win, score }) {
      const { width: W, height: H } = this.scale;
      G.ui.background(this, 'bg-zamora', win ? 0.35 : 0.6);
      win ? this.winScreen(W, H, score) : this.loseScreen(W, H, score);
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start('PintxosGame'));
    }

    loseScreen(W, H, score) {
      G.sfx.gameOver();
      const top = G.safe.top, bottom = H - G.safe.bottom;
      G.ui.text(this, W / 2, top + H * 0.14, '¡Fin del\njuego!', 26, '#ff5a5a', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, top + H * 0.27, `Pintxos: ${score}`, 16, '#ffd23f');
      G.ui.text(this, W / 2, top + H * 0.27 + 34, `Récord: ${G.progress.best(CFG.id)}\nObjetivo: ${CFG.TARGET_PINTXOS}`, 9, '#ffffff', { lineSpacing: 8 });
      const ane = this.add.image(W / 2, bottom - 150, 'ane-spicy').setOrigin(0.5, 1).setScale(1.3);
      this.tweens.add({ targets: ane, angle: { from: -3, to: 3 }, duration: 300, yoyo: true, repeat: -1 });
      G.ui.button(this, W / 2, bottom - 100, 'Reintentar', () => this.scene.start('PintxosGame'), 190, 44);
      const back = G.ui.text(this, W / 2, bottom - 44, 'Volver al mapa', 9, '#ffffff').setInteractive({ useHandCursor: true });
      back.on('pointerup', () => this.scene.start('Map'));
    }

    winScreen(W, H, score) {
      G.sfx.win();
      const top = G.safe.top, bottom = H - G.safe.bottom;
      const t = G.ui.text(this, W / 2, top + H * 0.12, '¡Lo has\nconseguido!', 24, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      this.tweens.add({ targets: t, scale: 1.06, duration: 400, yoyo: true, repeat: -1 });
      G.ui.text(this, W / 2, top + H * 0.12 + 66, `¡${score} pintxos!\nDe Zamora a Bilbao.`, 10, '#ffffff', { lineSpacing: 8 });

      // pintxos en dos filas
      const py = top + H * 0.12 + 120;
      CFG.PINTXOS.forEach((p, i) => {
        const x = W / 2 + ((i % 3) - 1) * 90, y = py + Math.floor(i / 3) * 54;
        const img = this.add.image(x, y, 'px-' + p.key);
        this.tweens.add({ targets: img, y: y - 8, duration: 500 + (i % 3) * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      });

      // Ane celebrando: alterna brazos arriba / salto
      const baseY = bottom - 110;
      const ane = this.add.image(W / 2, baseY, 'ane-celebrate').setOrigin(0.5, 1).setScale(1.4);
      let f = 0;
      this.time.addEvent({ delay: 280, loop: true, callback: () => {
        f ^= 1; ane.setTexture(f ? 'ane-jump' : 'ane-celebrate'); ane.y = baseY - (f ? 16 : 0);
      } });
      this.confetti(W, H);

      G.ui.button(this, W / 2, bottom - 70, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44);
      const again = G.ui.text(this, W / 2, bottom - 26, 'Jugar otra vez', 9, '#ffffff').setInteractive({ useHandCursor: true });
      again.on('pointerup', () => this.scene.start('PintxosGame'));
    }

    confetti(W, H) {
      const colors = [0xff3b5c, 0xffd23f, 0x3bd16f, 0x3b9dff, 0xff8a3b, 0xffffff];
      this.time.addEvent({ delay: 60, loop: true, callback: () => {
        const c = this.add.rectangle(Phaser.Math.Between(0, W), -6, 4, 4, Phaser.Utils.Array.GetRandom(colors));
        this.tweens.add({ targets: c, y: H + 10, x: c.x + Phaser.Math.Between(-40, 40), angle: 360,
          duration: Phaser.Math.Between(1800, 3000), onComplete: () => c.destroy() });
      } });
    }
  }
  MG.scenes.push(PintxosEnd);
})(window.AneGame);
