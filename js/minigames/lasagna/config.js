/*
 * Minijuego 7 (día 7, Roma): Torre de lasagna.
 * Las capas (pasta, ragú y bechamel) van de lado a lado sobre la fuente. Un toque las suelta:
 * lo que sobresale de la capa de abajo se corta y se cae. Si una capa no toca la de abajo, se
 * acaba. Al llegar a TARGET capas, la lasagna entra al horno para el gratinado.
 */
(function (G) {
  // La lasagna es K veces más grande que en la primera versión (196 px de ancho, capas de 14 px).
  // Velocidades y márgenes en px se multiplican por K: el margen de tiempo para acertar
  // (PERFECT_PX / velocidad) es el mismo, así que la dificultad percibida no cambia.
  const K = 252 / 196;
  const CFG = {
    id: 'lasagna',
    TARGET: 28,            // capas para ganar (torre alta; la cámara sube con ella)
    LAYER_H: 20,           // alto de cada capa (px lógicos; = LH de tools/make_lasagna_art.py)
    START_W: 252,          // ancho inicial (= interior de la fuente)
    SPEED0: 100 * K, SPEED_STEP: 4 * K, SPEED_MAX: 200 * K,   // px/s del vaivén (sube suave: 28 capas)
    PERFECT_PX: 6 * K,     // si se desvía menos que esto, encaja sin cortar
    MIN_OVERLAP: 2 * K,    // si solapa menos que esto con la capa de abajo, se cae
    REGROW_AFTER: 2,       // perfectas seguidas para recuperar un poco de ancho
    REGROW_PX: 12 * K,
    ORDER: ['pasta', 'ragu', 'bech'],
  };
  G.minigames.lasagna = {
    id: CFG.id, title: 'Torre de lasagna', config: CFG, scenes: [],
    preload(scene) {
      scene.load.image('ls-bg', G.asset('assets/lasagna/bg_roma.png'));
      // Capas, fuente de barro y adornos pixel-art (tools/make_lasagna_art.py)
      ['pasta', 'ragu', 'bech', 'gratin', 'crust', 'dish', 'dish_back', 'basil']
        .forEach(k => scene.load.image('ls-' + k, G.asset(`assets/lasagna/${k}.png`)));
    },
  };
})(window.AneGame);
