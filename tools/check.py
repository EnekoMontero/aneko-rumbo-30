"""Comprobación antes de publicar. Uso: python tools/check.py
Revisa: modo prueba, fotos y textos de relleno del Memory, archivos que faltan, sintaxis JS y fechas.
Termina con código 1 si hay algún ERROR (lo que impediría dárselo a Ane).
"""
import hashlib, os, re, shutil, subprocess, sys

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errors, warns = [], []
read = lambda rel: open(os.path.join(ROOT, rel), encoding='utf-8').read()

# 1) Interruptor de pruebas
ns = read('js/core/namespace.js')
m = re.search(r'window\.AneGame\.FORCE_TEST\s*=\s*(true|false)', ns)
if not m: errors.append('No encuentro FORCE_TEST en js/core/namespace.js')
elif m.group(1) == 'true': errors.append('FORCE_TEST = true en js/core/namespace.js (modo prueba: todo desbloqueado). Ponlo a false antes de publicar.')

# 2) Memory: fotos y textos de relleno
PLACEHOLDER = {'1f3473fe6701780a', 'ae02291b1c98d0e7', '7dea0759789b4cc4', 'e281714b0efd6f9f', 'facf1bd0702f0817', '3f6544c3f90789c5'}
cfg = read('js/minigames/memory/config.js')
relleno = []
for src in re.findall(r"src: '([^']+)'", cfg):
    p = os.path.join(ROOT, src)
    if not os.path.exists(p): errors.append(f'Memory: falta la foto {src}')
    elif hashlib.sha1(open(p, 'rb').read()).hexdigest()[:16] in PLACEHOLDER: relleno.append(os.path.basename(src))
if relleno: errors.append(f'Memory: fotos de relleno ("VIAJE · cámbiame") sin cambiar: {", ".join(relleno)} (assets/fotos/memory/)')
txt = re.findall(r"(?:place|date): '((?:Destino|Fecha) \d)'", cfg)
if txt: errors.append(f'Memory: textos de relleno sin cambiar en js/minigames/memory/config.js: {", ".join(txt)}')

# 3) Archivos referenciados que no existen (scripts del index y rutas literales de recursos)
html = read('index.html')
refs = re.findall(r'<script src="([^"]+)"', html) + re.findall(r'(?:href|src)="((?:assets|fonts)/[^"]+)"', html) + ['fonts/PressStart.ttf']
for d, _, files in os.walk(os.path.join(ROOT, 'js')):
    for fn in files:
        refs += re.findall(r"""['"`](assets/[\w./-]+\.(?:png|jpe?g|webp|mp3))['"`]""", open(os.path.join(d, fn), encoding='utf-8').read())
for r in sorted(set(refs)):
    if not os.path.exists(os.path.join(ROOT, r)): errors.append(f'Falta el archivo {r}')

# 4) Sintaxis de todos los JS (si hay Node instalado)
if shutil.which('node'):
    for r in re.findall(r'<script src="([^"]+)"', html):
        res = subprocess.run(['node', '--check', os.path.join(ROOT, r)], capture_output=True, text=True)
        if res.returncode: errors.append(f'Error de sintaxis en {r}:\n{res.stderr.strip()[:400]}')
else:
    warns.append('No hay Node instalado: no se ha comprobado la sintaxis JS')

# 5) Fechas del mapa
dates = re.findall(r"date: '(\d{4}-\d{2}-\d{2})'", read('js/map/config.js'))
if dates != sorted(dates): warns.append(f'Las fechas del mapa no van en orden: {dates}')
print('Fechas del mapa:', ', '.join(dates))

for w in warns: print('AVISO:', w)
for e in errors: print('ERROR:', e)
print('\nTodo listo para publicar.' if not errors else f'\n{len(errors)} error(es): corrígelos antes de dárselo a Ane.')
sys.exit(1 if errors else 0)
