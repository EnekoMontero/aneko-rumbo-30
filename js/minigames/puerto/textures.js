/* Texturas del puerto generadas en tiempo de ejecución (gota de salpicadura y Ane reducida; el resto es
   arte pixel en assets/puerto/, hecho con tools/make_puerto_art.py) y fondo compartido de portada/final. */
(function (G) {
  const MG = G.minigames.puerto;
  MG.makeTextures = (scene) => {
    if (scene.textures.exists('pt-drop')) return;
    const g = scene.make.graphics({ add: false });
    g.fillStyle(0xc4e8fa, 1).fillRect(0, 0, 3, 3); g.generateTexture('pt-drop', 3, 3); g.destroy();
  };

  /**
   * Ane a tamaño de casilla. El sprite original mide ~112 px de alto; escalarlo a ~0,5 con vecino más
   * próximo se come filas enteras (ojos, gafas). Aquí se reduce UNA vez con suavizado de calidad en un
   * lienzo del tamaño final, así en pantalla se dibuja a 1:1 y conserva el detalle.
   * Devuelve la clave de la textura. k = factor de escala común a todas las poses.
   */
  MG.aneTexture = (scene, pose, k) => {
    const key = `pt-ane-${pose}-${Math.round(k * 1000)}`;
    if (scene.textures.exists(key)) return key;
    const src = scene.textures.get('ane-' + pose).getSourceImage();
    const w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k));
    // reducción en dos pasos (mitad y luego al tamaño final): menos aliasing que de golpe
    let mid = src;
    if (w * 2 < src.width) {
      mid = document.createElement('canvas');
      mid.width = w * 2; mid.height = h * 2;
      const mc = mid.getContext('2d'); mc.imageSmoothingEnabled = true; mc.imageSmoothingQuality = 'high';
      mc.drawImage(src, 0, 0, mid.width, mid.height);
    }
    const tex = scene.textures.createCanvas(key, w, h);
    const ctx = tex.getContext(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(mid, 0, 0, w, h);
    // limpia la semitransparencia del borde: o se ve o no (silueta nítida sobre el suelo)
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
    ctx.putImageData(img, 0, 0);
    tex.refresh();
    return key;
  };

  /** Fondo del puerto (portada y final): imagen ajustada + capa oscura opcional. */
  MG.drawBackdrop = (scene, dim = 0.35) => G.ui.background(scene, 'pt-bg', dim);
})(window.AneGame);
