/*
 * Arte de la lasagna. Las capas, la fuente de barro, la costra gratinada y la albahaca son PNG
 * pixel-art (tools/make_lasagna_art.py, cargados en config.js). Aquí se generan las piezas
 * mínimas (vapor, miga) y helpers para dibujar el contorno de las capas y lasagnas de adorno.
 */
(function (G) {
  const MG = G.minigames.lasagna, CFG = MG.config;
  const KEYS = ['ls-pasta', 'ls-ragu', 'ls-bech'];

  MG.makeTextures = (scene) => {
    if (scene.textures.exists('ls-steam')) return;
    const tex = (key, w, h, draw) => { const g = scene.make.graphics({ add: false }); draw(g); g.generateTexture(key, w, h); g.destroy(); };
    // Vapor / miga
    tex('ls-steam', 6, 6, g => g.fillStyle(0xffffff, 1).fillCircle(3, 3, 3));
    tex('ls-crumb', 3, 3, g => g.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3));
    // Sombra de la fuente sobre el mantel
    tex('ls-shadow', 64, 12, g => g.fillStyle(0x2a0e06, 0.45).fillEllipse(32, 6, 64, 12));
  };

  /**
   * Contorno lateral de una capa (las tiras se repiten en horizontal y no tienen bordes propios):
   * línea oscura a cada lado, un poco de luz a la izquierda y sombra a la derecha.
   */
  MG.drawEdges = (g, x, y, w, h = CFG.LAYER_H) => {
    g.fillStyle(0x1b1430, 0.9).fillRect(x - 1, y + 1, 1, h - 1).fillRect(x + w, y + 1, 1, h - 1);
    g.fillStyle(0xffffff, 0.22).fillRect(x, y + 2, 1, h - 3);
    g.fillStyle(0x2a0e06, 0.3).fillRect(x + w - 2, y + 2, 2, h - 3);
  };

  /** Textura de la capa n (0 = la de abajo): pasta, ragú, bechamel... (gratinada si gratin). */
  MG.layerKey = (n, gratin = false) => {
    const k = KEYS[n % 3];
    return gratin && k === 'ls-bech' ? 'ls-gratin' : k;
  };

  /**
   * Lasagna de adorno (portada y final) dentro de su fuente de barro. Coordenadas locales: el
   * fondo de la fuente en y = 0, centrada en x = 0; el contenedor se escala con opts.scale.
   * opts: { n capas, w ancho, gratin, scale, offsets: [dx por capa] }
   */
  MG.miniLasagna = (scene, x, y, opts = {}) => {
    const { n = 6, w = CFG.START_W, gratin = false, scale = 0.5, offsets = [] } = opts;
    const LH = CFG.LAYER_H, c = scene.add.container(x, y);
    c.add(scene.add.image(0, 30, 'ls-shadow').setScale((CFG.START_W + 40) / 64, 1.4));
    c.add(scene.add.image(0, -16, 'ls-dish_back').setOrigin(0.5, 0));
    const edges = scene.add.graphics();
    for (let i = 0; i < n; i++) {
      const lx = -w / 2 + (offsets[i] || 0), ly = -(i + 1) * LH;
      c.add(scene.add.tileSprite(lx, ly, w, LH, MG.layerKey(i, gratin)).setOrigin(0));
      MG.drawEdges(edges, lx, ly, w);
    }
    c.add(edges);
    c.add(scene.add.image(0, -8, 'ls-dish').setOrigin(0.5, 0));
    if (gratin && n > 0) {
      const lx = -w / 2 + (offsets[n - 1] || 0), ty = -n * LH;
      c.add(scene.add.tileSprite(lx, ty - 5, w, 14, 'ls-crust').setOrigin(0));
      [[-0.22, 0], [0.12, 1], [0.3, 0]].forEach(([fx, f]) => c.add(scene.add.image(fx * w, ty - 5, 'ls-basil').setFlipX(!!f)));
    }
    c.topY = -n * LH;     // altura de la última capa (local)
    c.setScale(scale);
    return c;
  };

  /** Fondo de Roma (Coliseo) a pantalla completa + capa oscura opcional. */
  MG.drawBackdrop = (scene, dim = 0.35) => G.ui.background(scene, 'ls-bg', dim);
})(window.AneGame);
