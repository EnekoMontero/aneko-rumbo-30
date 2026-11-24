/* Final del CrossFit: WOD completado (vuelve al mapa) o "¡Tiempo!" (reintentar). Con el crédito musical. */
(function (G) {
  const MG = G.minigames.crossfit, CFG = MG.config;

  class CrossfitEnd extends Phaser.Scene {
    constructor() { super('CrossfitEnd'); }
    create({ win, reps = 0, round = 1, score = 0, maxCombo = 0, stats = { perfect: 0, good: 0, miss: 0 } }) {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      MG.drawBox(this, W, H, 0, 0.45);
      const ty = top + Math.max(80, H * 0.11);
      const statTxt = `Reps: ${reps}/${CFG.REPS_TO_WIN}\nPerfectas: ${stats.perfect} · Bien: ${stats.good}\nNo reps: ${stats.miss}\nMejor combo: x${maxCombo}\nPuntos: ${score}`;
      const panel = (y, h) => this.add.graphics().fillStyle(0x1b1430, 0.82).fillRoundedRect(28, y, W - 56, h, 10).lineStyle(3, 0xffffff, 1).strokeRoundedRect(28, y, W - 56, h, 10);
      const aneY = bottom - 150;
      if (win) {
        const t = G.ui.text(this, W / 2, ty, '¡WOD\ncompletado!', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
        this.tweens.add({ targets: t, scale: 1.05, duration: 400, yoyo: true, repeat: -1 });
        G.ui.text(this, W / 2, ty + 62, `¡${CFG.ROUNDS} rondas x ${CFG.REPS_PER_ROUND} reps!`, 9, '#ffffff');
        panel(ty + 86, 124); G.ui.text(this, W / 2, ty + 148, statTxt, 9, '#ffffff', { lineSpacing: 8, strokeThickness: 3 });
        const ane = G.ui.ane(this, W / 2 - 40, aneY, 'celebrate', 1.0);
        let f = 0;
        this.time.addEvent({ delay: 300, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'cf_bup' : 'celebrate'); ane.y = aneY - (f ? 12 : 0); } });
        this.add.image(W / 2 + 70, aneY, 'cf-box').setOrigin(0.5, 1).setScale(0.7);
        this.confetti(W, H);
        G.ui.button(this, W / 2, bottom - 110, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44).setDepth(5);
        const again = G.ui.text(this, W / 2, bottom - 64, 'Repetir el WOD', 9, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        again.on('pointerup', () => this.scene.start('CrossfitGame'));
      } else {
        G.ui.text(this, W / 2, ty, '¡Tiempo!', 24, '#ff5a5a', { strokeThickness: 8 });
        G.ui.text(this, W / 2, ty + 40, `Ronda ${Math.min(round, CFG.ROUNDS)}/${CFG.ROUNDS} · te faltaron ${Math.max(0, CFG.REPS_TO_WIN - reps)} reps`, 10, '#ffffff');
        panel(ty + 64, 124); G.ui.text(this, W / 2, ty + 126, statTxt, 9, '#ffffff', { lineSpacing: 8, strokeThickness: 3 });
        G.ui.text(this, W / 2, ty + 210, 'Consejo: toca justo cuando\nel icono pisa la línea', 9, '#9fe3ff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2, aneY, 'tired', 1.3);
        this.tweens.add({ targets: ane, scaleY: 1.36, duration: 476, yoyo: true, repeat: -1 });
        G.ui.button(this, W / 2, bottom - 110, 'Reintentar', () => this.scene.start('CrossfitGame'), 190, 44).setDepth(5);
        const back = G.ui.text(this, W / 2, bottom - 64, 'Volver al mapa', 9, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        back.on('pointerup', () => this.scene.start('Map'));
      }
      G.ui.text(this, W / 2, bottom - 22, CFG.CREDIT + '\n' + CFG.CREDIT_URL, 7, '#d0c8e8', { lineSpacing: 5, strokeThickness: 2 }).setDepth(5);
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start(win ? 'Map' : 'CrossfitGame', win ? { completed: CFG.id } : {}));
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
  MG.scenes.push(CrossfitEnd);
})(window.AneGame);
