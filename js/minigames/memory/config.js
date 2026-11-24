/*
 * Minijuego del día 4 (aeropuerto de Bilbao): Memory de viajes.
 * 6 parejas (12 cartas en rejilla 3×4). Cada pareja es la foto de un viaje; al
 * acertarla sale un cartel con el sitio y la fecha. Sin derrota: estrellas según movimientos.
 *
 * ─── CÓMO CAMBIAR LAS FOTOS ──────────────────────────────────────────────
 * 1. Pon la foto (JPG/PNG/WEBP, NO HEIC) en cualquier carpeta y ejecuta:
 *        python tools/prepare_photos.py RUTA_DE_LA_FOTO_O_CARPETA
 *    (la endereza, la reduce y la guarda en assets/fotos/memory/ con su nombre; el original
 *    queda en fotos-originales/). Cualquier proporción vale: el juego recorta el CUADRADO CENTRAL.
 * 2. Cambia `place` (sitio, corto: cabe en la carta) y `date` (fecha, texto libre) abajo.
 *    Tienen que ser exactamente 6 viajes (6 parejas = 12 cartas).
 * 3. python tools/check.py te avisa si queda alguna foto o texto de relleno.
 * ─────────────────────────────────────────────────────────────────────────
 */
(function (G) {
  const CFG = {
    id: 'memory',
    TRIPS: [
      { src: 'assets/fotos/memory/bolonia.jpg', place: 'Bolonia', date: '2021' },
      { src: 'assets/fotos/memory/atenas.jpg', place: 'Atenas', date: '2023' },
      { src: 'assets/fotos/memory/bali.jpg', place: 'Bali', date: '2024' },
      { src: 'assets/fotos/memory/venecia.jpg', place: 'Venecia', date: '2024' },
      { src: 'assets/fotos/memory/londres.jpg', place: 'Londres', date: '2026' },
      { src: 'assets/fotos/memory/nuevayork.jpg', place: 'Nueva York', date: '2026' },
    ],
    COLS: 3, ROWS: 4,
    STARS: [10, 14],     // ≤10 movimientos = 3 estrellas, ≤14 = 2, más = 1 (mínimo posible: 6)
    FLIP_MS: 160,
    MISS_MS: 750,        // tiempo que se ven dos cartas distintas antes de darse la vuelta
    BANNER_MS: 1600,
  };
  const MG = G.minigames.memory = { id: CFG.id, title: 'Memory de viajes', config: CFG, scenes: [],
    preload(scene) {
      scene.load.image('mm-bg', G.asset('assets/memory/bg_aeropuerto.jpg'));
      scene.load.image('mm-back', G.asset('assets/memory/cardback.png'));
    },
  };
})(window.AneGame);
