/* Efectos de sonido sintetizados con WebAudio (sin archivos externos). */
(function (G) {
  let ctx = null;
  const listeners = new Set();
  let muted = G.store.get('ane.muted') === '1';

  // iOS 17+: que el interruptor de silencio no apague el juego (como un vídeo)
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* no soportado */ }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
    }
    // 'interrupted' = iOS tras una llamada o al volver de segundo plano
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') { const r = ctx.resume(); r && r.catch && r.catch(() => {}); }
    return ctx;
  }
  /** Primer gesto: crear/reanudar el contexto y sonar un búfer mudo (desbloqueo clásico de iOS Safari). */
  let primed = false;
  function unlock() {
    const c = ensure(); if (!c) return;
    if (!primed) {
      try { const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); primed = true; } catch (e) { /* reintento en el próximo toque */ }
    }
  }
  // iOS/Android: el audio solo arranca tras un gesto. En fase de captura, para que los
  // botones HTML (silencio/inclinación) que paran la propagación también desbloqueen.
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev =>
    window.addEventListener(ev, unlock, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && primed) ensure(); });

  /** Tono simple con barrido de frecuencia y envolvente. */
  function tone({ type = 'square', f0 = 440, f1 = f0, dur = 0.1, vol = 0.15, delay = 0 }) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur = 0.2, vol = 0.12, delay = 0) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; g.gain.value = vol;
    s.connect(g).connect(c.destination); s.start(t);
  }

  G.sfx = {
    catch() { tone({ f0: 660, f1: 1320, dur: 0.08 }); tone({ f0: 990, f1: 1760, dur: 0.07, delay: 0.06, vol: 0.1 }); },
    pepper() { tone({ type: 'sawtooth', f0: 520, f1: 110, dur: 0.35, vol: 0.18 }); noise(0.25, 0.1); },
    lifeLost() { [523, 392, 262].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.97, dur: 0.14, vol: 0.2, delay: i * 0.12 })); },
    drop() { noise(0.12, 0.15); tone({ type: 'triangle', f0: 200, f1: 70, dur: 0.15, vol: 0.2 }); },
    jump() { tone({ f0: 330, f1: 880, dur: 0.14, vol: 0.12 }); },
    drink() { [700, 900, 1100].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 1.2, dur: 0.06, vol: 0.12, delay: i * 0.05 })); },
    hit() { noise(0.2, 0.18); tone({ type: 'sawtooth', f0: 300, f1: 80, dur: 0.25, vol: 0.16 }); },
    turbo() { [392, 523, 659, 784, 1047].forEach((f, i) => tone({ f0: f, f1: f * 1.5, dur: 0.07, vol: 0.11, delay: i * 0.05 })); },
    step() { tone({ f0: 520, f1: 600, dur: 0.05, vol: 0.05 }); },
    unlock() { [784, 988, 1175, 1568].forEach((f, i) => tone({ f0: f, dur: 0.12, vol: 0.12, delay: i * 0.09 })); },
    locked() { tone({ type: 'square', f0: 160, f1: 120, dur: 0.12, vol: 0.12 }); tone({ type: 'square', f0: 160, f1: 120, dur: 0.12, vol: 0.12, delay: 0.14 }); },
    click() { tone({ f0: 880, dur: 0.05, vol: 0.1 }); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone({ f0: f, dur: 0.16, vol: 0.13, delay: i * 0.11 })); },
    gameOver() { [392, 330, 262, 196].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.22, vol: 0.2, delay: i * 0.18 })); },
    /** Pitido de cronómetro (tabata). */
    beep(f = 880, dur = 0.12, vol = 0.14, delay = 0) { tone({ type: 'square', f0: f, dur, vol, delay }); },
    /** Contexto compartido (para la música del CrossFit). */
    ctx() { return ensure(); },
    get muted() { return muted; },
    setMuted(v) { muted = v; G.store.set('ane.muted', v ? '1' : '0'); listeners.forEach(fn => fn(muted)); },
    onMute(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})(window.AneGame);
