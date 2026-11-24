"""
Arte del mapa retocado a mano con PIL.

  assets/map/iruka.png -> el cartel del edificio (icono del nodo del día 3) pone «IRUKA»,
                          el nombre del box de CrossFit de Ane, en vez de «CROSSFIT».
                          Letras de fonts/PressStart.ttf a 8 px SIN suavizado (píxel a píxel),
                          oscuras sobre el cartel crema, igual que el rótulo original.

Se puede ejecutar varias veces: solo repinta el interior del cartel.
Uso: python tools/make_map_art.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / 'assets/map/iruka.png'
FONT = ROOT / 'fonts/PressStart.ttf'

SIGN = (19, 25, 59, 31)          # interior del cartel (x0, y0, x1, y1 incluidos), marco crema alrededor
CREAM = (230, 220, 205, 255)     # fondo del cartel (mismo crema que el marco)
INK = (34, 30, 48, 255)          # letras


def main():
    im = Image.open(ICON).convert('RGBA')
    x0, y0, x1, y1 = SIGN
    d = ImageDraw.Draw(im)
    d.rectangle(SIGN, fill=CREAM)

    # Texto renderizado en 1 bit (sin antialias) y centrado en el cartel
    font = ImageFont.truetype(str(FONT), 8)
    mask = Image.new('L', (64, 16), 0)
    md = ImageDraw.Draw(mask)
    md.fontmode = '1'
    md.text((0, 0), 'IRUKA', font=font, fill=255)
    bx0, by0, bx1, by1 = mask.getbbox()
    w, h = bx1 - bx0, by1 - by0
    ox = x0 + (x1 - x0 + 1 - w) // 2
    oy = y0 + (y1 - y0 + 1 - h) // 2
    glyphs = mask.crop((bx0, by0, bx1, by1))
    px = im.load()
    for y in range(h):
        for x in range(w):
            if glyphs.getpixel((x, y)):
                px[ox + x, oy + y] = INK
    im.save(ICON)
    print('ok', ICON, f'texto {w}x{h} en ({ox},{oy})')


if __name__ == '__main__':
    main()
