# Textos del juego

Todos los textos que ve Ane, por pantalla. Para cambiar uno, edítalo en el **archivo y línea** indicados
(este documento solo sirve para revisar; se regenera con `python tools/extract_texts.py`).

- `↵` = salto de línea (en el código es `\n`).
- `${...}` = parte que el juego rellena sola (un número, un nombre...). No la borres.
- Los textos con varias líneas tienen que caber en la pantalla del móvil: si alargas mucho uno, avísame.

## Textos generales (intro, pasaporte, sellos, mapa y final)

**[js/core/texts.js](js/core/texts.js)**

| Línea | Texto |
| ---: | --- |
| [11](js/core/texts.js#L11) | Algo se está ↵ preparando... |
| [12](js/core/texts.js#L12) | Empieza en |
| [13](js/core/texts.js#L13) | DÍAS |
| [13](js/core/texts.js#L13) | HORAS |
| [13](js/core/texts.js#L13) | MIN |
| [13](js/core/texts.js#L13) | SEG |
| [14](js/core/texts.js#L14) | Vuelve el 3 de diciembre ↵ para empezar la aventura |
| [15](js/core/texts.js#L15) | ¡Ya es la hora! |
| [20](js/core/texts.js#L20) | Saltar >> |
| [22](js/core/texts.js#L22) | ¡RIIIING! |
| [23](js/core/texts.js#L23) | ¿Qué día es hoy...? |
| [24](js/core/texts.js#L24) | ¡Arriba! |
| [25](js/core/texts.js#L25) | ¡Buenos días! |
| [26](js/core/texts.js#L26) | ¿Eing? |
| [27](js/core/texts.js#L27) | DIC |
| [30](js/core/texts.js#L30) | Se acercan los 30... |
| [31](js/core/texts.js#L31) | ¡Ha llegado una carta para ti! |
| [32](js/core/texts.js#L32) | Para: Ane |
| [33](js/core/texts.js#L33) | Pasaporte de los 30 |
| [34](js/core/texts.js#L34) | Cada día se abre un destino. ↵ Consigue los 7 sellos ↵ antes de cumplir ¡30! años |
| [35](js/core/texts.js#L35) | Empezar |
| [40](js/core/texts.js#L40) | Pasaporte |
| [42](js/core/texts.js#L42) | Titular: Ane |
| [43](js/core/texts.js#L43) | Sellos |
| [44](js/core/texts.js#L44) | Sin sello |
| [46](js/core/texts.js#L46) | Zamora |
| [46](js/core/texts.js#L46) | La Ría |
| [46](js/core/texts.js#L46) | Iruka |
| [46](js/core/texts.js#L46) | Loiu |
| [46](js/core/texts.js#L46) | Bali |
| [46](js/core/texts.js#L46) | Puerto |
| [46](js/core/texts.js#L46) | Roma |
| [47](js/core/texts.js#L47) | Día ${day} · ↵ ${name} |
| [48](js/core/texts.js#L48) | Itinerario |
| [49](js/core/texts.js#L49) | ¡Nuevo sello! |
| [50](js/core/texts.js#L50) | ¡Pasaporte completo! ↵ ¡Eres una viajera de 10! |
| [51](js/core/texts.js#L51) | Falta 1 sello |
| [51](js/core/texts.js#L51) | Faltan ${n} sellos |
| [52](js/core/texts.js#L52) | Cerrar |
| [53](js/core/texts.js#L53) | Ver intro |
| [58](js/core/texts.js#L58) | ZAMORA |
| [59](js/core/texts.js#L59) | RÍA |
| [60](js/core/texts.js#L60) | IRUKA |
| [61](js/core/texts.js#L61) | LOIU |
| [62](js/core/texts.js#L62) | BALI |
| [63](js/core/texts.js#L63) | PUERTO |
| [64](js/core/texts.js#L64) | ROMA |
| [69](js/core/texts.js#L69) | ¡Hoy se abre ↵ un nuevo destino! |
| [70](js/core/texts.js#L70) | HOY |
| [71](js/core/texts.js#L71) | Superados |
| [72](js/core/texts.js#L72) | DÍA ${day} · ${date} |
| [73](js/core/texts.js#L73) | Cerrado |
| [74](js/core/texts.js#L74) | ¡Disponible! |
| [75](js/core/texts.js#L75) | Próximamente |
| [76](js/core/texts.js#L76) | ¡Superado! Puedes repetir |
| [77](js/core/texts.js#L77) | Récord: ${n} |
| [78](js/core/texts.js#L78) | ¡Jugar! |
| [79](js/core/texts.js#L79) | ¡Siguiente destino abierto! |
| [80](js/core/texts.js#L80) | Siguiente destino: ${reason} |
| [82](js/core/texts.js#L82) | ¡Mañana! |
| [82](js/core/texts.js#L82) | ¡Faltan ${n} días! |
| [83](js/core/texts.js#L83) | ¡Es HOY! |
| [88](js/core/texts.js#L88) | Feliz cumpleaños, Ane |
| [89](js/core/texts.js#L89) | Volver al mapa |
| [90](js/core/texts.js#L90) | Repetir |
| [93](js/core/texts.js#L93) | ¡Pide un deseo ↵ y sopla las velas! |
| [94](js/core/texts.js#L94) | Toca la pantalla para soplar |
| [95](js/core/texts.js#L95) | Soplar al micro |
| [96](js/core/texts.js#L96) | ¡Sopla fuerte al micro! ↵ (o toca la pantalla) |
| [97](js/core/texts.js#L97) | Sin micro: toca la pantalla ↵ para soplar |
| [99](js/core/texts.js#L99) | ¡Pasaporte completo! |
| [100](js/core/texts.js#L100) | Sellos: ${n}/${total} · ¡a por el resto! |

## Mapa: nombres de los destinos

**[js/map/config.js](js/map/config.js)**

| Línea | Texto |
| ---: | --- |
| [10](js/map/config.js#L10) | Rumbo a los 30 |
| [12](js/map/config.js#L12) | Calle Balborraz |
| [12](js/map/config.js#L12) | Zamora |
| [12](js/map/config.js#L12) | Pintxos de Zamora |
| [13](js/map/config.js#L13) | Ría de Bilbao |
| [13](js/map/config.js#L13) | Guggenheim |
| [13](js/map/config.js#L13) | Carrera por la ría 6 km |
| [14](js/map/config.js#L14) | IRUKA CROSSFIT |
| [14](js/map/config.js#L14) | Box de CrossFit |
| [14](js/map/config.js#L14) | Guitar Hero de CrossFit |
| [15](js/map/config.js#L15) | Aeropuerto |
| [15](js/map/config.js#L15) | Bilbao · Loiu |
| [15](js/map/config.js#L15) | Memory de viajes |
| [16](js/map/config.js#L16) | Bali |
| [16](js/map/config.js#L16) | Indonesia |
| [16](js/map/config.js#L16) | Nadar en Bali |
| [17](js/map/config.js#L17) | Puerto de Bilbao |
| [17](js/map/config.js#L17) | Contenedores |
| [17](js/map/config.js#L17) | Cruzar el puerto |
| [18](js/map/config.js#L18) | Roma |
| [18](js/map/config.js#L18) | El Coliseo |
| [18](js/map/config.js#L18) | Torre de lasagna |
| [19](js/map/config.js#L19) | La gran sorpresa |
| [19](js/map/config.js#L19) | Sorpresa final |

## Mapa

**[js/map/map-scene.js](js/map/map-scene.js)**

| Línea | Texto |
| ---: | --- |
| [390](js/map/map-scene.js#L390) | PRUEBA · HOY = ${G.unlock.prettyDate(G.FAKE_TODAY)} |
| [390](js/map/map-scene.js#L390) | MODO PRUEBA |
| [392](js/map/map-scene.js#L392) | [Borrar progreso] |

**[js/map/soon-scene.js](js/map/soon-scene.js)**

| Línea | Texto |
| ---: | --- |
| [15](js/map/soon-scene.js#L15) | Día ${n.day} |
| [19](js/map/soon-scene.js#L19) | ¡Sorpresa! |
| [19](js/map/soon-scene.js#L19) | Próximamente |
| [20](js/map/soon-scene.js#L20) | Algo despega muy pronto... |
| [20](js/map/soon-scene.js#L20) | Este juego está en obras |
| [21](js/map/soon-scene.js#L21) | Volver al mapa |

**[js/map/unlock.js](js/map/unlock.js)**

| Línea | Texto |
| ---: | --- |
| [57](js/map/unlock.js#L57) | Se abre el ${this.prettyDate(n.date)} |

## Pasaporte

**[js/story/passport-scene.js](js/story/passport-scene.js)**

| Línea | Texto |
| ---: | --- |
| [112](js/story/passport-scene.js#L112) | ▼ desliza ▼ |

## Día 1 · Pintxos de Zamora

**[js/minigames/pintxos/start-scene.js](js/minigames/pintxos/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [19](js/minigames/pintxos/start-scene.js#L19) | Pintxos ↵ de Zamora |
| [21](js/minigames/pintxos/start-scene.js#L21) | Día 1 · Zamora |
| [33](js/minigames/pintxos/start-scene.js#L33) | ¡NO! |
| [37](js/minigames/pintxos/start-scene.js#L37) | Atrapa ${CFG.TARGET_PINTXOS} pintxos con el plato. |
| [38](js/minigames/pintxos/start-scene.js#L38) | Toca a la izquierda o a la ↵ derecha para moverte. |
| [39](js/minigames/pintxos/start-scene.js#L39) | ¡Ojo con los pimientos! ↵ Si se cae un pintxo, ↵ pierdes una vida. |
| [51](js/minigames/pintxos/start-scene.js#L51) | Récord: ${best} |
| [55](js/minigames/pintxos/start-scene.js#L55) | ¡Jugar! |

**[js/minigames/pintxos/game-scene.js](js/minigames/pintxos/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [215](js/minigames/pintxos/game-scene.js#L215) | ¡PICA! |
| [229](js/minigames/pintxos/game-scene.js#L229) | ¡Se cayó! |

**[js/minigames/pintxos/end-scene.js](js/minigames/pintxos/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [18](js/minigames/pintxos/end-scene.js#L18) | ¡Fin del ↵ juego! |
| [19](js/minigames/pintxos/end-scene.js#L19) | Pintxos: ${score} |
| [20](js/minigames/pintxos/end-scene.js#L20) | Récord: ${G.progress.best(CFG.id)} ↵ Objetivo: ${CFG.TARGET_PINTXOS} |
| [23](js/minigames/pintxos/end-scene.js#L23) | Reintentar |
| [24](js/minigames/pintxos/end-scene.js#L24) | Volver al mapa |
| [31](js/minigames/pintxos/end-scene.js#L31) | ¡Lo has ↵ conseguido! |
| [33](js/minigames/pintxos/end-scene.js#L33) | ¡${score} pintxos! ↵ De Zamora a Bilbao. |
| [53](js/minigames/pintxos/end-scene.js#L53) | Jugar otra vez |

**[js/minigames/pintxos/config.js](js/minigames/pintxos/config.js)**

| Línea | Texto |
| ---: | --- |
| [19](js/minigames/pintxos/config.js#L19) | Pincho Los Lobos |
| [19](js/minigames/pintxos/config.js#L19) | Los Lobos · Zamora |
| [20](js/minigames/pintxos/config.js#L20) | Tiberios |
| [20](js/minigames/pintxos/config.js#L20) | Zamora |
| [21](js/minigames/pintxos/config.js#L21) | Bravas |
| [21](js/minigames/pintxos/config.js#L21) | El Caballero · Zamora |
| [22](js/minigames/pintxos/config.js#L22) | Figón |
| [23](js/minigames/pintxos/config.js#L23) | Gilda |
| [23](js/minigames/pintxos/config.js#L23) | Bilbao |
| [24](js/minigames/pintxos/config.js#L24) | Txangurro |
| [24](js/minigames/pintxos/config.js#L24) | El Globo · Bilbao |

## Día 2 · Carrera por la ría

**[js/minigames/corredor/start-scene.js](js/minigames/corredor/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [15](js/minigames/corredor/start-scene.js#L15) | Carrera por ↵ la ría 6 km |
| [16](js/minigames/corredor/start-scene.js#L16) | Día 2 · Bilbao |
| [22](js/minigames/corredor/start-scene.js#L22) | ¡Salta los metros ↵ que salen de los ↵ fosteritos! |
| [23](js/minigames/corredor/start-scene.js#L23) | Agua = energía. ↵ Si se acaba, te agotas |
| [24](js/minigames/corredor/start-scene.js#L24) | Txakoli = turbo |
| [25](js/minigames/corredor/start-scene.js#L25) | Llega a San Mamés |
| [36](js/minigames/corredor/start-scene.js#L36) | Toca para saltar ↵ Mantén pulsado = más alto |
| [42](js/minigames/corredor/start-scene.js#L42) | ¡A correr! |

**[js/minigames/corredor/game-scene.js](js/minigames/corredor/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [57](js/minigames/corredor/game-scene.js#L57) | ¡Toca para saltar! ↵ Mantén = más alto |
| [86](js/minigames/corredor/game-scene.js#L86) | ENERGÍA |
| [90](js/minigames/corredor/game-scene.js#L90) | ¡TURBO TXAKOLI! |
| [119](js/minigames/corredor/game-scene.js#L119) | San Mamés: ${(left / 1000).toFixed(1).replace('.', ',')} km |
| [261](js/minigames/corredor/game-scene.js#L261) | META |
| [312](js/minigames/corredor/game-scene.js#L312) | ¡ZAS! |
| [322](js/minigames/corredor/game-scene.js#L322) | -${CFG.HIT} energía |
| [342](js/minigames/corredor/game-scene.js#L342) | +${CFG.WATER} agua |
| [347](js/minigames/corredor/game-scene.js#L347) | ¡TXAKOLI! |
| [378](js/minigames/corredor/game-scene.js#L378) | ¡Agotada! |
| [389](js/minigames/corredor/game-scene.js#L389) | ¡META! |

**[js/minigames/corredor/end-scene.js](js/minigames/corredor/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [15](js/minigames/corredor/end-scene.js#L15) | ¡Has llegado ↵ a San Mamés! |
| [17](js/minigames/corredor/end-scene.js#L17) | ${CFG.GOAL_M / 1000} km por la ría ↵ en ${secs} segundos |
| [22](js/minigames/corredor/end-scene.js#L22) | Volver al mapa |
| [23](js/minigames/corredor/end-scene.js#L23) | Correr otra vez |
| [27](js/minigames/corredor/end-scene.js#L27) | ¡Agotada! |
| [28](js/minigames/corredor/end-scene.js#L28) | Has corrido ${km.toFixed(1).replace('.', ',')} km ↵ de ${CFG.GOAL_M / 1000} |
| [29](js/minigames/corredor/end-scene.js#L29) | Consejo: no te saltes ↵ ninguna botella de agua |
| [32](js/minigames/corredor/end-scene.js#L32) | Reintentar |

**[js/minigames/corredor/config.js](js/minigames/corredor/config.js)**

| Línea | Texto |
| ---: | --- |
| [34](js/minigames/corredor/config.js#L34) | Casco Viejo |
| [35](js/minigames/corredor/config.js#L35) | Puente de La Salve |
| [36](js/minigames/corredor/config.js#L36) | Guggenheim |
| [37](js/minigames/corredor/config.js#L37) | Universidad de Deusto |
| [38](js/minigames/corredor/config.js#L38) | Torre Iberdrola |
| [39](js/minigames/corredor/config.js#L39) | San Mamés |
| [52](js/minigames/corredor/config.js#L52) | Carrera por la ría 6 km |

## Día 3 · Guitar Hero de CrossFit (IRUKA)

**[js/minigames/crossfit/start-scene.js](js/minigames/crossfit/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [27](js/minigames/crossfit/start-scene.js#L27) | Guitar Hero ↵ de CrossFit |
| [28](js/minigames/crossfit/start-scene.js#L28) | Día 3 · Box IRUKA CrossFit |
| [38](js/minigames/crossfit/start-scene.js#L38) | Toca el botón de cada ↵ ejercicio cuando su icono ↵ llegue a la línea |
| [39](js/minigames/crossfit/start-scene.js#L39) | ${CFG.ROUNDS} rondas de ${CFG.REPS_PER_ROUND} reps (${CFG.REPS_TO_WIN} en total) ↵ con descansos cortos. ↵ Si lo haces bien, ¡sube el ritmo! |
| [40](js/minigames/crossfit/start-scene.js#L40) | Teclado: A S D · 1 2 3 |
| [48](js/minigames/crossfit/start-scene.js#L48) | ¡A entrenar! |

**[js/minigames/crossfit/game-scene.js](js/minigames/crossfit/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [43](js/minigames/crossfit/game-scene.js#L43) | Cargando música… |
| [81](js/minigames/crossfit/game-scene.js#L81) | RONDA 1/${CFG.ROUNDS} |
| [82](js/minigames/crossfit/game-scene.js#L82) | PREPÁRATE |
| [83](js/minigames/crossfit/game-scene.js#L83) | REPS 0/${CFG.REPS_PER_ROUND} |
| [86](js/minigames/crossfit/game-scene.js#L86) | VEL |
| [145](js/minigames/crossfit/game-scene.js#L145) | TIEMPO ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} |
| [146](js/minigames/crossfit/game-scene.js#L146) | DESCANSO 0:${String(secs).padStart(2, '0')} |
| [146](js/minigames/crossfit/game-scene.js#L146) | ¡TIEMPO! |
| [148](js/minigames/crossfit/game-scene.js#L148) | RONDA ${Math.min(CFG.ROUNDS, this.round + 1)}/${CFG.ROUNDS} |
| [178](js/minigames/crossfit/game-scene.js#L178) | ¡YA! |
| [181](js/minigames/crossfit/game-scene.js#L181) | ¡ÚLTIMA RONDA! ↵ ¡A TOPE! |
| [181](js/minigames/crossfit/game-scene.js#L181) | RONDA ${this.round + 1} ↵ ¡A POR ELLO! |
| [204](js/minigames/crossfit/game-scene.js#L204) | ¡PREPÁRATE! |
| [225](js/minigames/crossfit/game-scene.js#L225) | ¡RONDA ${this.round}/${CFG.ROUNDS} HECHA! ↵ Descansa |
| [274](js/minigames/crossfit/game-scene.js#L274) | NO REP |
| [286](js/minigames/crossfit/game-scene.js#L286) | ¡PERFECTA! |
| [286](js/minigames/crossfit/game-scene.js#L286) | ¡BIEN! |
| [293](js/minigames/crossfit/game-scene.js#L293) | REPS ${this.roundReps}/${CFG.REPS_PER_ROUND} |
| [295](js/minigames/crossfit/game-scene.js#L295) | COMBO x${this.combo} |
| [307](js/minigames/crossfit/game-scene.js#L307) | ¡MÁS RÁPIDO! |
| [434](js/minigames/crossfit/game-scene.js#L434) | ¡WOD ↵ COMPLETADO! |

**[js/minigames/crossfit/end-scene.js](js/minigames/crossfit/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [14](js/minigames/crossfit/end-scene.js#L14) | Reps: ${reps}/${CFG.REPS_TO_WIN} ↵ Perfectas: ${stats.perfect} · Bien: ${stats.good} ↵ No reps: ${stats.miss} ↵ Mejor combo: x${maxCombo} ↵ Puntos: ${score} |
| [18](js/minigames/crossfit/end-scene.js#L18) | ¡WOD ↵ completado! |
| [20](js/minigames/crossfit/end-scene.js#L20) | ¡${CFG.ROUNDS} rondas x ${CFG.REPS_PER_ROUND} reps! |
| [27](js/minigames/crossfit/end-scene.js#L27) | Volver al mapa |
| [28](js/minigames/crossfit/end-scene.js#L28) | Repetir el WOD |
| [31](js/minigames/crossfit/end-scene.js#L31) | ¡Tiempo! |
| [32](js/minigames/crossfit/end-scene.js#L32) | Ronda ${Math.min(round, CFG.ROUNDS)}/${CFG.ROUNDS} · te faltaron ${Math.max(0, CFG.REPS_TO_WIN - reps)} reps |
| [34](js/minigames/crossfit/end-scene.js#L34) | Consejo: toca justo cuando ↵ el icono pisa la línea |
| [37](js/minigames/crossfit/end-scene.js#L37) | Reintentar |

**[js/minigames/crossfit/config.js](js/minigames/crossfit/config.js)**

| Línea | Texto |
| ---: | --- |
| [13](js/minigames/crossfit/config.js#L13) | Música: "Motivator", Kevin MacLeod ↵ (incompetech.com) · Licencia CC BY 4.0 |
| [14](js/minigames/crossfit/config.js#L14) | creativecommons.org/licenses/by/4.0 |
| [31](js/minigames/crossfit/config.js#L31) | WALL BALL |
| [32](js/minigames/crossfit/config.js#L32) | BURPEE |
| [33](js/minigames/crossfit/config.js#L33) | SALTO AL ↵ CAJÓN |
| [39](js/minigames/crossfit/config.js#L39) | Guitar Hero de CrossFit |

## Día 4 · Memory de viajes

**[js/minigames/memory/start-scene.js](js/minigames/memory/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [31](js/minigames/memory/start-scene.js#L31) | Memory ↵ de viajes |
| [32](js/minigames/memory/start-scene.js#L32) | Día 4 · Aeropuerto de Bilbao |
| [42](js/minigames/memory/start-scene.js#L42) | Da la vuelta a dos cartas: ↵ si son el mismo viaje, ¡pareja! |
| [43](js/minigames/memory/start-scene.js#L43) | ${CFG.TRIPS.length} parejas · ${CFG.TRIPS.length * 2} cartas ↵ Cada pareja: un viaje juntos |
| [44](js/minigames/memory/start-scene.js#L44) | Cuantos menos movimientos, ↵ más estrellas |
| [51](js/minigames/memory/start-scene.js#L51) | ¡A embarcar! |

**[js/minigames/memory/game-scene.js](js/minigames/memory/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [35](js/minigames/memory/game-scene.js#L35) | Cargando fotos… |
| [74](js/minigames/memory/game-scene.js#L74) | Parejas ${this.matched.size}/${CFG.TRIPS.length} · Mov: ${this.moves} |

**[js/minigames/memory/end-scene.js](js/minigames/memory/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [14](js/minigames/memory/end-scene.js#L14) | ¡Todas las ↵ parejas! |
| [19](js/minigames/memory/end-scene.js#L19) | ¡Memoria de piloto! |
| [19](js/minigames/memory/end-scene.js#L19) | ¡Muy buen vuelo! |
| [19](js/minigames/memory/end-scene.js#L19) | ¡Aterrizaje conseguido! |
| [20](js/minigames/memory/end-scene.js#L20) | ${moves} movimientos · ${msg} |
| [45](js/minigames/memory/end-scene.js#L45) | Toca un viaje para verlo en grande |
| [52](js/minigames/memory/end-scene.js#L52) | Volver al mapa |
| [53](js/minigames/memory/end-scene.js#L53) | Jugar otra vez |

**[js/minigames/memory/config.js](js/minigames/memory/config.js)**

| Línea | Texto |
| ---: | --- |
| [21](js/minigames/memory/config.js#L21) | Bolonia |
| [22](js/minigames/memory/config.js#L22) | Atenas |
| [23](js/minigames/memory/config.js#L23) | Bali |
| [24](js/minigames/memory/config.js#L24) | Venecia |
| [25](js/minigames/memory/config.js#L25) | Londres |
| [26](js/minigames/memory/config.js#L26) | Nueva York |
| [34](js/minigames/memory/config.js#L34) | Memory de viajes |

## Día 5 · Nadar en Bali

**[js/minigames/bali/start-scene.js](js/minigames/bali/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [15](js/minigames/bali/start-scene.js#L15) | Nadar ↵ en Bali |
| [16](js/minigames/bali/start-scene.js#L16) | Día 5 · Bali, Indonesia |
| [25](js/minigames/bali/start-scene.js#L25) | ¡SÍ! |
| [31](js/minigames/bali/start-scene.js#L31) | ¡NO! |
| [33](js/minigames/bali/start-scene.js#L33) | Nada con las tortugas marinas: ↵ ¡junta ${CFG.TURTLES} para ganar! |
| [34](js/minigames/bali/start-scene.js#L34) | Esquiva los dragones de Komodo ↵ y las medusas: ¡te quitan ↵ una vida! |
| [35](js/minigames/bali/start-scene.js#L35) | Arrastra el dedo para nadar |
| [36](js/minigames/bali/start-scene.js#L36) | Teclado: flechas o W A S D |
| [42](js/minigames/bali/start-scene.js#L42) | ¡Al agua! |

**[js/minigames/bali/game-scene.js](js/minigames/bali/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [44](js/minigames/bali/game-scene.js#L44) | ¡Junta ${CFG.TURTLES} tortugas! |
| [163](js/minigames/bali/game-scene.js#L163) | ¡A mitad! |
| [176](js/minigames/bali/game-scene.js#L176) | ¡Medusa! |
| [176](js/minigames/bali/game-scene.js#L176) | ¡Ñam! |
| [189](js/minigames/bali/game-scene.js#L189) | ¡${CFG.TURTLES} tortugas! |
| [194](js/minigames/bali/game-scene.js#L194) | ¡Sin vidas! |

**[js/minigames/bali/end-scene.js](js/minigames/bali/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [16](js/minigames/bali/end-scene.js#L16) | ¡Amiga de ↵ las tortugas! |
| [18](js/minigames/bali/end-scene.js#L18) | ${turtles} tortugas en ${secs} segundos |
| [19](js/minigames/bali/end-scene.js#L19) | ¡Ni un mordisco de ↵ dragones de Komodo! |
| [19](js/minigames/bali/end-scene.js#L19) | Te sobraron ${lives} ${lives === 1 ? 'vida' : 'vidas'}. ↵ ¡Los dragones se quedan ↵ en la playa! |
| [28](js/minigames/bali/end-scene.js#L28) | Volver al mapa |
| [29](js/minigames/bali/end-scene.js#L29) | Nadar otra vez |
| [32](js/minigames/bali/end-scene.js#L32) | ¡Sin vidas! |
| [33](js/minigames/bali/end-scene.js#L33) | Tortugas: ${turtles}/${CFG.TURTLES} |
| [34](js/minigames/bali/end-scene.js#L34) | Consejo: cuando veas el "!" ↵ en la playa, apártate ↵ de esa fila |
| [39](js/minigames/bali/end-scene.js#L39) | Reintentar |

**[js/minigames/bali/config.js](js/minigames/bali/config.js)**

| Línea | Texto |
| ---: | --- |
| [27](js/minigames/bali/config.js#L27) | Nadar en Bali |

## Día 6 · Cruzar el puerto

**[js/minigames/puerto/start-scene.js](js/minigames/puerto/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [16](js/minigames/puerto/start-scene.js#L16) | Cruzar ↵ el puerto |
| [17](js/minigames/puerto/start-scene.js#L17) | Día 6 · Puerto de Bilbao |
| [39](js/minigames/puerto/start-scene.js#L39) | Esquiva los camiones de ↵ la terminal de contenedores |
| [40](js/minigames/puerto/start-scene.js#L40) | Los contenedores no se mueven: ↵ pasa por los huecos |
| [41](js/minigames/puerto/start-scene.js#L41) | En el agua, salta de barco ↵ en barco: ¡no te caigas! |
| [42](js/minigames/puerto/start-scene.js#L42) | Desliza para moverte ↵ (toca para avanzar) ↵ ¡${CFG.CROSSINGS} cruces, cada uno más rápido! |
| [43](js/minigames/puerto/start-scene.js#L43) | Teclado: flechas o W A S D |
| [53](js/minigames/puerto/start-scene.js#L53) | ¡A cruzar! |

**[js/minigames/puerto/game-scene.js](js/minigames/puerto/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [49](js/minigames/puerto/game-scene.js#L49) | Desliza para moverte ↵ toca para avanzar |
| [245](js/minigames/puerto/game-scene.js#L245) | Cruce ${Math.min(this.crossing + 1, CFG.CROSSINGS)}/${CFG.CROSSINGS} |
| [355](js/minigames/puerto/game-scene.js#L355) | ¡Al agua! |
| [360](js/minigames/puerto/game-scene.js#L360) | ¡Cuidado! |
| [392](js/minigames/puerto/game-scene.js#L392) | ¡Puerto ↵ cruzado! |
| [398](js/minigames/puerto/game-scene.js#L398) | ¡Cruce ${this.crossing}/${CFG.CROSSINGS}! ↵ Ahora más rápido |

**[js/minigames/puerto/end-scene.js](js/minigames/puerto/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [18](js/minigames/puerto/end-scene.js#L18) | ¡Puerto ↵ cruzado! |
| [21](js/minigames/puerto/end-scene.js#L21) | ${CFG.CROSSINGS} cruces en ${secs} segundos |
| [22](js/minigames/puerto/end-scene.js#L22) | ¡Sin perder ni una vida! ↵ Ni un camión ni una caída a la ría |
| [22](js/minigames/puerto/end-scene.js#L22) | Te sobraron ${lives} ${lives === 1 ? 'vida' : 'vidas'} ↵ ¡La ría no pudo contigo! |
| [27](js/minigames/puerto/end-scene.js#L27) | Volver al mapa |
| [28](js/minigames/puerto/end-scene.js#L28) | Cruzar otra vez |
| [31](js/minigames/puerto/end-scene.js#L31) | ¡Sin vidas! |
| [33](js/minigames/puerto/end-scene.js#L33) | Cruces: ${crossings}/${CFG.CROSSINGS} |
| [34](js/minigames/puerto/end-scene.js#L34) | Consejo: espera a que el ↵ barco llegue antes de saltar |
| [37](js/minigames/puerto/end-scene.js#L37) | Reintentar |

**[js/minigames/puerto/config.js](js/minigames/puerto/config.js)**

| Línea | Texto |
| ---: | --- |
| [87](js/minigames/puerto/config.js#L87) | Cruzar el puerto |

## Día 7 · Torre de lasagna

**[js/minigames/lasagna/start-scene.js](js/minigames/lasagna/start-scene.js)**

| Línea | Texto |
| ---: | --- |
| [15](js/minigames/lasagna/start-scene.js#L15) | Torre de ↵ lasagna |
| [16](js/minigames/lasagna/start-scene.js#L16) | Día 7 · Roma, junto al Coliseo |
| [29](js/minigames/lasagna/start-scene.js#L29) | Pasta, ragú y bechamel van ↵ de lado a lado: toca para soltar |
| [30](js/minigames/lasagna/start-scene.js#L30) | Lo que sobresale se corta. ↵ ¡Si no cae encima, se acabó! |
| [31](js/minigames/lasagna/start-scene.js#L31) | ${CFG.TARGET} capas y... ¡al horno! |
| [37](js/minigames/lasagna/start-scene.js#L37) | ¡A cocinar! |

**[js/minigames/lasagna/game-scene.js](js/minigames/lasagna/game-scene.js)**

| Línea | Texto |
| ---: | --- |
| [41](js/minigames/lasagna/game-scene.js#L41) | Toca para soltar ↵ cada capa |
| [69](js/minigames/lasagna/game-scene.js#L69) | Capas: ${n}/${CFG.TARGET} |
| [71](js/minigames/lasagna/game-scene.js#L71) | Ahora: ${next} |
| [125](js/minigames/lasagna/game-scene.js#L125) | ¡Perfecto! |
| [128](js/minigames/lasagna/game-scene.js#L128) | ¡Perfecto! ↵ ¡Más lasagna! |
| [173](js/minigames/lasagna/game-scene.js#L173) | ¡Se ha caído! |
| [191](js/minigames/lasagna/game-scene.js#L191) | ¡Al horno! ↵ Gratinando... |
| [210](js/minigames/lasagna/game-scene.js#L210) | ¡Lasagna ↵ perfecta! |

**[js/minigames/lasagna/end-scene.js](js/minigames/lasagna/end-scene.js)**

| Línea | Texto |
| ---: | --- |
| [25](js/minigames/lasagna/end-scene.js#L25) | ¡Lasagna ↵ perfecta! |
| [27](js/minigames/lasagna/end-scene.js#L27) | ${layers} capas · ${perfects} perfectas |
| [28](js/minigames/lasagna/end-scene.js#L28) | Gratinada en el horno de leña, ↵ con vistas al Coliseo |
| [37](js/minigames/lasagna/end-scene.js#L37) | Volver al mapa |
| [38](js/minigames/lasagna/end-scene.js#L38) | Cocinar otra vez |
| [41](js/minigames/lasagna/end-scene.js#L41) | ¡Se ha caído! |
| [42](js/minigames/lasagna/end-scene.js#L42) | Capas: ${layers}/${CFG.TARGET} |
| [43](js/minigames/lasagna/end-scene.js#L43) | Consejo: suelta la capa justo ↵ cuando esté encima ↵ de la anterior |
| [46](js/minigames/lasagna/end-scene.js#L46) | Reintentar |

**[js/minigames/lasagna/config.js](js/minigames/lasagna/config.js)**

| Línea | Texto |
| ---: | --- |
| [25](js/minigames/lasagna/config.js#L25) | Torre de lasagna |

## Otros textos comunes

**[js/core/controls.js](js/core/controls.js)**

| Línea | Texto |
| ---: | --- |
| [24](js/core/controls.js#L24) | 📱 Inclinar: SÍ |
| [24](js/core/controls.js#L24) | 📱 Inclinar |
| [40](js/core/controls.js#L40) | Sin permiso de inclinación. Usa el control táctil. |
| [45](js/core/controls.js#L45) | La inclinación no está disponible. Usa el control táctil. |

**[js/core/photos.js](js/core/photos.js)**

| Línea | Texto |
| ---: | --- |
| [20](js/core/photos.js#L20) | FOTO ? |
| [21](js/core/photos.js#L21) | no se pudo cargar |
| [91](js/core/photos.js#L91) | Toca para cerrar |

**[js/core/ui.js](js/core/ui.js)**

| Línea | Texto |
| ---: | --- |
| [45](js/core/ui.js#L45) | ◀ Mapa |

## Página (carga y aviso de girar el móvil)

**[index.html](index.html)**

| Línea | Texto |
| ---: | --- |
| [12](index.html#L12) | Ane · Rumbo a los 30 |
| [83](index.html#L83) | 📱 Inclinar |
| [90](index.html#L90) | Pon el móvil |
| [90](index.html#L90) | en vertical |
| [90](index.html#L90) | para jugar |
| [95](index.html#L95) | Cargando… |
