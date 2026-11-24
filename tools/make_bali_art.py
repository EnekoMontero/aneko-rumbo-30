"""
Genera el arte pixel-art de "Nadar en Bali" (assets/bali/):
  - bg_sea.png   360x720, se repite en vertical: playas con palmeras, sombrillas, toallas y conchas;
                 mar con degradado de profundidad (claro en la orilla, oscuro en el centro) y fondo
                 marino apagado (corales, rocas, algas) para que lo jugable destaque encima.
  - caustics.png 96x96, se repite en las dos direcciones: red de cáusticas (luz) para superponer animada.
  - foam.png     22x96, se repite en vertical: espuma de la orilla (borde izquierdo = arena).
  - jelly1.png / jelly2.png  24x30: medusa con contorno oscuro (dos fotogramas de tentáculos).
Uso: python tools/make_bali_art.py   (desde la raíz del proyecto)
"""
import math
import os
import random

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'bali')
W, H = 360, 720
BEACH = 34                       # = CFG.BEACH
OUTLINE = (27, 20, 48)           # #1b1430, contorno común del juego
rng = random.Random(30)          # semilla fija: el arte sale siempre igual

BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=float) / 16 - 0.5


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)


def periodic_noise(w, h, cells_x, cells_y, seed):
    """Ruido de valor suave y periódico (se repite sin costuras en x e y)."""
    r = np.random.default_rng(seed)
    grid = r.random((cells_y, cells_x))
    ys = np.arange(h) / h * cells_y
    xs = np.arange(w) / w * cells_x
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    fy = ys - y0; fx = xs - x0
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    y1 = (y0 + 1) % cells_y; x1 = (x0 + 1) % cells_x
    y0 %= cells_y; x0 %= cells_x
    a = grid[y0][:, x0]; b = grid[y0][:, x1]; c = grid[y1][:, x0]; d = grid[y1][:, x1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def fbm(w, h, base, seed, octaves=3):
    tot = np.zeros((h, w)); amp = 1; norm = 0
    for o in range(octaves):
        tot += amp * periodic_noise(w, h, base[0] * 2 ** o, base[1] * 2 ** o, seed + o)
        norm += amp; amp *= 0.5
    return tot / norm


def ramp(stops, t):
    """Interpola una rampa de colores [(pos, rgb), ...] para un array t en [0,1]."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,))
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / max(1e-6, p1 - p0))[m][:, None]
        out[m] = c0 + (c1 - c0) * k
    return out


def posterize(rgb, step=10):
    """Cuantiza con tramado Bayer para que el degradado se vea pixel-art y no liso."""
    h, w, _ = rgb.shape
    th = np.tile(BAYER, (h // 4 + 1, w // 4 + 1))[:h, :w][..., None]
    return np.clip(np.round(rgb / step + th) * step, 0, 255)


# ---------------------------------------------------------------- lienzo con repetición vertical
class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = np.zeros((h, w, 4))           # RGBA float 0..255

    def put(self, x, y, c, a=255):
        x = int(round(x)); y = int(round(y)) % self.h
        if 0 <= x < self.w:
            if a >= 255:
                self.px[y, x, :3] = c; self.px[y, x, 3] = 255
            else:
                k = a / 255
                self.px[y, x, :3] = self.px[y, x, :3] * (1 - k) + np.array(c) * k
                self.px[y, x, 3] = max(self.px[y, x, 3], a)


def outline_layer(rgba, color=OUTLINE):
    """Añade contorno de 1 px alrededor de lo opaco de una capa RGBA (numpy)."""
    a = rgba[..., 3] > 0
    n = np.zeros_like(a)
    n[1:] |= a[:-1]; n[:-1] |= a[1:]; n[:, 1:] |= a[:, :-1]; n[:, :-1] |= a[:, 1:]
    edge = n & ~a
    out = rgba.copy()
    out[edge, :3] = color; out[edge, 3] = 255
    return out


def stamp(dst, src, ox, oy, wrap_y=True):
    """Pega src (RGBA numpy) en dst con mezcla alfa; envuelve en vertical."""
    sh, sw = src.shape[:2]
    for yy in range(sh):
        ty = oy + yy
        if wrap_y: ty %= dst.shape[0]
        elif not 0 <= ty < dst.shape[0]: continue
        for xx in range(sw):
            a = src[yy, xx, 3]
            if a <= 0: continue
            tx = ox + xx
            if not 0 <= tx < dst.shape[1]: continue
            k = a / 255
            dst[ty, tx, :3] = dst[ty, tx, :3] * (1 - k) + src[yy, xx, :3] * k


def shade(dst, mask, ox, oy, factor):
    """Oscurece dst donde mask (bool) cae, desplazado (sombras)."""
    sh, sw = mask.shape
    for yy in range(sh):
        ty = (oy + yy) % dst.shape[0]
        for xx in range(sw):
            if not mask[yy, xx]: continue
            tx = ox + xx
            if 0 <= tx < dst.shape[1]:
                dst[ty, tx, :3] *= factor


# ---------------------------------------------------------------- palmera vista desde arriba
def make_palm(seed, R=38, fronds=9):
    r = random.Random(seed)
    S = R * 2 + 8
    c = S / 2
    lay = np.zeros((S, S, 4))
    DARK, MID, LIGHT, HI = hexc('1f5a2c'), hexc('2f7f36'), hexc('4fa543'), hexc('86cf55')
    base = r.random() * math.tau
    for k in range(fronds):
        a = base + k * math.tau / fronds + r.uniform(-0.18, 0.18)
        L = R * r.uniform(0.82, 1.0)
        curl = r.choice([-1, 1]) * r.uniform(0.25, 0.6)
        dx, dy = math.cos(a), math.sin(a)
        px_, py_ = -dy, dx
        steps = int(L * 3)
        for i in range(steps):
            t = i / steps * L
            u = t / L
            bend = curl * (u ** 2) * L * 0.5
            cx = c + dx * t + px_ * bend
            cy = c + dy * t + py_ * bend
            hw = 7.0 * math.sin(math.pi * min(1, u * 1.05)) ** 0.75
            if int(t) % 3 == 0: hw -= 1.6                 # foliolos dentados
            hw = max(0.6, hw)
            n = int(hw * 2) + 1
            for j in range(-n, n + 1):
                s = j / 2
                if abs(s) > hw: continue
                x = int(cx + px_ * s); y = int(cy + py_ * s)
                if not (0 <= x < S and 0 <= y < S): continue
                e = abs(s) / hw
                # luz desde arriba-izquierda: el lado que mira a la luz, más claro
                lit = (px_ * s * -0.7 + py_ * s * -0.7) > 0
                col = HI if e < 0.18 else (LIGHT if (e < 0.55 and lit) else (MID if e < 0.8 else DARK))
                if u > 0.85 and e > 0.5: col = DARK
                lay[y, x, :3] = col; lay[y, x, 3] = 255
    # cocos en el centro
    for (ox, oy) in [(-2, -1), (2, -2), (0, 2), (-3, 2)]:
        for yy in range(-2, 2):
            for xx in range(-2, 2):
                if xx * xx + yy * yy <= 3:
                    x, y = int(c + ox + xx), int(c + oy + yy)
                    lay[y, x, :3] = hexc('7a4a1e') if (xx + yy) > -2 else hexc('a8692c'); lay[y, x, 3] = 255
    return outline_layer(lay)


# ---------------------------------------------------------------- sombrilla y toalla (desde arriba)
def make_umbrella(c1, c2, R=13):
    S = R * 2 + 3
    lay = np.zeros((S, S, 4))
    cx = cy = S / 2 - 0.5
    for y in range(S):
        for x in range(S):
            d = math.hypot(x - cx, y - cy)
            if d > R: continue
            ang = (math.atan2(y - cy, x - cx) + math.tau) % math.tau
            seg = int(ang / (math.tau / 8))
            col = hexc(c1) if seg % 2 == 0 else hexc(c2)
            # volumen: más claro arriba-izquierda, más oscuro abajo-derecha
            l = ((cx - x) + (cy - y)) / (2 * R)
            col = np.clip(col * (0.86 + 0.28 * l), 0, 255)
            if d > R - 1.5: col = col * 0.78
            lay[y, x, :3] = col; lay[y, x, 3] = 255
    for (x, y) in [(0, 0), (1, 0), (0, 1), (1, 1)]:
        lay[int(cy) + y, int(cx) + x, :3] = hexc('fff6dc')
    return outline_layer(lay)


def make_towel(cols, w=12, h=26):
    lay = np.zeros((h + 2, w + 2, 4))
    for y in range(h):
        col = hexc(cols[(y // 4) % len(cols)])
        for x in range(w):
            c = col * (0.92 if x in (0, w - 1) else 1.0)
            lay[y + 1, x + 1, :3] = c; lay[y + 1, x + 1, 3] = 255
    # flecos
    for x in range(1, w + 1, 2):
        lay[0, x, :3] = hexc('fff6dc'); lay[0, x, 3] = 255
        lay[h + 1, x, :3] = hexc('fff6dc'); lay[h + 1, x, 3] = 255
    return outline_layer(lay)


# ---------------------------------------------------------------- fondo completo
def make_bg():
    ys, xs = np.mgrid[0:H, 0:W].astype(float)
    # ---- arena
    n_sand = fbm(W, H, (6, 12), 3)
    sand = ramp([(0, hexc('dcb877')), (0.45, hexc('eed394')), (0.75, hexc('f5e0aa')), (1, hexc('fbefc8'))], n_sand)
    grain = np.random.default_rng(5).random((H, W))
    sand[grain > 0.93] *= 0.9
    sand[grain < 0.03] = np.minimum(255, sand[grain < 0.03] * 1.07)
    # arena mojada junto al agua
    dist_shore = np.where(xs < W / 2, BEACH - xs, xs - (W - BEACH - 1))   # >0 en la arena
    wet = np.clip(1 - dist_shore / 8, 0, 1)[..., None]
    sand = sand * (1 - wet * 0.2)

    # ---- profundidad del agua: 0 = orilla, 1 = centro profundo, con zonas más oscuras y bancos de arena
    d_shore = np.minimum(xs - BEACH, W - BEACH - 1 - xs)        # >0 en el agua
    depth = np.clip(d_shore / 96, 0, 1) ** 0.8
    zones = fbm(W, H, (3, 6), 11, 3)
    depth = np.clip(depth * 0.78 + (zones - 0.5) * 0.75 * np.clip(d_shore / 40, 0, 1) + 0.1, 0, 1)
    water = ramp([(0, hexc('7fe0d2')), (0.18, hexc('45c6c6')), (0.42, hexc('22a2b6')),
                  (0.7, hexc('15809e')), (1, hexc('0d5d82'))], depth)

    # ---- fondo marino (arena con ondas + decorado), luego se ve "a través" del agua
    floor = ramp([(0, hexc('cdb27a')), (1, hexc('e8d49e'))], fbm(W, H, (8, 16), 21))
    ripple = np.sin((xs * 0.35 + ys * 0.9 + fbm(W, H, (4, 8), 31) * 18) * 0.9)
    floor[ripple > 0.75] *= 1.08
    floor[ripple < -0.8] *= 0.88
    # la arena del fondo solo modula el agua (ondas claras/oscuras): el agua conserva su turquesa
    lum = floor.mean(axis=2)
    mod = (lum / lum.mean() - 1) * (1 - depth * 0.6)
    sea = water * (1 + mod[..., None] * 1.4)
    # decorado del fondo: visible pero apagado (mezclado con el color del agua según la profundidad)
    deco = Canvas(W, H)
    place_seabed(deco, depth)
    m = deco.px[..., 3] > 0
    k = depth[..., None]
    deco_col = deco.px[..., :3] * (0.62 + 0.38 * (water / 255)) * (1 - k * 0.25) + water * 0.25 * k
    vis = (0.86 - 0.38 * depth)[..., None]
    sea = np.where(m[..., None], sea * (1 - vis) + deco_col * vis, sea)
    # brillo suave: franjas de luz diagonales muy tenues
    band = (np.sin((xs * 0.05 - ys * 0.11) * 1.0) > 0.92) & (depth < 0.85)
    sea[band] = np.minimum(255, sea[band] * 1.05)

    is_water = (xs >= BEACH) & (xs < W - BEACH)
    rgb = np.where(is_water[..., None], sea, sand)
    rgb = posterize(rgb, 8)

    img = np.zeros((H, W, 4)); img[..., :3] = rgb; img[..., 3] = 255
    decorate_beaches(img)
    return Image.fromarray(img.astype(np.uint8), 'RGBA').convert('RGB')


def place_seabed(cv, depth):
    """Corales, rocas, algas y estrellas de mar (apagados: el agua los tapa según la profundidad)."""
    lo, hi = BEACH + 6, W - BEACH - 6

    def blob(cx, cy, r, cols, irregular=0.35, seed=0):
        rr = random.Random(seed)
        ph = [rr.random() * math.tau for _ in range(3)]
        for y in range(int(cy - r - 2), int(cy + r + 3)):
            for x in range(int(cx - r - 2), int(cx + r + 3)):
                a = math.atan2(y - cy, x - cx)
                rad = r * (1 + irregular * 0.33 * (math.sin(3 * a + ph[0]) + math.sin(5 * a + ph[1]) + math.sin(2 * a + ph[2])) / 1.5)
                d = math.hypot(x - cx, y - cy)
                if d > rad: continue
                l = ((cx - x) + (cy - y)) / (2 * r)          # luz arriba-izquierda
                c = cols[0] if l > 0.25 else (cols[1] if l > -0.3 else cols[2])
                if d > rad - 1: c = cols[2]
                cv.put(x, y, c)

    # rocas (grises azuladas)
    for i in range(16):
        x = rng.uniform(lo, hi); y = rng.uniform(0, H)
        r = rng.uniform(5, 12)
        blob(x, y, r, [hexc('7d8f96'), hexc('5d6f78'), hexc('3c4a55')], 0.5, i)
        if rng.random() < 0.6:
            blob(x + r * 0.9, y + r * 0.5, r * 0.55, [hexc('7d8f96'), hexc('5d6f78'), hexc('3c4a55')], 0.4, i + 100)

    # corales ramificados (ocre, naranja apagado, violeta apagado: nada rosa chillón ni verde tortuga)
    coral_cols = [[hexc('d59a62'), hexc('b07445'), hexc('7d4e2e')],
                  [hexc('c98a8a'), hexc('a2615f'), hexc('6e3a3e')],
                  [hexc('9b86b8'), hexc('766190'), hexc('4e3f66')],
                  [hexc('d8c27a'), hexc('b09a52'), hexc('7a6634')]]
    for i in range(40):
        x0 = rng.uniform(lo, hi); y0 = rng.uniform(0, H)
        cols = rng.choice(coral_cols)
        if rng.random() < 0.4:                                   # coral cerebro
            r = rng.uniform(5, 9)
            blob(x0, y0, r, cols, 0.15, 200 + i)
            for k in range(-int(r) + 2, int(r) - 1, 3):
                for t in range(-int(r) + 2, int(r) - 1):
                    if math.hypot(t, k) < r - 2: cv.put(x0 + t, y0 + k + math.sin(t * 0.9) * 0.8, cols[2])
            continue
        for b in range(rng.randint(4, 7)):                        # coral cuerno de ciervo
            ang = rng.uniform(0, math.tau); x, y = x0, y0
            for s in range(rng.randint(6, 13)):
                ang += rng.uniform(-0.6, 0.6)
                x += math.cos(ang); y += math.sin(ang)
                cv.put(x, y, cols[0]); cv.put(x + 1, y, cols[1]); cv.put(x, y + 1, cols[2]); cv.put(x + 1, y + 1, cols[2])
                if s > 3 and rng.random() < 0.18:
                    a2 = ang + rng.choice([-1, 1]) * 0.9; x2, y2 = x, y
                    for _ in range(rng.randint(3, 6)):
                        x2 += math.cos(a2); y2 += math.sin(a2)
                        cv.put(x2, y2, cols[0]); cv.put(x2 + 1, y2, cols[1])

    # algas / hierba marina (líneas finas onduladas, verde azulado)
    for i in range(34):
        x0 = rng.uniform(lo, hi); y0 = rng.uniform(0, H)
        for k in range(rng.randint(3, 6)):
            x = x0 + rng.uniform(-4, 4); ln = rng.randint(7, 14); ph = rng.random() * 6
            for s in range(ln):
                cv.put(x + math.sin(ph + s * 0.5) * 1.5, y0 - s, hexc('3d7a5e') if s < ln - 3 else hexc('5c9a6c'))

    # estrellas de mar en la parte poco profunda (cerca de la orilla)
    for i in range(10):
        side = rng.random() < 0.5
        x0 = rng.uniform(BEACH + 8, BEACH + 34) if side else rng.uniform(W - BEACH - 34, W - BEACH - 8)
        y0 = rng.uniform(0, H)
        for k in range(5):
            a = k * math.tau / 5 + rng.random()
            for s in range(4):
                cv.put(x0 + math.cos(a) * s, y0 + math.sin(a) * s, hexc('e0874a') if s < 3 else hexc('c46a35'))
        cv.put(x0, y0, hexc('f2a865'))


def decorate_beaches(img):
    # conchas y piedrecitas
    for i in range(46):
        left = rng.random() < 0.5
        x = rng.uniform(2, BEACH - 6) if left else rng.uniform(W - BEACH + 6, W - 3)
        y = rng.uniform(0, H)
        kind = rng.random()
        if kind < 0.45:          # concha (abanico)
            c = rng.choice(['fbe7e0', 'f6c9b8', 'fff4dc', 'e8b48f'])
            for (dx, dy, col) in [(0, 0, c), (1, 0, c), (2, 0, c), (0, 1, c), (1, 1, 'c9926e'), (2, 1, c), (1, 2, 'b47f5c'), (-1, 0, 'b47f5c'), (3, 0, 'b47f5c')]:
                put_px(img, x + dx, y + dy, hexc(col))
        elif kind < 0.8:         # piedrecita
            put_px(img, x, y, hexc('a8916a')); put_px(img, x + 1, y, hexc('8e7a58'))
        else:                    # huellas de pies
            for s in range(4):
                put_px(img, x + (s % 2) * 3, y + s * 5, hexc('c9a56c')); put_px(img, x + (s % 2) * 3, y + s * 5 + 1, hexc('c9a56c'))

    # toallas
    towels = [(4, 140, ['ff5d7a', 'fff1f0']), (W - 17, 212, ['3fa7e0', 'ffd23f']),
              (8, 330, ['ffb03b', 'fff1f0', '2e9d4b']), (W - 15, 470, ['b35de0', 'fff1f0']),
              (5, 545, ['3fd1c0', 'ff8a3b'])]
    for (x, y, cols) in towels:
        t = make_towel(cols)
        shade(img, t[..., 3] > 0, x + 2, y + 2, 0.82)
        stamp(img, t, x, y)

    # sombrillas (con sombra)
    umbrellas = [(-6, 96, 'f05a3c', 'fff4dc'), (W - 24, 270, 'ffd23f', '2e9d9d'),
                 (-8, 390, '3b7de0', 'fff4dc'), (W - 22, 535, 'f05a3c', 'ffd23f'),
                 (-4, 690, 'ff7fb0', 'fff4dc'), (W - 20, 20, '3fd1c0', 'fff4dc')]
    for (x, y, c1, c2) in umbrellas:
        u = make_umbrella(c1, c2)
        shade(img, u[..., 3] > 0, x + 6, y + 8, 0.72)
        stamp(img, u, x, y)

    # palmeras grandes (con sombra proyectada sobre arena y agua)
    palms = [(-34, -10, 1), (W - 50, 110, 2), (-36, 210, 3), (W - 48, 350, 4),
             (-32, 450, 5), (W - 52, 600, 6), (-40, 590, 7)]
    for (x, y, seed) in palms:
        p = make_palm(seed)
        shade(img, p[..., 3] > 0, x + 9, y + 11, 0.66)
    for (x, y, seed) in palms:
        stamp(img, make_palm(seed), x, y)


def put_px(img, x, y, c):
    x = int(round(x)); y = int(round(y)) % img.shape[0]
    if 0 <= x < img.shape[1]:
        img[y, x, :3] = c


# ---------------------------------------------------------------- cáusticas animables
def make_caustics(S=96, n=26):
    r = np.random.default_rng(7)
    pts = r.random((n, 2)) * S
    ys, xs = np.mgrid[0:S, 0:S].astype(float)
    d = []
    for (px, py) in pts:
        dx = np.abs(xs - px); dx = np.minimum(dx, S - dx)
        dy = np.abs(ys - py); dy = np.minimum(dy, S - dy)
        d.append(np.hypot(dx, dy))
    d = np.sort(np.stack(d), axis=0)
    edge = d[1] - d[0]
    # líneas finas que se cortan aquí y allá (no una red de celdas perfecta)
    brk = periodic_noise(S, S, 6, 6, 9)
    a = np.zeros((S, S))
    a[edge < 2.2] = 45
    a[(edge < 1.0) & (brk > 0.3)] = 150
    a[brk < 0.18] *= 0.3
    img = np.zeros((S, S, 4)); img[..., :3] = 255; img[..., 3] = a
    return Image.fromarray(img.astype(np.uint8), 'RGBA')


# ---------------------------------------------------------------- espuma de la orilla
def make_foam(Wf=22, Hf=96):
    """Borde izquierdo = arena. Lenguas de espuma de distinto ancho, con burbujas y agua muy clara."""
    img = np.zeros((Hf, Wf, 4))
    holes = np.random.default_rng(4).random((Hf, Wf))
    T = math.tau
    for y in range(Hf):
        u = y / Hf
        w = 4.5 + 4.5 * (0.5 + 0.5 * math.sin(u * T * 2 + 0.4)) + 1.6 * math.sin(u * T * 5 + 1.1) + 0.7 * math.sin(u * T * 11)
        for x in range(Wf):
            if x < w - 1.2:
                hole = holes[y, x] > 0.86 and x > 1
                img[y, x] = (214, 248, 250, 200) if hole else (255, 255, 255, 255)
            elif x < w:
                img[y, x] = (205, 246, 248, 235)
            elif x < w + 4:
                img[y, x] = (175, 240, 238, 90 - (x - w) * 18)
        # segunda línea de espuma, entrecortada
        x2 = int(w + 6 + 2 * math.sin(u * T * 3 + 2))
        if math.sin(u * T * 7) > -0.35 and x2 < Wf:
            img[y, x2] = (240, 255, 255, 230)
            if x2 + 1 < Wf: img[y, x2 + 1] = (200, 248, 250, 110)
    return Image.fromarray(img.astype(np.uint8), 'RGBA')


# ---------------------------------------------------------------- medusa (obstáculo: rosa vivo con contorno)
def make_jelly(frame):
    Wj, Hj = 24, 30
    lay = np.zeros((Hj, Wj, 4))
    BELL, HI, SH, DEEP = hexc('f07ad8'), hexc('ffc6f4'), hexc('c04ab0'), hexc('8e2c86')
    cx, cy = 11.5, 10
    for y in range(2, 15):
        for x in range(1, 23):
            dx = (x - cx) / 10.5; dy = (y - cy) / 8.5
            if y <= cy and dx * dx + dy * dy > 1: continue
            if y > cy and (abs(dx) > 1 or y > 13): continue
            l = (-(x - cx) * 0.6 - (y - cy)) / 10
            c = HI if l > 0.55 else (BELL if l > -0.2 else SH)
            if y >= 12: c = DEEP
            lay[y, x, :3] = c; lay[y, x, 3] = 255
    for (x, y) in [(6, 5), (7, 5), (6, 6), (9, 4), (10, 4)]:
        lay[y, x, :3] = hexc('ffffff')
    # brazos orales (centro) y tentáculos (bordes)
    for i, x0 in enumerate([4, 8, 12, 16, 19]):
        ln = 13 if i in (1, 3) else 11
        for s in range(ln):
            x = x0 + int(round(math.sin(s * 0.7 + i + frame * math.pi) * 1.2))
            y = 14 + s
            if y >= Hj - 1: break
            c = SH if i in (1, 3) else BELL
            lay[y, x, :3] = c; lay[y, x, 3] = 255
            if i in (1, 3):
                lay[y, x + 1, :3] = DEEP; lay[y, x + 1, 3] = 255
    return Image.fromarray(outline_layer(lay).astype(np.uint8), 'RGBA')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    make_bg().save(os.path.join(OUT, 'bg_sea.png'), optimize=True)
    make_caustics().save(os.path.join(OUT, 'caustics.png'), optimize=True)
    make_foam().save(os.path.join(OUT, 'foam.png'), optimize=True)
    make_jelly(0).save(os.path.join(OUT, 'jelly1.png'), optimize=True)
    make_jelly(1).save(os.path.join(OUT, 'jelly2.png'), optimize=True)
    print('Arte de Bali generado en', os.path.normpath(OUT))
