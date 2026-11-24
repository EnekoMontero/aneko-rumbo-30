/*
 * Arranque de Phaser en VERTICAL. Ancho lógico fijo (360) y alto según la proporción
 * real de la pantalla, así el lienzo llena todo el móvil sin franjas negras
 * (375x667, 390x844, 430x932, 412x915...). En escritorio/apaisado se muestra
 * un móvil vertical con bandas a los lados.
 */
(function (G) {
  const DESKTOP_ASPECT = 844 / 390;
  const isTouch = matchMedia('(pointer: coarse)').matches;

  /** Lee env(safe-area-inset-*) en px CSS. */
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);

  function viewport() {
    const vv = window.visualViewport;
    return { w: Math.round(vv ? vv.width : window.innerWidth), h: Math.round(vv ? vv.height : window.innerHeight) };
  }

  /** Calcula tamaño lógico y márgenes seguros para la pantalla actual. */
  function layout() {
    const { w, h } = viewport();
    const portrait = h >= w;
    const aspect = portrait ? h / Math.max(1, w) : DESKTOP_ASPECT;
    const H = Math.round(Phaser.Math.Clamp(G.GAME_WIDTH * aspect, 560, 880) / 2) * 2;
    const k = portrait ? G.GAME_WIDTH / Math.max(1, w) : 0;   // px CSS -> px lógicos
    const cs = getComputedStyle(probe);
    G.safe = { top: Math.round(parseFloat(cs.paddingTop || 0) * k), bottom: Math.round(parseFloat(cs.paddingBottom || 0) * k) };
    // Solo pruebas: ?safe=TOP,BOTTOM (px CSS) simula el notch/barra de inicio de un iPhone
    const sim = G.TEST && /[?&]safe=(\d+),(\d+)/.exec(location.search);
    if (sim) G.safe = { top: Math.round(+sim[1] * k), bottom: Math.round(+sim[2] * k) };
    return { W: G.GAME_WIDTH, H };
  }

  function boot() {
    const { W, H } = layout();
    G.GAME_HEIGHT = H;
    const scenes = [G.BootScene, ...(G.coreScenes || [])];
    Object.values(G.minigames).forEach(mg => scenes.push(...mg.scenes));
    G.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: '#1b1430',
      pixelArt: true,            // escalado nearest-neighbor, píxeles nítidos
      roundPixels: true,
      audio: { noAudio: true },  // el sonido va por WebAudio propio
      input: { activePointers: 3 },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
      scene: scenes,
    });

    // Al cambiar el tamaño (barra del navegador, girar, otro móvil) se recalcula el alto lógico
    let t = 0;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const L = layout();
        const landscapePhone = isTouch && viewport().w > viewport().h;
        if (landscapePhone) G.game.loop.sleep(); else G.game.loop.wake();
        G.game.events.emit('ane-pause', landscapePhone);
        // Móvil en horizontal: solo se pausa (aviso de girar). No se reconstruyen escenas, así
        // al volver a vertical la partida sigue donde estaba.
        if (!landscapePhone && L.H !== G.GAME_HEIGHT) {
          G.GAME_HEIGHT = L.H;
          G.game.scale.setGameSize(L.W, L.H);
          // Escenas activas: se recolocan. Las pausadas (mapa bajo el pasaporte) se rehacen al reanudarse.
          G.game.scene.getScenes(true).forEach(s => (s.relayout ? s.relayout() : s.scene.restart(s.sys.settings.data)));
        }
        G.game.scale.refresh();
        G.placeHud && setTimeout(G.placeHud, 30);
      }, 120);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport && window.visualViewport.addEventListener('resize', onResize);
    G.game.events.once('ready', () => G.placeHud && setTimeout(G.placeHud, 60));
    if (isTouch && viewport().w > viewport().h) G.game.events.once('ready', () => G.game.loop.sleep());
  }

  // Esperamos a la fuente pixel para que los textos de Phaser salgan bien
  const fontReady = document.fonts && document.fonts.load
    ? Promise.race([document.fonts.load('16px PressStart'), new Promise(r => setTimeout(r, 2500))])
    : Promise.resolve();
  // ...y a la hora del servidor (para que cambiar la fecha del móvil no adelante los días)
  const timeReady = G.syncTime ? G.syncTime() : Promise.resolve();
  Promise.all([fontReady, timeReady]).then(boot, boot);
})(window.AneGame);
