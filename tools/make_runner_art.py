"""
Genera el decorado pixel-art de "Carrera por la ría 6 km" (assets/runner/). Todas las capas se
repiten en horizontal SIN costura (todo se dibuja con x módulo el ancho) y van a escala 1:1
(1 px de arte = 1 px lógico). El decorado va algo más apagado (bruma, contorno suave) que lo
jugable (Ane, metros, fosteritos, agua, txakoli) y que los monumentos, para que eso se lea al instante.
  - bg_hills_far.png 720x260  montes lejanos (Pagasarri/Ganekogorta) azulados, con bruma abajo
  - bg_hills.png     640x170  montes de Artxanda: prados, bosque en la cresta, caseríos y almiares
  - bg_city.png      768x136  orilla de enfrente: edificios bilbaínos con miradores, tejados,
                              árboles del paseo y muelle de piedra con su barandilla
  - water.png        256x168  ría: reflejos de la orilla, degradado, ondas y destellos
  - path.png         64x76    paseo: bordillo de granito del muelle, baldosa de Bilbao y bordillo
  - rail.png         32x28    barandilla verde clásica de la ría (con pomo en cada poste)
  - garden.png       320x128  jardín: césped, parterres con flores, banco, farola y setos
  - finish.png       24x44    línea de meta (cuadros)
Uso: python tools/make_runner_art.py   (desde la raíz del proyecto)
"""
import math
import os
import random

import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'runner')
OUTLINE = (27, 20, 48)            # #1b1430, contorno de lo jugable
SOFT = (62, 52, 84)               # contorno suave del decorado
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], dtype=float) / 16 - 0.5


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def shade(c, f):
    """f>0 aclara (hacia blanco cálido), f<0 oscurece (hacia violeta oscuro)."""
    return mix(c, (255, 246, 226), f) if f >= 0 else mix(c, (40, 30, 60), -f)


def periodic_noise(w, h, cx, cy, seed):
    """Ruido de valor suave y periódico (se repite sin costuras en x e y)."""
    r = np.random.default_rng(seed)
    grid = r.random((cy, cx))
    ys = np.arange(h) / h * cy
    xs = np.arange(w) / w * cx
    y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int)
    fy = ys - y0; fx = xs - x0
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    y1 = (y0 + 1) % cy; x1 = (x0 + 1) % cx
    y0 %= cy; x0 %= cx
    a = grid[y0][:, x0]; b = grid[y0][:, x1]; c = grid[y1][:, x0]; d = grid[y1][:, x1]
    top = a + (b - a) * fx[None, :]
    bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]


def fbm(w, h, base, seed, octaves=3):
    tot = np.zeros((h, w)); amp = 1; norm = 0
    for o in range(octaves):
        tot += amp * periodic_noise(w, h, base[0] * 2 ** o, max(1, base[1] * 2 ** o), seed + o)
        norm += amp; amp *= 0.5
    return tot / norm


def noise1d(w, cells, seed, octaves=3):
    """Ruido 1D periódico en [-0.5, 0.5]."""
    return fbm(w, 1, (cells, 1), seed, octaves)[0] - 0.5


class Canvas:
    """Lienzo RGBA con dibujo envolvente en x (para que el bucle horizontal no tenga costura)."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.a = np.zeros((h, w, 4), dtype=np.uint8)

    def put(self, x, y, c, alpha=255):
        if 0 <= y < self.h:
            x %= self.w
            if alpha >= 255 or self.a[y, x, 3] == 0:
                self.a[y, x, :3] = c[:3]; self.a[y, x, 3] = max(alpha, self.a[y, x, 3])
            else:
                t = alpha / 255
                self.a[y, x, :3] = [int(self.a[y, x, i] * (1 - t) + c[i] * t) for i in range(3)]

    def get(self, x, y):
        return tuple(int(v) for v in self.a[y, x % self.w, :3])

    def opaque(self, x, y):
        return 0 <= y < self.h and self.a[y, x % self.w, 3] > 0

    def rect(self, x, y, w, h, c, alpha=255):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.put(xx, yy, c, alpha)

    def hline(self, x, y, w, c, alpha=255):
        self.rect(x, y, w, 1, c, alpha)

    def vline(self, x, y, h, c, alpha=255):
        self.rect(x, y, 1, h, c, alpha)

    def disc(self, cx, cy, r, c):
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                if xx * xx + yy * yy <= r * r + r * 0.6:
                    self.put(cx + xx, cy + yy, c)

    def stamp(self, spr, ox, oy):
        """Pega otro Canvas (con alfa) en (ox, oy), envolviendo en x."""
        for y in range(spr.h):
            for x in range(spr.w):
                if spr.a[y, x, 3]:
                    self.put(ox + x, oy + y, tuple(spr.a[y, x, :3]), int(spr.a[y, x, 3]))

    def image(self):
        return Image.fromarray(self.a, 'RGBA')


def outline_sprite(spr, color):
    """Añade contorno de 1 px alrededor de lo opaco (el sprite debe tener margen de 1 px)."""
    al = spr.a[:, :, 3] > 0
    ring = np.zeros_like(al)
    ring[1:, :] |= al[:-1, :]; ring[:-1, :] |= al[1:, :]
    ring[:, 1:] |= al[:, :-1]; ring[:, :-1] |= al[:, 1:]
    ring &= ~al
    spr.a[ring, :3] = color; spr.a[ring, 3] = 255
    return spr


def haze(cv, color, t):
    """Mezcla todo lo opaco hacia el color de la bruma (aleja la capa)."""
    m = cv.a[:, :, 3] > 0
    rgb = cv.a[:, :, :3].astype(float)
    rgb[m] = rgb[m] * (1 - t) + np.array(color, dtype=float) * t
    cv.a[:, :, :3] = np.clip(np.round(rgb), 0, 255).astype(np.uint8)


def dpick(ramp, t, x, y, spread=1.0):
    """Elige un color de la rampa con tramado Bayer (degradados con sabor pixel-art)."""
    n = len(ramp) - 1
    v = t * n + BAYER[y % 4, x % 4] * spread
    return ramp[int(min(n, max(0, math.floor(v + 0.5))))]


# ---------------------------------------------------------------- montes lejanos
def make_far():
    W, H = 720, 260
    cv = Canvas(W, H)
    xs = np.arange(W)
    tau = 2 * math.pi
    back = 36 + 20 * np.sin(tau * xs / W * 2 + 0.5) + 11 * np.sin(tau * xs / W * 5 + 1.3) + 12 * noise1d(W, 24, 11)
    front = 92 + 22 * np.sin(tau * xs / W * 3 + 2.0) + 9 * np.sin(tau * xs / W * 7) + 10 * noise1d(W, 36, 12)
    back, front = np.round(back).astype(int), np.round(front).astype(int)
    mist = hexc('#c9dbe2')
    ramp_b = [hexc('#a3bacd'), hexc('#adc3d4'), hexc('#b8cbda'), hexc('#c2d4df'), mist]
    ramp_f = [hexc('#7598a0'), hexc('#80a2a8'), hexc('#8cacb0'), hexc('#9ab7ba'), hexc('#aac3c8'), hexc('#b9cfd5'), mist]
    tex = fbm(W, H, (60, 22), 21, 3)

    def slope(r, x, k=10):
        return (r[(x + k) % W] - r[x - k]) / (2 * k)     # >0: ladera que mira a la derecha (sombra)
    for x in range(W):
        sb = slope(back, x)
        for y in range(back[x], H):
            d = y - back[x]
            t = 0.12 + d / 70 + sb * 0.5 * math.exp(-d / 30)
            cv.put(x, y, dpick(ramp_b, max(0, min(1, t)), x, y))
        if sb < 0:
            cv.put(x, back[x], hexc('#cfdde8'))
        sf = slope(front, x)
        for y in range(front[x], H):
            d = y - front[x]
            t = 0.05 + d / 105 + sf * 0.7 * math.exp(-d / 40) + (tex[y, x] - 0.5) * 0.3
            cv.put(x, y, dpick(ramp_f, max(0, min(1, t)), x, y))
        if sf < 0.05:                                     # cresta iluminada por el sol (izquierda)
            cv.put(x, front[x], hexc('#a6c1bd'))
    # arbolado en la cresta: puntitos más oscuros, muy suaves
    rng = random.Random(5)
    for _ in range(700):
        x = rng.randrange(W)
        y = front[x] + 1 + int(abs(rng.gauss(0, 5)))
        if y < H:
            cv.put(x, y, hexc('#7699a0'))
    # antenas del Pagasarri en la cima más alta
    xm = int(np.argmin(front))
    for i, dx in enumerate((0, 5)):
        hh = 11 - i * 3
        cv.vline(xm + dx, front[xm + dx] - hh, hh, hexc('#8d9fa8'))
        cv.put(xm + dx, front[xm + dx] - hh, hexc('#c98a7c'))
    return cv


# ---------------------------------------------------------------- montes cercanos (Artxanda)
def make_caserio(rng):
    """Caserío vasco: fachada ancha bajo tejado a dos aguas poco inclinado, balcón de madera."""
    w, h = 19, 14
    s = Canvas(w, h)
    wall, wall_d = hexc('#efe6d2'), hexc('#d3c6ad')
    roof, roof_l, roof_d = hexc('#b45a40'), hexc('#cf7656'), hexc('#8c3f30')
    # tejado (filas 1-4): trapecio con cumbrera centrada
    for r, (x0, x1) in enumerate([(7, 11), (5, 13), (3, 15), (1, 17)]):
        for x in range(x0, x1 + 1):
            c = roof_l if x < 9 else roof
            if r == 3: c = roof_d
            s.put(x, 1 + r, c)
    # muros (filas 5-12)
    for y in range(5, 13):
        for x in range(2, 17):
            s.put(x, y, wall if x < 13 else wall_d)
    s.hline(2, 5, 15, hexc('#c7b89c'))                   # sombra del alero
    s.hline(4, 7, 11, hexc('#8a5a3a'))                   # balcón de madera
    for x in (5, 8, 11, 14):
        s.put(x, 6, hexc('#5a4048'))                     # ventanitas
    s.rect(8, 9, 3, 4, hexc('#6b4a3a'))                  # portalón
    s.put(8, 9, hexc('#8a6a50'))
    for x in (4, 14):
        s.rect(x, 10, 1, 2, hexc('#5a4048'))
    return outline_sprite(s, hexc('#5b4a52'))


def make_tree(r, rng, base=('#3f7a4c', '#2f6342', '#5f9a5c', '#7fb36c')):
    mid, dark, light, hl = (hexc(c) for c in base)
    s = Canvas(2 * r + 3, 2 * r + 5)
    cx, cy = r + 1, r + 1
    s.vline(cx, cy + r - 1, 3, hexc('#5a4632'))
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            if x * x + y * y <= r * r + rng.random() * r * 0.8:
                d = (x + 1) * 0.5 + (y + 1)              # luz desde arriba a la izquierda
                c = light if d < -r * 0.6 else (mid if d < r * 0.5 else dark)
                if d < -r * 1.1 and rng.random() < 0.6: c = hl
                s.put(cx + x, cy + y, c)
    return s


def make_hills():
    W, H = 640, 170
    cv = Canvas(W, H)
    xs = np.arange(W)
    tau = 2 * math.pi
    ridge = 34 + 16 * np.sin(tau * xs / W * 2 + 0.3) + 9 * np.sin(tau * xs / W * 5 + 2) + 8 * noise1d(W, 32, 31)
    ridge = np.round(ridge).astype(int)
    ramp = [hexc('#2a5a44'), hexc('#356b4c'), hexc('#457d52'), hexc('#58905a'), hexc('#6ea263'), hexc('#88b671'), hexc('#a0c47c')]
    rng = random.Random(7)
    # mosaico de prados y bosquetes (Voronoi periódico en x, celdas más anchas que altas)
    N = 46
    sx = np.array([rng.uniform(0, W) for _ in range(N)])
    sy = np.array([rng.uniform(0, H) for _ in range(N)])
    kind = [rng.choices(['prado', 'prado2', 'bosque', 'helecho'], (5, 4, 3, 1))[0] for _ in range(N)]
    base_t = {'prado': 0.72, 'prado2': 0.56, 'bosque': 0.2, 'helecho': 0.62}
    X, Y = np.meshgrid(np.arange(W), np.arange(H))
    dx = np.abs(X[..., None] - sx[None, None, :]); dx = np.minimum(dx, W - dx)
    dist = dx ** 2 + ((Y[..., None] - sy[None, None, :]) * 2.2) ** 2
    cell = np.argmin(dist, axis=2)
    tex = fbm(W, H, (64, 18), 43, 2)
    bump = fbm(W, H, (160, 42), 47, 1)
    for x in range(W):
        sl = (ridge[(x + 8) % W] - ridge[x - 8]) / 16
        for y in range(ridge[x], H):
            d = y - ridge[x]
            k = kind[cell[y, x]]
            t = base_t[k] - sl * 0.6 * math.exp(-d / 45) + (tex[y, x] - 0.5) * 0.25
            if d < 12: t = min(t, 0.25 + d * 0.02)        # bosque en la cresta
            if k == 'bosque' or d < 12:                   # copas: grumos claros/oscuros
                t += (bump[y, x] - 0.5) * 0.7
            c = dpick(ramp, max(0, min(1, t)), x, y, 0.8)
            if k == 'helecho' and d >= 12:
                c = mix(c, hexc('#b7a560'), 0.35)          # helechal ya dorado
            # setos entre parcelas
            if d >= 12 and (cell[y, x] != cell[y, (x + 1) % W] or cell[y, x] != cell[min(H - 1, y + 1), x]):
                c = ramp[1] if (x + y) % 5 else ramp[2]
            cv.put(x, y, c)
    # bosque en la cresta: copas que rompen la silueta
    x = 0
    while x < W:
        r = rng.choice((3, 3, 4, 4, 5))
        t = make_tree(r, rng, ('#356d48', '#285a3e', '#4f8a55', '#6aa262'))
        cv.stamp(t, x - r - 1, ridge[x % W] - r + rng.randint(-1, 2))
        x += rng.randint(r, 2 * r)
    # árboles sueltos en los setos de los prados
    for _ in range(60):
        x = rng.randrange(W)
        y = ridge[x] + rng.randint(16, 100)
        if y < H and cell[y, x] != cell[y, (x + 2) % W]:
            r = rng.choice((2, 2, 3))
            cv.stamp(make_tree(r, rng), x - r - 1, y - r - 1)
    # caseríos con su almiar, a distintas alturas (en prados)
    for i in range(8):
        for _ in range(30):
            x = int((i + 0.15 + rng.random() * 0.7) * W / 8)
            y = ridge[x] + rng.randint(24, 66)
            if kind[cell[min(H - 1, y), x]].startswith('prado'):
                break
        cv.stamp(make_caserio(rng), x - 9, y - 13)
        if rng.random() < 0.6:                            # almiar (montón de hierba seca con palo)
            ax = x + rng.choice((-15, 13))
            cv.vline(ax, y - 9, 3, hexc('#5a4632'))
            for r, w in enumerate((1, 3, 3, 5, 5)):
                cv.hline(ax - w // 2, y - 6 + r, w, hexc('#c9a957') if r < 3 else hexc('#a98a45'))
    haze(cv, (184, 208, 214), 0.16)
    return cv


# ---------------------------------------------------------------- ciudad (orilla de enfrente)
FACADES = ['#e8d4b0', '#dba67e', '#c98a6c', '#e5c271', '#aec3b0', '#b9cad8', '#efe8dc', '#d0a19c', '#b67d5d', '#e3b98d']
GLASS, GLASS_L, GLASS_D = hexc('#93acc0'), hexc('#d6e6ee'), hexc('#4d5b74')
FRAME = hexc('#f4efe6')
LIT = hexc('#f6d88e')
IRON = hexc('#3e3552')


def draw_window(cv, x, y, w, h, rng, balcony=False):
    lit = rng.random() < 0.10
    cv.rect(x - 1, y - 1, w + 2, h + 2, FRAME)
    cv.rect(x, y, w, h, LIT if lit else GLASS_D)
    if not lit:
        cv.put(x, y, hexc('#8ea3bb'))
        if h > 3: cv.put(x, y + 1, hexc('#6d7f98'))
    if balcony:
        cv.hline(x - 2, y + h - 2, w + 4, IRON)
        for xx in range(x - 2, x + w + 2, 2):
            cv.vline(xx, y + h - 1, 2, IRON)
        cv.hline(x - 2, y + h + 1, w + 4, shade(IRON, 0.3))


def draw_mirador(cv, x, y0, w, floors, fh, wallc):
    """Mirador acristalado: cuerpo blanco que sobresale, con cristales que brillan."""
    top, bot = y0, y0 + floors * fh
    cv.rect(x, top - 1, w, bot - top + 2, FRAME)
    cv.vline(x + w, top, bot - top + 1, shade(wallc, -0.35))     # sombra del vuelo (luz por la izquierda)
    for f in range(floors):
        yy = top + f * fh + 2
        for px in range(x + 1, x + w - 1, 3):
            pw = min(2, x + w - 1 - px)
            cv.rect(px, yy, pw, fh - 5, GLASS)
            cv.put(px, yy, GLASS_L)                               # destello en diagonal
            if fh - 5 > 3: cv.put(px + pw - 1, yy + 1, GLASS_L)
        cv.hline(x, top + f * fh + fh - 2, w, shade(FRAME, -0.12))
    cv.hline(x - 1, top - 2, w + 2, shade(FRAME, -0.18))        # tejadillo
    cv.rect(x + 1, bot + 1, w - 2, 1, shade(wallc, -0.3))       # ménsula


def make_building(rng, w, kind):
    """Devuelve un Canvas (w+2 de ancho para el contorno) con un edificio apoyado en su base."""
    H = 128
    s = Canvas(w + 2, H)
    wallc = hexc(rng.choice(FACADES))
    fh = 13
    if kind == 'casco':
        floors = rng.randint(3, 5); fh = 12
    elif kind == 'moderno':
        floors = rng.randint(7, 8); fh = 12
    else:
        floors = rng.randint(4, 7)
    ground = 14
    body = ground + floors * fh + 3
    roof_h = 0 if kind == 'moderno' else rng.randint(6, 9)
    top = H - body
    x0, x1 = 1, w + 1
    # fachada con textura suave y luz por la izquierda
    for y in range(top, H):
        for x in range(x0, x1):
            c = wallc
            if x == x0: c = shade(wallc, 0.22)
            elif x >= x1 - 2: c = shade(wallc, -0.18)
            elif (x * 7 + y * 3) % 11 == 0: c = shade(wallc, -0.05)
            s.put(x, y, c)
    # planta baja: comercios con arcos o lonjas, toldos de colores
    gb = H - ground
    s.rect(x0, gb, w, ground, shade(wallc, -0.28))
    s.hline(x0, gb, w, shade(wallc, 0.15))
    px = x0 + 3
    while px + 7 < x1 - 1:
        sw = min(rng.choice((7, 8, 9)), x1 - 2 - px)
        s.rect(px, gb + 4, sw, ground - 4, hexc('#3f3a54'))
        s.rect(px + 1, gb + 5, sw - 2, ground - 8, hexc('#6f7f95'))
        s.put(px + 1, gb + 5, hexc('#a9bccc'))
        if rng.random() < 0.45:
            aw = rng.choice(['#c8553d', '#2f6f6a', '#d9a53f', '#3f5f9a'])
            for xx in range(px - 1, px + sw + 1):
                s.put(xx, gb + 3, hexc(aw) if (xx - px) % 2 == 0 else hexc('#f1e9da'))
                s.put(xx, gb + 4, shade(hexc(aw), -0.25))
        px += sw + 3
    # cornisas entre plantas y cornisa superior
    s.rect(x0, top, w, 3, shade(wallc, 0.28))
    s.hline(x0, top + 3, w, shade(wallc, -0.35))
    # columnas de huecos
    cols = max(2, (w - 4) // 9)
    step = (w - 4) / cols
    mir_cols = set()
    if kind == 'ensanche':
        if rng.random() < 0.75: mir_cols |= {0, cols - 1} if cols >= 3 else {0}
        if rng.random() < 0.3: mir_cols = set(range(cols))
    for f in range(floors):
        fy = top + 4 + f * fh
        if f < floors and kind != 'moderno':
            s.hline(x0, fy + fh - 1, w, shade(wallc, -0.08))
        for ci in range(cols):
            cx = int(x0 + 2 + ci * step + step / 2)
            if ci in mir_cols:
                continue
            if kind == 'moderno':
                draw_window(s, cx - 2, fy + 3, 4, 5, rng)
            else:
                draw_window(s, cx - 1, fy + 3, 3, fh - 6, rng, balcony=(f == 0 or rng.random() < 0.35))
    for ci in mir_cols:
        cx = int(x0 + 2 + ci * step + step / 2)
        mw = 7 if step >= 9 else 5
        draw_mirador(s, cx - mw // 2, top + 4 + fh, mw, floors - 1, fh, wallc)
    if kind == 'casco':                                   # balcones de madera corridos
        for f in range(1, floors):
            s.hline(x0 + 1, top + 4 + f * fh + fh - 3, w - 2, hexc('#6a4a3a'))
    if kind == 'moderno':                                 # bandas horizontales de hormigón
        for f in range(floors):
            s.hline(x0, top + 4 + f * fh + fh - 2, w, shade(wallc, 0.18))
    # tejado
    if roof_h:
        rc = hexc(rng.choice(['#5d566b', '#6b5f72', '#a8573f', '#9a4c3a']))
        for r in range(roof_h):
            inset = (roof_h - r) * 1 if kind == 'casco' else (roof_h - r) // 2 + 1
            for x in range(x0 + inset, x1 - inset):
                c = shade(rc, 0.18) if x < x0 + w * 0.45 else rc
                if r % 3 == 2: c = shade(c, -0.12)
                s.put(x, top - roof_h + r, c)
        # buhardillas y chimeneas
        if w > 30:
            for dx in (w // 3, 2 * w // 3):
                s.rect(x0 + dx - 2, top - 5, 5, 5, FRAME)
                s.rect(x0 + dx - 1, top - 4, 3, 3, GLASS_D)
                s.put(x0 + dx - 1, top - 4, GLASS)
        for _ in range(rng.randint(1, 2)):
            cx = x0 + rng.randint(4, max(5, w - 6))
            s.rect(cx, top - roof_h - 3, 3, 4 + rng.randint(0, 2), hexc('#a25a44'))
            s.hline(cx - 1, top - roof_h - 3, 5, hexc('#7a4434'))
    else:
        s.rect(x0, top - 2, w, 2, shade(wallc, -0.2))
        if rng.random() < 0.6:
            s.rect(x0 + w // 2 - 4, top - 6, 8, 4, shade(wallc, -0.1))
    return outline_sprite(s, SOFT)


def make_city():
    W, H = 768, 136
    QUAY = 8
    cv = Canvas(W, H)
    rng = random.Random(1937)
    widths, kinds = [], []
    total = 0
    while total < W:
        k = rng.choices(['ensanche', 'casco', 'moderno'], (7, 2, 1))[0]
        w = rng.randint(20, 27) if k == 'casco' else rng.randint(32, 50)
        widths.append(w); kinds.append(k); total += w
    widths[-1] -= total - W
    if widths[-1] < 18:                                   # que el último no quede raquítico
        widths[-2] += widths[-1]; widths.pop(); kinds.pop()
    x, first = 0, None
    for w, k in zip(widths, kinds):
        b = make_building(rng, w, k)
        first = first or b
        cv.stamp(b, x - 1, H - QUAY - 128)
        x += w
    cv.stamp(first, -1, H - QUAY - 128)                  # repite el primero: contorno correcto en la costura
    # árboles del paseo de enfrente (tapan un poco los bajos: profundidad)
    x = rng.randint(10, 30)
    while x < W:
        for j in range(rng.randint(2, 4)):
            r = rng.choice((5, 6, 7))
            t = make_tree(r, rng, ('#4c8a52', '#386f45', '#6aa661', '#8cc078'))
            cv.stamp(t, x + j * 13 - r - 1, H - QUAY - 2 * r - 9)
        x += rng.randint(110, 170)
    # muelle de piedra con barandilla
    qy = H - QUAY
    stone, stone_l, stone_d = hexc('#a69c8a'), hexc('#c9bfaa'), hexc('#7d7466')
    for y in range(qy, H):
        for xx in range(W):
            c = stone
            row = (y - qy - 1) // 3
            if y == qy: c = stone_l
            elif (y - qy) % 3 == 0: c = stone_d
            elif (xx + row * 6) % 12 == 0: c = stone_d
            if y >= H - 2: c = hexc('#5c5f5c') if (xx * 5 + y) % 7 else hexc('#5f7a5a')
            cv.put(xx, y, c)
    for xx in range(W):
        cv.put(xx, qy - 3, hexc('#3f6b52'))
        if xx % 4 == 0:
            cv.vline(xx, qy - 2, 2, hexc('#3f6b52'))
    haze(cv, (206, 223, 232), 0.13)
    return cv


# ---------------------------------------------------------------- agua de la ría
def make_water():
    W, H = 256, 168
    cv = Canvas(W, H)
    ramp = [hexc('#5d99a1'), hexc('#518d96'), hexc('#47818b'), hexc('#3e7680'), hexc('#366b76'), hexc('#30616d')]
    rng = random.Random(3)
    # reflejo de la orilla de enfrente: franjas verticales de colores apagados, rotas por las ondas
    refl = []
    while len(refl) < W:
        c = mix(hexc(rng.choice(FACADES)), hexc('#40808a'), 0.55)
        refl += [c] * rng.randint(14, 34)
    refl = refl[:W]
    brk = fbm(W, 32, (32, 16), 5, 2)                      # celdas alargadas: ondas horizontales
    wob = fbm(W, 32, (16, 8), 6, 1)
    for y in range(H):
        for x in range(W):
            t = min(1, max(0, (y - 16) / 95))
            c = dpick(ramp, t, x, y)
            if y < 24 and brk[y, x] > 0.32 + y / 34:
                rx = int(x + (wob[y, x] - 0.5) * 8)
                c = mix(c, refl[rx % W], 0.75 * (1 - y / 26))
            if y < 3:
                c = mix(c, hexc('#2c4c56'), 0.55 - y * 0.15)  # sombra al pie del muelle
            cv.put(x, y, c)
    # ondas: cresta clara + valle oscuro; más largas y separadas cuanto más cerca
    for _ in range(190):
        y = int(5 + (rng.random() ** 0.85) * (H - 9))
        L = 2 + int(y / 13) + rng.randint(0, 3)
        x = rng.randrange(W)
        base = cv.get(x, y)
        cv.hline(x, y, L, shade(base, 0.26 if y < 60 else 0.18))
        cv.hline(x + 1, y + 1, max(1, L - 2), shade(base, -0.15))
    # destellos del sol: rayitas horizontales con el centro blanco
    for _ in range(6):
        x, y = rng.randrange(W), rng.randint(14, 80)
        L = rng.choice((3, 5))
        cv.hline(x - L // 2, y, L, hexc('#cdeef2'))
        cv.put(x, y, hexc('#ffffff'))
    for _ in range(10):
        cv.put(rng.randrange(W), rng.randint(10, 100), hexc('#d9f2f5'))
    return cv


# ---------------------------------------------------------------- paseo con baldosa de Bilbao
def make_path():
    W, H = 64, 76
    cv = Canvas(W, H)
    # bordillo de granito del muelle (filas 0-7)
    gr, gr_l, gr_d = hexc('#bdb5a6'), hexc('#d8d0c0'), hexc('#8f877b')
    for y in range(0, 8):
        for x in range(W):
            c = gr_l if y < 2 else (gr if y < 6 else gr_d)
            if x % 32 == 0 and y >= 2: c = gr_d
            if y in (2, 3) and (x * 3) % 7 == 0: c = shade(gr, 0.1)
            cv.put(x, y, c)
    cv.hline(0, 7, W, hexc('#7c7468'))
    # baldosas (filas 8-67): baldosa gris de Bilbao con su flor en relieve suave, 32x12 (algo escorzadas)
    base, lt, dk, jt = hexc('#c3bcb0'), hexc('#d2ccc1'), hexc('#b0a99d'), hexc('#a29b90')
    for y in range(8, 68):
        for x in range(W):
            ty, tx = (y - 8) % 12, x % 32
            c = base
            if ty == 0 or tx == 0: c = jt
            elif ty == 1 or tx == 1: c = lt
            else:
                dx, dy = (tx - 16.5) / 2, (ty - 6.5)
                for px_, py_ in ((0, -2.6), (0, 2.6), (-2.6, 0), (2.6, 0)):   # cuatro pétalos
                    d2 = (dx - px_) ** 2 + (dy - py_) ** 2
                    if 1.2 < d2 < 3.4:
                        c = lt if (dx - px_) + (dy - py_) < 0 else dk
                if dx * dx + dy * dy < 0.8: c = dk
            cv.put(x, y, c)
    # sombra de la barandilla sobre las primeras filas
    for y in range(8, 12):
        for x in range(W):
            if y < 10 or (x + y) % 4 == 0:
                cv.put(x, y, shade(cv.get(x, y), -0.14))
    # desgaste suave
    rng = random.Random(9)
    for _ in range(40):
        x, y = rng.randrange(W), rng.randint(12, 66)
        cv.put(x, y, shade(cv.get(x, y), rng.choice((-0.07, 0.06))))
    # bordillo hacia el jardín (filas 68-75)
    for y in range(68, H):
        for x in range(W):
            c = gr_l if y == 68 else (gr if y < 73 else gr_d)
            if x % 32 == 16 and y > 68: c = gr_d
            cv.put(x, y, c)
    cv.hline(0, H - 1, W, hexc('#6f685e'))
    return cv


# ---------------------------------------------------------------- barandilla verde de la ría
def make_rail():
    W, H = 32, 28
    cv = Canvas(W, H)
    dk, md, lt, hl = hexc('#1d3f31'), hexc('#2d6347'), hexc('#4a8a62'), hexc('#7fb98c')
    # barrotes (cada 4 px) y anillos del friso
    for x in range(5, W, 4):
        cv.vline(x, 5, 19, md)
        cv.vline(x, 18, 6, dk)
    for x in range(7, W - 1, 4):
        cv.put(x - 1, 7, md); cv.put(x + 1, 7, md); cv.put(x, 6, lt); cv.put(x, 8, dk)
    cv.hline(3, 10, W - 3, md)                            # travesaño bajo el friso
    # pasamanos
    cv.hline(0, 2, W, hl); cv.hline(0, 3, W, lt); cv.hline(0, 4, W, dk)
    # travesaño inferior y zócalo
    cv.hline(0, 23, W, lt); cv.hline(0, 24, W, dk)
    # poste con pomo
    cv.rect(0, 1, 4, 26, md)
    cv.vline(0, 1, 26, lt); cv.vline(3, 1, 26, dk)
    cv.rect(0, 0, 4, 1, lt); cv.put(1, 0, hl)
    cv.hline(0, 26, 4, dk); cv.hline(0, 27, 4, hexc('#2a2a2e'))
    cv.put(1, 12, hl); cv.put(1, 13, hl)
    return cv


# ---------------------------------------------------------------- jardín
def make_bush(rng, rx, ry):
    s = Canvas(2 * rx + 3, 2 * ry + 3)
    cols = [hexc('#2c5e33'), hexc('#3b7639'), hexc('#4f8d45'), hexc('#6aa652')]
    for y in range(-ry, ry + 1):
        for x in range(-rx, rx + 1):
            if (x / rx) ** 2 + (y / ry) ** 2 <= 1 + rng.random() * 0.15:
                d = (x / rx) * 0.6 + (y / ry) + (rng.random() - 0.5) * 0.5
                s.put(rx + 1 + x, ry + 1 + y, cols[3] if d < -0.8 else cols[2] if d < 0 else cols[1] if d < 0.7 else cols[0])
    return outline_sprite(s, hexc('#244a2c'))


def make_garden():
    W, H = 320, 128
    cv = Canvas(W, H)
    ramp = [hexc('#457f3c'), hexc('#4f8b43'), hexc('#59964a'), hexc('#64a052')]
    tex = fbm(W, H, (40, 16), 61, 2)
    rng = random.Random(30)
    for y in range(H):
        for x in range(W):
            t = 0.4 + (tex[y, x] - 0.5) * 0.9 + (0.18 if (x // 20) % 2 == 0 else 0)   # franjas del cortacésped
            c = dpick(ramp, max(0, min(1, t)), x, y, 0.7)
            if y < 3: c = hexc('#2f6533') if y < 2 else ramp[0]   # sombra del bordillo
            cv.put(x, y, c)
    for _ in range(600):                                  # briznas
        x, y = rng.randrange(W), rng.randint(4, H - 1)
        cv.put(x, y, hexc('#74b25f') if rng.random() < 0.6 else hexc('#3d7639'))
    # parterres: macizos de hojas con flores, sin bordes rectos
    flowers = [('#e0566a', '#a8304a'), ('#f2cc55', '#c49a2c'), ('#f6f2e8', '#c9c1b0'), ('#ec93b6', '#b9638a'), ('#a48ad8', '#6f58a8')]
    for bx, bw in ((14, 64), (196, 50)):
        fc = rng.sample(flowers, 2)
        cy = 17
        for x in range(bx, bx + bw):
            hh = int(6 + 4.4 * math.sin((x - bx) / bw * math.pi)) - (1 if x in (bx, bx + bw - 1) else 0)
            for y in range(cy - hh // 2, cy + hh // 2 + 1):
                d = (y - (cy - hh // 2)) / max(1, hh)
                cv.put(x, y, hexc('#3f7a3a') if d < 0.35 else hexc('#336a33') if d < 0.8 else hexc('#28552c'))
            cv.put(x, cy + hh // 2 + 1, hexc('#2c5a30'))
        for _ in range(bw // 2):
            x = rng.randint(bx + 2, bx + bw - 4)
            y = rng.randint(cy - 4, cy + 3)
            c, cd = fc[rng.randrange(2)]
            cv.put(x, y, hexc(c)); cv.put(x + 1, y, hexc(c)); cv.put(x, y + 1, hexc(cd)); cv.put(x + 1, y + 1, hexc(cd))
    # arbustos redondos
    for x, rx, ry in ((96, 9, 6), (112, 6, 5), (282, 10, 7), (300, 6, 4)):
        cv.rect(x - rx + 1, 18 + ry - 1, 2 * rx, 2, hexc('#2f6533'))
        cv.stamp(make_bush(rng, rx, ry), x - rx - 1, 17 - ry - 1)
    # banco clásico (listones de madera, patas de hierro verde)
    bx, by = 140, 4
    wood, wood_l, wood_d = hexc('#b98250'), hexc('#d6a36a'), hexc('#7f5432')
    iron, iron_l = hexc('#24483a'), hexc('#3f7258')
    cv.rect(bx - 1, by + 20, 38, 3, hexc('#2f6533'))      # sombra en el césped
    for i, y in enumerate((by + 1, by + 4, by + 7)):      # respaldo
        cv.hline(bx + 2, y, 32, wood_l if i == 0 else wood); cv.hline(bx + 2, y + 1, 32, wood_d)
    for i, y in enumerate((by + 12, by + 14)):            # asiento
        cv.hline(bx, y, 36, wood_l if i == 0 else wood); cv.hline(bx, y + 1, 36, wood_d)
    for x in (bx + 3, bx + 31):
        cv.vline(x, by, 21, iron); cv.vline(x + 1, by, 21, iron_l)
        cv.hline(x - 2, by + 20, 6, iron)
        cv.put(x - 1, by + 16, iron); cv.put(x - 2, by + 17, iron)   # pata curva
    # farola de Bilbao: fuste con anillos, farol de cristal cálido y remate
    fx, fy = 258, 1
    post, post_l, post_d = hexc('#2a3b3d'), hexc('#557072'), hexc('#18232a')
    cv.rect(fx - 4, fy + 52, 10, 4, hexc('#2f6533'))      # sombra
    cv.rect(fx - 3, fy + 48, 8, 4, post); cv.hline(fx - 3, fy + 48, 8, post_l)
    cv.rect(fx - 2, fy + 45, 6, 3, post); cv.hline(fx - 2, fy + 45, 6, post_l)
    cv.rect(fx, fy + 16, 2, 29, post); cv.vline(fx, fy + 16, 29, post_l)
    for y in (fy + 24, fy + 36):
        cv.hline(fx - 1, y, 4, post_l); cv.hline(fx - 1, y + 1, 4, post_d)
    cv.hline(fx - 2, fy + 15, 6, post)
    cv.rect(fx - 4, fy + 6, 10, 9, post)                  # farol
    cv.rect(fx - 3, fy + 7, 8, 7, hexc('#f8df98'))
    cv.rect(fx - 2, fy + 8, 3, 4, hexc('#fff6d6'))
    cv.vline(fx + 1, fy + 7, 7, post)
    cv.rect(fx - 5, fy + 4, 12, 2, post); cv.hline(fx - 4, fy + 4, 10, post_l)
    cv.rect(fx - 1, fy + 2, 4, 2, post); cv.put(fx, fy + 1, post); cv.put(fx + 1, fy, post_l)
    return cv


def make_finish():
    W, H = 24, 44
    cv = Canvas(W, H)
    for y in range(H):
        for x in range(W):
            on = ((x // 6) + (y // 6)) % 2 == 0
            c = hexc('#f6f2ea') if on else OUTLINE
            if on and (x % 6 == 5 or y % 6 == 5): c = hexc('#d9d2e6')
            cv.put(x, y, c)
    return cv


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    jobs = {
        'bg_hills_far.png': make_far, 'bg_hills.png': make_hills, 'bg_city.png': make_city,
        'water.png': make_water, 'path.png': make_path, 'rail.png': make_rail,
        'garden.png': make_garden, 'finish.png': make_finish,
    }
    for name, fn in jobs.items():
        img = fn().image()
        img.save(os.path.join(OUT, name), optimize=True)
        print(name, img.size)
