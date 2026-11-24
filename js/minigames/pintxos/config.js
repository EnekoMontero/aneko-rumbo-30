/* Minijuego 1 (día 1): Pintxos de Zamora — configuración y textos. */
(function (G) {
  const CFG = {
    id: 'pintxos',
    TARGET_PINTXOS: 30,      // pintxos para ganar (desbloquea el siguiente nodo)
    LIVES: 3,
    ANE_SPEED: 250,          // px lógicos/s (pantalla de 360 de ancho)
    ANE_SCALE: 1.35,         // Ane más grande (se ve mejor en el móvil); la zona de recogida escala con ella
    // Dificultad: interpolación lineal de "inicio" a "fin" durante RAMP_MS
    RAMP_MS: 70000,
    FALL_SPEED: [0.25, 0.56],// fracción de la altura de pantalla por segundo (igual en todos los móviles)
    SPAWN_MS: [1300, 620],   // ms entre apariciones
    PEPPER_CHANCE: [0.16, 0.3],
    MAX_JUMP_X: 220,         // distancia máx. entre pintxos seguidos (además, siempre alcanzable a tiempo)
    MIN_GAP_S: 0.32,         // margen mínimo entre la llegada de dos pintxos seguidos
    PEPPER_MARGIN: 70,       // px que un pimiento deja libres alrededor de donde hay que estar
    PEPPER_WINDOW_S: 0.6,    // ... si llega a menos de este tiempo de un pintxo
    PINTXOS: [
      { key: 'moruno',    name: 'Pincho Los Lobos', from: 'Los Lobos · Zamora' },
      { key: 'tiberios',  name: 'Tiberios',      from: 'Zamora' },
      { key: 'bravas',    name: 'Bravas',        from: 'El Caballero · Zamora' },
      { key: 'figon',     name: 'Figón',         from: 'Zamora' },
      { key: 'gilda',     name: 'Gilda',         from: 'Bilbao' },
      { key: 'txangurro', name: 'Txangurro',     from: 'El Globo · Bilbao' },
    ],
    PEPPER_KEY: 'pimiento',
  };

  G.minigames.pintxos = {
    config: CFG,
    scenes: [],   // las escenas se registran en sus propios archivos
    preload(scene) {
      CFG.PINTXOS.forEach(p => scene.load.image('px-' + p.key, G.asset(`assets/pintxos/${p.key}.png`)));
      scene.load.image('px-' + CFG.PEPPER_KEY, G.asset('assets/pintxos/pimiento_picante.png'));
      scene.load.image('px-plato', G.asset('assets/pintxos/plato.png'));
    },
  };
})(window.AneGame);
