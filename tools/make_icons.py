"""Genera los iconos (pestaña del navegador y pantalla de inicio) a partir de assets/map/final30.png.
Uso: python tools/make_icons.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'map', 'final30.png')
OUT = os.path.join(ROOT, 'assets', 'icons')
BG = (27, 20, 48, 255)   # #1b1430, el morado oscuro del juego


def icon(size, pad):
    art = Image.open(SRC).convert('RGBA')
    # escala entera (píxeles nítidos) que quepa dejando margen
    k = max(1, min((size - 2 * pad) // art.width, (size - 2 * pad) // art.height))
    art = art.resize((art.width * k, art.height * k), Image.NEAREST)
    im = Image.new('RGBA', (size, size), BG)
    im.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return im


os.makedirs(OUT, exist_ok=True)
icon(180, 14).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
icon(192, 16).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
icon(512, 40).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
# favicon: arte reducido con buen filtro (a 32 px no cabe a escala entera)
art = Image.open(SRC).convert('RGBA')
fav = Image.new('RGBA', (64, 64), BG)
small = art.resize((art.width * 56 // art.height, 56), Image.LANCZOS)
fav.alpha_composite(small, ((64 - small.width) // 2, 4))
fav.save(os.path.join(OUT, 'favicon.png'), optimize=True)
print('iconos en', OUT)
