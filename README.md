# Ane · Rumbo a los 30

Juego-regalo para el 30 cumpleaños de Ane: un mapa con 7 minijuegos (uno por día, del 3 al 9 de
diciembre de 2026) y la sorpresa final ¡30! el 10 de diciembre. Cada juego superado da un sello
en el Pasaporte de los 30.

## Estructura

```
index.html              página del juego (carga Phaser y los scripts en orden)
manifest.webmanifest    nombre e icono al "Añadir a pantalla de inicio"
vendor/phaser.min.js    motor (Phaser 3, local, sin CDN)
fonts/PressStart.ttf    fuente pixel
js/core/                núcleo: namespace (INTERRUPTOR DE PRUEBAS), textos, sonido, progreso, UI
js/map/                 mapa: config.js = orden, nombres y FECHAS de cada día; unlock.js = regla de apertura
js/story/               intro, pasaporte y escena final
js/minigames/<juego>/   cada minijuego: config, portada (start), partida (game), final (end)
assets/                 imágenes, música y fotos
tools/                  scripts de ayuda (ver abajo)
```

Textos: los generales (intro, pasaporte, mapa, final) están en `js/core/texts.js`; los de cada
minijuego, en su `start-scene.js` (portada) y `end-scene.js` (pantalla final).

## Probar en el ordenador

Hace falta un servidor local (abriendo `index.html` con doble clic no carga la música ni las fotos):

```
python -m http.server 8000
```

y abre http://localhost:8000 (en Chrome, F12 > icono del móvil para verlo en tamaño teléfono).

### Modo prueba

En `js/core/namespace.js`:

```js
window.AneGame.FORCE_TEST = true;   // true mientras pruebas, false para Ane
```

Con `FORCE_TEST = true`:
- todo está desbloqueado y en el mapa aparece **[Borrar progreso]**;
- `?hoy=2026-12-05` en la URL simula ese día **tal como lo verá Ane** (se abren solo los días hasta esa fecha);
  con una fecha anterior al 3 de diciembre (p. ej. `?hoy=2026-12-01`) se ve la **cuenta atrás** que verá
  si abre el enlace antes de tiempo (ni intro ni mapa hasta el día 3);
- `?intro=1` fuerza la intro; `?nointro=1` la salta.

Con `FORCE_TEST = false` no hay ningún atajo por URL (`?test=1`, `?hoy=` no hacen nada).

### Probar en tu móvil sin publicar

Con el móvil en la misma WiFi que el ordenador:

```
python -m http.server 8000 --bind 0.0.0.0
```

Mira la IP del ordenador (`ipconfig` → "Dirección IPv4", p. ej. 192.168.1.40) y abre en el móvil
`http://192.168.1.40:8000`. Si no carga, permite Python en el firewall de Windows cuando lo pregunte.

### Qué protege y qué no

- La fecha se pide al servidor al arrancar: cambiar la fecha del móvil **no** adelanta los días
  (sin internet se usa la del móvil).
- No hay atajos por URL con `FORCE_TEST = false`.
- Es un juego que corre en el navegador: alguien con conocimientos técnicos podría mirar el código.
  Si el repositorio es público, quien lo encuentre puede ver el código, las fotos y el final.

## Reglas del calendario

- Cada juego se abre en su fecha (hora del móvil de Ane), aunque no haya superado el anterior.
- Si un día no consigue un sello, puede volver a ese juego cuando quiera.
- El ¡30! se abre el 10 de diciembre siempre. Con los 7 sellos, el final añade el desfile de sellos
  «¡Pasaporte completo!»; si falta alguno, muestra los que tiene y la anima a conseguir el resto.

## Antes de publicar

1. Fotos del Memory (día 4): ver instrucciones al principio de `js/minigames/memory/config.js`:
   `python tools/prepare_photos.py CARPETA_CON_6_FOTOS` y escribir sitio y fecha de cada viaje.
2. `FORCE_TEST = false` en `js/core/namespace.js`.
3. `python tools/check.py` → tiene que decir **Todo listo para publicar**.

## Publicar en GitHub Pages con tu dominio

1. Crea un repositorio en GitHub y sube esta carpeta (sin `dist/` ni el HTML antiguo: ya están en `.gitignore`).
   Ojo: en un repositorio **público** cualquiera puede ver el código y las fotos. GitHub Pages desde un
   repositorio privado necesita una cuenta de pago; si no, usa nombres de repo poco obvios.
   (`noindex` ya evita que salga en Google.)
2. En el repositorio: **Settings > Pages > Source: Deploy from a branch > main / (root)**.
3. Dominio **aneko.info** (ya está el archivo `CNAME` en la raíz con ese dominio; GitHub lo rellena
   solo en **Settings > Pages > Custom domain**). En el panel DNS de donde compraste el dominio:
   - 4 registros **A** para `@` (el dominio sin www): `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - (opcional, IPv6) 4 registros **AAAA** para `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`,
     `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - 1 registro **CNAME** `www` → `TU_USUARIO.github.io`
   Borra otros registros A/AAAA de `@` que hubiera (los del aparcamiento del dominio). Cuando GitHub
   diga "DNS check successful" (de minutos a unas horas), marca **Enforce HTTPS**.
4. **Muy importante:** el progreso de Ane se guarda en su navegador *por dirección web*. Configura el
   dominio definitivo **antes** de pasarle el enlace; si luego cambias de dirección, empezará de cero.
5. En iPhone, si añade el juego a la pantalla de inicio, esa versión guarda su progreso aparte de Safari:
   mejor que juegue siempre desde el mismo sitio (lo más cómodo: el icono de la pantalla de inicio).

Tras cada cambio, GitHub tarda 1-2 minutos en publicarlo.

## Herramientas (`tools/`)

| Script | Para qué |
| --- | --- |
| `check.py` | Comprobación antes de publicar (modo prueba, fotos de relleno, archivos que faltan, sintaxis) |
| `prepare_photos.py` | Prepara las 6 fotos del Memory |
| `build_standalone.py` | Genera `dist/ane-juego.html`: todo el juego en un único archivo (copia de seguridad) |
| `make_icons.py` | Regenera los iconos a partir de `assets/map/final30.png` |
| `extract_texts.py` | Genera `TEXTOS.md` con todos los textos del juego (por pantalla, con archivo y línea) para revisarlos |

Música del CrossFit: "Motivator", Kevin MacLeod (incompetech.com), licencia CC BY 4.0.
