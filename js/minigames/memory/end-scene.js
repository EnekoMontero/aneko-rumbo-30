/* Final del Memory: estrellas, álbum de los viajes (tocables) y vuelta al mapa. */
(function (G) {
  const MG = G.minigames.memory, CFG = MG.config;

  class MemoryEnd extends Phaser.Scene {
    constructor() { super('MemoryEnd'); }
    create({ moves = 0, secs = 0, stars = 1 }) {
      G.showTiltButton(false);
      this.events.once('shutdown', () => G.photos.close());
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      G.ui.background(this, 'mm-bg', 0.5);
      const ty = top + Math.max(66, H * 0.09);
      const t = G.ui.text(this, W / 2, ty, '¡Todas las\nparejas!', 20, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      this.tweens.add({ targets: t, scale: 1.05, duration: 400, yoyo: true, repeat: -1 });
      const sg = MG.drawStars(this, W / 2, ty + 62, stars, 15);
      sg.setScale(0.2).setAlpha(0); sg.x = W / 2 * 0.8; sg.y = (ty + 62) * 0.8;
      this.tweens.add({ targets: sg, scale: 1, alpha: 1, x: 0, y: 0, duration: 400, delay: 200, ease: 'Back.out' });
      const msg = stars === 3 ? '¡Memoria de piloto!' : stars === 2 ? '¡Muy buen vuelo!' : '¡Aterrizaje conseguido!';
      G.ui.text(this, W / 2, ty + 96, `${moves} movimientos · ${msg}`, 9, '#ffffff', { wrap: W - 30 });

      // álbum 3×2
      const cols = 3, gap = 8, rows = Math.ceil(CFG.TRIPS.length / cols);
      const cw = Math.floor(Math.min(96, (W - 32 - gap * (cols - 1)) / cols));
      const ps = cw - 8, chh = ps + 30;
      const ay = ty + 118;
      const maxRowsH = bottom - 150 - ay;
      const scale = Math.min(1, maxRowsH / (rows * (chh + gap)));
      const album = this.add.container(W / 2, ay).setScale(scale);
      CFG.TRIPS.forEach((tr, i) => {
        const x = (i % cols - (cols - 1) / 2) * (cw + gap), y = Math.floor(i / cols) * (chh + gap) + chh / 2;
        const c = this.add.container(x, y);
        const g = this.add.graphics().fillStyle(0x1b1430, 1).fillRoundedRect(-cw / 2, -chh / 2 + 2, cw, chh, 5)
          .fillStyle(0xfff8e8, 1).fillRoundedRect(-cw / 2, -chh / 2, cw, chh, 5);
        const img = this.add.image(0, -chh / 2 + 4 + ps / 2, G.photos.texture(this, tr.src, ps, 0));
        const p = G.ui.text(this, 0, chh / 2 - 19, tr.place, 7, '#1b1430', { strokeThickness: 0 }); p.setShadow(0, 0, '#000', 0, false, false);
        if (p.width > cw - 6) p.setScale((cw - 6) / p.width);   // nombres largos: encoger, no salirse
        const d = G.ui.text(this, 0, chh / 2 - 8, tr.date, 7, '#6a5f86', { strokeThickness: 0 }); d.setShadow(0, 0, '#000', 0, false, false);
        c.add([g, img, p, d]); c.setSize(cw, chh).setInteractive({ useHandCursor: true });
        c.on('pointerup', () => G.photos.view(tr.src, tr.place, tr.date));
        c.setScale(0); this.tweens.add({ targets: c, scale: 1, duration: 260, delay: 300 + i * 90, ease: 'Back.out' });
        album.add(c);
      });
      const albumBottom = ay + rows * (chh + gap) * scale;
      G.ui.text(this, W / 2, albumBottom + 8, 'Toca un viaje para verlo en grande', 8, '#d0c8e8', { strokeThickness: 3 });

      const aneY = bottom - 112;
      const ane = G.ui.ane(this, 52, aneY, 'celebrate', 0.7);
      let f = 0;
      this.time.addEvent({ delay: 280, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'jump' : 'celebrate'); ane.y = aneY - (f ? 12 : 0); } });
      this.confetti(W, H);
      G.ui.button(this, W / 2 + 30, bottom - 74, 'Volver al mapa', () => this.scene.start('Map', { completed: CFG.id }), 220, 44).setDepth(5);
      const again = G.ui.text(this, W / 2 + 30, bottom - 28, 'Jugar otra vez', 9, '#ffffff').setInteractive({ useHandCursor: true }).setDepth(5);
      again.on('pointerup', () => this.scene.start('MemoryGame'));
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Map', { completed: CFG.id }));
    }
    confetti(W, H) {
      const colors = [0xff3b5c, 0xffffff, 0xffd23f, 0x3bd16f, 0x3b9dff];
      this.time.addEvent({ delay: 70, loop: true, callback: () => {
        const c = this.add.rectangle(Phaser.Math.Between(0, W), -6, 4, 4, Phaser.Utils.Array.GetRandom(colors)).setDepth(4);
        this.tweens.add({ targets: c, y: H + 10, x: c.x + Phaser.Math.Between(-40, 40), angle: 360,
          duration: Phaser.Math.Between(1800, 3000), onComplete: () => c.destroy() });
      } });
    }
  }
  MG.scenes.push(MemoryEnd);
})(window.AneGame);
