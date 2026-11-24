/*
 * Decorado del corredor. El arte pixel-art (montes lejanos y cercanos, ciudad, ría, paseo, barandilla,
 * jardín y meta) está en assets/runner/ (lo genera tools/make_runner_art.py, en bucle horizontal sin
 * costura y a escala 1:1) y se carga en el preload (config.js). Aquí queda la nube común, el cielo y la
 * colocación vertical de las capas lejanas, compartida por la partida, la portada y el final.
 */
(function (G) {
  const MG = G.minigames.corredor;
  // Alto del arte de cada capa (px lógicos); debe coincidir con tools/make_runner_art.py
  MG.ART_H = { far: 260, hills: 170, city: 136, rail: 28, path: 76 };
  MG.makeTextures = function (scene) { G.ui.makeCloud(scene); };

  /**
   * Borde inferior de las capas lejanas. El arte no se escala (píxeles nítidos): en pantallas altas
   * los montes suben un poco para llenar el cielo y la bruma de su base queda tapada por la ciudad.
   */
  MG.backLayout = function (L) {
    const lift = L.s - 1;   // 0 .. 0.5
    return { farY: L.riaTop - 34 - Math.round(lift * 150), hillsY: L.riaTop - 20 - Math.round(lift * 70), cityY: L.riaTop };
  };

  /** Cielo en franjas de 4 px: azul arriba y bruma clara y cálida hacia el horizonte. */
  MG.drawSky = function (g, W, bottom) {
    const top = Phaser.Display.Color.ValueToColor(0x4a8ad6), low = Phaser.Display.Color.ValueToColor(0xdcecf0);
    g.clear();
    for (let y = 0; y < bottom; y += 4) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, low, 1, Math.min(1, Math.pow(y / bottom, 1.4)));
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1).fillRect(0, y, W, 4);
    }
  };
})(window.AneGame);
