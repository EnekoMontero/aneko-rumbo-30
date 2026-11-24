/*
 * Minijuego 5 (día 5, Bali): Nadar con tortugas.
 * Vista cenital del mar de Bali. Ane nada (arrastra el dedo) y recoge tortugas marinas, que se
 * quedan nadando a su lado un rato. Los dragones de Komodo salen de la playa y cruzan el agua:
 * ¡esquívalos! Desde el segundo 15 también bajan medusas.
 * Se gana al juntar TURTLES tortugas; 3 vidas.
 */
(function (G) {
  const CFG = {
    id: 'bali',
    TURTLES: 12,              // tortugas para ganar
    LIVES: 3,
    INVULN_MS: 1300,
    BEACH: 34,                // ancho de cada franja de playa (px lógicos)
    SCROLL: 46,               // px/s que "avanza" el mar
    TURTLE_EVERY: [2300, 3300],   // ms entre tortugas (aleatorio en el rango)
    TURTLE_SPEED: [44, 70],   // px/s hacia abajo
    KOMODO_EVERY: [2600, 4200],   // ms entre dragones; baja hasta KOMODO_MIN con el tiempo
    KOMODO_MIN: 1500,
    KOMODO_WARN_MS: 900,      // aviso "!" antes de lanzarse al agua
    KOMODO_SPEED: [150, 200], // px/s al cruzar
    JELLY_FROM_S: 15, JELLY_EVERY: [3200, 5200], JELLY_SPEED: [36, 56],
    FOLLOW_MS: 4500,          // cuánto nada a tu lado cada tortuga recogida
    MAX_FOLLOWERS: 4,
  };
  G.minigames.bali = {
    id: CFG.id, title: 'Nadar en Bali', config: CFG, scenes: [],
    preload(scene) {
      ['ane_swim1', 'ane_swim2', 'ane_swim3', 'turtle1', 'turtle2', 'komodo1', 'komodo2', 'jelly1', 'jelly2', 'caustics', 'foam']
        .forEach(k => scene.load.image('bl-' + k, G.asset(`assets/bali/${k}.png`)));
      // Fondo pixel-art que se repite en vertical (tools/make_bali_art.py)
      scene.load.image('bl-sea', G.asset('assets/bali/bg_sea.png'));
    },
  };
})(window.AneGame);
