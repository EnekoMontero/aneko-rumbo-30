/*
 * Pasaporte de los 30 (se abre encima del mapa): 7 sellos, uno por minijuego, y debajo el
 * itinerario (dibujo del lugar, fecha y juego de cada día). Si llega con {stamps:[...]}
 * anima cada sello nuevo (el sello golpea la página) y marca ese día en el itinerario.
 */
(function (G) {
  const DESIGN_H = 660;
  /** Posición centrada en filas (p. ej. 7 elementos en filas de 4 = 4 + 3). */
  const grid = (i, n, per, x0, dx) => { const row = Math.floor(i / per), inRow = Math.min(per, n - row * per); return { x: x0 + (i % per - (inRow - 1) / 2) * dx, row }; };     // alto de diseño del librito; se escala si la pantalla es más baja

  class PassportScene extends Phaser.Scene {
    constructor() { super('Passport'); }

    create(data = {}) {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H;
      const T = G.T.passport;
      this.queue = (data.stamps || []).slice();
      const animating = new Set(this.queue);

      this.add.rectangle(0, 0, W, H, 0x0d0a18, 0.82).setOrigin(0).setInteractive();   // bloquea el mapa
      const top = G.safe.top + 8, avail = H - top - G.safe.bottom - 8;
      const k = Math.min(1, avail / DESIGN_H);
      const book = this.book = this.add.container(W / 2, top + (avail - DESIGN_H * k) / 2).setScale(k);

      const PW = 336, x0 = -PW / 2;
      const g = this.add.graphics();
      g.fillStyle(0x5a0f24, 1).fillRoundedRect(x0 - 6, -4, PW + 12, DESIGN_H + 8, 10);       // tapas
      g.fillStyle(0xf3e6c8, 1).fillRoundedRect(x0, 0, PW, DESIGN_H, 6);                      // hoja
      g.lineStyle(1, 0xd9c7a0, 1);
      for (let y = 112; y < DESIGN_H - 10; y += 16) g.lineBetween(x0 + 10, y, x0 + PW - 10, y);   // guilloché simple
      g.fillStyle(0x7a1630, 1).fillRect(x0, 0, PW, 96);
      g.lineStyle(2, 0xd6aa3c, 1).strokeRect(x0 + 6, 6, PW - 12, 84);
      book.add(g);

      // Cabecera: foto de Ane + título
      const ph = this.add.graphics().fillStyle(0xfff8e8, 1).fillRect(x0 + 14, 12, 52, 72).lineStyle(2, 0xd6aa3c, 1).strokeRect(x0 + 14, 12, 52, 72);
      book.add(ph);
      book.add(G.ui.ane(this, x0 + 40, 84, 'stand', 0.62));
      book.add(G.ui.text(this, x0 + 76, 30, T.title, 10, '#ffd23f', { ox: 0, wrap: 240 }));
      book.add(G.ui.text(this, x0 + 76, 56, T.owner, 8, '#ffffff', { ox: 0 }));
      this.count = G.ui.text(this, x0 + 76, 76, '', 8, '#f3e6c8', { ox: 0, strokeThickness: 3 });
      book.add(this.count);

      // Sellos 4 + 3
      book.add(G.ui.text(this, x0 + 14, 116, T.stampsLabel, 9, '#7a1630', { ox: 0, strokeThickness: 0 }));
      this.slots = {};
      G.story.IDS.forEach((id, i) => {
        const gp = grid(i, G.story.IDS.length, 4, 0, 82), cx = gp.x, cy = 170 + gp.row * 110;
        const sg = this.add.graphics();
        sg.lineStyle(2, 0xbfa77a, 1);
        for (let a = 0; a < 24; a++) { const a0 = (a / 24) * Math.PI * 2; if (a % 2 === 0) sg.beginPath().arc(cx, cy, 37, a0, a0 + Math.PI / 24).strokePath(); }
        book.add(sg);
        const n = G.story.node(id);
        book.add(G.ui.text(this, cx, cy + 48, T.slotLabel(n.day, T.slotNames[id]), 7, '#6a5a40', { strokeThickness: 0, wrap: 80 }));
        const empty = G.ui.text(this, cx, cy, T.emptySlot, 7, '#bfa77a', { strokeThickness: 0 });
        book.add(empty);
        this.slots[id] = { cx, cy, empty };
        if (G.progress.isCompleted(id) && !animating.has(id)) this.putStamp(id, false);
      });

      // Itinerario: un renglón por día con el dibujo del lugar, la fecha y el juego
      const ay = 348, rh = 36;
      book.add(G.ui.text(this, x0 + 14, ay, T.itineraryLabel, 9, '#7a1630', { ox: 0, strokeThickness: 0 }));
      this.rows = {};
      G.story.IDS.forEach((id, i) => {
        const n = G.story.node(id), cy = ay + 30 + i * rh;
        const rg = this.add.graphics().fillStyle(i % 2 ? 0xeadbb6 : 0xf0e3c2, 1).fillRoundedRect(x0 + 10, cy - rh / 2 + 2, PW - 20, rh - 4, 4);
        book.add(rg);
        const ic = this.add.image(x0 + 34, cy, n.icon);
        ic.setScale(Math.min(34 / ic.width, 28 / ic.height));
        const date = G.ui.text(this, x0 + 60, cy, G.unlock.prettyDate(n.date).toUpperCase(), 8, '#7a1630', { ox: 0, strokeThickness: 0 });
        const name = G.ui.text(this, x0 + 118, cy - 6, n.name, 8, '#3a2a18', { ox: 0, strokeThickness: 0 });
        const game = G.ui.text(this, x0 + 118, cy + 7, n.game, 7, '#7a6a50', { ox: 0, strokeThickness: 0 });
        const heart = this.add.image(x0 + PW - 26, cy, 'heart').setScale(1.6);
        const dot = this.add.circle(x0 + PW - 26, cy, 5).setStrokeStyle(2, 0xbfa77a);
        book.add([ic, date, name, game, heart, dot]);
        this.rows[id] = { ic, date, name, game, heart, dot };
        this.showRow(id, G.progress.isCompleted(id) && !animating.has(id));
      });

      // Pie: estado + botones
      this.status = G.ui.text(this, 0, 622, '', 8, '#7a1630', { strokeThickness: 0, wrap: 310 });
      book.add(this.status);
      // Barra inferior FIJA con "Cerrar" y "Ver intro": siempre visible aunque el librito no quepa
      // (antes iba dentro del librito y en pantallas bajas quedaba fuera: no se podía salir).
      const FOOT = 62, footY = H - G.safe.bottom - FOOT;
      this.footY = footY;
      this.add.rectangle(0, footY, W, H - footY, 0x0d0a18, 1).setOrigin(0).setDepth(20).setInteractive();
      this.add.rectangle(0, footY, W, 2, 0xd6aa3c, 0.8).setOrigin(0).setDepth(20);
      G.ui.button(this, W / 2 + 64, footY + FOOT / 2, T.close, () => this.close(), 150, 44).setDepth(21);
      const intro = G.ui.text(this, W / 2 - 96, footY + FOOT / 2, T.replayIntro, 9, '#ffffff', { strokeThickness: 3 }).setDepth(21);
      intro.setInteractive({ useHandCursor: true }).on('pointerup', (p) => { if (p.getDistance() > 12) return; G.sfx.click(); this.scene.stop('Map'); this.scene.start('Intro'); });
      // El librito ocupa el resto. En pantallas bajas (iPhone mini con la barra de Safari) no se encoge
      // por debajo de 0.92 para que la letra siga legible: se desliza con el dedo.
      const availB = footY - 6 - top;
      const k2 = Math.max(0.92, Math.min(1, availB / DESIGN_H)), fullH = DESIGN_H * k2;
      book.setScale(k2).setY(top + Math.max(0, (availB - fullH) / 2));
      this.setupScroll(top, top + availB - fullH);
      this.updateStatus();

      book.setAlpha(0).setY(book.y + 30);
      this.tweens.add({ targets: book, alpha: 1, y: book.y - 30, duration: 300, ease: 'Quad.out',
        onComplete: () => this.time.delayedCall(250, () => this.nextStamp()) });
    }

    /** Arrastre vertical del librito cuando no cabe entero (minY < maxY). */
    setupScroll(maxY, minY) {
      if (minY >= maxY - 1) return;
      const book = this.book;
      // aviso de que hay más abajo, justo encima de la barra fija
      const arrow = G.ui.text(this, this.W / 2, this.footY - 14, '▼ desliza ▼', 9, '#ffd23f', { strokeThickness: 4 }).setDepth(19);
      this.tweens.add({ targets: arrow, y: arrow.y + 4, duration: 450, yoyo: true, repeat: -1 });
      let startY = null, startP = 0;
      this.input.on('pointerdown', p => { if (p.y >= this.footY) return; startY = book.y; startP = p.y; });
      this.input.on('pointerup', () => { startY = null; });
      this.input.on('pointermove', p => {
        if (startY === null || !p.isDown) return;
        book.y = Phaser.Math.Clamp(startY + (p.y - startP), minY, maxY);
        arrow.setVisible(book.y > minY + 4);
      });
      this.scrollTo = (y) => this.tweens.add({ targets: book, y: Phaser.Math.Clamp(y, minY, maxY), duration: 250 });
    }

    showRow(id, have) {
      const r = this.rows[id];
      r.heart.setVisible(have); r.dot.setVisible(!have);
      r.ic.setAlpha(have ? 1 : 0.45);
      [r.date, r.name, r.game].forEach(t => t.setAlpha(have ? 1 : 0.55));
    }

    putStamp(id, animate) {
      const s = this.slots[id];
      s.empty.setVisible(false);
      const st = G.story.stamp(this, s.cx, s.cy, id, 34);
      this.book.add(st);
      return st;
    }

    updateStatus() {
      const T = G.T.passport, have = G.story.stamps().filter(id => !this.queue.includes(id));
      const left = G.story.IDS.length - have.length;
      this.status.setText(left === 0 ? T.complete : T.remaining(left)).setColor(left === 0 ? '#c0283c' : '#7a1630');
      this.count.setText(`${T.stampsLabel}: ${have.length}/${G.story.IDS.length}`);
    }

    /** Animación: el sello cae, golpea, salpica tinta y se marca el día en el itinerario. */
    nextStamp() {
      if (!this.queue.length) return;
      const id = this.queue[0], T = G.T.passport;
      const st = this.putStamp(id, true);
      const fx = st.scale;
      st.setScale(3.2).setAlpha(0);
      st.y -= 40;
      G.sfx.jump();
      this.tweens.add({ targets: st, scale: fx, alpha: 1, y: st.y + 40, duration: 260, ease: 'Quad.in', delay: 150, onComplete: () => {
        G.sfx.hit(); this.cameras.main.shake(160, 0.01);
        const wp = this.book.getWorldTransformMatrix().transformPoint(st.x, st.y);
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2, d = Phaser.Math.Between(40, 60) * this.book.scale;
          const p = this.add.rectangle(wp.x, wp.y, 3, 3, 0x7a1630).setDepth(5);
          this.tweens.add({ targets: p, x: wp.x + Math.cos(a) * d, y: wp.y + Math.sin(a) * d, alpha: 0, duration: 420, onComplete: () => p.destroy() });
        }
        const banner = G.ui.text(this, this.W / 2, this.H * 0.45, `${T.newStamp}\n${G.story.node(id).name} · ${G.unlock.prettyDate(G.story.node(id).date)}`, 10, '#ffd23f', { wrap: 320 }).setDepth(10).setScale(0.3);
        const bg = this.add.rectangle(this.W / 2, this.H * 0.45, 340, banner.height + 28, 0x1b1430, 0.92).setDepth(9).setStrokeStyle(3, 0xffd23f).setScale(0.3);
        this.tweens.add({ targets: [banner, bg], scale: 1, duration: 280, ease: 'Back.out', delay: 200 });
        const r = this.rows[id];
        this.showRow(id, true);
        r.heart.setScale(0); this.tweens.add({ targets: r.heart, scale: 1.6, duration: 400, ease: 'Back.out', delay: 350 });
        this.time.delayedCall(450, () => G.sfx.unlock());
        G.story.markStamped(id);
        this.queue.shift();
        this.updateStatus();
        this.time.delayedCall(2300, () => {
          this.tweens.add({ targets: [banner, bg], alpha: 0, duration: 250, onComplete: () => { banner.destroy(); bg.destroy(); } });
          this.nextStamp();
        });
      } });
    }

    close() {
      this.queue.forEach(id => G.story.markStamped(id));
      this.scene.stop();
      const map = this.scene.get('Map');
      // Si la pantalla cambió de tamaño mientras el mapa estaba en pausa, se rehace
      if (map && this.scene.isPaused('Map') && map.builtH === this.scale.height) { this.scene.resume('Map'); map.refreshAll && map.refreshAll(); }
      else this.scene.start('Map');
    }

    /** Al cambiar de tamaño se rehace con los sellos que faltaban por animar. */
    relayout() { this.scene.restart({ stamps: this.queue.filter(id => G.story.pendingStamps().includes(id)) }); }
  }
  G.coreScenes.push(PassportScene);
})(window.AneGame);
