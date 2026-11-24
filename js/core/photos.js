/*
 * Fotos de los minijuegos (Memory).
 * - Cualquier foto (vertical, horizontal, de móvil...) se recorta al CUADRADO central
 *   y se reduce a como mucho MAX px una sola vez; la imagen original se descarta
 *   (así una foto de 12 MP no revienta la memoria del móvil).
 * - Cada tamaño en pantalla se dibuja aparte con suavizado (filtro LINEAR) para que
 *   las fotos se vean nítidas aunque el resto del juego sea pixel art.
 * - Si una foto no carga, se usa un cuadro de relleno "FOTO ?" y el juego sigue.
 */
(function (G) {
  const MAX = 1024;
  const cache = {};   // src -> Promise<HTMLCanvasElement cuadrado>

  function placeholder(label) {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#3a3358'; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = '#ffd23f'; x.lineWidth = 16; x.strokeRect(24, 24, 464, 464);
    x.fillStyle = '#ffffff'; x.font = '40px PressStart, monospace'; x.textAlign = 'center';
    x.fillText(label || 'FOTO ?', 256, 250); x.font = '18px PressStart, monospace';
    x.fillStyle = '#ffd23f'; x.fillText('no se pudo cargar', 256, 310);
    return c;
  }

  function squareFrom(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    const s = Math.min(w, h), out = Math.min(MAX, s);
    const c = document.createElement('canvas'); c.width = c.height = out;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, out, out);   // recorte centrado
    return c;
  }

  G.photos = {
    /** Carga (una vez) y devuelve una promesa con el lienzo cuadrado de la foto. */
    load(src) {
      if (!cache[src]) {
        cache[src] = new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => { try { resolve(squareFrom(img)); } catch (e) { resolve(placeholder()); } };
          img.onerror = () => { console.warn('[fotos] no se pudo cargar', src); resolve(placeholder()); };
          img.src = G.asset(src);
        });
      }
      return cache[src];
    },
    loadAll(srcs) { return Promise.all(srcs.map(s => G.photos.load(s))); },

    /** Ya cargada (síncrono) o null. */
    _ready: {},
    /**
     * Textura de Phaser de la foto a `size` px (cuadrada). Opcionalmente partida en
     * n x n frames ("0".."n*n-1") para el puzzle. Requiere haber hecho load() antes.
     */
    texture(scene, src, size, n = 0) {
      size = Math.max(8, Math.round(size));
      const key = `photo:${src}:${size}:${n}`;
      if (scene.textures.exists(key)) return key;
      const sq = G.photos._ready[src];
      const tex = scene.textures.createCanvas(key, size, size);
      const x = tex.getContext();
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(sq || placeholder(), 0, 0, size, size);
      tex.refresh();
      if (n > 1) {
        const t = size / n;
        for (let i = 0; i < n * n; i++) {
          const cx = Math.round((i % n) * t), cy = Math.round(Math.floor(i / n) * t);
          const cw = Math.round(((i % n) + 1) * t) - cx, ch = Math.round((Math.floor(i / n) + 1) * t) - cy;
          tex.add(String(i), 0, cx, cy, cw, ch);
        }
      }
      tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
      return key;
    },

    /** Muestra la foto grande (resolución completa) por encima del juego, con texto. */
    view(src, title, sub) {
      G.photos.close();
      const d = document.createElement('div');
      d.id = 'ane-photo-view';
      d.style.cssText = 'position:fixed;inset:0;z-index:50;background:rgba(15,10,30,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:PressStart,monospace;color:#fff;text-align:center;padding:20px;box-sizing:border-box;';
      const im = document.createElement('img');
      im.src = G.asset(src);
      im.style.cssText = 'width:min(88vw,62vh);height:min(88vw,62vh);object-fit:cover;border:4px solid #fff;box-shadow:0 6px 0 #000;image-rendering:auto;';
      d.appendChild(im);
      if (title) { const t = document.createElement('div'); t.textContent = title; t.style.cssText = 'font-size:14px;color:#ffd23f;line-height:1.6;max-width:88vw;'; d.appendChild(t); }
      if (sub) { const s = document.createElement('div'); s.textContent = sub; s.style.cssText = 'font-size:10px;line-height:1.6;'; d.appendChild(s); }
      const k = document.createElement('div'); k.textContent = 'Toca para cerrar'; k.style.cssText = 'font-size:9px;color:#b8b0d8;margin-top:8px;';
      d.appendChild(k);
      d.addEventListener('click', G.photos.close);
      document.body.appendChild(d);
    },
    close() { const o = document.getElementById('ane-photo-view'); if (o) o.remove(); },
  };
  // guarda el lienzo listo para uso síncrono
  const _load = G.photos.load;
  G.photos.load = (src) => _load(src).then(c => (G.photos._ready[src] = c));
})(window.AneGame);
