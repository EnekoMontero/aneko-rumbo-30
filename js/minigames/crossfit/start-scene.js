/* Portada del CrossFit: título, carriles explicados, crédito musical y botón. */
(function (G) {
  const MG = G.minigames.crossfit, CFG = MG.config;

  /** Icono de nota de un carril (reutilizado en portada, juego y botones). */
  MG.noteIcon = (scene, x, y, lane, size = 44) => {
    const c = scene.add.container(x, y);
    const k = MG.config.LANES[lane].key;
    if (k === 'burpee') c.add(scene.add.image(0, 0, 'cf-ic-burpee').setScale(size / 50));
    else if (k === 'box') c.add(scene.add.image(0, 0, 'cf-ic-box').setScale(size / 50));
    else c.add([scene.add.image(0, 0, 'cf-disc-ball').setScale(size / 48), scene.add.image(0, 0, 'cf-ball').setScale(size / 48 * 0.95)]);
    return c;
  };

  class CrossfitStart extends Phaser.Scene {
    constructor() { super('CrossfitStart'); }
    create() {
      MG.makeTextures(this);
      MG.music.load();   // se decodifica mientras se leen las reglas
      G.showTiltButton(false);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      const ty = top + Math.max(78, H * 0.105);
      // fondo desplazado para que el cartel IRUKA (y 138-202 del dibujo) quede entero tras el panel de reglas
      MG.drawBox(this, W, H, ty - 28, 0.35);
      G.ui.backToMap(this);
      G.ui.text(this, W / 2, ty, 'Guitar Hero\nde CrossFit', 20, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      G.ui.text(this, W / 2, ty + 58, 'Día 3 · Box IRUKA CrossFit', 9, '#ffffff');

      const bx = 16, by = ty + 80, bw = W - 32, bh = 274;
      this.add.graphics().fillStyle(0x1b1430, 0.95).fillRoundedRect(bx, by, bw, bh, 10)
        .lineStyle(3, 0xffffff, 1).strokeRoundedRect(bx, by, bw, bh, 10);
      CFG.LANES.forEach((L, i) => {
        const x = bx + bw * (i + 0.5) / 3;
        MG.noteIcon(this, x, by + 34, i, 42);
        G.ui.text(this, x, by + 72, L.label, 8, '#ffffff', { lineSpacing: 5, strokeThickness: 3 });
      });
      G.ui.text(this, W / 2, by + 126, 'Toca el botón de cada\nejercicio cuando su icono\nllegue a la línea', 9, '#ffffff', { lineSpacing: 7, strokeThickness: 3 });
      G.ui.text(this, W / 2, by + 196, `${CFG.ROUNDS} rondas de ${CFG.REPS_PER_ROUND} reps (${CFG.REPS_TO_WIN} en total)\ncon descansos cortos.\nSi lo haces bien, ¡sube el ritmo!`, 9, '#ffd23f', { lineSpacing: 7, strokeThickness: 3 });
      G.ui.text(this, W / 2, by + 252, 'Teclado: A S D · 1 2 3', 8, '#9fe3ff', { strokeThickness: 3 });

      const aneY = bottom - 72;
      const ane = G.ui.ane(this, 70, aneY, 'cf_ready', 0.8);
      let f = 0;
      this.time.addEvent({ delay: 476, loop: true, callback: () => { f ^= 1; ane.setPose(f ? 'cf_squat' : 'cf_ready'); } });
      this.add.image(W - 52, aneY, 'cf-box').setOrigin(0.5, 1).setScale(0.6);
      const go = () => this.scene.start('CrossfitGame');
      G.ui.button(this, W / 2 + 40, aneY - 30, '¡A entrenar!', go, 190, 44);
      G.ui.text(this, W / 2, bottom - 26, CFG.CREDIT, 7, '#d0c8e8', { lineSpacing: 5, strokeThickness: 2 });
      this.input.keyboard.once('keydown-SPACE', go);
      this.input.keyboard.once('keydown-ENTER', go);
    }
  }
  MG.scenes.push(CrossfitStart);
})(window.AneGame);
