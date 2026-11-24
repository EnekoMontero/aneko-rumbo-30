/*
 * Minijuego 2 (día 2): Carrera por la ría 6 km — configuración.
 * DECISIÓN: una sola carrera sin vidas. La barra de ENERGÍA es el único "marcador
 * de vida": se gasta corriendo, chocar con un metro quita un buen trozo y si llega
 * a cero Ane se agota y pierde. Así hay un único recurso que vigilar (más claro en
 * un móvil) y el agua tiene doble función: aguantar y recuperarse de un golpe.
 */
(function (G) {
  const CFG = {
    id: 'corredor',
    GOAL_PX: 20000,            // recorrido hasta San Mamés (px lógicos)
    GOAL_M: 6000,              // lo que se muestra en el HUD (metros): el paseo son 6 km en total
    SPEED: [245, 300],         // px/s al inicio -> al final
    TURBO_MULT: 1.6, TURBO_MS: 4000,
    GRAVITY: 1900, JUMP_V: 680,
    HOLD_MS: 220, HOLD_GRAVITY: 0.5,     // mantener pulsado = salto un poco más alto
    COYOTE_MS: 90, BUFFER_MS: 130,
    // Energía (0..100)
    DRAIN: [2.3, 3.5],         // por segundo (sube a lo largo de la carrera)
    WATER: 28, HIT: 28,
    STUMBLE_MS: 700, INVULN_MS: 1300,
    // Obstáculos: metros que salen de un "fosterito"
    TRAIN_EXTRA: [100, 175],    // px/s más rápido que el suelo
    TRAIN_JITTER: [0.8, 1.15],  // cada metro va a una velocidad algo distinta (variedad sin hacerlo injusto)
    OBST_GAP: [[650, 1200], [380, 700]],   // px de separación al inicio / al final (aleatorio en el rango)
    DOUBLE_FROM: 0.3, DOUBLE_P: [0.25, 0.55],        // a partir de este % pueden salir dos metros seguidos
    DOUBLE_MS: [420, 560],      // ms entre los dos vagones de un doble (forman un tren más o menos largo)
    DOUBLE_MAX_PX: 100,         // tope de separación entre vagones: el tren largo siempre se puede saltar
    LAUNCH_DELAY_MS: [0, 120],  // el metro sale del fosterito con un pequeño retraso aleatorio
    WATER_GAP: [1400, 2000],
    TXAKOLI_AT: [0.28, 0.58, 0.82], TXAKOLI_JITTER: 0.04,   // posición de cada txakoli ± 4 % del recorrido
    // Monumentos (orden real río abajo) y punto del recorrido en el que pasan por el centro
    LANDMARKS: [
      { key: 'cascoviejo', at: 0.06, name: 'Casco Viejo' },
      { key: 'salve', at: 0.24, name: 'Puente de La Salve' },
      { key: 'guggenheim', at: 0.42, name: 'Guggenheim' },
      { key: 'deusto', at: 0.60, name: 'Universidad de Deusto' },
      { key: 'iberdrola', at: 0.79, name: 'Torre Iberdrola' },
      { key: 'sanmames', at: 1.0, name: 'San Mamés' },
    ],
    PARALLAX: { hills: 0.05, city: 0.12, landmarks: 0.17, water: 0.45, ground: 1 },
    // Pantallas altas: la ría, la ciudad y los monumentos crecen para no dejar tanto cielo vacío
    TALL: { fromH: 640, perPx: 1 / 350, max: 1.5 },
  };
  /** Disposición vertical común (juego, portada y final). s = escala del decorado. */
  CFG.layout = (H) => {
    const s = Math.min(CFG.TALL.max, Math.max(1, 1 + (H - CFG.TALL.fromH) * CFG.TALL.perPx));
    const groundY = Math.round(H - 92 - G.safe.bottom), pathTop = groundY - 44;
    return { s, groundY, pathTop, riaTop: Math.round(pathTop - 110 * s) };
  };
  G.minigames.corredor = {
    id: CFG.id, title: 'Carrera por la ría 6 km', config: CFG, scenes: [],
    preload(scene) {
      ['deusto', 'guggenheim', 'iberdrola', 'salve', 'cascoviejo', 'sanmames', 'fosterito', 'metro', 'agua', 'txakoli']
        .forEach(k => scene.load.image('r-' + k, G.asset(`assets/runner/${k}.png`)));
      // Decorado (tools/make_runner_art.py): clave de textura -> archivo
      Object.entries({ 'hills-far': 'bg_hills_far', hills: 'bg_hills', city: 'bg_city', water: 'water', path: 'path',
        rail: 'rail', garden: 'garden', finish: 'finish' })
        .forEach(([k, f]) => scene.load.image('r-' + k, G.asset(`assets/runner/${f}.png`)));
    },
  };
})(window.AneGame);
