/* Progreso (localStorage): juegos superados (= sellos del pasaporte) y mejores puntuaciones. */
(function (G) {
  const KEY = 'ane.progress.v1';
  const isObj = v => typeof v === 'object' && !Array.isArray(v);
  const load = () => {
    const p = G.store.json(KEY, {}, isObj);
    if (!isObj(p.completed || {})) p.completed = {};
    if (!isObj(p.best || {})) p.best = {};
    return p;
  };
  const save = (p) => G.store.set(KEY, JSON.stringify(p));

  G.progress = {
    get: load,
    /** Mejor puntuación de un minijuego. */
    best(id) { return (load().best || {})[id] || 0; },
    recordScore(id, score) {
      const p = load(); p.best = p.best || {};
      if (score > (p.best[id] || 0)) { p.best[id] = score; save(p); return true; }
      return false;
    },
    isCompleted(id) { return !!(load().completed || {})[id]; },
    /** Marca un minijuego como superado: da su sello del pasaporte (la animación sale al volver al mapa). */
    complete(id) {
      const p = load(); p.completed = p.completed || {};
      if (!p.completed[id]) { p.completed[id] = Date.now(); save(p); }
    },
  };
})(window.AneGame);
