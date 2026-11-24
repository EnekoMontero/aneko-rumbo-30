/*
 * Historia de los 30: intro, pasaporte con sellos y escena final.
 * Estado en localStorage.
 */
(function (G) {
  const INTRO_KEY = 'ane.introSeen';
  const STAMP_KEY = 'ane.stamps.v1';      // sellos ya "estampados" (animación vista)
  /** Orden de los sellos en el pasaporte = orden del mapa. */
  const IDS = ['pintxos', 'corredor', 'crossfit', 'memory', 'bali', 'puerto', 'lasagna'];
  const qs = location.search + location.hash;

  const loadSeen = () => G.store.json(STAMP_KEY, [], Array.isArray).slice();

  G.story = {
    IDS,
    /** ¿Mostrar la intro al arrancar? (?intro=1 la fuerza; ?nointro=1 y los tests automáticos la saltan) */
    shouldShowIntro() {
      if (/[?&#]intro=1\b/.test(qs)) return true;
      if (/[?&#]nointro=1\b/.test(qs) || navigator.webdriver) return false;
      return !G.store.get(INTRO_KEY);
    },
    markIntroSeen() { G.store.set(INTRO_KEY, '1'); },
    /** Sellos conseguidos = minijuegos superados. */
    stamps() { return IDS.filter(id => G.progress.isCompleted(id)); },
    allStamps() { return this.stamps().length === IDS.length; },
    missing() { return IDS.length - this.stamps().length; },
    /** Sellos superados cuya animación aún no se ha visto. */
    pendingStamps() { const seen = loadSeen(); return this.stamps().filter(id => !seen.includes(id)); },
    markStamped(id) { const s = loadSeen(); if (!s.includes(id)) { s.push(id); G.store.set(STAMP_KEY, JSON.stringify(s)); } },
    reset() { G.store.remove(STAMP_KEY); G.store.remove(INTRO_KEY); },
    /** Nodo del mapa de un minijuego (para el icono del sello). */
    node(id) { return G.MAP.nodes.find(n => n.id === id); },


    /**
     * Sello de tinta: aro doble + icono del nodo en un color + nombre.
     * Devuelve un contenedor centrado en (x, y).
     */
    stamp(scene, x, y, id, r = 34) {
      const col = { pintxos: 0xc0283c, corredor: 0x2a5cc0, crossfit: 0x1f1f2a, memory: 0x6a3cb0, bali: 0x1a8a7a, puerto: 0xd0661a, lasagna: 0x2f8a3c }[id] || 0xc0283c;
      const c = scene.add.container(x, y);
      const g = scene.add.graphics();
      g.lineStyle(3, col, 0.95).strokeCircle(0, 0, r);
      g.lineStyle(1, col, 0.95).strokeCircle(0, 0, r - 5);
      for (let k = 0; k < 10; k++) {         // muescas de tinta irregular
        const a = k * 0.63 + 0.2;
        g.fillStyle(0xf3e6c8, 1).fillRect(Math.cos(a) * r - 1, Math.sin(a) * r - 1, 2, 2);
      }
      c.add(g);
      const n = this.node(id);
      if (n && scene.textures.exists(n.icon)) {
        // tinta: el icono conserva el dibujo pero teñido del color del sello
        const mix = (c, k) => Math.round(c + (255 - c) * k);
        const lc = (mix(col >> 16 & 255, 0.35) << 16) | (mix(col >> 8 & 255, 0.35) << 8) | mix(col & 255, 0.35);
        const ic = scene.add.image(0, -6, n.icon).setTint(lc).setAlpha(0.92);
        ic.setScale(Math.min((r * 1.2) / ic.width, (r * 0.8) / ic.height));
        c.add(ic);
      }
      const t = scene.add.text(0, r * 0.42, G.T.stamps[id], { fontFamily: G.FONT, fontSize: '6px', color: '#' + col.toString(16).padStart(6, '0') })
        .setOrigin(0.5).setResolution(2);
      c.add(t);
      c.setAngle(((IDS.indexOf(id) * 37) % 17) - 8);
      return c;
    },
  };

  // Recursos de la historia
  G.corePreload = G.corePreload || [];
  G.corePreload.push(scene => {
    const L = (k, p) => scene.load.image(k, G.asset(p));
    L('st-bedroom', 'assets/story/bedroom.png');
    L('st-cake', 'assets/story/cake.png');
    L('st-passport', 'assets/story/passport.png');
    L('st-envelope', 'assets/story/envelope.png');
    L('st-cont', 'assets/story/cont_frame.png');
    L('st-door-l', 'assets/story/door_l.png');
    L('st-door-r', 'assets/story/door_r.png');
  });
})(window.AneGame);
