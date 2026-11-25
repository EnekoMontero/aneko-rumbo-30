/*
 * TEXTOS CENTRALES del juego (intro, pasaporte, sellos, mapa y escena final).
 * Edita aquí y se cambia en el juego. Los textos de cada minijuego están en su
 * carpeta js/minigames/<juego>/ (portada = start-scene.js, final = end-scene.js).
 * Usa \n para saltos de línea. No borres las claves (lo que va antes de los dos puntos).
 */
(function (G) {
  G.T = {
    // ---------- Cuenta atrás (si se abre antes del 3 de diciembre) ----------
    countdown: {
      title: 'Algo se está\npreparando...',
      label: 'Empieza en',
      units: ['DÍAS', 'HORAS', 'MIN', 'SEG'],
      sub: 'Vuelve el 3 de diciembre\npara empezar la aventura',
      ready: '¡Ya es la hora!',
    },

    // ---------- Intro (primera vez que se abre el juego) ----------
    intro: {
      skip: 'Saltar >>',
      zzz: 'Zzz...',
      alarm: '¡RIIIING!',
      wake: '¿Qué día es hoy...?',
      getUp: '¡Arriba!',                // Ane salta de la cama
      stretch: '¡Buenos días!',         // se estira en la alfombra
      cheer: '¿Eing?',           // al ver el pasaporte
      calendarMonths: ['DIC', 'DIC', 'DIC', 'DIC', 'DIC', 'DIC', 'DIC', 'DIC'],
      calendarDays: ['3', '4', '5', '6', '7', '8', '9', '10'],
      calendarLast: '¡30!',
      countdown: 'Se acercan los 30...',
      letterArrives: '¡Ha llegado una carta para ti!',
      letterFrom: 'Para: Ane',
      passportTitle: 'Pasaporte de los 30',
      passportSub: 'Cada día se abre un destino.\nConsigue los 7 sellos\nantes de cumplir ¡30! años',
      start: 'Empezar',
    },

    // ---------- Pasaporte ----------
    passport: {
      mapButton: 'Pasaporte',
      title: 'Pasaporte de los 30',
      owner: 'Titular: Ane',
      stampsLabel: 'Sellos',
      emptySlot: 'Sin sello',
      // Etiqueta bajo cada hueco de sello: «Día 3 · CrossFit»
      slotNames: { pintxos: 'Zamora', corredor: 'La Ría', crossfit: 'Iruka', memory: 'Loiu', bali: 'Bali', puerto: 'Puerto', lasagna: 'Roma' },
      slotLabel: (day, name) => `Día ${day} ·\n${name}`,   // dos líneas: el nombre del lugar nunca se parte
      itineraryLabel: 'Itinerario',
      newStamp: '¡Nuevo sello!',
      complete: '¡Pasaporte completo!\n¡Eres una viajera de 10!',
      remaining: n => (n === 1 ? 'Falta 1 sello' : `Faltan ${n} sellos`),
      close: 'Cerrar',
      replayIntro: 'Ver intro',
    },

    // Nombre del sello de cada minijuego (lo que pone dentro del sello)
    stamps: {
      pintxos: 'ZAMORA',
      corredor: 'RÍA',
      crossfit: 'IRUKA',
      memory: 'LOIU',
      bali: 'BALI',
      puerto: 'PUERTO',
      lasagna: 'ROMA',
    },

    // ---------- Mapa ----------
    map: {
      newDay: '¡Hoy se abre\nun nuevo destino!',
      today: 'HOY',                                   // etiqueta del destino de hoy
      done: 'Superados',                              // «Superados: 2/7» (barra superior)
      dayLabel: (day, date) => `DÍA ${day} · ${date}`,
      closed: 'Cerrado',                              // «Cerrado · Se abre el 5 dic»
      available: '¡Disponible!',
      soon: 'Próximamente',
      completed: '¡Superado! Puedes repetir',
      record: n => `Récord: ${n}`,
      play: '¡Jugar!',
      nextOpen: '¡Siguiente destino abierto!',
      nextOn: reason => `Siguiente destino: ${reason}`,  // reason = «se abre el 5 dic»
      // Cuenta atrás en el nodo del ¡30! mientras sigue cerrado
      finalCountdown: n => (n === 1 ? '¡Mañana!' : `¡Faltan ${n} días!`),
      finalToday: '¡Es HOY!',
    },

    // ---------- Escena final (nodo ¡30!) ----------
    final: {
      title: 'Feliz cumpleaños, Ane',
      back: 'Volver al mapa',
      again: 'Repetir',
      skip: 'Saltar >>',
      // Soplar las velas (al acabar la canción)
      wish: '¡Pide un deseo\ny sopla las velas!',
      wishHint: 'Toca la pantalla para soplar',
      micButton: 'Soplar al micro',
      micListening: '¡Sopla al micro!\n(o toca la pantalla)',
      micDenied: 'Sin micro: toca la pantalla\npara soplar',
      micSilent: 'No te oigo... toca la pantalla\npara soplar',
      // Extra al final: con los 7 sellos, desfile de sellos; si faltan, ánimo para conseguirlos
      allStamps: '¡Pasaporte completo!',
      someStamps: (n, total) => `Sellos: ${n}/${total} · ¡a por el resto!`,
    },
  };
})(window.AneGame);
