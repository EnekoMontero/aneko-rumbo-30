/*
 * Escena final (nodo ¡30!, se abre el 10 de diciembre). Se abren las puertas del contenedor, sale
 * Ane, llega la tarta de cinnamon rolls y se encienden las 30 velas mientras suena "Cumpleaños feliz"
 * (WebAudio). Al acabar la canción: "¡Pide un deseo y sopla!" — Ane apaga las velas tocando la
 * pantalla (cada toque, una ráfaga) o soplando de verdad al micrófono (opcional, pide permiso).
 * Con todas apagadas: confeti, "Feliz cumpleaños, Ane" y los sellos del pasaporte.
 * Se puede saltar y repetir.
 *
 * MODULAR: al terminar se muestran también los botones de G.FINAL_EXTRAS, por ejemplo:
 *   G.FINAL_EXTRAS.push({ label: 'Álbum de fotos', scene: 'Album' });
 */
(function (G) {
  G.FINAL_EXTRAS = G.FINAL_EXTRAS || [];
  const CANDLES = 30;
  // "Cumpleaños feliz" (melodía tradicional, dominio público): [nota MIDI, pulsos]
  const SONG = [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2],
                [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
                [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
                [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3]];
  const BEAT = 0.34;            // s por pulso
  const T0 = 0.25;              // la canción empieza a los 0,25 s
  const SONG_LEN = SONG.reduce((a, n) => a + n[1], 0) * BEAT;   // ≈ 9,4 s
  // Línea de tiempo (ms)
  // wish = al terminar la canción se pide el deseo (luego todo depende de cuándo sople Ane)
  const AT = { shake: 500, doors: 1300, ane: 2100, cake: 3600, light: 4500, wish: Math.round((T0 + SONG_LEN) * 1000) + 200 };
  const MIC_LEVEL = 0.12;       // volumen (RMS) a partir del cual cuenta como soplido
  const MIC_EVERY_MS = 70;      // soplando sin parar se apaga una vela cada este tiempo

  class FinalScene extends Phaser.Scene {
    constructor() { super('Final'); }

    create(data = {}) {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H;
      this.skipped = !!data.skip;
      this.stage = 'playing';
      this.flames = []; this.music = null;
      G.showTiltButton && G.showTiltButton(false);
      G.ui.background(this, 'pt-bg', 0.3);
      this.groundY = Math.round(H * 0.70);
      this.add.rectangle(0, this.groundY - 6, W, H - this.groundY + 6, 0x1b1430, 0.25).setOrigin(0);

      // Contenedor con puertas
      const cx = W / 2, cs = 2, cy = this.groundY - 76 * cs;
      this.contX = cx; this.contTop = cy; this.cs = cs;
      this.add.ellipse(cx, this.groundY + 2, 96 * cs + 20, 16, 0x000000, 0.35);
      this.cont = this.add.image(cx, cy, 'st-cont').setOrigin(0.5, 0).setScale(cs);
      this.doorL = this.add.image(cx - 44 * cs, cy + 6 * cs, 'st-door-l').setOrigin(0, 0).setScale(cs).setDepth(2);
      this.doorR = this.add.image(cx + 44 * cs, cy + 6 * cs, 'st-door-r').setOrigin(1, 0).setScale(cs).setDepth(2);
      this.aneEnd = { x: W / 2 - 78, y: this.groundY + 70, s: 1.25 };
      this.cakeEnd = { x: W / 2 + 66, y: this.groundY + 66 };

      G.ui.backToMap(this);
      this.events.once('shutdown', () => { this.stopMusic(); this.stopMic(); });

      if (this.skipped) return this.showEnd(true);

      // fundido de entrada
      const black = this.add.rectangle(0, 0, W, H, 0x000000, 1).setOrigin(0).setDepth(100);
      this.tweens.add({ targets: black, alpha: 0, duration: 500, onComplete: () => black.destroy() });
      this.skipBtn = G.ui.text(this, W - 14, H - G.safe.bottom - 26, G.T.final.skip, 9, '#ffffff', { ox: 1 }).setDepth(120);
      this.skipBtn.setInteractive({ useHandCursor: true }).on('pointerup', () => this.skip());
      this.playMusic();
      const at = (ms, fn) => this.time.delayedCall(ms, fn);
      at(AT.shake, () => this.rumble());
      at(AT.doors, () => this.openDoors());
      at(AT.ane, () => this.aneOut());
      at(AT.cake, () => this.cakeIn(false));
      at(AT.light, () => this.lightCandles());
      at(AT.wish, () => this.askWish());
    }

    skip() {
      if (this.stage !== 'playing' && this.stage !== 'wish') return;
      this.stage = 'skipping';
      G.sfx.click();
      this.scene.restart({ skip: true });
    }

    // ---------- música ----------
    playMusic() {
      if (G.sfx.muted) return;
      const c = G.sfx.ctx(); if (!c) return;
      const master = c.createGain(); master.gain.value = 0.5; master.connect(c.destination);
      const t0 = c.currentTime + T0;
      const note = (m, t, d, type, vol) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        g.gain.setValueAtTime(vol, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.98);
        o.connect(g).connect(master); o.start(t); o.stop(t + d);
      };
      // acompañamiento: bajo en cada compás de 3 pulsos (anacrusa de 1 pulso)
      const BASS = [55, 55, 50, 50, 55, 55, 48, 53, 48, 50, 48];
      let t = t0;
      SONG.forEach(([m, b]) => { note(m, t, b * BEAT, 'triangle', 0.22); note(m + 12, t, b * BEAT * 0.6, 'square', 0.025); t += b * BEAT; });
      BASS.forEach((m, i) => { const bt = t0 + (1 + i * 3) * BEAT; if (bt < t) { note(m, bt, BEAT * 0.9, 'triangle', 0.16); note(m + 7, bt + BEAT, BEAT * 0.5, 'triangle', 0.06); note(m + 7, bt + 2 * BEAT, BEAT * 0.5, 'triangle', 0.06); } });
      // acorde final
      [60, 64, 67, 72].forEach((m, i) => note(m, t + 0.05 + i * 0.03, 1.6, 'triangle', 0.12));
      this.music = { c, master };
      this.unMute = G.sfx.onMute(v => { if (this.music) this.music.master.gain.value = v ? 0 : 0.5; });
    }
    stopMusic() {
      if (this.unMute) { this.unMute(); this.unMute = null; }
      if (!this.music) return;
      const { c, master } = this.music; this.music = null;
      try { master.gain.cancelScheduledValues(c.currentTime); master.gain.setValueAtTime(0, c.currentTime); master.disconnect(); } catch (e) { /* ya cerrado */ }
    }

    // ---------- pasos del "vídeo" ----------
    rumble() {
      G.sfx.drop();
      this.tweens.add({ targets: [this.cont, this.doorL, this.doorR], x: '+=2', duration: 50, yoyo: true, repeat: 5 });
    }
    openDoors() {
      G.sfx.pepper();
      this.tweens.add({ targets: [this.doorL, this.doorR], scaleX: 0.5, duration: 900, ease: 'Cubic.out' });
      const glow = this.add.rectangle(this.contX, this.contTop + 76, 160, 130, 0xfff2a8, 0).setDepth(1);
      this.tweens.add({ targets: glow, fillAlpha: 0.45, duration: 500, yoyo: true, hold: 300 });
    }
    aneOut() {
      const ane = this.ane = G.ui.ane(this, this.contX, this.groundY - 8, 'stand', 0.8).setAlpha(0).setDepth(3);
      G.sfx.turbo();
      this.tweens.add({ targets: ane, alpha: 1, duration: 300 });
      const e = this.aneEnd;
      this.tweens.add({ targets: ane, x: e.x, y: e.y, scale: e.s, duration: 1300, ease: 'Sine.inOut' });
      // pasitos
      this.tweens.add({ targets: ane, angle: { from: -4, to: 4 }, duration: 160, yoyo: true, repeat: 3, onComplete: () => ane.setAngle(0) });
      // brillos al salir
      this.time.addEvent({ delay: 180, repeat: 8, callback: () => this.sparkle(ane.x + Phaser.Math.Between(-30, 30), ane.y - Phaser.Math.Between(40, 150) * ane.scale / 1.25) });
    }
    cakeIn(instant) {
      const { x, y } = this.cakeEnd, cs = 1.5;
      const cake = this.cake = this.add.container(instant ? x : this.W + 120, y).setDepth(4);
      cake.add(this.add.image(0, 0, 'st-cake').setOrigin(0.5, 1).setScale(cs));
      // 30 velas en 3 filas sobre la parte de arriba de la tarta
      const rows = [{ n: 9, w: 66, y: -100 }, { n: 11, w: 86, y: -90 }, { n: 10, w: 104, y: -78 }];
      let made = 0;
      rows.forEach(r => {
        for (let i = 0; i < r.n && made < CANDLES; i++, made++) {
          const cxk = -r.w / 2 + (r.w * i) / (r.n - 1) + (r.y % 2), cyk = r.y + Math.abs(i - (r.n - 1) / 2) * 1.2;
          const col = [0xff5a8a, 0x5ac8ff, 0xffd23f, 0x7ee07e][made % 4];
          const g = this.add.graphics();
          g.fillStyle(0x1b1430, 1).fillRect(cxk - 2, cyk - 12, 4, 13);
          g.fillStyle(col, 1).fillRect(cxk - 1, cyk - 11, 2, 11);
          g.fillStyle(0xffffff, 1).fillRect(cxk - 1, cyk - 8, 2, 1).fillRect(cxk - 1, cyk - 4, 2, 1);
          cake.add(g);
          const f = this.add.container(cxk, cyk - 14).setVisible(false);
          f.add(this.add.rectangle(0, 0, 4, 6, 0xff8a1e)); f.add(this.add.rectangle(0, 1, 2, 3, 0xfff2a8));
          cake.add(f);
          this.flames.push(f);
        }
      });
      if (!instant) {
        G.sfx.jump();
        this.tweens.add({ targets: cake, x, duration: 900, ease: 'Back.out' });
      }
    }
    lightCandles() {
      // se encienden de izquierda a derecha en ~1,2 s y titilan
      [...this.flames].sort((a, b) => a.x - b.x).forEach((f, i) => this.time.delayedCall(i * 40, () => {
        f.setVisible(true).setScale(0.2);
        this.tweens.add({ targets: f, scale: 1, duration: 120, onComplete: () =>
          this.tweens.add({ targets: f, scaleY: { from: 0.8, to: 1.2 }, duration: Phaser.Math.Between(120, 220), yoyo: true, repeat: -1 }) });
        if (i % 6 === 0) G.sfx.beep(1400 + i * 10, 0.03, 0.03);
      }));
      const glow = this.add.ellipse(this.cakeEnd.x, this.cakeEnd.y - 100, 150, 60, 0xffd27a, 0).setDepth(3);
      this.tweens.add({ targets: glow, fillAlpha: 0.28, duration: 1200, delay: 600 });
      this.candleGlow = glow;
    }
    // ---------- el deseo: soplar las velas ----------
    askWish() {
      if (this.stage !== 'playing') return;
      this.stage = 'wish';
      const T = G.T.final, W = this.W, bottom = this.H - G.safe.bottom;
      this.wishTxt = G.ui.text(this, W / 2, G.safe.top + 100, T.wish, 16, '#ffd23f', { strokeThickness: 7, lineSpacing: 12, wrap: 340 }).setDepth(20).setScale(0.3);
      this.tweens.add({ targets: this.wishTxt, scale: 1, duration: 400, ease: 'Back.out', onComplete: () =>
        this.wishTxt && this.tweens.add({ targets: this.wishTxt, scale: 1.06, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' }) });
      this.wishHint = G.ui.text(this, W / 2, bottom - 62, T.wishHint, 10, '#ffffff', { strokeThickness: 4, lineSpacing: 8, wrap: 300 }).setDepth(20);
      this.tweens.add({ targets: this.wishHint, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
      G.sfx.unlock();
      // Micrófono opcional (solo en https / localhost y si el navegador lo permite)
      if (window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.micBtn = G.ui.button(this, W / 2, bottom - 112, T.micButton, () => this.startMic(), 240, 40).setDepth(21);
      }
      // Toque en cualquier sitio (menos en botones y enlaces) = soplido
      this.input.on('pointerdown', (p, over) => {
        if (this.stage !== 'wish' || (over && over.length)) return;
        this.blowSome(Phaser.Math.Between(5, 8));
      });
    }

    /** Ráfaga de aire de Ane hacia la tarta que apaga las n primeras velas encendidas (de izquierda a derecha). */
    blowSome(n) {
      if (this.stage !== 'wish') return;
      const lit = this.flames.filter(f => f.visible && !f.out).sort((a, b) => a.x - b.x);
      if (!lit.length) return;
      const y0 = this.cakeEnd.y - 110;
      for (let k = 0; k < Math.min(5, 2 + n); k++) {
        const l = this.add.rectangle(this.aneEnd.x + 30, y0 + k * 7 - 14, 18, 2, 0xffffff, 0.8).setDepth(6);
        this.tweens.add({ targets: l, x: this.cakeEnd.x + 40, alpha: 0, scaleX: 2.5, duration: 420, delay: k * 40, onComplete: () => l.destroy() });
      }
      if (n > 1 || !this.lastWhoosh || this.time.now - this.lastWhoosh > 250) { G.sfx.drink(); this.lastWhoosh = this.time.now; }
      if (this.ane) {
        this.tweens.killTweensOf(this.ane);
        this.ane.setScale(this.aneEnd.s);
        this.tweens.add({ targets: this.ane, scaleX: this.aneEnd.s * 1.06, scaleY: this.aneEnd.s * 0.95, duration: 90, yoyo: true });
      }
      const batch = lit.slice(0, n);
      batch.forEach((f, i) => { f.out = true; this.time.delayedCall(140 + i * 35, () => this.putOut(f)); });
      if (lit.length <= n) this.time.delayedCall(140 + batch.length * 35 + 350, () => this.allOut());
    }
    putOut(f) {
      this.tweens.killTweensOf(f); f.setVisible(false);
      const wp = this.cake.getWorldTransformMatrix().transformPoint(f.x, f.y);
      const p = this.add.circle(wp.x, wp.y, 3, 0xdddddd, 0.8).setDepth(6);
      this.tweens.add({ targets: p, y: wp.y - 30, x: wp.x + Phaser.Math.Between(0, 14), alpha: 0, scale: 2.4, duration: 700, onComplete: () => p.destroy() });
      const left = this.flames.filter(fl => !fl.out).length;
      if (this.candleGlow) this.candleGlow.fillAlpha = 0.28 * left / this.flames.length;
    }
    /** Todas apagadas: fuera textos del deseo y ¡fiesta! */
    allOut() {
      if (this.stage !== 'wish') return;
      this.stopMic();
      [this.wishTxt, this.wishHint, this.micBtn].forEach(o => { if (o) { this.tweens.killTweensOf(o); o.destroy(); } });
      this.wishTxt = this.wishHint = this.micBtn = null;
      this.party();
      this.time.delayedCall(1600, () => this.buttons());
    }

    // ---------- micrófono (opcional) ----------
    async startMic() {
      if (this.mic || this.stage !== 'wish') return;
      const T = G.T.final;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
        if (!this.sys.isActive() || this.stage !== 'wish') { stream.getTracks().forEach(t => t.stop()); return; }
        const c = G.sfx.ctx();
        if (!c) throw new Error('sin audio');
        const src = c.createMediaStreamSource(stream), an = c.createAnalyser();
        an.fftSize = 1024; src.connect(an);
        this.mic = { stream, src, an, buf: new Float32Array(an.fftSize), acc: 0 };
        if (this.micBtn) { this.micBtn.destroy(); this.micBtn = null; }
        if (this.wishHint) this.wishHint.setText(T.micListening);
      } catch (e) {
        if (this.micBtn) { this.micBtn.destroy(); this.micBtn = null; }
        if (this.wishHint) this.wishHint.setText(T.micDenied);
      }
    }
    stopMic() {
      if (!this.mic) return;
      try { this.mic.src.disconnect(); this.mic.stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ya parado */ }
      this.mic = null;
    }
    update(time, delta) {
      const m = this.mic;
      if (!m || this.stage !== 'wish') return;
      m.an.getFloatTimeDomainData(m.buf);
      let sum = 0; for (let i = 0; i < m.buf.length; i++) sum += m.buf[i] * m.buf[i];
      const rms = Math.sqrt(sum / m.buf.length);
      if (rms > MIC_LEVEL) { m.acc += delta; while (m.acc > MIC_EVERY_MS) { m.acc -= MIC_EVERY_MS; this.blowSome(1); } }
      else m.acc = 0;
    }

    party() {
      G.sfx.win();
      this.confetti(120);
      this.time.addEvent({ delay: 650, repeat: 5, callback: () => this.firework() });
      this.title(false);
      this.time.delayedCall(900, () => this.stampsExtra(false));
      if (this.skipBtn) { this.skipBtn.destroy(); this.skipBtn = null; }
      this.stage = 'done';
    }
    title(instant) {
      const t = G.ui.text(this, this.W / 2, G.safe.top + 70, G.T.final.title, 20, '#ffd23f', { strokeThickness: 7, wrap: 340 }).setDepth(20);
      if (!instant) { t.setScale(0.2); this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.out' }); }
      this.tweens.add({ targets: t, angle: { from: -2, to: 2 }, duration: 900, yoyo: true, repeat: -1, delay: instant ? 0 : 500 });
    }
    buttons(instant) {
      const T = G.T.final, W = this.W, H = this.H;
      const btns = [...G.FINAL_EXTRAS, { label: T.again, run: s => s.scene.restart({}) }, { label: T.back, scene: 'Map' }];
      const by = H - G.safe.bottom - 34 - (btns.length - 1) * 50;
      btns.forEach((b, i) => {
        const btn = G.ui.button(this, W / 2, by + i * 50, b.label, () => (b.run ? b.run(this) : this.scene.start(b.scene)), 220, 44).setDepth(30);
        if (!instant) { btn.setAlpha(0); this.tweens.add({ targets: btn, alpha: 1, duration: 300, delay: i * 150 }); }
      });
    }
    /** Estado final directo (al saltar o al cambiar el tamaño de pantalla al terminar). */
    showEnd() {
      this.stage = 'done';
      this.doorL.setScale(this.cs * 0.5, this.cs); this.doorR.setScale(this.cs * 0.5, this.cs);
      const e = this.aneEnd;
      this.ane = G.ui.ane(this, e.x, e.y, 'stand', e.s).setDepth(3);
      this.cakeIn(true);
      for (let k = 0; k < 5; k++) {   // humito de las velas recién apagadas
        const p = this.add.circle(this.cakeEnd.x - 30 + k * 15, this.cakeEnd.y - 110, 3, 0xdddddd, 0.6).setDepth(6);
        this.tweens.add({ targets: p, y: p.y - 34, alpha: 0, scale: 2.4, duration: 1200, delay: k * 300, repeat: -1 });
      }
      G.sfx.win();
      this.confetti(80);
      this.title(true);
      this.stampsExtra(true);
      this.buttons(true);
    }

    /**
     * Extra bajo el título: los sellos del pasaporte. Con los 7, desfilan con «¡Pasaporte completo!»;
     * si falta alguno, se ven los conseguidos (y huecos) con un mensaje de ánimo. Sin sellos, nada.
     */
    stampsExtra(instant) {
      const ids = G.story.IDS, have = G.story.stamps(), all = have.length === ids.length;
      if (!have.length) return;
      const T = G.T.final, W = this.W, y = G.safe.top + 172, r = 19, dx = Math.min(48, (W - 16) / ids.length);
      const lbl = G.ui.text(this, W / 2, y - 40, all ? T.allStamps : T.someStamps(have.length, ids.length), all ? 12 : 8,
        all ? '#ffd23f' : '#ffffff', { strokeThickness: 5, lineSpacing: 6, wrap: 340 }).setDepth(20);
      if (!instant) { lbl.setAlpha(0); this.tweens.add({ targets: lbl, alpha: 1, duration: 300 }); }
      ids.forEach((id, i) => {
        const x = W / 2 + (i - (ids.length - 1) / 2) * dx, got = have.includes(id);
        const c = this.add.container(x, y).setDepth(20);
        c.add(this.add.circle(0, 0, r + 3, 0xf3e6c8, got ? 1 : 0.25).setStrokeStyle(2, 0x1b1430, got ? 1 : 0.4));
        if (got) c.add(G.story.stamp(this, 0, 0, id, r));
        if (instant) return;
        c.setScale(got ? 2.4 : 1).setAlpha(0);
        this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 220, ease: 'Quad.in', delay: 200 + i * 170,
          onComplete: () => { if (got) { G.sfx.beep(600 + i * 70, 0.05, 0.08); this.sparkle(x, y - r); } } });
      });
      if (all && !instant) this.time.delayedCall(200 + ids.length * 170 + 200, () => { G.sfx.unlock(); this.confetti(40); });
    }

    sparkle(x, y) {
      const s = this.add.star(x, y, 4, 2, 6, 0xffffff).setDepth(7);
      this.tweens.add({ targets: s, scale: 1.8, alpha: 0, angle: 90, duration: 500, onComplete: () => s.destroy() });
    }
    confetti(n) {
      const cols = [0xffd23f, 0xff3b5c, 0x5ac8ff, 0x7ee07e, 0xffffff, 0xb07cff];
      for (let k = 0; k < n; k++) {
        const c = this.add.rectangle(Phaser.Math.Between(0, this.W), -10 - Phaser.Math.Between(0, 200), 4, 6, Phaser.Utils.Array.GetRandom(cols)).setDepth(25);
        this.tweens.add({ targets: c, y: this.H + 20, x: c.x + Phaser.Math.Between(-40, 40), angle: Phaser.Math.Between(-360, 360),
          duration: Phaser.Math.Between(1800, 3200), delay: Phaser.Math.Between(0, 600), onComplete: () => c.destroy() });
      }
    }
    firework() {
      const x = Phaser.Math.Between(40, this.W - 40), y = Phaser.Math.Between(G.safe.top + 120, this.H * 0.35);
      const col = Phaser.Utils.Array.GetRandom([0xffd23f, 0xff3b5c, 0x5ac8ff, 0xffffff]);
      G.sfx.catch();
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2, p = this.add.rectangle(x, y, 3, 3, col).setDepth(2);
        this.tweens.add({ targets: p, x: x + Math.cos(a) * 46, y: y + Math.sin(a) * 46 + 10, alpha: 0, duration: 800, onComplete: () => p.destroy() });
      }
    }

    /** Cambio de alto de pantalla: a mitad del "vídeo" no se corta; al terminar se recoloca. */
    relayout() { if (this.stage === 'done') this.scene.restart({ skip: true }); }
  }
  G.coreScenes.push(FinalScene);
})(window.AneGame);
