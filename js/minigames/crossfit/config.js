/*
 * Minijuego 3 (día 3): Guitar Hero de CrossFit en un box de CrossFit — configuración.
 * Todo el ritmo sale de los BPM de la canción. El WOD son 3 rondas de 10 reps buenas:
 * al completar las 10 reps de una ronda empieza un descanso corto (~5 s, sin notas) y luego la siguiente.
 * La velocidad sube con la racha de aciertos (con tope) y baja un escalón al fallar.
 * DECISIÓN: se gana al llegar a 30 reps (3 x 10); si la canción termina antes, "¡Tiempo!" y se puede reintentar.
 */
(function (G) {
  const CFG = {
    id: 'crossfit',
    MUSIC: 'assets/music/motivator.mp3',
    // Crédito obligatorio (CC BY 4.0): título, autor, fuente y licencia
    CREDIT: 'Música: "Motivator", Kevin MacLeod\n(incompetech.com) · Licencia CC BY 4.0',
    CREDIT_URL: 'creativecommons.org/licenses/by/4.0',
    BPM: 126, BEAT0: 0.026,          // tempo y primer golpe medidos en el mp3 recortado
    INTRO_BEATS: 8,                  // "¡Prepárate!" + cuenta atrás antes de la primera ronda
    COUNT_BEATS: 2, YA_BEATS: 2,     // cada número de la cuenta 3-2-1 dura 2 pulsos (~0,95 s); "¡YA!" otros 2
    ROUNDS: 3, REPS_PER_ROUND: 10,   // 3 rondas x 10 reps buenas = 30 para ganar
    REST_BEATS: 10,                  // descanso entre rondas: 10 pulsos = ~4,8 s (antes ~9,5 s)
    FIRST_NOTE: 3,                   // pulsos desde el "¡YA!" hasta la primera nota de la ronda
    // Velocidad: pulsos entre notas por nivel. Se sube un nivel cada LEVEL_UP aciertos seguidos
    // (tope en el último: 1,5 pulsos = ~0,7 s entre notas) y se baja uno al fallar.
    STEP_LEVELS: [4, 3, 2.5, 2, 1.5], LEVEL_UP: 4,
    TIME_LIMIT_BEATS: 290,           // la canción dura ~140 s: si se acaba antes de las 30 reps, "¡Tiempo!"
    REPS_TO_WIN: 30,
    PERFECT_MS: 70, GOOD_MS: 140, EARLY_MS: 230,   // ventanas de acierto
    LEAD_S: 1.45,                    // segundos que tarda un icono en caer hasta la línea
    POINTS: { perfect: 100, good: 60 },
    LANES: [
      // Orden de izquierda a derecha (= escenario: diana a la izquierda, cajón a la derecha)
      { key: 'ball', label: 'WALL BALL', color: 0x3b7fe0, dark: 0x22509a },
      { key: 'burpee', label: 'BURPEE', color: 0xe8433a, dark: 0x9c2420 },
      { key: 'box', label: 'SALTO AL\nCAJÓN', color: 0x34a853, dark: 0x1f6d33 },
    ],
  };
  CFG.SPB = 60 / CFG.BPM;

  const MG = G.minigames.crossfit = {
    id: CFG.id, title: 'Guitar Hero de CrossFit', config: CFG, scenes: [],
    preload(scene) {
      ['ready', 'bdown', 'bup', 'tuck', 'squat', 'throw', 'catch', 'trip', 'shin', 'dizzy']
        .forEach(p => scene.load.image('ane-cf_' + p, G.asset(`assets/crossfit/ane_${p}.png`)));
      ['box', 'ball', 'ic-burpee', 'ic-box'].forEach(k => scene.load.image('cf-' + k, G.asset(`assets/crossfit/${k}.png`)));
      scene.load.image('cf-bg', G.asset('assets/crossfit/bg_box.png'));
      scene.load.image('cf-wbtarget', G.asset('assets/crossfit/wb_target.png'));
    },
  };

  /** Fondo del box: ancho completo arriba y suelo oscuro debajo. Devuelve el desplazamiento. */
  MG.drawBox = (scene, W, H, top = 0, dim = 0) => {
    scene.add.rectangle(0, 0, W, H, 0x1f1c22).setOrigin(0);
    const img = scene.add.image(W / 2, top, 'cf-bg').setOrigin(0.5, 0);
    img.setScale(Math.max(W / img.width, 0.6));
    const bottom = top + img.displayHeight;
    if (bottom < H) {   // fundido del suelo hacia el color de relleno
      const g = scene.add.graphics();
      for (let i = 0; i < 24; i++) g.fillStyle(0x1f1c22, i / 24).fillRect(0, bottom - 24 + i, W, 1);
    }
    if (dim) scene.add.rectangle(0, 0, W, H, 0x1b1430, dim).setOrigin(0);
    return { img, scale: img.scaleX };
  };

  /** Texturas generadas: disco de cada carril (para la nota de wall ball) y estrellitas. */
  MG.makeTextures = (scene) => {
    if (scene.textures.exists('cf-disc-ball')) return;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0x1b1430, 1).fillCircle(24, 25, 23);
    g.fillStyle(0xffffff, 1).fillCircle(24, 24, 22);
    g.fillStyle(0x3b7fe0, 1).fillCircle(24, 24, 18);
    g.fillStyle(0x6fa6f5, 1).fillCircle(20, 19, 7);
    g.generateTexture('cf-disc-ball', 48, 50); g.destroy();
  };

  /** Música: se descarga y decodifica una vez (también desde el archivo único). */
  MG.music = {
    promise: null, buffer: null,
    load() {
      if (this.promise) return this.promise;
      const ctx = G.sfx.ctx();
      if (!ctx || !window.fetch) return (this.promise = Promise.resolve(null));
      this.promise = fetch(G.asset(CFG.MUSIC))
        .then(r => r.arrayBuffer())
        .then(ab => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
        .then(b => (this.buffer = b))
        .catch(err => { console.warn('Música no disponible, uso el ritmo sintetizado', err); return null; });
      return this.promise;
    },
  };

  /**
   * Reproductor + reloj del WOD. Con la canción: reloj = AudioContext (sincronía exacta).
   * Sin canción: un tabata sintetizado con WebAudio a los mismos BPM.
   * Sin audio en absoluto: reloj con performance.now (silencio).
   */
  MG.Player = class {
    constructor() {
      this.ctx = G.sfx.ctx(); this.t = -0.5; this.pn = performance.now(); this.paused = false; this.nextBeat = 0;
      this.synth = !MG.music.buffer;
    }
    start() {
      const c = this.ctx;
      if (c) {
        if (c.state !== 'running' && c.resume) c.resume().catch(() => {});
        this.gain = c.createGain(); this.gain.gain.value = G.sfx.muted ? 0 : 0.85;
        this.gain.connect(c.destination);
        this.startAt = c.currentTime + 0.5;
        if (!this.synth) {
          this.src = c.createBufferSource(); this.src.buffer = MG.music.buffer;
          this.src.connect(this.gain); this.src.start(this.startAt);
        }
        this.offMute = G.sfx.onMute(m => this.gain && this.gain.gain.setTargetAtTime(m ? 0 : 0.85, c.currentTime, 0.02));
      }
      this.pn = performance.now();
    }
    /**
     * Reloj del WOD en segundos (siempre creciente). Normalmente sigue al AudioContext, pero en Chrome de
     * Android el reloj de audio puede tardar en arrancar o quedarse quieto un rato (salida de audio
     * despertando, contexto suspendido): si no avanza en 200 ms se sigue con performance.now() y,
     * cuando vuelve, se re-sincroniza sin ir hacia atrás.
     */
    now() {
      const c = this.ctx, p = performance.now(), dt = Math.min(0.25, (p - this.pn) / 1000);
      this.pn = p;
      if (this.paused) return this.t;
      let t = this.t + dt;                                   // reserva: reloj del sistema
      if (c && c.state === 'running' && this.startAt !== undefined) {
        const ct = c.currentTime;
        if (ct !== this.lastCt) { this.lastCt = ct; this.lastCtPn = p; }
        if (p - this.lastCtPn < 200) {                       // el reloj de audio avanza: manda él
          const at = ct - this.startAt + Math.min(0.05, (p - this.lastCtPn) / 1000);
          if (this.synth && at < this.t - 0.05) this.startAt = ct - this.t;   // sin canción: re-anclar
          t = Math.max(this.t, this.synth ? ct - this.startAt : at);
        }
      }
      this.t = t;
      if (this.synth) this.schedule();
      return this.t;
    }
    /** Ritmo de reserva: bombo en cada pulso, charles a contratiempo, más fuerte al trabajar. */
    schedule() {
      const c = this.ctx; if (!c || c.state !== 'running') return;
      while (CFG.BEAT0 + this.nextBeat * CFG.SPB < this.t + 0.3) {
        const b = this.nextBeat++, at = this.startAt + CFG.BEAT0 + b * CFG.SPB;
        const ph = this.phaseOf ? this.phaseOf(b) : 'work'; if (ph === 'done') continue;   // la partida dice en qué fase está
        const work = ph === 'work';
        this.drum(at, 'kick', work ? 0.5 : 0.3);
        if (work || b % 2 === 0) this.drum(at + CFG.SPB / 2, 'hat', work ? 0.12 : 0.06);
        if (work && b % 4 === 2) this.drum(at, 'snare', 0.2);
      }
    }
    drum(at, kind, vol) {
      const c = this.ctx, g = c.createGain(); g.connect(this.gain);
      if (kind === 'kick') {
        const o = c.createOscillator(); o.frequency.setValueAtTime(140, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.15);
        g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.18);
        o.connect(g); o.start(at); o.stop(at + 0.2);
      } else {
        const len = kind === 'hat' ? 0.04 : 0.12, buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
        const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = c.createBufferSource(); s.buffer = buf;
        const f = c.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
        g.gain.setValueAtTime(vol, at); s.connect(f).connect(g); s.start(at);
      }
    }
    pause(p) {
      this.paused = p; this.pn = performance.now();
      if (this.ctx) (p ? this.ctx.suspend() : this.ctx.resume()).catch(() => {});
    }
    stop(fade = 0) {
      if (this.offMute) this.offMute();
      const c = this.ctx; if (!c || !this.gain) return;
      const g = this.gain, src = this.src;
      g.gain.setTargetAtTime(0, c.currentTime, Math.max(0.01, fade / 3));
      setTimeout(() => { try { src && src.stop(); } catch (e) { /* ya parada */ } g.disconnect(); }, fade * 1000 + 100);
      this.gain = null; this.synth = false;
    }
  };
})(window.AneGame);
