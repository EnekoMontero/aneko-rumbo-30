/*
 * Partida del CrossFit: 3 carriles, notas al ritmo, Ane hace (o falla) cada ejercicio.
 * 3 rondas de 10 reps buenas con un descanso corto entre rondas. Las notas se generan sobre la marcha:
 * nunca hay en pantalla más notas de las reps que faltan para cerrar la ronda, y el hueco entre notas
 * depende del nivel de velocidad (sube con la racha de aciertos, baja un escalón al fallar).
 */
(function (G) {
  const MG = G.minigames.crossfit, CFG = MG.config;
  const FAIL_MS = 720;

  class CrossfitGame extends Phaser.Scene {
    constructor() { super('CrossfitGame'); }

    create() {
      MG.makeTextures(this);
      G.showTiltButton(false);
      Object.assign(this, {
        notes: [], reps: 0, roundReps: 0, level: 0, streak: 0, nextNote: 0, phaseEnd: CFG.INTRO_BEATS, workStart: 0, lastLane: [-1, -2],
        reps0: 0, score: 0, combo: 0, maxCombo: 0, stats: { perfect: 0, good: 0, miss: 0 },
        phase: null, round: 0, lastBeat: -99, over: false, started: false, act: [], resting: false, player: null, tween: null, restTw: null,
      });
      this.buildStage();
      this.buildHud();
      this.buildLanes();
      G.ui.backToMap(this);

      // Entrada: toque en la columna del carril (debajo del escenario) o teclado
      this.input.on('pointerdown', (p) => { if (p.y > this.feetY - 10) this.tap(Math.min(2, Math.floor(p.x / (this.W / 3)))); });
      [['A', 'ONE', 'LEFT'], ['S', 'TWO', 'DOWN'], ['D', 'THREE', 'RIGHT']].forEach((keys, lane) =>
        keys.forEach(k => this.input.keyboard.on('keydown-' + k, () => this.tap(lane))));

      // Pausa: pestaña oculta o móvil en horizontal
      const onVis = () => this.player && this.player.pause(document.hidden);
      document.addEventListener('visibilitychange', onVis);
      const onPause = (p) => this.player && this.player.pause(p);
      G.game.events.on('ane-pause', onPause);
      this.events.once('shutdown', () => {
        document.removeEventListener('visibilitychange', onVis);
        G.game.events.off('ane-pause', onPause);
        if (this.player) this.player.stop(0.2);
      });

      this.banner('Cargando música…', '#ffffff', 0);
      const begin = () => {
        if (this.started || !this.sys.isActive()) return;
        this.started = true;
        this.player = new MG.Player(); this.player.phaseOf = (b) => this.phaseOfBeat(b); this.player.start();
        this.lblBanner.setAlpha(0);
      };
      MG.music.load().then(begin);
      this.time.delayedCall(4000, begin);   // por si la descarga se atasca: ritmo sintetizado
    }

    // ---------- Escenario (box de CrossFit + Ane + cajón + balón) ----------
    buildStage() {
      const { width: W, height: H } = this.scale;
      this.W = W; this.H = H;
      this.btnY = H - G.safe.bottom - 50;
      this.hitY = this.btnY - 66;
      this.feetY = Math.min(400, this.hitY - 190);
      const bgTop = this.feetY - 400;
      MG.drawBox(this, W, H, bgTop);
      // Mismo orden que los carriles: wall ball a la izquierda, burpee en el centro, cajón a la derecha
      this.aneX = 150; this.boxX = 274;
      // Diana de wall ball (estilo Hyrox) colgada de la barra del rig en la pared IZQUIERDA, a media altura
      this.disc = this.add.image(64, bgTop + 221, 'cf-wbtarget').setOrigin(0.5, 0).setDepth(3);
      this.target = { x: this.disc.x, y: this.disc.y + 40 };
      this.box = this.add.image(this.boxX, this.feetY + 2, 'cf-box').setOrigin(0.5, 1).setScale(0.82).setDepth(4);
      this.boxTop = this.feetY - this.box.displayHeight + 6;
      this.shadow = this.add.ellipse(this.aneX, this.feetY + 2, 56, 10, 0x000000, 0.35).setDepth(4);
      this.ane = G.ui.ane(this, this.aneX, this.feetY + 2, 'cf_ready', 1).setDepth(5);
      this.ball = this.add.image(0, 0, 'cf-ball').setDepth(6).setVisible(false);
    }

    // ---------- HUD ----------
    buildHud() {
      const W = this.W, y = G.safe.top + 44;
      this.add.graphics().setDepth(40).fillStyle(0x1b1430, 0.8).fillRoundedRect(8, y, W - 16, 50, 8)
        .lineStyle(2, 0xffffff, 0.9).strokeRoundedRect(8, y, W - 16, 50, 8);
      const t = (x, yy, s, size, col, ox) => G.ui.text(this, x, yy, s, size, col, { ox, strokeThickness: 3 }).setDepth(41);
      this.lblRound = t(18, y + 15, `RONDA 1/${CFG.ROUNDS}`, 8, '#ffffff', 0);
      this.lblPhase = t(W - 18, y + 15, 'PREPÁRATE', 8, '#ffd23f', 1);
      this.lblReps = t(18, y + 36, `REPS 0/${CFG.REPS_PER_ROUND}`, 10, '#3bd16f', 0);
      this.lblScore = t(W - 18, y + 36, '0', 9, '#ffffff', 1);
      // Medidor de velocidad (uno por nivel) en el centro del marcador
      t(W / 2 - 4, y + 15, 'VEL', 7, '#ffffff', 1);
      this.speedG = this.add.graphics().setDepth(41); this.speedPos = { x: W / 2 + 2, y: y + 10 };
      this.drawSpeed();
      this.lblCombo = G.ui.text(this, W / 2, this.hitY - 46, '', 10, '#ffd23f').setDepth(30);
      this.lblJudge = G.ui.text(this, W / 2, this.hitY - 22, '', 11, '#ffffff').setDepth(30).setAlpha(0);
      this.lblCount = G.ui.text(this, W / 2, this.feetY + 76, '', 36, '#ffffff', { strokeThickness: 9 }).setDepth(46).setVisible(false);
      this.countLabel = '';
      this.lblBanner = G.ui.text(this, W / 2, this.feetY + 70, '', 16, '#ffd23f', { strokeThickness: 7, lineSpacing: 10 }).setDepth(45);
    }
    banner(txt, color = '#ffd23f', hold = 900) {
      const b = this.lblBanner; this.tweens.killTweensOf(b);
      b.setText(txt).setColor(color).setAlpha(1).setScale(1.25);
      this.tweens.add({ targets: b, scale: 1, duration: 180 });
      if (hold) this.tweens.add({ targets: b, alpha: 0, delay: hold, duration: 300 });
    }

    // ---------- Carriles, línea de golpeo y botones ----------
    buildLanes() {
      const { W, H } = this, lw = W / 3, top = this.feetY + 12;
      const g = this.add.graphics().setDepth(8);
      g.fillStyle(0x0d0b10, 0.55).fillRect(0, top, W, H - top);
      for (let i = 1; i < 3; i++) g.fillStyle(0xffffff, 0.12).fillRect(i * lw - 1, top, 2, this.hitY - top + 10);
      this.spawnY = top + 6;
      this.lineG = this.add.graphics().setDepth(9);
      this.drawLine(0);
      this.ghosts = CFG.LANES.map((L, i) => MG.noteIcon(this, lw * (i + 0.5), this.hitY, i, 44).setAlpha(0.28).setDepth(9));
      this.btns = CFG.LANES.map((L, i) => {
        const x = lw * (i + 0.5), w = lw - 10, h = 78;
        const c = this.add.container(x, this.btnY).setDepth(20);
        const bg = this.add.graphics();
        const icon = MG.noteIcon(this, 0, -14, i, 34);
        const lbl = G.ui.text(this, 0, 22, L.label, 8, '#ffffff', { lineSpacing: 4, strokeThickness: 3 });
        c.add([bg, icon, lbl]);
        c.draw = (down) => {
          bg.clear();
          bg.fillStyle(0x1b1430, 1).fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 10);
          bg.fillStyle(down ? L.dark : L.color, 1).fillRoundedRect(-w / 2, -h / 2 + (down ? 4 : 0), w, h, 10);
          bg.lineStyle(3, 0xffffff, 1).strokeRoundedRect(-w / 2, -h / 2 + (down ? 4 : 0), w, h, 10);
          icon.y = -14 + (down ? 4 : 0); lbl.y = 24 + (down ? 4 : 0);
        };
        c.draw(false);
        return c;
      });
    }
    drawLine(pulse) {
      const g = this.lineG.clear();
      g.fillStyle(0x1b1430, 1).fillRect(0, this.hitY - 4, this.W, 8);
      g.fillStyle(0xffd23f, 0.55 + 0.45 * pulse).fillRect(0, this.hitY - 2, this.W, 4);
    }

    // ---------- Bucle ----------
    update() {
      if (!this.player || this.over) return;
      const t = this.player.now();
      const beat = (t - CFG.BEAT0) / CFG.SPB;
      const ph = this.advancePhase(beat);
      this.updateCountdown(beat, ph);
      this.drawLine(Math.max(0, 1 - (beat - Math.floor(beat)) * 3));
      const secs = ph.phase === 'rest' ? Math.max(0, Math.ceil((ph.end - beat) * CFG.SPB)) : Math.max(0, Math.ceil((CFG.TIME_LIMIT_BEATS - beat) * CFG.SPB));
      this.lblPhase.setText(ph.phase === 'work' ? `TIEMPO ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` :
        ph.phase === 'rest' ? `DESCANSO 0:${String(secs).padStart(2, '0')}` : ph.phase === 'intro' ? 'PREPÁRATE' : '¡TIEMPO!')
        .setColor(ph.phase === 'work' ? (secs <= 15 ? '#ff5a5a' : '#ff7a5a') : '#9fe3ff');
      this.lblRound.setText(`RONDA ${Math.min(CFG.ROUNDS, this.round + 1)}/${CFG.ROUNDS}`);
      if (ph.phase === 'work') this.scheduleNotes(t, beat);

      // notas: aparecer, caer, fallo si se pasan
      const span = this.hitY - this.spawnY;
      for (const n of this.notes) {
        if (n.done) continue;
        const dt = n.t - t;
        if (dt > CFG.LEAD_S) break;
        if (!n.obj) n.obj = MG.noteIcon(this, (this.W / 3) * (n.lane + 0.5), this.spawnY, n.lane, 44).setDepth(10);
        n.obj.y = this.hitY - (dt / CFG.LEAD_S) * span;
        n.obj.setAlpha(Math.min(1, (CFG.LEAD_S - dt) / 0.2));
        if (dt < -CFG.GOOD_MS / 1000) this.judge(n, 'miss', n.lane);
      }
          }

    /**
     * Cuenta atrás 3-2-1-¡YA! antes de cada intervalo de trabajo. Se calcula en cada fotograma a partir
     * del reloj (no con temporizadores ni detectando pulsos sueltos), así que aunque el móvil se salte
     * fotogramas o el reloj de audio avance a saltos siempre se ve el número que toca.
     * Cada número dura COUNT_BEATS pulsos (~1 s); "¡YA!" se queda YA_BEATS pulsos al empezar.
     */
    updateCountdown(beat, ph) {
      const per = CFG.COUNT_BEATS, YA = CFG.YA_BEATS;
      let label = '', frac = 0;
      if (ph.phase === 'intro' || ph.phase === 'rest') {
        const left = ph.end - beat;                       // pulsos hasta empezar a trabajar
        if (left > 0 && left <= 3 * per) { label = String(Math.ceil(left / per)); frac = 1 - (left / per - Math.floor(left / per) || 1); }
      } else if (ph.phase === 'work') {
        const since = beat - this.workStart;              // pulsos desde que empezó la ronda
        if (since >= 0 && since < YA) { label = '¡YA!'; frac = since / YA; }
        else if (this.countLabel === '¡YA!') {            // al quitar el ¡YA!, aviso de ronda
          const last = this.round === CFG.ROUNDS - 1;
          this.banner(last ? '¡ÚLTIMA RONDA!\n¡A TOPE!' : `RONDA ${this.round + 1}\n¡A POR ELLO!`, last ? '#ff5a5a' : '#ffd23f', 700);
        }
      }
      const c = this.lblCount;
      if (label !== this.countLabel) {
        this.countLabel = label;
        if (label) {
          if (label === '¡YA!') G.sfx.beep(990, 0.45, 0.16); else G.sfx.beep(660, 0.12, 0.14);
          this.tweens.killTweensOf(this.lblBanner); this.lblBanner.setAlpha(0);
          c.setText(label).setColor(label === '¡YA!' ? '#3bd16f' : '#ffffff');
        }
      }
      // pop al aparecer y desvanecido al final de cada número, calculado desde el reloj
      c.setVisible(!!label);
      if (label) c.setScale(1.6 - 0.6 * Math.min(1, frac * 5)).setAlpha(frac > 0.85 && label !== '¡YA!' ? (1 - frac) / 0.15 : 1);
    }

    /**
     * Máquina de fases según el reloj de la música: intro -> trabajo (hasta 10 reps buenas) -> descanso
     * (REST_BEATS pulsos) -> trabajo... El paso de trabajo a descanso lo dispara judge() al cerrar la ronda.
     */
    advancePhase(beat) {
      if (beat >= CFG.TIME_LIMIT_BEATS && this.phase !== 'done') { this.phase = 'done'; this.finish(false); }
      if (this.phase === null) { this.phase = 'intro'; this.banner('¡PREPÁRATE!', '#ffd23f', 700); this.setPose('cf_ready'); }
      if ((this.phase === 'intro' || this.phase === 'rest') && beat >= this.phaseEnd) this.startWork(this.phaseEnd);
      return { phase: this.phase, round: this.round, end: this.phaseEnd };
    }
    /** Fase en un pulso futuro cercano (para la percusión sintetizada de reserva). */
    phaseOfBeat(b) {
      if (b >= CFG.TIME_LIMIT_BEATS || this.over) return 'done';
      return (this.phase === 'intro' || this.phase === 'rest') && b < this.phaseEnd ? 'rest' : 'work';
    }
    startWork(b0) {
      this.phase = 'work'; this.workStart = b0; this.roundReps = 0;
      this.nextNote = b0 + CFG.FIRST_NOTE;
      this.lblReps.setText(`REPS 0/${CFG.REPS_PER_ROUND}`);
      this.stopRest();
    }
    /** Ronda cerrada: descanso corto (o victoria si era la última). */
    endRound(beat) {
      if (this.round >= CFG.ROUNDS - 1) return this.finish(true);
      this.round++;
      this.phase = 'rest'; this.phaseEnd = Math.ceil(beat) + CFG.REST_BEATS;
      G.sfx.beep(330, 0.5, 0.16);
      this.banner(`¡RONDA ${this.round}/${CFG.ROUNDS} HECHA!\nDescansa`, '#9fe3ff', 1400);
      this.startRest();
    }
    step() { return CFG.STEP_LEVELS[this.level]; }
    /**
     * Pone en la pista las notas que tocan: cada una LEAD_S antes de su golpe, sin pasarse de las reps
     * que faltan en la ronda (contando las que ya caen). Tras un fallo se añade otra en el siguiente medio pulso libre.
     */
    scheduleNotes(t, beat) {
      const inFlight = this.notes.filter(n => !n.done).length;
      if (inFlight + this.roundReps >= CFG.REPS_PER_ROUND) return;
      const lead = CFG.LEAD_S / CFG.SPB;
      if (this.nextNote < beat + lead * 0.6) this.nextNote = Math.ceil((beat + lead * 0.6) * 2) / 2;   // hueco tras fallos
      if (this.nextNote - beat > lead + 0.2) return;
      let lane;
      do { lane = Math.floor(Math.random() * 3); } while (lane === this.lastLane[0] && lane === this.lastLane[1]);
      this.lastLane = [lane, this.lastLane[0]];
      this.notes.push({ beat: this.nextNote, t: CFG.BEAT0 + this.nextNote * CFG.SPB, lane, round: this.round });
      this.nextNote += this.step();
      if (this.notes.length > 40) this.notes = this.notes.filter(n => !n.done || (n.obj && n.obj.active));
    }

    // ---------- Pulsaciones y juicio ----------
    tap(lane) {
      if (!this.player || this.over) return;
      const b = this.btns[lane]; b.draw(true); this.time.delayedCall(90, () => b.draw(false));
      if (this.phase !== 'work') return;
      const t = this.player.now();
      let best = null;
      for (const n of this.notes) {
        if (n.done || n.lane !== lane) continue;
        const d = Math.abs(n.t - t) * 1000;
        if (n.t - t > CFG.EARLY_MS / 1000) break;
        if (d <= CFG.EARLY_MS && (!best || d < best.d)) best = { n, d };
      }
      if (best) {
        const q = best.d <= CFG.PERFECT_MS ? 'perfect' : best.d <= CFG.GOOD_MS ? 'good' : 'miss';
        return this.judge(best.n, q, lane);
      }
      // carril equivocado: había una nota en la línea en otro carril
      const other = this.notes.find(n => !n.done && n.lane !== lane && Math.abs(n.t - t) * 1000 <= CFG.GOOD_MS);
      if (other) this.judge(other, 'miss', lane);
    }
    judge(n, q, lane) {
      n.done = true;
      const o = n.obj;
      if (q === 'miss') {
        this.stats.miss++; this.combo = 0;
        this.streak = 0; this.level = Math.max(0, this.level - 1); this.drawSpeed();   // fallo: un poco más despacio
        this.showJudge('NO REP', '#ff5a5a');
        this.fail(lane);
        if (o) this.tweens.add({ targets: o, alpha: 0, y: o.y + 30, duration: 250, onComplete: () => o.destroy() });
      } else {
        this.stats[q]++; this.combo++; this.reps++; this.roundReps++;
        if (++this.streak >= CFG.LEVEL_UP && this.level < CFG.STEP_LEVELS.length - 1) {   // racha: más rápido (con tope)
          this.streak = 0; this.level++;
          if (this.roundReps < CFG.REPS_PER_ROUND) this.flashSpeed();
        }
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        const mult = Math.min(4, 1 + Math.floor(this.combo / 8));
        this.score += CFG.POINTS[q] * mult;
        this.showJudge(q === 'perfect' ? '¡PERFECTA!' : '¡BIEN!', q === 'perfect' ? '#ffd23f' : '#3bd16f');
        G.sfx.catch();
        this.doRep(n.lane);
        if (o) { o.y = this.hitY; this.tweens.add({ targets: o, scale: 1.6, alpha: 0, duration: 200, onComplete: () => o.destroy() }); }
        const gh = this.ghosts[n.lane]; gh.setAlpha(1).setScale(1.2);
        this.tweens.add({ targets: gh, alpha: 0.28, scale: 1, duration: 220 });
      }
      this.lblReps.setText(`REPS ${this.roundReps}/${CFG.REPS_PER_ROUND}`);
      this.lblScore.setText(String(this.score));
      this.lblCombo.setText(this.combo >= 3 ? `COMBO x${this.combo}` : '');
      if (q !== 'miss' && this.roundReps >= CFG.REPS_PER_ROUND && this.phase === 'work') this.endRound(n.beat);
    }
    drawSpeed() {
      const g = this.speedG.clear(), { x, y } = this.speedPos, n = CFG.STEP_LEVELS.length;
      for (let i = 0; i < n; i++) {
        g.fillStyle(0x000000, 0.6).fillRect(x + i * 9, y, 7, 10);
        g.fillStyle(i <= this.level ? [0x3bd16f, 0x9be24a, 0xffd23f, 0xff9a3b, 0xff5a5a][i] : 0x4a4560, 1).fillRect(x + i * 9 + 1, y + 1, 5, 8);
      }
    }
    flashSpeed() {
      this.drawSpeed();
      this.time.delayedCall(260, () => !this.over && this.showJudge('¡MÁS RÁPIDO!', '#ff9a3b'));
    }
    showJudge(txt, col) {
      const j = this.lblJudge; this.tweens.killTweensOf(j);
      j.setText(txt).setColor(col).setAlpha(1).setScale(1.3).setY(this.hitY - 22);
      this.tweens.add({ targets: j, scale: 1, y: this.hitY - 30, duration: 160 });
      this.tweens.add({ targets: j, alpha: 0, delay: 380, duration: 200 });
    }

    // ---------- Animaciones de Ane ----------
    setPose(p) {
      this.ane.setPose(p);
      this.ane.setScale(p === 'tired' ? 1.3 : p === 'celebrate' ? 1.08 : 1);
    }
    stopAct() {
      this.act.forEach(a => (a.remove ? a.remove(false) : a.stop()));
      this.act = [];
      this.tweens.killTweensOf([this.ane, this.ball, this.box, this.shadow, this.disc]);
      Object.assign(this.ane, { x: this.aneX, y: this.feetY + 2, angle: 0 });
      this.ane.setFlip(false);   // por defecto mira a la derecha (cajón); solo el wall ball mira a la izquierda
      this.shadow.setPosition(this.aneX, this.feetY + 2).setScale(1);
      this.box.setAngle(0); this.disc.setAngle(0).setScale(1); this.ball.setVisible(false).setAngle(0);
    }
    tw(cfg) { const t = this.tweens.add(cfg); this.act.push(t); return t; }
    later(ms, fn) { const e = this.time.delayedCall(ms, fn); this.act.push(e); return e; }
    /** Duración de una repetición según la velocidad actual. */
    repMs() { return Math.max(520, Math.min(900, this.step() * CFG.SPB * 1000 * 0.85)); }

    doRep(lane) {
      this.stopAct();
      const d = this.repMs(), a = this.ane, fy = this.feetY + 2, k = CFG.LANES[lane].key;
      if (k === 'burpee') {            // BURPEE: plancha -> salto con brazos arriba
        this.setPose('cf_bdown');
        this.later(d * 0.38, () => { this.setPose('cf_bup'); this.tw({ targets: a, y: fy - 26, duration: d * 0.22, yoyo: true, ease: 'Quad.out' }); });
        this.later(d * 0.92, () => this.setPose('cf_ready'));
      } else if (k === 'box') {    // SALTO AL CAJÓN: agrupada hasta arriba del cajón y bajada
        this.setPose('cf_squat');
        this.later(d * 0.12, () => {
          this.setPose('cf_tuck');
          this.tw({ targets: a, x: this.boxX - 6, duration: d * 0.34 });
          this.tw({ targets: a, y: this.boxTop - 34, duration: d * 0.17, ease: 'Quad.out',
            onComplete: () => this.tw({ targets: a, y: this.boxTop, duration: d * 0.17, ease: 'Quad.in' }) });
          this.tw({ targets: this.shadow, x: this.boxX - 6, y: this.boxTop, duration: d * 0.34 });
        });
        this.later(d * 0.48, () => this.setPose('cf_ready'));
        this.later(d * 0.66, () => {
          this.tw({ targets: [a, this.shadow], x: this.aneX, duration: d * 0.26 });
          this.tw({ targets: [a, this.shadow], y: fy, duration: d * 0.26, ease: 'Quad.in' });
        });
      } else {                     // WALL BALL: mirando a la IZQUIERDA (hacia la diana): sentadilla, lanzamiento y recepción
        this.ane.setFlip(true);
        this.setPose('cf_squat');
        this.ball.setVisible(true).setPosition(this.aneX - 4, fy - 58);
        this.later(d * 0.3, () => {
          this.setPose('cf_throw');
          const T = this.target, hand = { x: this.aneX + 6, y: fy - 128 };
          this.ball.setPosition(hand.x, hand.y);
          this.arc(hand, { x: (hand.x + T.x) / 2 + 6, y: T.y - 46 }, T, d * 0.26, 'Sine.out', 200, () => {
            this.hitDisc();
            this.arc(T, { x: T.x + 10, y: T.y - 6 }, { x: this.aneX + 4, y: fy - 116 }, d * 0.28, 'Quad.in', 360);
          });
        });
        this.later(d * 0.86, () => { this.setPose('cf_catch'); this.ball.setPosition(this.aneX + 4, fy - 116); });
        this.later(d * 1.0, () => { this.ane.setFlip(false); this.setPose('cf_ready'); this.ball.setVisible(false); });
      }
    }

    /** Mueve el balón por una curva de Bézier cuadrática (p0 -> p2 con control p1) girándolo. */
    arc(p0, p1, p2, dur, ease, spin, done) {
      const b = this.ball, a0 = b.angle;
      return this.tw({ targets: { k: 0 }, k: 1, duration: dur, ease,
        onUpdate: (tw, o) => { const k = o.k, u = 1 - k;
          b.setPosition(u * u * p0.x + 2 * u * k * p1.x + k * k * p2.x, u * u * p0.y + 2 * u * k * p1.y + k * k * p2.y).setAngle(a0 + spin * k); },
        onComplete: () => done && done() });
    }
    hitDisc() {
      const d = this.disc; this.tweens.killTweensOf(d);
      d.setScale(1.08).setAngle(0);
      this.tweens.add({ targets: d, scale: 1, duration: 140, ease: 'Quad.out' });
      const fx = this.add.circle(this.target.x, this.target.y, 10, 0xffffff, 0.8).setDepth(7);
      this.tweens.add({ targets: fx, scale: 2.6, alpha: 0, duration: 220, onComplete: () => fx.destroy() });
    }
    fail(lane) {
      this.stopAct();
      const a = this.ane, fy = this.feetY + 2, k = CFG.LANES[lane].key;
      if (k === 'burpee') {        // tropieza en el burpee
        G.sfx.hit(); this.setPose('cf_trip');
        this.cameras.main.shake(140, 0.006);
      } else if (k === 'box') {    // se da con el cajón en la espinilla
        G.sfx.hit(); this.setPose('cf_shin');
        a.x = this.aneX + 34;
        this.tw({ targets: this.box, angle: { from: -7, to: 7 }, duration: 90, yoyo: true, repeat: 2, onComplete: () => this.box.setAngle(0) });
        this.tw({ targets: a, y: fy - 10, duration: 120, yoyo: true, repeat: 2 });
      } else {                     // el balón le cae en la cabeza (mirando a la diana, a la izquierda)
        this.ane.setFlip(true);
        this.setPose('cf_squat');
        const T = this.target;
        this.ball.setVisible(true).setPosition(T.x + 16, T.y - 20);   // rebota en el borde de la diana...
        this.tw({ targets: this.disc, angle: { from: -4, to: 4 }, duration: 60, yoyo: true, repeat: 1, onComplete: () => this.disc.setAngle(0) });
        this.arc({ x: T.x + 16, y: T.y - 20 }, { x: (T.x + this.aneX) / 2, y: T.y - 56 }, { x: this.aneX - 4, y: fy - 104 }, 300, 'Quad.in', -160, () => {   // ...y le cae en la cabeza
          G.sfx.drop(); this.setPose('cf_dizzy');
          this.tw({ targets: this.ball, x: this.aneX + 70, y: fy - 14, angle: 220, duration: 380, ease: 'Bounce.out' });
        });
      }
      this.later(FAIL_MS, () => { this.stopAct(); this.setPose('cf_ready'); });
    }

    startRest() {
      this.stopAct(); this.resting = true;
      this.setPose('tired');
      this.restTw = this.tweens.add({ targets: this.ane, scaleY: 1.36, duration: CFG.SPB * 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    stopRest() {
      if (!this.resting) return;
      this.resting = false; if (this.restTw) this.restTw.stop();
      this.stopAct(); this.setPose('cf_ready');
    }

    finish(win) {
      if (this.over) return;
      this.over = true;
      this.stopAct();
      this.notes.forEach(n => n.obj && !n.done && n.obj.setVisible(false));
      const data = { win, reps: this.reps, score: this.score, maxCombo: this.maxCombo, stats: this.stats, round: this.round + 1 };
      if (win) {
        G.progress.complete(CFG.id); G.progress.recordScore(CFG.id, this.score);
        this.player.stop(1.2); G.sfx.win();
        this.banner('¡WOD\nCOMPLETADO!', '#ffd23f', 0);
        this.setPose('celebrate');
        this.tween = this.tweens.add({ targets: this.ane, y: this.feetY - 16, duration: 220, yoyo: true, repeat: -1 });
      } else {
        this.player.stop(0.6); G.sfx.gameOver();
        this.banner('¡TIEMPO!', '#ff5a5a', 0);
        this.setPose('tired');
      }
      this.time.delayedCall(1800, () => this.scene.start('CrossfitEnd', data));
    }
  }
  MG.scenes.push(CrossfitGame);
})(window.AneGame);
