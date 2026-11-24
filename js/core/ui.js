/* Utilidades de interfaz pixel-art compartidas entre minijuegos. */
(function (G) {
  /*
   * Zona táctil mínima de 44 px (guía de Apple). Los enlaces de texto ("◀ Mapa", "Jugar otra vez"…)
   * y botones bajos se dibujan igual, pero su zona de toque se amplía centrada hasta 46x46 px lógicos.
   * Se aplica a todo setInteractive({ useHandCursor }) sin hitArea propio de Text y Container.
   */
  const MIN_TAP = 46;
  const origSetInteractive = Phaser.GameObjects.GameObject.prototype.setInteractive;
  Phaser.GameObjects.GameObject.prototype.setInteractive = function (cfg, cb, dropZone) {
    const w = this.width, h = this.height;
    if (cfg && cfg.useHandCursor && !cfg.hitArea && (this.type === 'Text' || this.type === 'Container') && w && h && (w < MIN_TAP || h < MIN_TAP)) {
      const W2 = Math.max(w, MIN_TAP), H2 = Math.max(h, MIN_TAP);
      cfg = { ...cfg, hitArea: new Phaser.Geom.Rectangle((w - W2) / 2, (h - H2) / 2, W2, H2), hitAreaCallback: Phaser.Geom.Rectangle.Contains };
    }
    return origSetInteractive.call(this, cfg, cb, dropZone);
  };

  G.ui = {
    /** Ane (sprite normal). Devuelve un Container con setPose(pose) y setFlip(bool). */
    ane(scene, x, y, pose = 'stand', scale = 1) {
      const c = scene.add.container(x, y);
      c.pose = null; c.flip = false;
      c.setPose = (p) => {
        if (p === c.pose) return c;
        c.pose = p; c.removeAll(true);
        c.add(scene.add.image(0, 0, 'ane-' + p).setOrigin(0.5, 1).setFlipX(c.flip));
        return c;
      };
      c.setFlip = (f) => { c.flip = f; c.each(i => i.setFlipX(f)); return c; };
      c.setPose(pose); c.setScale(scale);
      return c;
    },

    /** Nube pixel-art compartida (mapa y corredor). */
    makeCloud(scene) {
      if (scene.textures.exists('cloud')) return;
      const g = scene.make.graphics({ add: false });
      [[14, 18, 10], [28, 12, 13], [44, 16, 11], [56, 20, 8]].forEach(([x, y, r]) => g.fillStyle(0xd8e6f5, 1).fillCircle(x, y + 3, r));
      [[14, 18, 10], [28, 12, 13], [44, 16, 11], [56, 20, 8]].forEach(([x, y, r]) => g.fillStyle(0xffffff, 1).fillCircle(x, y, r));
      g.generateTexture('cloud', 68, 32); g.destroy();
    },

    /** Enlace pequeño "◀ Mapa" arriba a la izquierda. */
    backToMap(scene, label = '◀ Mapa') {
      const t = G.ui.text(scene, 12, G.safe.top + 22, label, 10, '#ffffff', { ox: 0 }).setDepth(50).setScrollFactor(0);
      let gone = false;
      t.setInteractive({ useHandCursor: true }).on('pointerup', () => { if (gone) return; gone = true; G.sfx.click(); scene.scene.start('Map'); });
      return t;
    },

    /** Texto con fuente pixel, contorno oscuro y sombra. */
    text(scene, x, y, str, size = 12, color = '#ffffff', opts = {}) {
      return scene.add.text(x, y, str, {
        fontFamily: G.FONT, fontSize: size + 'px', color,
        stroke: opts.stroke || '#1b1430', strokeThickness: opts.strokeThickness ?? Math.max(3, size / 3),
        align: opts.align || 'center', lineSpacing: opts.lineSpacing ?? 6,
        wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
        shadow: { offsetX: 0, offsetY: 2, color: '#000', fill: true, stroke: true, blur: 0 },
      }).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5).setResolution(2);
    },

    /** Botón estilo SNES (caja con borde) que llama a onClick. */
    button(scene, x, y, label, onClick, w = 170, h = 40) {
      const c = scene.add.container(x, y);
      const g = scene.add.graphics();
      const draw = (down) => {
        g.clear();
        g.fillStyle(0x1b1430, 1).fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 8);
        g.fillStyle(down ? 0xd9472b : 0xf05a3c, 1).fillRoundedRect(-w / 2, -h / 2 + (down ? 3 : 0), w, h, 8);
        g.lineStyle(3, 0xffffff, 1).strokeRoundedRect(-w / 2, -h / 2 + (down ? 3 : 0), w, h, 8);
      };
      draw(false);
      const t = G.ui.text(scene, 0, 1, label, 14);
      c.add([g, t]);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      // Solo cuenta un toque que EMPIEZA y acaba en el botón (evita toques fantasma al cambiar
      // de escena y segundos dedos), y como mucho uno cada 450 ms (doble toque = una vez).
      let pressed = -1, last = -1e9;
      c.on('pointerdown', (p) => { pressed = p.id; draw(true); t.y = 4; });
      c.on('pointerout', () => { pressed = -1; draw(false); t.y = 1; });
      c.on('pointerup', (p) => {
        draw(false); t.y = 1;
        const ok = pressed === p.id, now = performance.now();
        pressed = -1;
        if (!ok || now - last < 450) return;
        last = now; G.sfx.click(); onClick();
      });
      scene.tweens.add({ targets: c, scale: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      return c;
    },

    /**
     * Fondo a pantalla completa tipo "cover": llena todo el lienzo sea cual sea la
     * proporción del móvil, recortando bordes y dejando centrados los monumentos.
     * Devuelve {img, dim, fit()} para reajustarlo si cambia el tamaño.
     */
    background(scene, key, dim = 0) {
      const img = scene.add.image(0, 0, key);
      const shade = dim ? scene.add.rectangle(0, 0, 10, 10, 0x1b1430, dim).setOrigin(0) : null;
      const fit = () => {
        const { width, height } = scene.scale;
        img.setPosition(width / 2, height / 2).setScale(Math.max(width / img.width, height / img.height));
        if (shade) shade.setSize(width, height);
      };
      fit();
      scene.scale.on('resize', fit);
      scene.events.once('shutdown', () => scene.scale.off('resize', fit));
      return { img, shade, fit };
    },
  };
})(window.AneGame);
