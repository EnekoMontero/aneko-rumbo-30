/*
 * MAPA DEL MUNDO — configuración única: orden, nombres, fechas y escena de cada nodo.
 * El orden es provisional: basta con reordenar este array (el camino se recalcula).
 * Fechas (AAAA-MM-DD, hora local del móvil): del 3 al 9 de diciembre un minijuego al día;
 * el ¡30! el 10 de diciembre de 2026, día del cumpleaños.
 * scene: null => abre la pantalla "Próximamente".
 */
(function (G) {
  G.MAP = {
    title: 'Rumbo a los 30',
    nodes: [
      { id: 'pintxos',  day: 1, date: '2026-12-03', name: 'Calle Balborraz', place: 'Zamora',        game: 'Pintxos de Zamora',   icon: 'map-zamora',     scene: 'PintxosStart' },
      { id: 'corredor', day: 2, date: '2026-12-04', name: 'Ría de Bilbao',    place: 'Guggenheim',    game: 'Carrera por la ría 6 km',icon: 'map-ria',        scene: 'CorredorStart' },
      { id: 'crossfit', day: 3, date: '2026-12-05', name: 'IRUKA CROSSFIT',   place: 'Box de CrossFit', game: 'Guitar Hero de CrossFit', icon: 'map-iruka', scene: 'CrossfitStart', nameColor: '#ffffff', labelSize: 8 },
      { id: 'memory',   day: 4, date: '2026-12-06', name: 'Aeropuerto',       place: 'Bilbao · Loiu', game: 'Memory de viajes',    icon: 'map-aeropuerto', scene: 'MemoryStart' },
      { id: 'bali',     day: 5, date: '2026-12-07', name: 'Bali',             place: 'Indonesia',     game: 'Nadar en Bali',       icon: 'map-bali',       scene: 'BaliStart' },
      { id: 'puerto',   day: 6, date: '2026-12-08', name: 'Puerto de Bilbao', place: 'Contenedores',  game: 'Cruzar el puerto',    icon: 'map-puerto',     scene: 'PuertoStart' },
      { id: 'lasagna',  day: 7, date: '2026-12-09', name: 'Roma',             place: 'El Coliseo',    game: 'Torre de lasagna',     icon: 'map-roma',       scene: 'LasagnaStart' },
      { id: 'final',    day: 8, date: '2026-12-10', name: '¡30!',             place: 'La gran sorpresa', game: 'Sorpresa final',  icon: 'map-final30',    scene: 'Final', final: true },
    ],
  };
  const ICONS = { zamora: 'zamora', ria: 'ria', iruka: 'iruka', aeropuerto: 'aeropuerto', bali: 'bali', puerto: 'puerto', roma: 'roma', final30: 'final30' };
  G.corePreload = G.corePreload || [];
  G.corePreload.push(scene => Object.keys(ICONS).forEach(k => scene.load.image('map-' + k, G.asset(`assets/map/${ICONS[k]}.png`))));
  G.coreScenes = G.coreScenes || [];
})(window.AneGame);
