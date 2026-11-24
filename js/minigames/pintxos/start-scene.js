/* Pantalla de inicio (vertical): título, instrucciones y botón Jugar. */
(function (G) {
  const MG = G.minigames.pintxos, CFG = MG.config;

  class PintxosStart extends Phaser.Scene {
    constructor() { super('PintxosStart'); }

    create() {
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      G.ui.background(this, 'bg-zamora', 0.45);

      // Título con rebote (dos líneas para que quepa en vertical)
      // Pantallas bajas (Safari con barra visible): título más arriba y el bloque central se encoge
      const fitEnd = bottom - 92;                                   // encima del botón ¡Jugar!
      const ty = top + (top + Math.max(86, H * 0.12) + 445 > fitEnd ? 80 : Math.max(86, H * 0.12));
      const midY = ty + 70;
      const mid = this.add.container(W / 2, midY);
      const title = G.ui.text(this, W / 2, ty, 'Pintxos\nde Zamora', 26, '#ffd23f', { strokeThickness: 8, lineSpacing: 12 });
      this.tweens.add({ targets: title, y: ty + 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      G.ui.text(this, W / 2, ty + 58, 'Día 1 · Zamora', 9, '#ffffff');

      // Pintxos que flotan: 2 filas (6 pintxos) + el pimiento prohibido
      const py = 40;                                                // coordenadas dentro de "mid"
      CFG.PINTXOS.forEach((p, i) => {
        const x = ((i % 3) - 1) * 84, y = py + Math.floor(i / 3) * 56;
        const s = this.add.image(x, y, 'px-' + p.key).setScale(0.9);
        mid.add(s);
        this.tweens.add({ targets: s, y: y - 6, duration: 700, delay: i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      });
      const pep = this.add.image(0, py + 124, 'px-' + CFG.PEPPER_KEY).setScale(0.8).setAngle(-20);
      this.tweens.add({ targets: pep, angle: 20, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      mid.add([pep, G.ui.text(this, 40, py + 124, '¡NO!', 10, '#ff4040')]);

      // Instrucciones en panel, como el resto de portadas: blanco = objetivo, amarillo = control, rosa = peligro
      const o = { oy: 0, lineSpacing: 7, strokeThickness: 3 };
      const t1 = G.ui.text(this, 0, py + 160, `Atrapa ${CFG.TARGET_PINTXOS} pintxos con el plato.`, 9, '#ffffff', o);
      const t2 = G.ui.text(this, 0, t1.y + t1.height + 12, 'Toca a la izquierda o a la\nderecha para moverte.', 9, '#ffd23f', o);
      const t3 = G.ui.text(this, 0, t2.y + t2.height + 12, '¡Ojo con los pimientos!\nSi se cae un pintxo,\npierdes una vida.', 9, '#ff9f9f', o);
      const pTop = py - 40, pBottom = t3.y + t3.height + 14;
      const panel = this.add.graphics().fillStyle(0x1b1430, 0.86).fillRoundedRect(-164, pTop, 328, pBottom - pTop, 10)
        .lineStyle(3, 0xffffff, 1).strokeRoundedRect(-164, pTop, 328, pBottom - pTop, 10);
      mid.addAt(panel, 0);
      mid.add([t1, t2, t3]);
      mid.setScale(Math.min(1, (fitEnd - midY) / pBottom));

      // Ane en la esquina, botón y récord abajo
      const ane = this.add.image(52, bottom - 8, 'ane-idle').setOrigin(0.5, 1).setScale(0.9);
      this.tweens.add({ targets: ane, scaleY: 0.86, duration: 500, yoyo: true, repeat: -1 });
      const best = G.progress.best(CFG.id);
      if (best) G.ui.text(this, W / 2 + 40, bottom - 22, `Récord: ${best}`, 9, '#ffd23f');

      G.ui.backToMap(this);
      G.showTiltButton(true);
      G.ui.button(this, W / 2 + 40, bottom - 64, '¡Jugar!', () => this.scene.start('PintxosGame'), 170, 44);
      this.input.keyboard.once('keydown-SPACE', () => this.scene.start('PintxosGame'));
      this.input.keyboard.once('keydown-ENTER', () => this.scene.start('PintxosGame'));
    }
  }
  MG.scenes.push(PintxosStart);
})(window.AneGame);
