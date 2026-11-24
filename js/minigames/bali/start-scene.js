/* Portada de "Nadar en Bali": cómo se juega y botón. */
(function (G) {
  const MG = G.minigames.bali, CFG = MG.config;

  class BaliStart extends Phaser.Scene {
    constructor() { super('BaliStart'); }
    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      MG.drawBackdrop(this, 0.3);
      G.ui.backToMap(this);
      const ty = top + Math.max(78, H * 0.105);
      G.ui.text(this, W / 2, ty, 'Nadar\nen Bali', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, ty + 60, 'Día 5 · Bali, Indonesia', 9, '#ffffff');

      const bx = 14, by = ty + 80, bw = W - 28, bh = 276;
      this.add.graphics().fillStyle(0x1b1430, 0.88).fillRoundedRect(bx, by, bw, bh, 10)
        .lineStyle(3, 0xffffff, 1).strokeRoundedRect(bx, by, bw, bh, 10);
      // Buenas (tortuga) a la izquierda; malas (Komodo y medusa) a la derecha
      const iy = by + 40;
      const tt = this.add.image(bx + 62, iy, 'bl-turtle1').setScale(0.9);
      this.tweens.add({ targets: tt, angle: 8, y: iy - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      G.ui.text(this, bx + 62, iy + 36, '¡SÍ!', 10, '#7ee07e', { strokeThickness: 4 });
      const kd = this.add.image(bx + bw - 122, iy, 'bl-komodo1').setScale(0.6).setAngle(-90);
      this.time.addEvent({ delay: 260, loop: true, callback: () => kd.setTexture(kd.texture.key === 'bl-komodo1' ? 'bl-komodo2' : 'bl-komodo1') });
      const jf = this.add.image(bx + bw - 46, iy - 2, 'bl-jelly1').setScale(1.2);
      this.time.addEvent({ delay: 380, loop: true, callback: () => jf.setTexture(jf.texture.key === 'bl-jelly1' ? 'bl-jelly2' : 'bl-jelly1') });
      this.tweens.add({ targets: jf, y: iy - 8, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      G.ui.text(this, bx + bw - 84, iy + 36, '¡NO!', 10, '#ff6b6b', { strokeThickness: 4 });
      const st = { lineSpacing: 8, strokeThickness: 3 };
      G.ui.text(this, W / 2, by + 112, `Nada con las tortugas marinas:\n¡junta ${CFG.TURTLES} para ganar!`, 9, '#ffffff', st);
      G.ui.text(this, W / 2, by + 166, 'Esquiva los dragones de Komodo\ny las medusas: ¡te quitan\nuna vida!', 9, '#ff9f9f', st);
      G.ui.text(this, W / 2, by + 220, 'Arrastra el dedo para nadar', 9, '#ffd23f', st);
      G.ui.text(this, W / 2, by + 250, 'Teclado: flechas o W A S D', 9, '#d0c8e8', st);

      const aneY = bottom - 40;
      const ane = G.ui.ane(this, 64, aneY, 'stand', 0.75);
      this.time.addEvent({ delay: 420, loop: true, callback: () => this.tweens.add({ targets: ane, y: aneY - 10, duration: 110, yoyo: true }) });
      const go = () => this.scene.start('BaliGame');
      G.ui.button(this, W / 2 + 40, aneY - 40, '¡Al agua!', go, 190, 44);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    }
  }
  MG.scenes.push(BaliStart);
})(window.AneGame);
