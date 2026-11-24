"""Prepara fotos para el Memory de viajes (o cambia alguna).
Uso: python tools/prepare_photos.py CARPETA_O_FOTO [CARPETA_O_FOTO ...]

- Cada foto se endereza (fotos de móvil giradas), se reduce a 1024 px como mucho y se guarda en
  assets/fotos/memory/<nombre>.jpg con el mismo nombre que tenía (en minúsculas, sin espacios).
- Guarda una copia del original en fotos-originales/ (no se sube a GitHub).
- Formatos: JPG, PNG, WEBP. Las HEIC del iPhone: expórtalas antes como JPG.
- Después pon en js/minigames/memory/config.js (TRIPS) la ruta, el lugar y la fecha de cada una.
El juego recorta el CUADRADO CENTRAL de cada foto: deja lo importante en el centro.
"""
import os, re, shutil, sys, unicodedata
from PIL import Image, ImageOps

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fotos', 'memory')
BACKUP = os.path.join(ROOT, 'fotos-originales')
EXT = ('.jpg', '.jpeg', '.png', '.webp')


def slug(name):
    s = unicodedata.normalize('NFKD', os.path.splitext(name)[0]).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', s) or 'foto'


if len(sys.argv) < 2:
    sys.exit(__doc__)
files = []
for a in sys.argv[1:]:
    if os.path.isdir(a): files += [os.path.join(a, f) for f in sorted(os.listdir(a)) if f.lower().endswith(EXT)]
    elif a.lower().endswith(EXT) and os.path.exists(a): files.append(a)
if not files:
    sys.exit('No he encontrado fotos (JPG, PNG o WEBP) en lo que me has pasado.')
os.makedirs(BACKUP, exist_ok=True)
for p in files:
    shutil.copy2(p, os.path.join(BACKUP, os.path.basename(p)))
    im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
    im.thumbnail((1024, 1024), Image.LANCZOS)
    dst = os.path.join(OUT, slug(os.path.basename(p)) + '.jpg')
    im.save(dst, quality=85, optimize=True)
    if os.path.abspath(p) != os.path.abspath(dst) and os.path.dirname(os.path.abspath(p)) == os.path.abspath(OUT):
        os.remove(p)   # si la foto estaba ya en la carpeta del juego, queda solo la versión optimizada
    rel = os.path.relpath(dst, ROOT).replace(os.sep, '/')
    print(f"{os.path.basename(p):28s} -> {rel}  {im.size[0]}x{im.size[1]}  {os.path.getsize(dst) // 1024} KB")
    print(f"    {{ src: '{rel}', place: 'LUGAR', date: 'FECHA' }},")
print('\nPega esas líneas en TRIPS de js/minigames/memory/config.js (cambiando LUGAR y FECHA).')
