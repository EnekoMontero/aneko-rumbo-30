/*
 * Memory: 12 cartas (6 parejas) en rejilla 3×4. Estado en this.deck (índice de viaje
 * por posición), this.matched y this.open; la pantalla se redibuja desde el estado.
 */
(function (G) {
  const MG = G.minigames.memory, CFG = MG.config;

  class MemoryGame extends Phaser.Scene {
    constructor() { super('MemoryGame'); }

    create() {
      G.showTiltButton(false);
      const k = CFG.TRIPS.length;
      this.deck = Phaser.Utils.Array.Shuffle([...Array(k).keys(), ...Array(k).keys()]);
      this.matched = new Set(); this.open = []; this.moves = 0; this.done = false;
      this.endData = null; this.bannerObj = null; this.started = Date.now(); this.phase = 'loading'; this.missTimer = null;
      this.gen = (this.gen || 0) + 1; const gen = this.gen;
      this.events.once('shutdown', () => G.photos.close());
      this.build();
      G.photos.loadAll(CFG.TRIPS.map(p => p.src)).then(() => {
        if (gen !== this.gen || !this.sys.isActive()) return;
        this.phase = 'play'; this.build();
      });
    }
    relayout() { this.flipBackNow(); this.build(); }

    build() {
      this.tweens.killAll(); this.time.removeAllEvents(); this.missTimer = null; this.bannerObj = null;
      this.children.removeAll(true);
      const { width: W, height: H } = this.scale;
      const top = G.safe.top, bottom = H - G.safe.bottom;
      const bg = this.add.image(W / 2, H / 2, 'mm-bg'); bg.setScale(Math.max(W / bg.width, H / bg.height));
      this.add.rectangle(0, 0, W, H, 0x1b1430, 0.5).setOrigin(0);
      G.ui.backToMap(this);
      if (this.phase === 'loading') { G.ui.text(this, W / 2, H / 2, 'Cargando fotos…', 10, '#ffffff'); return; }
      this.hudTxt = G.ui.text(this, W / 2 + 20, top + 22, '', 9, '#ffd23f');
      this.updateHud();

      const C = CFG.COLS, R = CFG.ROWS, gap = 10;
      const availH = bottom - (top + 48) - 76;
      let cw = Math.min((W - 24 - gap * (C - 1)) / C, ((availH - gap * (R - 1)) / R) * 0.8);
      if (cw >= 96) cw = 96 + Math.floor((cw - 96) / 48) * 48;   // dorso a escala entera (×2) si cabe
      cw = Math.floor(cw); const ch = Math.round(cw * 1.25);
      const gw = C * cw + (C - 1) * gap, gh = R * ch + (R - 1) * gap;
      const gx = Math.round((W - gw) / 2), gy = Math.round(top + 48 + Math.max(0, (availH - gh) * 0.3));
      this.L = { gx, gy, cw, ch, gap, gh };
      const ps = cw - 8;   // foto cuadrada dentro de la carta
      this.cards = this.deck.map((trip, i) => {
        const x = gx + (i % C) * (cw + gap) + cw / 2, y = gy + Math.floor(i / C) * (ch + gap) + ch / 2;
        const c = this.add.container(x, y);
        const back = this.add.image(0, 0, 'mm-back').setDisplaySize(cw, ch);
        const face = this.add.container(0, 0);
        const fg = this.add.graphics();
        fg.fillStyle(0x1b1430, 1).fillRoundedRect(-cw / 2, -ch / 2 + 2, cw, ch, 5);
        fg.fillStyle(0xfff8e8, 1).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 5);
        const img = this.add.image(0, -ch / 2 + 4 + ps / 2, G.photos.texture(this, CFG.TRIPS[trip].src, ps, 0));
        const ring = this.add.graphics();
        const lbl = G.ui.text(this, 0, -ch / 2 + 4 + ps + (ch - ps - 4) / 2, CFG.TRIPS[trip].place, cw < 90 ? 6 : 7, '#1b1430', { strokeThickness: 0, wrap: cw - 6 });
        lbl.setShadow(0, 0, '#000', 0, false, false);
        face.add([fg, img, lbl, ring]); face.ring = ring; face.lbl = lbl;
        c.add([face, back]); c.back = back; c.face = face; c.trip = trip;
        const up = this.matched.has(trip) || this.open.includes(i);
        back.setVisible(!up); face.setVisible(up);
        lbl.setVisible(this.matched.has(trip));
        if (this.matched.has(trip)) this.markMatched(c, false);
        c.setSize(cw, ch).setInteractive({ useHandCursor: true });
        c.on('pointerup', () => this.tap(i));
        return c;
      });
      this.bannerY = Math.min(bottom - 44, gy + gh + 50);
      if (this.done) this.time.delayedCall(800, () => this.finish());   // por si se redimensionó al final
    }
    updateHud() {
      this.hudTxt.setText(`Parejas ${this.matched.size}/${CFG.TRIPS.length} · Mov: ${this.moves}`);
    }
    cardXY(i) { const c = this.cards[i]; return { x: c.x, y: c.y }; }

    flip(c, up, cb) {
      this.tweens.killTweensOf(c);
      this.tweens.add({ targets: c, scaleX: 0, duration: CFG.FLIP_MS / 2, ease: 'Sine.in', onComplete: () => {
        c.back.setVisible(!up); c.face.setVisible(up);
        this.tweens.add({ targets: c, scaleX: 1, duration: CFG.FLIP_MS / 2, ease: 'Sine.out', onComplete: cb });
      } });
    }
    flipBackNow() {
      if (this.missTimer) { this.missTimer.remove(false); this.missTimer = null; }
      if (this.open.length === 2) {
        const pair = this.open; this.open = [];
        if (this.cards) pair.forEach(j => this.flip(this.cards[j], false));
      }
    }
    tap(i) {
      if (this.phase !== 'play' || this.done) return;
      const c = this.cards[i];
      if (this.matched.has(c.trip) || this.open.includes(i)) return;
      if (this.open.length === 2) this.flipBackNow();   // no hace falta esperar
      G.sfx.beep(700, 0.03, 0.05);
      this.open.push(i); this.flip(c, true);
      if (this.open.length < 2) return;
      this.moves++;
      const [a, b] = this.open;
      if (this.cards[a].trip === this.cards[b].trip) {
        this.open = []; this.matched.add(c.trip);
        this.time.delayedCall(CFG.FLIP_MS + 20, () => {
          G.sfx.catch();
          this.markMatched(this.cards[a], true); this.markMatched(this.cards[b], true);
          this.banner(c.trip);
          if (this.matched.size === CFG.TRIPS.length) this.win();
        });
      } else {
        this.missTimer = this.time.delayedCall(CFG.MISS_MS, () => { this.missTimer = null; this.flipBackNow(); });
      }
      this.updateHud();
    }
    markMatched(c, animate) {
      const { cw, ch } = this.L;
      c.face.ring.clear().lineStyle(3, 0xffd23f, 1).strokeRoundedRect(-cw / 2 + 1, -ch / 2 + 1, cw - 2, ch - 2, 5);
      c.face.lbl.setVisible(true);
      if (animate) this.tweens.add({ targets: c, scale: 1.1, duration: 120, yoyo: true });
    }
    banner(trip) {
      const { width: W } = this.scale, t = CFG.TRIPS[trip];
      if (this.bannerObj) this.bannerObj.destroy();
      const bw = W - 28, bh = 64, ps = 52;
      const b = this.add.container(W / 2, this.bannerY).setDepth(20);
      const g = this.add.graphics();
      g.fillStyle(0x1b1430, 0.96).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 8).lineStyle(3, 0xffd23f, 1).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 8);
      const img = this.add.image(-bw / 2 + 8 + ps / 2, 0, G.photos.texture(this, t.src, ps, 0));
      const tx = -bw / 2 + ps + 18;
      const p = G.ui.text(this, tx, -10, t.place, 10, '#ffd23f', { ox: 0, wrap: bw - ps - 28 });
      const d = G.ui.text(this, tx, 14, t.date, 9, '#ffffff', { ox: 0 });
      b.add([g, img, p, d]);
      b.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: b, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
      this.tweens.add({ targets: b, alpha: 0, delay: CFG.BANNER_MS, duration: 250, onComplete: () => { b.destroy(); if (this.bannerObj === b) this.bannerObj = null; } });
      this.bannerObj = b;
    }
    win() {
      this.done = true;
      const secs = Math.round((Date.now() - this.started) / 1000);
      const stars = MG.starsFor(this.moves);
      G.progress.recordScore(CFG.id, stars * 1000 + Math.max(0, 500 - this.moves * 10));
      G.progress.complete(CFG.id);
      this.endData = { moves: this.moves, secs, stars };
      this.time.delayedCall(CFG.BANNER_MS + 200, () => this.finish());
    }
    finish() { G.sfx.win(); this.scene.start('MemoryEnd', this.endData);
    }
  }
  MG.scenes.push(MemoryGame);
})(window.AneGame);
