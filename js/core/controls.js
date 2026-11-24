/*
 * Controles comunes: inclinación (giroscopio) opcional + botón de silencio.
 * El toque (mitad izquierda / derecha) y el teclado se gestionan en cada escena.
 */
(function (G) {
  const tilt = { enabled: false, value: 0, available: 'DeviceOrientationEvent' in window };
  G.tilt = tilt;

  function onOrientation(e) {
    // Juego vertical: gamma = inclinación izquierda/derecha (beta si el móvil está girado)
    const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
    let v;
    if (ang === 90) v = e.beta;
    else if (ang === -90 || ang === 270) v = -e.beta;
    else if (ang === 180) v = -e.gamma;
    else v = e.gamma;
    tilt.value = v || 0;
  }

  const btnTilt = document.getElementById('btn-tilt');
  const btnMute = document.getElementById('btn-mute');

  function refresh() {
    btnTilt.textContent = tilt.enabled ? '📱 Inclinar: SÍ' : '📱 Inclinar';
    btnTilt.classList.toggle('on', tilt.enabled);
    btnMute.textContent = G.sfx.muted ? '🔇' : '🔊';
  }

  async function toggleTilt() {
    if (tilt.enabled) {
      tilt.enabled = false;
      window.removeEventListener('deviceorientation', onOrientation);
      refresh(); return;
    }
    try {
      // iOS 13+: pedir permiso explícito dentro del gesto
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') { alert('Sin permiso de inclinación. Usa el control táctil.'); return; }
      }
      window.addEventListener('deviceorientation', onOrientation);
      tilt.enabled = true;
    } catch (err) {
      alert('La inclinación no está disponible. Usa el control táctil.');
    }
    refresh();
  }

  // Solo mostramos el botón de inclinación en dispositivos táctiles
  const tiltPossible = tilt.available && matchMedia('(pointer: coarse)').matches;
  if (!tiltPossible) btnTilt.style.display = 'none';
  /** Cada escena decide si tiene sentido el botón de inclinación (solo Pintxos). */
  G.showTiltButton = (show) => { btnTilt.style.display = show && tiltPossible ? '' : 'none'; };
  btnTilt.addEventListener('click', (e) => { e.stopPropagation(); toggleTilt(); });
  btnMute.addEventListener('click', (e) => { e.stopPropagation(); G.sfx.setMuted(!G.sfx.muted); refresh(); });
  ['pointerdown', 'touchstart'].forEach(ev => {
    btnTilt.addEventListener(ev, e => e.stopPropagation());
    btnMute.addEventListener(ev, e => e.stopPropagation());
  });
  refresh();

  // --- En escritorio (vista con bandas) los botones van dentro del área de juego
  const hudBox = document.getElementById('hud-buttons');
  function placeHud() {
    const cv = document.querySelector('#game canvas') || document.querySelector('canvas');
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const right = window.innerWidth - r.right, top = r.top;
    hudBox.style.right = right > 4 ? `${Math.round(right + 6)}px` : '';
    hudBox.style.top = top > 4 ? `${Math.round(top + 6)}px` : '';
  }
  G.placeHud = placeHud;
  window.addEventListener('resize', () => { placeHud(); setTimeout(placeHud, 120); setTimeout(placeHud, 400); });
  window.addEventListener('load', () => setTimeout(placeHud, 200));

  // --- Bloquear zoom / scroll / doble toque (iOS ignora user-scalable=no)
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 300 && !e.target.closest('button')) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener('contextmenu', e => e.preventDefault());
})(window.AneGame);
