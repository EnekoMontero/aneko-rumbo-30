/* Espacio de nombres global del regalo. Todo cuelga de window.AneGame. */
window.AneGame = window.AneGame || {
  minigames: {},          // registro de minijuegos (id -> config)
  GAME_WIDTH: 360,        // ancho lógico fijo (vertical); el alto se adapta a la pantalla
  GAME_HEIGHT: 780,       // se recalcula en main.js según la proporción real del móvil
  FONT: 'PressStart',
  safe: { top: 0, bottom: 0 },  // márgenes seguros (notch / barra de inicio) en px lógicos
};

/** Ruta de un recurso; en la versión de un solo archivo devuelve el data-URI incrustado. */
window.AneGame.asset = (path) => (window.ANE_INLINE && window.ANE_INLINE[path]) || path;

/*
 * ┌───────────────────────────────────────────────────────────────────────────┐
 * │  INTERRUPTOR DE PRUEBAS                                                   │
 * │  true  = modo prueba siempre activo: todo desbloqueado, botón "Borrar     │
 * │          progreso" en el mapa y ?hoy=AAAA-MM-DD para simular una fecha.    │
 * │  false = versión de Ane: cada juego se abre en su fecha.                  │
 * │  ¡PONLO A false ANTES DE PUBLICAR! (python tools/check.py lo comprueba)    │
 * └───────────────────────────────────────────────────────────────────────────┘
 */
window.AneGame.FORCE_TEST = false;

/**
 * MODO PRUEBA (solo con FORCE_TEST = true): todo desbloqueado.
 * ?hoy=AAAA-MM-DD simula esa fecha y desactiva el "todo desbloqueado", para ver el mapa
 * exactamente como lo verá Ane ese día.
 * Con FORCE_TEST = false NO hay ningún atajo por URL: nadie puede desbloquearlo cambiando el enlace.
 */
(function (G) {
  const q = location.search + location.hash;
  const sim = G.FORCE_TEST && /[?&#]hoy=(\d{4}-\d{2}-\d{2})(?!\d)/.exec(q);
  G.FAKE_TODAY = sim ? sim[1] : null;
  G.TEST = G.FORCE_TEST && !G.FAKE_TODAY;
})(window.AneGame);

/**
 * Almacenamiento seguro: si localStorage no está disponible (Safari privado antiguo,
 * cookies bloqueadas, cuota llena) el juego sigue funcionando con memoria.
 * json(key, def, check): lee JSON y devuelve def si está corrupto o no tiene la forma esperada.
 */
window.AneGame.store = (function () {
  const mem = {};
  let ls = null;
  try { ls = window.localStorage; const k = '__ane_t'; ls.setItem(k, '1'); ls.removeItem(k); } catch (e) { ls = null; }
  const S = {
    get(k) { try { if (ls) return ls.getItem(k); } catch (e) { /* sin acceso */ } return k in mem ? mem[k] : null; },
    set(k, v) { v = String(v); mem[k] = v; try { ls && ls.setItem(k, v); } catch (e) { /* cuota o bloqueo: queda en memoria */ } },
    remove(k) { delete mem[k]; try { ls && ls.removeItem(k); } catch (e) { /* nada */ } },
    json(k, def, check) {
      try { const v = JSON.parse(S.get(k)); return v != null && (!check || check(v)) ? v : def; } catch (e) { return def; }
    },
  };
  return S;
})();

