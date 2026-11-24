/* Portada de "Torre de lasagna" (Roma): cómo se juega y botón. */
(function (G) {
  const MG = G.minigames.lasagna, CFG = MG.config;

  class LasagnaStart extends Phaser.Scene {
    constructor() { super('LasagnaStart'); }
    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      MG.drawBackdrop(this, 0.4);
      G.ui.backToMap(this);
      const ty = top + Math.max(78, H * 0.105);
      G.ui.text(this, W / 2, ty, 'Torre de\nlasagna', 22, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, ty + 60, 'Día 7 · Roma, junto al Coliseo', 9, '#ffffff');

      const bx = 14, by = ty + 80, bw = W - 28, bh = 250;
      this.add.graphics().fillStyle(0x1b1430, 0.88).fillRoundedRect(bx, by, bw, bh, 10)
        .lineStyle(3, 0xffffff, 1).strokeRoundedRect(bx, by, bw, bh, 10);
      // mini lasagna de ejemplo (a media escala) con una capa que va de lado a lado encima
      const mini = MG.miniLasagna(this, W / 2, by + 84, { n: 5, w: 220, offsets: [0, 0, 0, 0, 0], scale: 0.5 });
      const mv = this.add.tileSprite(-150, mini.topY - 44, 200, CFG.LAYER_H, MG.layerKey(5)).setOrigin(0);
      const mvEdges = this.add.graphics();
      mini.add([mv, mvEdges]);
      this.tweens.add({ targets: mv, x: -50, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut',
        onUpdate: () => MG.drawEdges(mvEdges.clear(), mv.x, mv.y, mv.width) });
      const st = { lineSpacing: 8, strokeThickness: 3 };
      G.ui.text(this, W / 2, by + 136, 'Pasta, ragú y bechamel van\nde lado a lado: toca para soltar', 9, '#ffffff', st);
      G.ui.text(this, W / 2, by + 186, 'Lo que sobresale se corta.\n¡Si no cae encima, se acabó!', 9, '#ff9f9f', st);
      G.ui.text(this, W / 2, by + 228, `${CFG.TARGET} capas y... ¡al horno!`, 9, '#ffd23f', st);

      const aneY = bottom - 40;
      const ane = G.ui.ane(this, 64, aneY, 'stand', 0.75);
      this.time.addEvent({ delay: 420, loop: true, callback: () => this.tweens.add({ targets: ane, y: aneY - 10, duration: 110, yoyo: true }) });
      const go = () => this.scene.start('LasagnaGame');
      G.ui.button(this, W / 2 + 40, aneY - 40, '¡A cocinar!', go, 190, 44);
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    }
  }
  MG.scenes.push(LasagnaStart);
})(window.AneGame);
