"""
Genera el arte pixel-art de "Torre de lasaña" (assets/lasagna/). Las capas son tiras de 32 px de
ancho que se repiten en horizontal (tileSprite) y miden LAYER_H de alto (= CFG.LAYER_H):
  - pasta.png, ragu.png, bech.png, gratin.png   capas (borde superior irregular, sombreado)
  - crust.png     costra de queso gratinado que se pone encima de la última capa al hornear
  - dish.png      frente de la fuente de barro (tapa la parte baja de la primera capa)
  - dish_back.png interior/borde trasero de la fuente (detrás de las capas)
  - basil.png     hoja de albahaca para decorar la lasaña terminada
Uso: python tools/make_lasagna_art.py   (desde la raíz del proyecto). No toca bg_roma.png.
"""
import math
import os

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'lasagna')
LH = 20          # = CFG.LAYER_H
TW = 32          # ancho del patrón que se repite
START_W = 252    # = CFG.START_W (interior de la fuente)
OUTLINE = (27, 20, 48)
rng = np.random.default_rng(7)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def new(w, h):
    return np.zeros((h, w, 4), dtype=float)


def px(img, x, y, c, a=255):
    h, w = img.shape[:2]
    x %= w                                     # repetición horizontal sin costuras
    if 0 <= y < h:
        img[y, x, :3] = c; img[y, x, 3] = a


def save(img, name):
    Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), 'RGBA').save(os.path.join(OUT, name), optimize=True)


GAP = (88, 36, 18)   # grieta entre capas (salsa oscura): se pinta por encima del borde ondulado


def fill_gap(img, top):
    for x in range(TW):
        for y in range(top[x]):
            img[y, x, :3] = GAP; img[y, x, 3] = 255


def top_profile(amp, period_parts, seed):
    """Altura del borde superior (en px desde arriba) para cada columna, periódica en TW."""
    r = np.random.default_rng(seed)
    ph = r.random(len(period_parts)) * math.tau
    xs = np.arange(TW)
    prof = np.zeros(TW)
    for (k, a), p in zip(period_parts, ph):
        prof += a * np.sin(xs / TW * math.tau * k + p)
    prof = (prof - prof.min()) / max(1e-6, prof.max() - prof.min()) * amp
    return np.round(prof).astype(int)


# ---------------------------------------------------------------- pasta (lámina rizada)
def make_pasta():
    img = new(TW, LH)
    top = top_profile(2, [(4, 1.0), (8, 0.4)], 1)
    BASE, LIGHT, HI, SH, DARK = hexc('f0c55c'), hexc('f8d77c'), hexc('fff0b8'), hexc('d9a23e'), hexc('a8702a')
    for x in range(TW):
        t0 = top[x]
        for y in range(t0, LH):
            yy = y - t0
            # pliegues de pasta rizada: bandas diagonales claras/oscuras
            fold = math.sin((x * 0.7 + y * 1.6) * 0.55)
            c = BASE
            if fold > 0.6: c = LIGHT
            if fold < -0.75: c = SH
            if yy == 0: c = HI
            elif yy == 1: c = LIGHT
            if y >= LH - 3: c = SH
            if y == LH - 1: c = DARK
            px(img, x, y, c)
    # poros y burbujitas de la pasta
    for (x, y) in [(5, 7), (13, 11), (22, 6), (27, 13), (9, 14), (18, 9)]:
        px(img, x, y, hexc('e3b24c'))
    for (x, y) in [(3, 5), (16, 5), (25, 8)]:
        px(img, x, y, hexc('fff4c8'))
    fill_gap(img, top)
    return img


# ---------------------------------------------------------------- ragú (tomate y carne)
def make_ragu():
    img = new(TW, LH)
    top = top_profile(3, [(3, 1.0), (7, 0.6), (11, 0.3)], 2)
    BASE, MID, DARK, DEEP, HI = hexc('b3301b'), hexc('cf4526'), hexc('8a2212'), hexc('5e160c'), hexc('ec7448')
    noise = rng.random((LH, TW))
    for x in range(TW):
        t0 = top[x]
        for y in range(t0, LH):
            yy = y - t0
            c = BASE
            if noise[y, x] > 0.86: c = MID
            if noise[y, x] < 0.05: c = DARK
            if yy == 0: c = HI
            elif yy == 1: c = MID
            if y >= LH - 2: c = DARK
            if y == LH - 1: c = DEEP
            px(img, x, y, c)
    # trocitos de carne (marrón) con brillo
    for (x, y) in [(3, 7), (12, 12), (20, 7), (27, 13), (7, 14)]:
        for (dx, dy, c) in [(1, 0, '8e4420'), (2, 0, '7e3418'), (0, 1, '7e3418'), (1, 1, '6b2a14'), (2, 1, '6b2a14'),
                            (3, 1, '5a2210'), (1, 2, '5a2210'), (2, 2, '4a1a0c')]:
            px(img, x + dx, y + dy, hexc(c))
    for (x, y) in [(16, 9), (9, 5), (24, 14)]:          # tomate en trozos
        px(img, x, y, hexc('e85a34')); px(img, x + 1, y, hexc('d24a28')); px(img, x, y + 1, hexc('a82a18'))
    # brillos de aceite
    for (x, y) in [(8, 5), (22, 11), (14, 15), (28, 9)]:
        px(img, x, y, hexc('f5a070'))
    # albahaca y orégano
    for (x, y) in [(17, 13), (18, 13), (5, 10)]:
        px(img, x, y, hexc('3f8f34'))
    fill_gap(img, top)
    return img


# ---------------------------------------------------------------- bechamel con mozzarella
def make_bech():
    img = new(TW, LH)
    top = top_profile(2, [(2, 1.0), (5, 0.5)], 3)
    BASE, HI, SH, DARK = hexc('f4e8c8'), hexc('fffbef'), hexc('e2d0a2'), hexc('c4ad7c')
    for x in range(TW):
        t0 = top[x]
        for y in range(t0, LH):
            yy = y - t0
            c = BASE
            if yy <= 1: c = HI
            if y >= LH - 3: c = SH
            if y == LH - 1: c = DARK
            px(img, x, y, c)
    # queso fundido (vetas amarillas) y nuez moscada
    for (x, y, l) in [(2, 7, 5), (14, 10, 6), (24, 6, 4), (8, 13, 4), (20, 14, 5)]:
        for i in range(l):
            px(img, x + i, y + (1 if i in (2, 3) else 0), hexc('f2d27a'))
        px(img, x + l, y, hexc('e6bc56'))
    for (x, y) in [(6, 4), (18, 5), (28, 11), (12, 16), (25, 15)]:
        px(img, x, y, hexc('b88a52'))
    fill_gap(img, top)
    return img


# ---------------------------------------------------------------- gratinado (queso tostado)
def make_gratin():
    img = new(TW, LH)
    top = top_profile(3, [(3, 1.0), (6, 0.5)], 4)
    BASE, LIGHT, HI, BROWN, DARK = hexc('d48a30'), hexc('e8a848'), hexc('f8d478'), hexc('a8561a'), hexc('6e3010')
    noise = rng.random((LH, TW))
    for x in range(TW):
        t0 = top[x]
        for y in range(t0, LH):
            yy = y - t0
            c = BASE
            if noise[y, x] > 0.75: c = LIGHT
            if yy == 0: c = BROWN
            elif yy == 1: c = LIGHT
            if y >= LH - 2: c = BROWN
            if y == LH - 1: c = DARK
            px(img, x, y, c)
    # burbujas tostadas
    for (x, y) in [(4, 6), (15, 10), (24, 5), (10, 14), (27, 13)]:
        for (dx, dy, c) in [(0, 0, BROWN), (1, 0, BROWN), (0, 1, BROWN), (1, 1, DARK), (-1, 0, HI)]:
            px(img, x + dx, y + dy, c)
    fill_gap(img, top)
    return img


# ---------------------------------------------------------------- costra gratinada de arriba (con chorretones)
def make_crust():
    H = 14
    img = new(TW, H)
    top = top_profile(3, [(2, 1.0), (5, 0.6), (9, 0.3)], 5)
    BASE, LIGHT, HI, BROWN, DARK = hexc('eaa840'), hexc('f6c860'), hexc('fff0a8'), hexc('b8641e'), hexc('7e3a12')
    drip = [0, 0, 2, 4, 2, 0, 0, 0, 0, 3, 5, 3, 1, 0, 0, 0, 0, 0, 2, 3, 2, 0, 0, 0, 1, 4, 6, 4, 1, 0, 0, 0]
    for x in range(TW):
        bot = 7 + drip[x]
        for y in range(top[x], min(H, bot + 1)):
            c = BASE
            if y == top[x]: c = BROWN
            elif y == top[x] + 1: c = HI
            elif (x * 3 + y * 5) % 11 == 0: c = BROWN
            elif (x + y) % 5 == 0: c = LIGHT
            if y == bot: c = BROWN
            px(img, x, y, c)
    for (x, y) in [(6, 4), (20, 3), (13, 5), (27, 4)]:
        px(img, x, y, DARK); px(img, x + 1, y, BROWN)
    return img


# ---------------------------------------------------------------- fuente de barro
def make_dish():
    rim = 12                         # lo que sobresale el borde a cada lado del interior
    handle = 14
    Wd = START_W + 2 * rim + 2 * handle
    Hd = 44
    img = new(Wd, Hd)
    x0, x1 = handle, Wd - handle     # cuerpo
    RIM_HI, RIM, BODY, BODY_HI, BODY_SH, DEEP = hexc('f4b27c'), hexc('dc7d45'), hexc('c0602a'), hexc('d8763c'), hexc('9a4520'), hexc('6e2c12')
    CREAM, GREEN, RED, BLUE = hexc('f5e6c4'), hexc('2f8a3c'), hexc('ce2b37'), hexc('3a6fb0')
    for y in range(Hd):
        inset = 0 if y < 7 else int((y - 7) * 0.32)        # paredes que se estrechan hacia abajo
        for x in range(x0 + inset, x1 - inset):
            u = (x - x0) / (x1 - x0)
            if y < 3: c = RIM_HI if y == 0 or (y == 1 and 0.04 < u < 0.96) else RIM
            elif y < 6: c = RIM if y < 5 else BODY_SH
            else:
                c = BODY
                if u < 0.06 or u > 0.94: c = BODY_SH
                elif 0 <= (x - x0) - 26 - (y - 6) * 0.6 < 6 or 0 <= (x - x0) - 36 - (y - 6) * 0.6 < 2: c = BODY_HI   # reflejo del esmalte
                if y >= Hd - 6: c = BODY_SH
                if y >= Hd - 2: c = DEEP
            px(img, x, y, c)
    # banda pintada a mano: ondas crema con puntos verdes, blancos y rojos (colores de Italia)
    for x in range(x0 + 10, x1 - 10):
        yy = 16 + int(round(1.6 * math.sin((x - x0) * 0.42)))
        px(img, x, yy, CREAM); px(img, x, yy + 1, CREAM)
    for i, x in enumerate(range(x0 + 16, x1 - 14, 15)):
        col = [GREEN, CREAM, RED][i % 3]
        for (dx, dy) in [(0, 0), (1, 0), (0, 1), (1, 1)]:
            px(img, x + dx, 24 + dy, col)
        px(img, x, 23, col); px(img, x + 1, 26, col)
    # finas líneas azules bajo el borde y sobre la base (estilo cerámica)
    for x in range(x0 + 4, x1 - 4):
        px(img, x, 9, BLUE)
    for x in range(x0 + 10, x1 - 10):
        px(img, x, 33, CREAM)
    # asas laterales (anillos)
    for side in (0, 1):
        cx = handle - 2 if side == 0 else Wd - handle + 1
        for y in range(4, 18):
            for x in range(Wd):
                d = math.hypot((x - cx) / 1.0, (y - 10) / 1.15)
                if (side == 0 and x <= x0) or (side == 1 and x >= x1 - 1):
                    if 3.5 <= d <= 7.5:
                        c = RIM_HI if y < 8 else (RIM if y < 13 else BODY_SH)
                        px(img, x, y, c)
    return outline(img)


def make_dish_back():
    rim = 12
    Wd = START_W + 2 * rim
    Hd = 12
    img = new(Wd, Hd)
    for y in range(Hd):
        for x in range(Wd):
            if y == 0: c = hexc('f4b27c')
            elif y == 1: c = hexc('dc7d45')
            elif x < 3 or x >= Wd - 3: c = hexc('9a4520')
            else: c = hexc('7a3418') if y < 6 else hexc('5e2410')       # interior en sombra
            px(img, x, y, c)
    return outline(img)


def make_basil():
    img = new(12, 9)
    leaf = ['....GGG.....', '..GGLLGG....', '.GLLHLLGG...', 'GLLLLHLLGG..', '.GGLLLLHLGG.', '...GGLLLLLGs',
            '.....GGGGG.s', '..........s.', '............']
    C = {'G': hexc('2f7a2a'), 'L': hexc('46a83a'), 'H': hexc('8fd65a'), 's': hexc('2f6a26')}
    for y, row in enumerate(leaf):
        for x, ch in enumerate(row):
            if ch in C: px(img, x, y, C[ch])
    return outline(img)


def outline(img):
    a = img[..., 3] > 0
    n = np.zeros_like(a)
    n[1:] |= a[:-1]; n[:-1] |= a[1:]; n[:, 1:] |= a[:, :-1]; n[:, :-1] |= a[:, 1:]
    edge = n & ~a
    out = img.copy()
    out[edge, :3] = OUTLINE; out[edge, 3] = 255
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    save(make_pasta(), 'pasta.png')
    save(make_ragu(), 'ragu.png')
    save(make_bech(), 'bech.png')
    save(make_gratin(), 'gratin.png')
    save(make_crust(), 'crust.png')
    save(make_dish(), 'dish.png')
    save(make_dish_back(), 'dish_back.png')
    save(make_basil(), 'basil.png')
    print('Arte de la lasaña generado en', os.path.normpath(OUT))
