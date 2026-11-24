/* Portada del Memory de viajes (aeropuerto de Bilbao). */
(function (G) {
  const MG = G.minigames.memory, CFG = MG.config;

  MG.drawStars = (scene, cx, cy, n, size = 14, total = 3) => {
    const g = scene.add.graphics();
    for (let i = 0; i < total; i++) {
      const x = cx + (i - (total - 1) / 2) * size * 2.4, pts = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? size * 0.45 : size;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, cy + Math.sin(a) * r));
      }
      g.fillStyle(0x1b1430, 1).fillPoints(pts.map(p => new Phaser.Math.Vector2(p.x, p.y + 3)), true);
      g.fillStyle(i < n ? 0xffd23f : 0x5a5370, 1).fillPoints(pts, true);
      g.lineStyle(2, 0x1b1430, 1).strokePoints(pts, true);
    }
    return g;
  };
  MG.starsFor = (moves) => (moves <= CFG.STARS[0] ? 3 : moves <= CFG.STARS[1] ? 2 : 1);

  class MemoryStart extends Phaser.Scene {
    constructor() { super('MemoryStart'); }
    create() {
      G.showTiltButton(false);
      G.photos.loadAll(CFG.TRIPS.map(p => p.src));
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      G.ui.background(this, 'mm-bg', 0.35);
      G.ui.backToMap(this);
      const ty = top + Math.max(78, H * 0.105);
      G.ui.text(this, W / 2, ty, 'Memory\nde viajes', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, ty + 60, 'Día 4 · Aeropuerto de Bilbao', 9, '#ffffff');

      const bx = 16, by = ty + 82, bw = W - 32, bh = 252;
      this.add.graphics().fillStyle(0x1b1430, 0.86).fillRoundedRect(bx, by, bw, bh, 10)
        .lineStyle(3, 0xffffff, 1).strokeRoundedRect(bx, by, bw, bh, 10);
      // dos tarjetas de embarque: una se da la vuelta
      const c1 = this.add.image(W / 2 - 34, by + 52, 'mm-back').setScale(1.25);
      const c2 = this.add.image(W / 2 + 34, by + 52, 'mm-back').setScale(1.25);
      this.tweens.add({ targets: c2, scaleX: 0, duration: 200, yoyo: true, hold: 120, repeat: -1, repeatDelay: 1100, ease: 'Sine.in' });
      this.tweens.add({ targets: c1, angle: { from: -4, to: 4 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      G.ui.text(this, W / 2, by + 112, 'Da la vuelta a dos cartas:\nsi son el mismo viaje, ¡pareja!', 9, '#ffffff', { lineSpacing: 7, strokeThickness: 3 });
      G.ui.text(this, W / 2, by + 158, `${CFG.TRIPS.length} parejas · ${CFG.TRIPS.length * 2} cartas\nCada pareja: un viaje juntos`, 9, '#9fe3ff', { lineSpacing: 7, strokeThickness: 3 });
      G.ui.text(this, W / 2, by + 204, 'Cuantos menos movimientos,\nmás estrellas', 9, '#ffd23f', { lineSpacing: 7, strokeThickness: 3 });
      MG.drawStars(this, W / 2, by + 236, 3, 8);

      const aneY = bottom - 40;
      const ane = G.ui.ane(this, 64, aneY, 'stand', 0.75);
      this.time.addEvent({ delay: 420, loop: true, callback: () => this.tweens.add({ targets: ane, y: aneY - 10, duration: 110, yoyo: true }) });
      const go = () => this.scene.start('MemoryGame');
      G.ui.button(this, W / 2 + 40, aneY - 40, '¡A embarcar!', go, 200, 44);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    }
  }
  MG.scenes.push(MemoryStart);
})(window.AneGame);
