/*
 * Minijuego 6 (día 6): Cruzar el puerto — estilo Frogger en vertical.
 * Rejilla de 9 columnas x 12 filas (de abajo arriba):
 *   0 muelle de salida · 1-3 carriles de camiones · 4 patio de contenedores (muros con huecos)
 *   5-6 carriles · 7 muelle intermedio (seguro) · 8-10 agua con barcos · 11 muelle de llegada (meta)
 * v8: arte pixel a 1 px de arte = 1 px lógico (casilla de 40 px, tools/make_puerto_art.py), horizonte
 * con la parte de arriba de bg_puerto.jpg y variedad entre partidas:
 *   - sentido de cada carril aleatorio en cada partida;
 *   - en cada cruce se re-sortean los huecos del patio y la variación de velocidad de cada carril.
 * DECISIÓN: 3 vidas para toda la partida; hay que cruzar 3 veces y cada cruce va más rápido.
 * Al perder una vida Ane vuelve al muelle de salida del cruce actual.
 */
(function (G) {
  const CFG = {
    id: 'puerto',
    COLS: 9, ROWS: 12, TILE: 40,   // el arte está dibujado para casillas de 40 px
    CONT_ROW: 4, MID_ROW: 7,
    LIVES: 3, CROSSINGS: 3,
    SPEED_MUL: [1, 1.3, 1.6],      // velocidad de cada cruce
    HOP_MS: 130,                   // duración del salto de una casilla
    SWIPE_PX: 22,                  // desplazamiento mínimo para que cuente como deslizar (si no, toque = arriba)
    INVULN_MS: 900,
    START_COL: 4,
    ANE_H: 1.6,                    // alto de Ane (pose de pie) en casillas
    // Contenedores fijos: esquinas del muelle de salida (siempre) y patio (fila CONT_ROW), donde en cada
    // cruce se sortean YARD_GAPS huecos separados entre sí (ver pickYardGaps). BLOCKED es la disposición
    // inicial por defecto; la escena guarda la actual en CFG.live.blocked.
    BLOCKED: { 4: [0, 1, 3, 4, 6, 8], 0: [0, 8] },
    YARD_GAPS: 3,
    // Carriles: v = px/s en el cruce 1 (con casilla de 40). El sentido se sortea en cada partida y la
    // velocidad varía ±SPEED_JITTER por carril en cada cruce.
    // Aparición aleatoria: hueco entre objetos = gap[0] + aleatorio(0..gap[1]) casillas (borde a borde).
    // Carretera: el hueco mínimo siempre deja pasar a Ane. Agua: pocos barcos y largos; el hueco se
    // limita además para que nunca haya que esperar más de WATER_MAX_WAIT s a que llegue uno.
    ROAD: {
      1: { v: 46, gap: [1.9, 3.2], kinds: ['pickup', 'van', 'pickup', 'truck_red'] },
      2: { v: 40, gap: [2.0, 3.0], kinds: ['truck_blue', 'truck_orange', 'truck_red', 'van'] },
      3: { v: 58, gap: [2.2, 3.4], kinds: ['straddle', 'straddle', 'pickup'] },
      5: { v: 44, gap: [2.0, 3.0], kinds: ['truck_blue', 'truck_orange', 'van', 'pickup'] },
      6: { v: 66, gap: [2.4, 3.6], kinds: ['pickup', 'straddle', 'van', 'truck_red'] },
    },
    WATER: {
      8: { v: 34, gap: [1.3, 1.1], kinds: ['flat', 'barge', 'tug', 'flat'] },
      9: { v: 42, gap: [1.5, 1.3], kinds: ['tug', 'flat', 'tug'] },
      10: { v: 30, gap: [1.2, 0.9], kinds: ['ship', 'barge', 'ship'] },
    },
    WATER_MAX_WAIT: 3.4,
    SPEED_JITTER: 0.15,
    // Margen (casillas) hacia dentro desde el extremo del sprite del barco para aterrizar: el casco empieza
    // 3 px dentro del PNG (3/40), así que cuenta justo cuando el centro de Ane queda sobre el casco visible.
    BOAT_EDGE: 0.075,
    // Ancho en pantalla (en casillas) = ancho del PNG / 40. Todos los sprites miran a la DERECHA
    // (cabina/proa delante); en los carriles hacia la izquierda se voltean.
    SPRITES: {
      pickup: { w: 1.3 }, van: { w: 1.3 }, truck_red: { w: 1.65 }, truck_blue: { w: 2.25 }, truck_orange: { w: 2.25 },
      straddle: { w: 1.2 },
      barge: { w: 3.3 }, flat: { w: 2.7 }, tug: { w: 1.9 }, ship: { w: 4.3 },
    },
    live: null,                    // estado de la partida en curso (lo rellena PuertoGame)
  };
  /** ¿Hay contenedor en (fila, columna)? Usa la disposición de la partida en curso si la hay. */
  CFG.blocked = (r, c) => {
    const b = (CFG.live && CFG.live.blocked) || CFG.BLOCKED;
    return !!(b[r] && b[r].includes(c));
  };
  CFG.isRoad = (r) => !!CFG.ROAD[r];
  CFG.isWater = (r) => !!CFG.WATER[r];

  /**
   * Sortea los huecos del patio: YARD_GAPS columnas no contiguas (al menos una de muro entre dos huecos),
   * bien repartidas (ninguna columna a más de 3 de un hueco) y distinta de la disposición anterior.
   * Devuelve la lista de columnas BLOQUEADAS.
   */
  CFG.pickYardGaps = (prevBlocked) => {
    const n = CFG.COLS, k = CFG.YARD_GAPS;
    for (let tries = 0; tries < 200; tries++) {
      const gaps = Phaser.Utils.Array.Shuffle([...Array(n).keys()]).slice(0, k).sort((a, b) => a - b);
      let ok = gaps[0] <= 3 && gaps[k - 1] >= n - 4;
      for (let i = 1; i < k && ok; i++) ok = gaps[i] - gaps[i - 1] >= 2 && gaps[i] - gaps[i - 1] <= 5;
      const blocked = [...Array(n).keys()].filter(c => !gaps.includes(c));
      if (ok && (!prevBlocked || blocked.join() !== prevBlocked.join())) return blocked;
    }
    return CFG.BLOCKED[CFG.CONT_ROW].slice();
  };

  G.minigames.puerto = {
    id: CFG.id, title: 'Cruzar el puerto', config: CFG, scenes: [],
    preload(scene) {
      ['truck_blue', 'truck_orange', 'truck_red', 'van', 'straddle', 'pickup', 'cont_red', 'cont_teal', 'cont_yellow', 'cont_blue',
        'ship', 'barge', 'tug', 'flat', 'bollard', 'tile_asphalt', 'tile_dash', 'tile_quay', 'tile_yard', 'tile_quay_mid', 'tile_goal',
        'tile_water0', 'tile_water1', 'tile_water2', 'tile_water3']
        .forEach(k => scene.load.image('pt-' + k, G.asset(`assets/puerto/${k}.png`)));
      scene.load.image('pt-bg', G.asset('assets/puerto/bg_puerto.jpg'));
    },
  };
})(window.AneGame);
