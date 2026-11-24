/*
 * Mapa del mundo estilo SNES: vertical, se recorre de abajo (día 1) a arriba (¡30!).
 * Toca un nodo para que Ane camine hasta él; "¡Jugar!" entra en el minijuego.
 * Arrastra arriba/abajo para desplazar el mapa.
 *
 * Detalles: el destino de HOY lleva anillo pulsante y etiqueta; los superados, un mini sello
 * del pasaporte y el tramo de camino ya recorrido marcado con puntos; el ¡30! brilla y
 * muestra la cuenta atrás. Gaviotas y barcos dan vida al mapa.
 */
(function (G) {
  const STEP = 190;                    // separación vertical entre nodos
  const XS = [128, 232];               // zigzag del camino
  const AT_KEY = 'ane.map.at';
  const ANE_S = 0.64;                  // escala de Ane de pie (sprite de 112 px -> ~72 px)
  const ANE_RUN_S = ANE_S * 1.2;       // los sprites de carrera/salto miden ~93 px
  const DOT_GAP = 11;                  // separación de los puntos del camino recorrido

  /** Días entre dos fechas AAAA-MM-DD (b - a). */
  const daysBetween = (a, b) => {
    const t = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
    return Math.round((t(b) - t(a)) / 86400000);
  };
  /** Interpolación lineal por tramos (para seguir el cauce de la ría). */
  const lerpTable = (xs, ys, x) => {
    if (x <= xs[0]) return ys[0];
    for (let k = 1; k < xs.length; k++) if (x <= xs[k]) return ys[k - 1] + (ys[k] - ys[k - 1]) * (x - xs[k - 1]) / (xs[k] - xs[k - 1]);
    return ys[ys.length - 1];
  };

  class MapScene extends Phaser.Scene {
    constructor() { super('Map'); }

    create(data = {}) {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H; this.builtH = H;
      G.showTiltButton(false);
      const nodes = G.MAP.nodes, N = nodes.length;
      this.panelH = 112 + G.safe.bottom;
      this.worldH = Math.max(H, 210 + (N - 1) * STEP + 240) + this.panelH - 112;
      const baseY = this.worldH - this.panelH - 96;
      this.pts = nodes.map((n, i) => new Phaser.Math.Vector2(n.final ? W / 2 : XS[i % 2], baseY - i * STEP));
      this.spline = new Phaser.Curves.Spline(this.pts);
      this.todayIdx = nodes.findIndex(n => n.date === G.unlock.today());
      this.makeTextures();

      this.drawWorld();
      this.trail = [];
      this.nodeViews = nodes.map((n, i) => this.makeNode(n, i));
      // Al volver de un juego recién superado, su sello y su tramo de camino aparecen con animación
      this.fresh = data.completed ? nodes.findIndex(n => n.id === data.completed) : -1;
      this.paintTrail();
      this.nodeViews.forEach((v, i) => this.paintNode(v, i));
      this.makeFinalGlow();
      this.makeLife();

      // Ane: en el último nodo visitado (o en el que se acaba de superar)
      let at = Phaser.Math.Clamp(parseInt(G.store.get(AT_KEY) || '0', 10) || 0, 0, N - 1);
      if (data.completed) at = Math.max(0, nodes.findIndex(n => n.id === data.completed));
      if (!G.unlock.isUnlocked(at)) at = 0;
      this.at = at; this.focus = at; this.walking = false;
      const p = this.pts[at];
      this.shadow = this.add.ellipse(p.x, p.y + 6, 36, 9, 0x000000, 0.28).setDepth(29);
      this.ane = G.ui.ane(this, p.x, p.y + 6, 'stand', ANE_S).setDepth(30);
      this.startIdle();

      const cam = this.cameras.main;
      cam.setBounds(0, 0, W, this.worldH);
      cam.centerOn(W / 2, p.y - 40);

      this.buildHud();
      this.buildPassportButton();
      this.buildPanel();
      this.refreshPanel();
      this.setupInput();

      if (data.completed) this.time.delayedCall(350, () => this.celebrate(at));
      // Sellos nuevos del pasaporte (juegos superados cuya animación no se ha visto)
      const pending = G.story.pendingStamps();
      if (pending.length) this.time.delayedCall(data.completed ? 2900 : 700, () => this.openPassport(pending));
      else if (!data.completed) this.time.delayedCall(600, () => this.announceNewDay());
    }

    // ---------- Texturas pequeñas generadas (pixel art) ----------
    makeTextures() {
      G.ui.makeCloud(this);
      const px = (key, rows, C, k = 1) => {
        if (this.textures.exists(key)) return;
        const g = this.make.graphics({ add: false });
        rows.forEach((r, y) => [...r].forEach((ch, x) => { if (C[ch] != null) g.fillStyle(C[ch], 1).fillRect(x * k, y * k, k, k); }));
        g.generateTexture(key, rows[0].length * k, rows.length * k); g.destroy();
      };
      // punto del camino recorrido (coral con contorno)
      px('map-dot', ['.KKKK.', 'KwccsK', 'KccccK', 'KccccK', 'KscccK', '.KKKK.'], { K: 0x1b1430, c: 0xf05a3c, w: 0xffc0a0, s: 0xc23e26 });
      // destello de 4 puntas (¡30!)
      px('map-spark', ['...w...', '...w...', '..wyw..', 'wwyyyww', '..wyw..', '...w...', '...w...'], { w: 0xffffff, y: 0xffd23f });
      // gaviota, dos fotogramas de aleteo
      px('map-gull-a', ['K.......K', 'wK.....Kw', '.wK...Kw.', '..wKwKw..', '....K....'], { K: 0x1b1430, w: 0xffffff });
      px('map-gull-b', ['.........', '.........', 'KwwKwKwwK', '...wKw...', '....K....'], { K: 0x1b1430, w: 0xffffff });
      // velero (mira a la derecha)
      px('map-boat', [
        '......K.....', '.....KwK....', '.....KwwK...', '.....KwwwK..', '.....KwwwwK.', '.....KKKKKKK',
        'KKKKKKKKKKKK', 'KwwwwwwwwwwK', '.KrrrrrrrrK.', '..KKKKKKKK..',
      ], { K: 0x1b1430, w: 0xffffff, r: 0xf05a3c });
      // halo suave (luz del ¡30! y del destino de hoy)
      if (!this.textures.exists('map-glow')) {
        const t = this.textures.createCanvas('map-glow', 96, 96), ctx = t.getContext();
        const gr = ctx.createRadialGradient(48, 48, 2, 48, 48, 48);
        gr.addColorStop(0, 'rgba(255,235,150,1)'); gr.addColorStop(0.45, 'rgba(255,210,63,0.55)'); gr.addColorStop(1, 'rgba(255,210,63,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, 96, 96); t.refresh();
      }
    }

    // ---------- Mundo ----------
    /** Fondo pintado (tools_make_map_bg.py): terreno, ría, mar, camino, mesetas y decorado ya integrados. */
    drawWorld() {
      const W = this.W, bg = G.MAP_BG, dy = this.pts[0].y - bg.base;   // dy = safe.bottom
      this.bgDy = dy;
      const col = c => Phaser.Display.Color.GetColor(c[0], c[1], c[2]);
      if (dy > 0) this.add.rectangle(0, 0, W, dy, col(bg.top)).setOrigin(0).setDepth(0);
      const below = this.worldH - (dy + bg.h);
      if (below > 0) this.add.rectangle(0, dy + bg.h, W, below, col(bg.bottom)).setOrigin(0).setDepth(0);
      this.add.image(0, dy, 'map-bg').setOrigin(0).setDepth(0);
      // brillos del agua (mar y ría)
      const rnd = new Phaser.Math.RandomDataGenerator(['ane30']);
      bg.glints.forEach(([x, y]) => {
        const s = this.add.rectangle(x, y + dy, rnd.pick([4, 6]), 2, 0xe6f6ff).setDepth(1).setAlpha(0);
        this.tweens.add({ targets: s, alpha: 0.9, duration: 500, yoyo: true, repeat: -1,
          delay: rnd.between(0, 3000), repeatDelay: rnd.between(1200, 3600), hold: 200 });
      });
      // nubes pixeladas a la deriva (con su sombra) sobre la costa
      this.makeMapCloud();
      for (let k = 0; k < 4; k++) {
        const y = rnd.between(40, 560) + dy, x = rnd.between(-40, W), dur = rnd.between(38000, 60000);
        const sh = this.add.image(x + 10, y + 34, 'map-cloud').setTint(0x1b1430).setAlpha(0.16).setDepth(2);
        const c = this.add.image(x, y, 'map-cloud').setAlpha(0.92).setDepth(3);
        const drift = () => {
          const from = c.x, d = dur * (W + 80 - from) / (W + 160);
          this.tweens.add({ targets: [c, sh], x: `+=${W + 80 - from}`, duration: d, ease: 'Linear', onComplete: () => {
            c.x = -80; sh.x = -70; drift();
          } });
        };
        drift();
      }
    }

    makeMapCloud() {
      if (this.textures.exists('map-cloud')) return;
      const rows = ['.....oooo.........', '...ooxxxxoo.ooo...', '..oxxxxxxxxoxxxo..', '.oxxxxxxxxxxxxxxo.',
        'oxxxxxxxxxxxxxxxxo', 'oxxxxxxxxxxxxxxbxo', '.obbxxxxxxxxxbbbo.', '..oobbbbbbbbbboo..', '....oooooooooo....'];
      const g = this.make.graphics({ add: false }), C = { o: 0x9fb4d8, x: 0xffffff, b: 0xd8e6f5 };
      rows.forEach((r, y) => [...r].forEach((ch, x) => { if (C[ch]) g.fillStyle(C[ch], 1).fillRect(x * 2, y * 2, 2, 2); }));
      g.generateTexture('map-cloud', rows[0].length * 2, rows.length * 2); g.destroy();
    }

    /** Vida: barcos por la ría y el canal, y gaviotas que cruzan de vez en cuando. */
    makeLife() {
      const W = this.W, dy = this.bgDy;
      // Barcos (coordenadas del fondo: cauce de la ría y canal entre islas)
      const boat = (yAt, dur, dir, delay) => {
        const b = this.add.image(0, 0, 'map-boat').setDepth(1.5).setFlipX(dir < 0);
        const wake = this.add.rectangle(0, 0, 3, 1, 0xe6f6ff).setDepth(1.4);
        const run = () => {
          this.tweens.addCounter({ from: 0, to: 1, duration: dur, delay, onUpdate: tw => {
            const u = tw.getValue(), x = dir > 0 ? -20 + u * (W + 40) : W + 20 - u * (W + 40);
            const bob = Math.round(Math.sin(u * 60) * 0.6);
            b.setPosition(Math.round(x), Math.round(yAt(x) + dy - 4 + bob));
            wake.setPosition(Math.round(x - dir * 9), Math.round(yAt(x) + dy + 1)).setAlpha(0.4 + 0.5 * Math.abs(Math.sin(u * 40)));
          }, onComplete: () => { delay = 2500; run(); } });
        };
        run();
      };
      boat(x => lerpTable([0, 100, 250, 360], [1443, 1441, 1424, 1428], x), 42000, 1, 0);
      boat(() => 910, 52000, -1, 6000);
      boat(() => 692, 47000, 1, 15000);

      // Gaviotas: pequeñas bandadas que cruzan la zona visible
      this.gulls = [];
      this.time.addEvent({ delay: 220, loop: true, callback: () => {
        this.gullFlap = !this.gullFlap;
        this.gulls.forEach(g => g.setTexture(this.gullFlap ? 'map-gull-a' : 'map-gull-b'));
      } });
      const flock = () => {
        const cam = this.cameras.main, dir = Math.random() < 0.5 ? 1 : -1;
        const y0 = cam.scrollY + Phaser.Math.Between(G.safe.top + 90, this.H - this.panelH - 60);
        const n = Phaser.Math.Between(1, 3), dur = Phaser.Math.Between(9000, 13000);
        for (let k = 0; k < n; k++) {
          const g = this.add.image(dir > 0 ? -20 - k * 16 : W + 20 + k * 16, y0 + k * 9 - (k ? 6 : 0), 'map-gull-a').setDepth(26).setScale(2);
          this.gulls.push(g);
          this.tweens.add({ targets: g, x: `+=${dir * (W + 80)}`, duration: dur, onComplete: () => {
            Phaser.Utils.Array.Remove(this.gulls, g); g.destroy();
          } });
          this.tweens.add({ targets: g, y: g.y - 10, duration: 1400 + k * 200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
        this.time.delayedCall(Phaser.Math.Between(7000, 12000), flock);
      };
      this.time.delayedCall(2500, flock);
    }

    // ---------- Nodos ----------
    /** Posición del icono del nodo i (al lado del punto, hacia fuera). */
    iconPos(i) {
      const p = this.pts[i], n = G.MAP.nodes[i];
      if (n.final) return { x: p.x, y: p.y - 70 };
      return { x: p.x < this.W / 2 ? p.x - 60 : p.x + 60, y: p.y - 26 };
    }

    /** Pastilla oscura con texto (etiquetas de nombre, fecha, HOY...). Devuelve un contenedor. */
    pill(x, y, str, size, color, fill = 0x1b1430, border = 0xffffff, alpha = 0.82) {
      const c = this.add.container(x, y);
      const t = G.ui.text(this, 0, 0, str, size, color, { strokeThickness: 0 });
      t.setShadow(0, 1, '#000', 0, false, true);
      const w = Math.ceil(t.width) + 10, h = size + 8;
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3).fillRoundedRect(-w / 2, -h / 2 + 2, w, h, 4);
      g.fillStyle(fill, alpha).fillRoundedRect(-w / 2, -h / 2, w, h, 4);
      g.lineStyle(1, border, 0.55).strokeRoundedRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 4);
      t.y = 1;
      c.add([g, t]); c.w = w; c.text = t;
      // que no se salga por los lados
      c.x = Phaser.Math.Clamp(x, w / 2 + 3, this.W - w / 2 - 3);
      return c;
    }

    makeNode(n, i) {
      const p = this.pts[i], ip = this.iconPos(i);
      const icon = this.add.image(ip.x, ip.y, n.icon).setDepth(5);
      const label = n.final ? null : this.pill(ip.x, ip.y + icon.height / 2 + 7, n.name, 8, n.nameColor || '#ffffff').setDepth(6);
      const ring = this.add.graphics().setDepth(3.5).setPosition(p.x, p.y);
      const marker = this.add.graphics().setDepth(4);
      const lock = this.add.image(p.x, p.y - 1, 'padlock').setScale(2).setDepth(7);
      const side = Math.sign(ip.x - p.x);
      let date;
      if (n.final) {
        // cuenta atrás bajo el ¡30!
        const left = daysBetween(G.unlock.today(), n.date);
        const str = left > 0 ? G.T.map.finalCountdown(left) : left === 0 ? G.T.map.finalToday : '';
        date = str ? this.pill(p.x, p.y + 26, str, 9, '#ffd23f', 0x7a1630, 0xffd23f, 0.92).setDepth(7) : null;
        this.finalLeft = left;
      } else {
        date = this.pill(p.x - side * 44, p.y + 2, G.unlock.prettyDate(n.date), 9, '#ffd23f').setDepth(7);
      }
      const ay = ip.y - icon.height / 2 - 6;
      const arrow = this.add.graphics({ x: ip.x, y: ay }).setDepth(8)
        .fillStyle(0x1b1430, 1).fillTriangle(-8, -9, 8, -9, 0, 3)
        .fillStyle(0xffd23f, 1).fillTriangle(-6, -8, 6, -8, 0, 0)
        .fillStyle(0xffffff, 1).fillRect(-4, -7, 3, 2);
      // Destino de HOY: etiqueta coral sobre la flecha y anillo pulsante alrededor del punto
      let today = null;
      if (i === this.todayIdx) {
        today = this.pill(ip.x, ay - 22, G.T.map.today, 9, '#ffffff', 0xf05a3c, 0xffffff, 1).setDepth(8);
        this.tweens.add({ targets: today, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        ring.lineStyle(3, 0xffd23f, 1).strokeEllipse(0, 0, 40, 25);
        this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 1300, repeat: -1, ease: 'Sine.out' });
      }
      const v = { icon, label, marker, lock, date, arrow, arrowY: ay, pulse: null, today, ring, side, badge: null };
      return v;
    }

    paintNode(v, i) {
      const p = this.pts[i], n = G.MAP.nodes[i];
      const open = G.unlock.isUnlocked(i), done = G.progress.isCompleted(n.id);
      const col = done ? 0xf05a3c : open ? 0xffd23f : 0x8a8a9a;
      v.marker.clear()
        .fillStyle(0x1b1430, 1).fillEllipse(p.x, p.y + 3, 34, 22)
        .fillStyle(col, 1).fillEllipse(p.x, p.y, 30, 18)
        .fillStyle(0xffffff, 0.55).fillEllipse(p.x - 5, p.y - 3, 10, 5);
      v.icon.setTint(open || n.final ? 0xffffff : 0xa4a4b4);   // el ¡30! siempre a todo color: es la meta
      v.lock.setVisible(!open);
      if (v.date) v.date.setVisible(n.final || !open);
      if (v.label) v.label.text.setColor(open ? (n.nameColor || '#ffffff') : '#c8c8d8');
      // Superado: mini sello del pasaporte junto al punto (al lado contrario del icono)
      if (done && !n.final && !v.badge) v.badge = this.makeBadge(n.id, p.x - v.side * 38, p.y - 8);
      if (v.badge) v.badge.setVisible(done && i !== this.fresh);
      if (v.pulse) { v.pulse.remove(); v.pulse = null; }
      v.arrow.setVisible(open && !done).setY(v.arrowY);
      if (open && !done) v.pulse = this.tweens.add({ targets: v.arrow, y: v.arrowY - 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    /** Sello en miniatura sobre un disco de papel (sin el nombre, que a este tamaño no se lee). */
    makeBadge(id, x, y) {
      const c = this.add.container(x, y).setDepth(6);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.3).fillCircle(1, 3, 17);
      g.fillStyle(0xf3e6c8, 1).fillCircle(0, 0, 17);
      g.lineStyle(2, 0x1b1430, 1).strokeCircle(0, 0, 17);
      const st = G.story.stamp(this, 0, 0, id, 13);
      st.each(o => {
        if (o.type === 'Text') o.setVisible(false);
        else if (o.type === 'Image') { o.y = 0; o.setScale(Math.min(17 / o.width, 14 / o.height)); }
      });
      c.add([g, st]);
      return c;
    }

    /** Puntos de colores sobre el tramo ya recorrido: del nodo superado i al siguiente. */
    segmentDots(i) {
      const N = this.pts.length, a = i / (N - 1), b = (i + 1) / (N - 1);
      const out = [];
      let prev = this.spline.getPoint(a), acc = 0;
      for (let k = 1; k <= 120; k++) {
        const q = this.spline.getPoint(a + (b - a) * k / 120);
        acc += Phaser.Math.Distance.BetweenPoints(prev, q); prev = q;
        if (acc < DOT_GAP) continue;
        acc = 0;
        // sin pisar los puntos de los nodos
        if (Phaser.Math.Distance.BetweenPoints(q, this.pts[i]) < 22 || Phaser.Math.Distance.BetweenPoints(q, this.pts[i + 1]) < 22) continue;
        out.push(q);
      }
      return out;
    }

    paintTrail() {
      this.trail.forEach(d => d.destroy());
      this.trail = [];
      const nodes = G.MAP.nodes;
      for (let i = 0; i < nodes.length - 1; i++) {
        if (!G.progress.isCompleted(nodes[i].id) || i === this.fresh) continue;
        this.segmentDots(i).forEach(q => this.trail.push(this.add.image(Math.round(q.x), Math.round(q.y), 'map-dot').setDepth(3)));
      }
    }

    /** Halo y destellos del ¡30!: más intensos según se acerca el 10 de diciembre. */
    makeFinalGlow() {
      const i = G.MAP.nodes.findIndex(n => n.final);
      if (i < 0) return;
      const ip = this.iconPos(i), left = this.finalLeft ?? 99;
      const near = left <= 7;                     // la última semana (desde el día 1) se nota más
      const glow = this.add.image(ip.x, ip.y + 4, 'map-glow').setDepth(4.5).setBlendMode(Phaser.BlendModes.ADD)
        .setScale(near ? 1.9 : 1.5).setAlpha(near ? 0.6 : 0.35);
      this.tweens.add({ targets: glow, scale: glow.scale * 1.15, alpha: glow.alpha + 0.2, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const icon = this.nodeViews[i].icon;
      this.tweens.add({ targets: icon, y: icon.y - 3, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.time.addEvent({ delay: left <= 0 ? 220 : near ? 380 : 900, loop: true, callback: () => {
        const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(34, 60);
        const s = this.add.image(ip.x + Math.cos(a) * r, ip.y + Math.sin(a) * r * 0.9, 'map-spark').setDepth(9).setScale(0);
        this.tweens.add({ targets: s, scale: Phaser.Math.Between(1, 2), angle: 90, duration: 420, yoyo: true, ease: 'Sine.inOut', onComplete: () => s.destroy() });
      } });
    }

    // ---------- Ane ----------
    /** Reposo: respira (estira un poco el sprite) y de vez en cuando mira a los lados o da un saltito. */
    startIdle() {
      this.stopIdle();
      this.ane.setPose('stand').setScale(ANE_S).setFlip(false);
      this.shadow.setScale(1);
      this.idleTw = this.tweens.add({ targets: this.ane, scaleY: ANE_S * 1.035, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const next = () => {
        this.idleEv = this.time.delayedCall(Phaser.Math.Between(4500, 8000), () => {
          if (this.walking || this.scene.isPaused()) return next();
          if (Math.random() < 0.55) {         // mira al otro lado y vuelve
            this.ane.setFlip(!this.ane.flip);
            this.time.delayedCall(1300, () => { if (!this.walking) this.ane.setFlip(false); });
          } else this.hop(false);
          next();
        });
      };
      next();
    }

    stopIdle() {
      if (this.idleTw) { this.idleTw.remove(); this.idleTw = null; }
      if (this.idleEv) { this.idleEv.remove(); this.idleEv = null; }
    }

    /** Saltito en el sitio (con pose de salto o de celebrar). */
    hop(cheer) {
      if (this.walking || this.hopping) return;
      this.hopping = true;
      const y = this.ane.y;
      this.ane.setPose(cheer ? 'celebrate' : 'jump').setScale(cheer ? ANE_S : ANE_RUN_S);
      this.tweens.add({ targets: this.ane, y: y - (cheer ? 18 : 12), duration: 170, yoyo: true, repeat: cheer ? 2 : 0, ease: 'Quad.out',
        onComplete: () => {
          this.hopping = false; this.ane.y = y;
          if (!this.walking) { this.ane.setPose('stand'); this.ane.setScale(ANE_S); this.startIdle(); }
        } });
      this.tweens.add({ targets: this.shadow, scale: 0.7, duration: 170, yoyo: true, repeat: cheer ? 2 : 0 });
    }

    // ---------- HUD y panel ----------
    buildHud() {
      const top = G.safe.top;
      const bar = this.add.graphics().setScrollFactor(0).setDepth(90);
      const barH = top + (G.TEST || G.FAKE_TODAY ? 62 : 44);
      bar.fillStyle(0x1b1430, 0.8).fillRect(0, 0, this.W, barH);
      bar.fillStyle(0x1b1430, 0.35).fillRect(0, barH, this.W, 2);
      this.title = G.ui.text(this, 12, top + 16, G.MAP.title, 11, '#ffd23f', { ox: 0 }).setScrollFactor(0).setDepth(91);
      const done = G.MAP.nodes.filter(n => G.progress.isCompleted(n.id)).length;
      this.count = G.ui.text(this, 12, top + 34, `${G.T.map.done}: ${done}/${G.MAP.nodes.length - 1}`, 8, '#ffffff', { ox: 0, strokeThickness: 3 }).setScrollFactor(0).setDepth(91);
      if (G.TEST || G.FAKE_TODAY) {
        const lbl = G.FAKE_TODAY ? `PRUEBA · HOY = ${G.unlock.prettyDate(G.FAKE_TODAY)}` : 'MODO PRUEBA';
        G.ui.text(this, 12, top + 52, lbl, 7, '#ff5a5a', { ox: 0, strokeThickness: 3 }).setScrollFactor(0).setDepth(91);
        const reset = G.ui.text(this, this.W - 12, top + 52, '[Borrar progreso]', 7, '#cccccc', { ox: 1, strokeThickness: 3 }).setScrollFactor(0).setDepth(91);
        reset.setInteractive({ useHandCursor: true }).on('pointerup', () => {
          G.store.remove('ane.progress.v1'); G.store.remove(AT_KEY); G.store.remove('ane.map.newSeen'); G.story.reset(); this.scene.restart({});
        });
      }
    }

    /** Botón del pasaporte (arriba a la derecha, a la izquierda del botón de sonido). */
    buildPassportButton() {
      // Píldora dentro de la barra superior: [libreta] Pasaporte / n/7
      const w = 100, h = 34, x = this.W - 48 - w / 2, y = G.safe.top + 22;
      const c = this.add.container(x, y).setScrollFactor(0).setDepth(92);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 8);
      g.fillStyle(0x7a1630, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
      g.lineStyle(2, 0xffd23f, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
      const ic = this.add.image(-w / 2 + 16, 0, 'st-passport').setScale(0.5);
      const lb = G.ui.text(this, -w / 2 + 31, -6, G.T.passport.mapButton, 7, '#ffffff', { ox: 0, strokeThickness: 3 });
      const n = G.story.stamps().length;
      const cnt = G.ui.text(this, -w / 2 + 31, 7, `${n}/${G.story.IDS.length}`, 7, '#ffd23f', { ox: 0, strokeThickness: 3 });
      c.add([g, ic, lb, cnt]);
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => { G.sfx.click(); this.openPassport([]); });
      this.passportBtn = c;
    }

    openPassport(stamps) {
      if (this.scene.isActive('Passport') || this.walking) return;
      this.scene.pause();
      this.scene.launch('Passport', { stamps });
    }

    /** Al cerrar el pasaporte: repinta nodos y camino (el ¡30! puede haberse abierto). */
    refreshAll() {
      this.fresh = -1;
      this.nodeViews.forEach((v, i) => this.paintNode(v, i));
      this.paintTrail();
      this.refreshPanel();
    }

    buildPanel() {
      const W = this.W, H = this.H, y0 = H - this.panelH;
      const g = this.add.graphics().setScrollFactor(0).setDepth(100);
      g.fillStyle(0x1b1430, 0.94).fillRect(0, y0, W, this.panelH);
      g.fillStyle(0xffffff, 1).fillRect(0, y0, W, 3);
      g.fillStyle(0xf05a3c, 1).fillRect(0, y0 + 3, W, 2);
      g.fillStyle(0xffffff, 0.05).fillRect(0, y0 + 5, W, 22);
      const o = { ox: 0, oy: 0, strokeThickness: 3 };
      this.pDay = G.ui.text(this, 14, y0 + 14, '', 8, '#9fd3ff', o).setScrollFactor(0).setDepth(101);
      this.pName = G.ui.text(this, 14, y0 + 30, '', 11, '#ffd23f', o).setScrollFactor(0).setDepth(101);
      this.pGame = G.ui.text(this, 14, y0 + 50, '', 8, '#ffffff', o).setScrollFactor(0).setDepth(101);
      this.pState = G.ui.text(this, 14, y0 + 68, '', 8, '#3bd16f', o).setScrollFactor(0).setDepth(101);
      this.pBest = G.ui.text(this, 14, y0 + 86, '', 8, '#ffd23f', o).setScrollFactor(0).setDepth(101);
      // miniatura del destino a la derecha cuando no se puede jugar desde aquí
      this.pIcon = this.add.image(W - 62, y0 + 56, G.MAP.nodes[0].icon).setScrollFactor(0).setDepth(101);
      this.play = G.ui.button(this, W - 70, y0 + 54, G.T.map.play, () => this.enter(), 112, 44).setScrollFactor(0).setDepth(102);
    }

    refreshPanel() {
      const i = this.focus, n = G.MAP.nodes[i], M = G.T.map;
      const open = G.unlock.isUnlocked(i), done = G.progress.isCompleted(n.id);
      this.pDay.setText(M.dayLabel(n.day, G.unlock.prettyDate(n.date)));
      this.pName.setText(n.name).setColor(n.nameColor || '#ffd23f');
      this.pGame.setText(`${n.game} · ${n.place}`);
      if (!open) this.pState.setText(`${M.closed} · ${G.unlock.reason(i)}`).setColor('#ff8080');
      else if (done) this.pState.setText(M.completed).setColor('#3bd16f');
      else this.pState.setText(n.scene || n.final ? M.available : M.soon).setColor('#ffd23f');
      const best = done ? G.progress.best(n.id) : 0;
      this.pBest.setText(best > 0 ? M.record(best) : '');
      const canPlay = open && i === this.at && !this.walking;
      this.play.setVisible(canPlay);
      this.pIcon.setTexture(n.icon).setVisible(!canPlay && !this.walking).setTint(open ? 0xffffff : 0x8a8a9a);
      this.pIcon.setScale(Math.min(76 / this.pIcon.width, 74 / this.pIcon.height));
      this.pGame.setWordWrapWidth(canPlay ? 210 : 255);   // sin pisar el botón ni la miniatura
      // Si "juego · lugar" no cabe en una línea, se muestra solo el juego (no pisa el estado).
      if (this.pGame.getWrappedText().length > 1) this.pGame.setText(n.game);
    }

    // ---------- Entrada ----------
    setupInput() {
      let startY = 0, startScroll = 0, dragging = false;
      const cam = this.cameras.main;
      this.input.on('pointerdown', p => { startY = p.y; startScroll = cam.scrollY; dragging = false; });
      this.input.on('pointermove', p => {
        if (!p.isDown) return;
        if (Math.abs(p.y - startY) > 8) dragging = true;
        if (dragging) cam.scrollY = Phaser.Math.Clamp(startScroll - (p.y - startY), 0, this.worldH - this.H);
      });
      this.input.on('pointerup', p => {
        if (dragging || p.y > this.H - this.panelH || p.y < G.safe.top + 50) return;   // panel y barra superior
        const wp = cam.getWorldPoint(p.x, p.y);
        const i = this.pts.findIndex((pt, k) => {
          const ip = this.iconPos(k);
          return Phaser.Math.Distance.Between(wp.x, wp.y, pt.x, pt.y) < 36 ||
            (Math.abs(wp.x - ip.x) < 48 && Math.abs(wp.y - ip.y) < 50);
        });
        if (i >= 0) this.select(i);
      });
      this.input.keyboard.on('keydown-UP', () => this.select(Math.min(this.at + 1, this.pts.length - 1)));
      this.input.keyboard.on('keydown-DOWN', () => this.select(Math.max(this.at - 1, 0)));
      this.input.keyboard.on('keydown-ENTER', () => this.play.visible && this.enter());
    }

    select(i) {
      if (this.walking) return;
      this.focus = i;
      if (!G.unlock.isUnlocked(i)) {
        G.sfx.locked();
        const v = this.nodeViews[i];
        this.tweens.add({ targets: v.lock, x: v.lock.x + 4, duration: 50, yoyo: true, repeat: 3 });
        this.refreshPanel();
        return;
      }
      if (i === this.at) { this.refreshPanel(); this.hop(false); return; }
      this.walkTo(i);
    }

    walkTo(i) {
      const N = this.pts.length, from = this.at / (N - 1), to = i / (N - 1);
      this.stopIdle();
      this.tweens.killTweensOf(this.ane); this.hopping = false;
      this.walking = true; this.refreshPanel();
      let lastX = this.ane.x, frame = 0;
      const step = this.time.addEvent({ delay: 100, loop: true, callback: () => {
        frame = (frame + 1) % 4; this.ane.setPose('runc' + (frame + 1)); if (frame % 2 === 0) G.sfx.step();
      } });
      this.ane.setPose('runc1').setScale(ANE_RUN_S);
      this.tweens.addCounter({
        from, to, duration: Math.abs(i - this.at) * 700, ease: 'Sine.inOut',
        onUpdate: tw => {
          const p = this.spline.getPoint(tw.getValue());
          if (Math.abs(p.x - lastX) > 0.3) this.ane.setFlip(p.x < lastX);
          lastX = p.x;
          this.ane.setPosition(p.x, p.y + 6); this.shadow.setPosition(p.x, p.y + 6);
          this.cameras.main.centerOn(this.W / 2, p.y - 40);
        },
        onComplete: () => {
          step.remove(); this.walking = false; this.at = i; this.focus = i;
          G.store.set(AT_KEY, String(i));
          this.startIdle();
          this.refreshPanel();
          // pequeño "plof" de polvo al llegar
          const p = this.pts[i];
          for (let k = -1; k <= 1; k += 2) {
            const d = this.add.ellipse(p.x + k * 8, p.y + 6, 8, 5, 0xfff4d6, 0.9).setDepth(29);
            this.tweens.add({ targets: d, x: d.x + k * 14, y: d.y - 4, alpha: 0, scale: 1.6, duration: 380, onComplete: () => d.destroy() });
          }
        },
      });
    }

    enter() {
      const n = G.MAP.nodes[this.at];
      if (!G.unlock.isUnlocked(this.at)) return;
      G.store.set(AT_KEY, String(this.at));
      if (n.scene) this.scene.start(n.scene);
      else this.scene.start('Soon', { index: this.at });
    }

    /** Al volver de un juego superado: estrellas, sello en el mapa, camino marcado y anuncio del siguiente destino. */
    celebrate(i) {
      const p = this.pts[i], v = this.nodeViews[i];
      G.sfx.unlock();
      this.hop(true);
      for (let k = 0; k < 14; k++) {
        const s = this.add.rectangle(p.x, p.y, 4, 4, Phaser.Utils.Array.GetRandom([0xffd23f, 0xffffff, 0xff3b5c])).setDepth(40);
        const a = (k / 14) * Math.PI * 2;
        this.tweens.add({ targets: s, x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 40, alpha: 0, duration: 700, onComplete: () => s.destroy() });
      }
      // el mini sello cae sobre el mapa
      if (v.badge && this.fresh === i) {
        v.badge.setVisible(true).setScale(2.4).setAlpha(0);
        this.tweens.add({ targets: v.badge, scale: 1, alpha: 1, duration: 320, delay: 250, ease: 'Back.in', onComplete: () => {
          G.sfx.drop(); this.cameras.main.shake(90, 0.003);
        } });
      }
      // el tramo hacia el siguiente destino se marca punto a punto
      if (this.fresh === i && i < this.pts.length - 1) {
        this.segmentDots(i).forEach((q, k) => {
          const d = this.add.image(Math.round(q.x), Math.round(q.y), 'map-dot').setDepth(3).setScale(0);
          this.trail.push(d);
          this.tweens.add({ targets: d, scale: 1, duration: 160, delay: 700 + k * 45, ease: 'Back.out' });
        });
      }
      this.fresh = -1;
      const next = i + 1;
      // (si el siguiente ya está superado, por ejemplo al recuperar un sello atrasado, no se anuncia nada)
      if (next >= this.pts.length || G.progress.isCompleted(G.MAP.nodes[next].id)) return;
      const open = G.unlock.isUnlocked(next);
      const msg = open ? G.T.map.nextOpen : G.T.map.nextOn(G.unlock.reason(next).toLowerCase());
      const t = G.ui.text(this, this.W / 2, G.safe.top + (G.TEST || G.FAKE_TODAY ? 90 : 72), msg, 10, open ? '#ffd23f' : '#ffffff', { wrap: 330 }).setScrollFactor(0).setDepth(95);
      this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 600, onComplete: () => t.destroy() });
      if (open) {
        this.focus = next; this.refreshPanel();
        this.cameras.main.pan(this.W / 2, this.pts[next].y + 20, 900, 'Sine.easeInOut');
        this.time.delayedCall(1700, () => { this.cameras.main.pan(this.W / 2, p.y - 40, 700, 'Sine.easeInOut'); this.focus = this.at; this.refreshPanel(); });
      }
    }

    /**
     * Primera vez que se abre el mapa en un día con un destino nuevo: aviso y Ane camina hasta él.
     * Se recuerda el último destino anunciado para no repetirlo cada vez que se vuelve al mapa.
     */
    announceNewDay() {
      if (G.TEST || this.walking || !this.scene.isActive()) return;
      const SEEN = 'ane.map.newSeen';
      let newest = -1;
      G.MAP.nodes.forEach((n, i) => { if (G.unlock.isUnlocked(i)) newest = i; });
      const seen = parseInt(G.store.get(SEEN) || '-1', 10);
      if (newest < 0 || newest <= seen) return;
      G.store.set(SEEN, String(newest));
      if (newest === this.at || G.progress.isCompleted(G.MAP.nodes[newest].id)) return;
      G.sfx.unlock();
      // cartel con fondo (como el de «¡Nuevo sello!») para que se lea sobre el mapa
      const t = this.add.container(this.W / 2, G.safe.top + 112).setScrollFactor(0).setDepth(95).setScale(0.5);
      const txt = G.ui.text(this, 0, 0, G.T.map.newDay, 12, '#ffd23f', { strokeThickness: 5, lineSpacing: 8 });
      const bg = this.add.rectangle(0, 0, Math.max(240, txt.width + 32), txt.height + 24, 0x1b1430, 0.92).setStrokeStyle(3, 0xffd23f);
      t.add([bg, txt]);
      this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 500, onComplete: () => t.destroy() });
      this.time.delayedCall(500, () => this.walkTo(newest));
    }

    relayout() { this.scene.restart({}); }
  }
  G.coreScenes.push(MapScene);
})(window.AneGame);
