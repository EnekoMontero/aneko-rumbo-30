/*
 * Regla de desbloqueo: cada nodo se abre en su FECHA (día 1 el 3 dic ... ¡30! el 10 dic).
 * No hace falta haber superado el anterior: si un día no sale, ese sello se puede conseguir
 * más tarde repitiendo el juego. El ¡30! se abre el 10 de diciembre tenga los sellos que tenga.
 * Modo prueba (FORCE_TEST / ?test=1): todo desbloqueado. ?hoy=AAAA-MM-DD simula una fecha.
 */
(function (G) {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /**
   * Hora del servidor: al arrancar se pide la cabecera Date al propio servidor (GitHub Pages) y se
   * guarda la diferencia con el reloj del móvil. Así cambiar la fecha del móvil no adelanta los días.
   * Sin internet (o abriendo el archivo local) se usa la hora del móvil. main.js espera a esto (máx. 2,5 s).
   */
  G.timeOffset = 0;
  G.syncTime = function () {
    if (location.protocol === 'file:' || !window.fetch) return Promise.resolve();
    const t0 = Date.now();
    const req = fetch(location.pathname + '?t=' + t0, { method: 'HEAD', cache: 'no-store' })
      .then(r => {
        const server = Date.parse(r.headers.get('Date') || '');
        if (server) G.timeOffset = server - (t0 + Date.now()) / 2;
      })
      .catch(() => { /* sin red: hora del móvil */ });
    return Promise.race([req, new Promise(res => setTimeout(res, 2500))]);
  };

  /** Fecha de "hoy" (zona horaria del móvil, hora del servidor si se pudo) en formato AAAA-MM-DD. */
  function today() {
    if (G.FAKE_TODAY) return G.FAKE_TODAY;
    const d = new Date(Date.now() + G.timeOffset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Instante actual en ms (hora del servidor si se pudo; con ?hoy= simula ese día a la hora actual). */
  function nowMs() {
    const real = new Date(Date.now() + G.timeOffset);
    if (!G.FAKE_TODAY) return real.getTime();
    const [y, m, d] = G.FAKE_TODAY.split('-').map(Number);
    return new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds()).getTime();
  }

  G.unlock = {
    today,
    nowMs,
    /** Medianoche (hora del móvil) del día en que se abre el primer destino: empieza la aventura. */
    startMs() { const [y, m, d] = G.MAP.nodes[0].date.split('-').map(Number); return new Date(y, m - 1, d).getTime(); },
    /** ¿Aún no ha empezado? (antes del día 1 se ve la cuenta atrás en vez de la intro y el mapa) */
    beforeStart() { return !G.TEST && nowMs() < this.startMs(); },
    /** "3 dic" */
    prettyDate(iso) { const [, m, d] = iso.split('-').map(Number); return `${d} ${MESES[m - 1]}`; },
    dateReached(node) { return today() >= node.date; },
    isUnlocked(i) { return G.TEST || this.dateReached(G.MAP.nodes[i]); },
    /** Motivo legible por el que un nodo sigue cerrado. */
    reason(i) {
      const n = G.MAP.nodes[i];
      return this.dateReached(n) ? '' : `Se abre el ${this.prettyDate(n.date)}`;
    },
  };
})(window.AneGame);
