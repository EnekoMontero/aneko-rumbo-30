"""Genera TEXTOS.md con todos los textos que se ven en el juego, por pantalla, con archivo y línea.
Uso: python tools/extract_texts.py
Para cambiar un texto, edítalo en el archivo y la línea que se indican (no en TEXTOS.md).
"""
import os, re, sys

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Orden y nombre de cada sección (por carpeta/archivo)
SECTIONS = [
    ('js/core/texts.js', 'Textos generales (intro, pasaporte, sellos, mapa y final)'),
    ('js/story/intro-scene.js', 'Intro (vídeo de inicio)'),
    ('js/map/config.js', 'Mapa: nombres de los destinos'),
    ('js/map/', 'Mapa'),
    ('js/story/passport-scene.js', 'Pasaporte'),
    ('js/story/final-scene.js', 'Escena final ¡30!'),
    ('js/minigames/pintxos/', 'Día 1 · Pintxos de Zamora'),
    ('js/minigames/corredor/', 'Día 2 · Carrera por la ría'),
    ('js/minigames/crossfit/', 'Día 3 · Guitar Hero de CrossFit (IRUKA)'),
    ('js/minigames/memory/', 'Día 4 · Memory de viajes'),
    ('js/minigames/bali/', 'Día 5 · Nadar en Bali'),
    ('js/minigames/puerto/', 'Día 6 · Cruzar el puerto'),
    ('js/minigames/lasagna/', 'Día 7 · Torre de lasagna'),
    ('js/core/', 'Otros textos comunes'),
    ('index.html', 'Página (carga y aviso de girar el móvil)'),
]
FILE_ORDER = ['start-scene', 'game-scene', 'end-scene', 'config', 'textures']

KEYS = {'LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE', 'ENTER', 'ONE', 'TWO', 'THREE', 'ADD', 'NORMAL'}
NOT_TEXT = {'Linear', 'PressStart', 'Back.out', 'Map', 'Text', 'Image', 'Container', 'HEAD', 'Date', '2d'}
SCENES = set()   # nombres internos de escena de todo el proyecto (se rellena en main)


def strip_comments(src):
    """Quita comentarios de JS respetando las cadenas (para no extraer textos de comentarios)."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in '\'"`':
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1]); i = j + 1
        elif src.startswith('//', i) and (i == 0 or src[i - 1] != ':'):
            while i < n and src[i] != '\n': i += 1
        elif src.startswith('/*', i):
            j = src.find('*/', i + 2); j = n if j < 0 else j + 2
            out.append('\n' * src.count('\n', i, j)); i = j
        else:
            out.append(c); i += 1
    return ''.join(out)


def scene_names(code):
    return set(re.findall(r"super\('(\w+)'\)", code))


def is_text(s, scenes):
    t = s.strip()
    if not t or t in NOT_TEXT or t in scenes or t in SCENES or t in KEYS: return False
    # tiene que quedar alguna letra fuera de las partes ${...} y de los saltos de línea
    if not re.search(r'[A-Za-zÁÉÍÓÚÑáéíóúñ]', re.sub(r'\$\{[^}]*\}|\\n', '', t)): return False
    if re.fullmatch(r'[.A-Za-z]+', t) and re.search(r'\.[A-Za-z.]', t): return False   # filas de pixel art: '.KKyyK.'
    if re.fullmatch(r'(.)\1{4,}', t): return False                              # 'XXXXXXXXXXXX'
    if re.match(r'rgba?\(|[#(_]|[+-]=', t) or re.search(r'\d+px ', t): return False   # colores, selectores, CSS
    if ':' in t and ' ' not in t: return False                                   # claves internas 'photo:...', 'file:'
    if t.startswith('?'): return False
    if re.fullmatch(r'#?[0-9a-fA-F]{3,8}', t): return False                     # colores
    if re.search(r'(assets|fonts|js)/|\.(png|jpe?g|mp3|js|ttf)\b', t): return False  # rutas
    if re.fullmatch(r'[\w.-]*(\$\{[^}]*\}[\w.-]*)+', t): return False           # claves con variables: 'px-' + ...
    if re.fullmatch(r'[a-z][\w.-]*', t): return False                           # claves, eventos, poses: 'pointerdown'
    if re.fullmatch(r'[A-Z][a-z]+(\.(in|out|inOut|easeInOut|easeOut|easeIn))', t): return False  # curvas de tween
    if re.fullmatch(r'[A-Z][a-z]+[A-Z]\w*', t): return False                    # nombres de escena: 'PintxosGame'
    if re.fullmatch(r'[A-Z,]+', t) and (',' in t or t in KEYS): return False   # teclas: 'LEFT,RIGHT,A,D'
    if re.fullmatch(r'[A-Z]', t): return False                                  # una letra de tecla
    if ':' in t and ';' in t: return False                                      # CSS
    if re.fullmatch(r'[\w-]+-[\w-]+', t) and t.lower() == t: return False
    if t.startswith('keydown') or t.startswith('pointer'): return False
    return bool(re.search(r'[A-Za-zÁÉÍÓÚÑáéíóúñ¡¿]', t))


def extract(path):
    raw = open(os.path.join(ROOT, path), encoding='utf-8').read()
    if path.endswith('.html'):
        text = re.sub(r'<script.*?</script>|<style.*?</style>', lambda m: '\n' * m.group(0).count('\n'), raw, flags=re.S)
        res = []
        for m in re.finditer(r'>([^<>]*[A-Za-zÁÉÍÓÚÑáéíóúñ][^<>]*)<', text):
            line = text.count('\n', 0, m.start()) + 1
            t = ' '.join(m.group(1).split())
            if t not in (x for _, x in res): res.append((line, t))
        return res
    code = strip_comments(raw)
    scenes = scene_names(raw)
    lines = code.split('\n')
    res, seen = [], set()
    for m in re.finditer(r"'((?:\\.|[^'\\\n])*)'|\"((?:\\.|[^\"\\\n])*)\"|`((?:\\.|[^`\\])*)`", code):
        s = next(g for g in m.groups() if g is not None)
        if not is_text(s, scenes) or s in seen: continue
        line = code.count('\n', 0, m.start()) + 1
        src_line = lines[line - 1]
        if 'console.' in src_line or 'Error(' in src_line: continue    # mensajes técnicos, no se ven
        seen.add(s)
        res.append((line, s))
    return res


def section_of(path):
    for prefix, name in SECTIONS:
        if path == prefix or (prefix.endswith('/') and path.startswith(prefix)):
            return name
    return None


def main():
    files = []
    for d, _, fs in os.walk(os.path.join(ROOT, 'js')):
        for f in fs:
            if f.endswith('.js'): files.append(os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/'))
    files.append('index.html')
    for p in files:
        if p.endswith('.js'): SCENES.update(scene_names(open(os.path.join(ROOT, p), encoding='utf-8').read()))
    by_sec = {}
    for p in files:
        sec = section_of(p)
        if not sec: continue
        items = extract(p)
        if items: by_sec.setdefault(sec, []).append((p, items))
    out = ['# Textos del juego', '',
           'Todos los textos que ve Ane, por pantalla. Para cambiar uno, edítalo en el **archivo y línea** indicados',
           '(este documento solo sirve para revisar; se regenera con `python tools/extract_texts.py`).', '',
           '- `↵` = salto de línea (en el código es `\\n`).',
           '- `${...}` = parte que el juego rellena sola (un número, un nombre...). No la borres.',
           '- Los textos con varias líneas tienen que caber en la pantalla del móvil: si alargas mucho uno, avísame.', '']
    total = 0
    for _, name in SECTIONS:
        if name not in by_sec: continue
        out += [f'## {name}', '']
        def key(e):
            base = os.path.basename(e[0]).replace('.js', '')
            return FILE_ORDER.index(base) if base in FILE_ORDER else 99
        for p, items in sorted(by_sec[name], key=key):
            out += [f'**[{p}]({p})**', '', '| Línea | Texto |', '| ---: | --- |']
            for line, s in items:
                shown = s.replace('\\n', ' ↵ ').replace('|', '\\|').replace("\\'", "'")
                out.append(f'| [{line}]({p}#L{line}) | {shown} |')
                total += 1
            out.append('')
    with open(os.path.join(ROOT, 'TEXTOS.md'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out))
    print(f'TEXTOS.md generado: {total} textos')


if __name__ == '__main__':
    main()
