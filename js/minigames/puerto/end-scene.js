/* Final de "Cruzar el puerto": victoria (vuelve al mapa) o sin vidas (reintentar). */
(function (G) {
  const MG = G.minigames.puerto, CFG = MG.config;

  class PuertoEnd extends Phaser.Scene {
    constructor() { super('PuertoEnd'); }
    create({ win, crossings = 0, secs = 0, lives = 0 }) {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      MG.drawBackdrop(this, 0.4);
      const ty = top + Math.max(80, H * 0.12);
      const aneY = bottom - 150;
      // panel oscuro tras los textos para que se lean sobre el fondo
      const panel = (y0, y1) => this.add.graphics().fillStyle(0x1b1430, 0.62).fillRoundedRect(20, y0, W - 40, y1 - y0, 10);
      if (win) {
        const t = G.ui.text(this, W / 2, ty, '¡Puerto\ncruzado!', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
        this.tweens.add({ targets: t, scale: 1.05, duration: 400, yoyo: true, repeat: -1 });
        panel(ty + 46, ty + 136);
        G.ui.text(this, W / 2, ty + 66, `${CFG.CROSSINGS} cruces en ${secs} segundos`, 10, '#ffffff');
        G.ui.text(this, W / 2, ty + 106, (lives >= CFG.LIVES ? '¡Sin perder ni una vida!\nNi un camión ni una caída a la ría' : `Te sobraron ${lives} ${lives === 1 ? 'vida' : 'vidas'}\n¡La ría no pudo contigo!`), 9, '#9fe3ff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2, aneY, 'celebrate', 1.0);
        let f = 0;
        this.time.addEvent({ delay: 280, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'jump' : 'celebrate'); ane.y = aneY - (f ? 14 : 0); } });
        this.confetti(W, H);
        G.ui.button(this, W / 2, bottom - 96, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44).setDepth(5);
        const again = G.ui.text(this, W / 2, bottom - 46, 'Cruzar otra vez', 10, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        again.on('pointerup', () => this.scene.start('PuertoGame'));
      } else {
        G.ui.text(this, W / 2, ty, '¡Sin vidas!', 22, '#ff5a5a', { strokeThickness: 8 });
        panel(ty + 28, ty + 124);
        G.ui.text(this, W / 2, ty + 48, `Cruces: ${crossings}/${CFG.CROSSINGS}`, 10, '#ffffff');
        G.ui.text(this, W / 2, ty + 92, 'Consejo: espera a que el\nbarco llegue antes de saltar', 9, '#9fe3ff', { lineSpacing: 8 });
        const ane = G.ui.ane(this, W / 2, aneY, 'tired', 1.2);
        this.tweens.add({ targets: ane, scaleY: 1.26, duration: 500, yoyo: true, repeat: -1 });
        G.ui.button(this, W / 2, bottom - 96, 'Reintentar', () => this.scene.start('PuertoGame'), 190, 44).setDepth(5);
        const back = G.ui.text(this, W / 2, bottom - 46, 'Volver al mapa', 10, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
        back.on('pointerup', () => this.scene.start('Map'));
      }
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start(win ? 'Map' : 'PuertoGame', win ? { completed: CFG.id } : {}));
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
  MG.scenes.push(PuertoEnd);
})(window.AneGame);
