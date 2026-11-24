"""
Generador del arte pixel de "Cruzar el puerto" (assets/puerto/*.png).

Escala: 1 px de arte = 1 px lógico del juego con casillas de 40 px (CFG.TILE). Así el puerto
tiene el mismo nivel de detalle que Ane y los fondos del resto del juego (antes era arte de
20 px por casilla ampliado x2).

Vista: cenital a 3/4 (se ve la cara de arriba y la cara que mira a la cámara), luz cálida de
atardecer como bg_puerto.jpg, contorno oscuro #1b1430 como el resto del juego.

Uso:  python tools/make_puerto_art.py      (sobrescribe los PNG de assets/puerto/, salvo bg_puerto.jpg)
"""
import os
import random
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'puerto')
T = 40                     # casilla en px
OL = (27, 20, 48, 255)     # contorno común del juego (#1b1430)
SH = (20, 12, 40)          # color de las sombras proyectadas


# ---------------------------------------------------------------- utilidades
def rgba(c, a=255):
    return (c[0], c[1], c[2], a) if len(c) == 3 else c


def mul(c, k):
    return tuple(max(0, min(255, int(round(v * k)))) for v in c[:3])


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def new(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def rect(im, x0, y0, x1, y1, c, a=255):
    """Rectángulo relleno con extremos INCLUIDOS."""
    if x1 < x0 or y1 < y0:
        return
    ImageDraw.Draw(im).rectangle([x0, y0, x1, y1], fill=rgba(c, a))


def hline(im, x0, x1, y, c, a=255):
    rect(im, x0, y, x1, y, c, a)


def vline(im, x, y0, y1, c, a=255):
    rect(im, x, y0, x, y1, c, a)


def px(im, x, y, c, a=255):
    if 0 <= x < im.width and 0 <= y < im.height:
        im.putpixel((x, y), rgba(c, a))


def outline(im, color=OL):
    """Contorno de 1 px alrededor de todo lo opaco (vecindad de 4)."""
    w, h = im.size
    src = im.load()
    out = im.copy()
    o = out.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] > 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] > 200:
                    o[x, y] = color
                    break
    return out


def under(base, top):
    """Pega `top` encima de `base` (mismo tamaño)."""
    r = base.copy()
    r.alpha_composite(top)
    return r


def shadow_ellipse(w, h, box, a=110):
    s = new(w, h)
    ImageDraw.Draw(s).ellipse(box, fill=rgba(SH, a))
    return s


def wheel(im, cx, cy, r=4):
    d = ImageDraw.Draw(im)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgba((34, 28, 44)))
    d.ellipse([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], fill=rgba((150, 146, 160)))
    px(im, cx, cy, (90, 86, 104))
    px(im, cx - 1, cy - r + 1, (70, 64, 84))


def glass(im, x0, y0, x1, y1):
    """Cristal con reflejo del atardecer."""
    rect(im, x0, y0, x1, y1, (120, 150, 196))
    rect(im, x0, y0, x1, y0 + (y1 - y0) // 2, (176, 196, 226))
    for i in range(0, (y1 - y0) + 1):            # reflejo diagonal
        px(im, x0 + 1 + i, y1 - i, (255, 222, 196))
        px(im, x0 + 2 + i, y1 - i, (232, 206, 214))


def save(im, name):
    im.save(os.path.join(OUT, name + '.png'))


# ---------------------------------------------------------------- vehículos
# Todos miran a la DERECHA. Lienzo de 36 px de alto: la sombra toca el borde inferior y las ruedas
# apoyan 3 px por encima. El juego coloca el borde inferior del lienzo casi en el borde inferior del
# carril, así el vehículo queda DENTRO de su fila.
VH = 36


def container_side(im, x0, y0, x1, y1, base, top_h=4):
    """Contenedor visto de lado (sobre un camión): tapa clara + costado con nervios verticales."""
    hi, dk, top = mul(base, 1.18), mul(base, 0.78), mix(base, (255, 214, 170), 0.35)
    rect(im, x0, y0, x1, y0 + top_h - 1, top)                     # tapa (cara de arriba)
    for x in range(x0 + 2, x1, 4):
        vline(im, x, y0, y0 + top_h - 1, mul(top, 0.9))
    rect(im, x0, y0 + top_h, x1, y1, base)                        # costado
    for x in range(x0 + 1, x1, 3):
        vline(im, x, y0 + top_h + 1, y1 - 1, dk)
        vline(im, x + 1, y0 + top_h + 1, y1 - 1, hi)
    hline(im, x0, x1, y0 + top_h, mul(base, 1.3))                 # arista iluminada
    hline(im, x0, x1, y1, mul(base, 0.6))
    for cx in (x0, x1 - 1):                                       # cantoneras
        rect(im, cx, y0 + top_h, cx + 1, y0 + top_h + 1, mul(base, 0.5))
        rect(im, cx, y1 - 1, cx + 1, y1, mul(base, 0.5))


def cab(im, x0, x1, roof_y, body_y, bot_y, base):
    """Cabina de camión mirando a la derecha."""
    top, dk = mix(base, (255, 220, 180), 0.35), mul(base, 0.72)
    rect(im, x0 + 1, roof_y, x1 - 3, body_y - 1, top)            # techo
    rect(im, x0, body_y, x1 - 1, bot_y, base)                     # costado
    hline(im, x0, x1 - 1, body_y, mul(base, 1.25))
    rect(im, x0, bot_y - 3, x1 - 1, bot_y, dk)                    # faldón
    rect(im, x1 - 2, body_y + 1, x1 - 1, bot_y, mul(base, 0.85))  # frontal en escorzo
    glass(im, x1 - 11, body_y + 2, x1 - 3, body_y + 7)            # ventana
    vline(im, x1 - 13, body_y + 2, bot_y - 4, dk)                 # puerta
    px(im, x1 - 15, body_y + 9, (230, 230, 236))                  # tirador
    rect(im, x1 - 1, bot_y - 5, x1, bot_y - 4, (255, 232, 150))   # faro
    rect(im, x0 + 1, body_y + 2, x0 + 2, body_y + 9, (70, 64, 84))  # tubo de escape
    rect(im, x0 + 1, roof_y - 2, x0 + 2, roof_y - 1, (70, 64, 84))


def semi(name, cab_c, cont_c, w=90):
    im = new(w, VH)
    rect(im, 3, 24, w - 8, 27, (54, 48, 66))                      # chasis
    container_side(im, 3, 6, w - 30, 24, cont_c)
    cab(im, w - 27, w - 2, 10, 13, 28, cab_c)
    rect(im, w - 30, 21, w - 27, 25, (54, 48, 66))                # enganche
    for cx in (11, 20, w - 38):
        wheel(im, cx, 29)
    wheel(im, w - 10, 29)
    im = outline(im)
    return under(shadow_ellipse(w, VH, [0, 27, w - 1, VH - 1]), im)


def box_truck(name, cab_c, box_c, w=66):
    im = new(w, VH)
    rect(im, 3, 24, w - 8, 27, (54, 48, 66))
    top, dk = mix(box_c, (255, 222, 190), 0.4), mul(box_c, 0.82)
    rect(im, 3, 5, w - 28, 8, top)
    rect(im, 3, 9, w - 28, 24, box_c)
    hline(im, 3, w - 28, 9, mul(box_c, 1.12))
    rect(im, 3, 15, w - 28, 18, cab_c)                            # franja
    hline(im, 3, w - 28, 24, dk)
    vline(im, 4, 10, 23, dk)
    cab(im, w - 25, w - 2, 10, 13, 28, cab_c)
    for cx in (11, 19, w - 10):
        wheel(im, cx, 29)
    im = outline(im)
    return under(shadow_ellipse(w, VH, [0, 27, w - 1, VH - 1]), im)


def pickup(w=52):
    base = (226, 220, 222)
    top, dk = (250, 236, 222), (168, 160, 170)
    im = new(w, VH)
    # caja trasera
    rect(im, 2, 15, 17, 26, base)
    rect(im, 3, 13, 17, 15, (88, 80, 98))                         # interior de la caja
    hline(im, 2, 17, 12, top)
    # cabina
    rect(im, 18, 8, 33, 11, top)                                  # techo
    rect(im, 17, 12, 35, 26, base)
    glass(im, 20, 13, 26, 18)
    glass(im, 28, 13, 34, 18)
    vline(im, 27, 13, 25, dk)
    # capó
    rect(im, 36, 15, w - 4, 17, top)
    rect(im, 36, 18, w - 3, 26, base)
    rect(im, w - 3, 21, w - 2, 22, (255, 232, 150))               # faro
    rect(im, 2, 22, w - 2, 23, (232, 120, 52))                    # franja naranja del puerto
    hline(im, 2, w - 2, 26, dk)
    rect(im, 24, 5, 27, 7, (255, 170, 40))                        # rotativo ámbar
    px(im, 25, 5, (255, 236, 160))
    for cx in (11, w - 12):
        wheel(im, cx, 28)
    im = outline(im)
    return under(shadow_ellipse(w, VH, [0, 27, w - 1, VH - 1]), im)


def van(w=52):
    base = (232, 182, 56)
    top, dk = (255, 226, 150), (176, 128, 36)
    im = new(w, VH)
    rect(im, 3, 5, w - 12, 8, top)                                # techo
    rect(im, 2, 9, w - 6, 27, base)
    hline(im, 2, w - 6, 9, mul(base, 1.12))
    rect(im, w - 6, 13, w - 3, 27, base)                          # morro
    rect(im, w - 11, 6, w - 6, 8, top)
    glass(im, w - 13, 11, w - 5, 17)
    glass(im, 18, 11, 26, 16)
    glass(im, 28, 11, 34, 16)
    vline(im, 15, 11, 24, dk)
    vline(im, 36, 11, 24, dk)
    rect(im, 2, 20, w - 3, 21, (52, 92, 170))                     # franja azul
    rect(im, w - 3, 22, w - 2, 23, (255, 232, 150))
    hline(im, 2, w - 3, 27, dk)
    for cx in (11, w - 13):
        wheel(im, cx, 29)
    im = outline(im)
    return under(shadow_ellipse(w, VH, [0, 27, w - 1, VH - 1]), im)


def straddle(w=48):
    """Carretilla pórtico (straddle carrier): pórtico amarillo con un contenedor colgando.
    Mide 40 px de alto (una casilla) para no invadir el carril de arriba."""
    H = 40
    yel, ytop, ydk = (236, 178, 46), (255, 226, 130), (176, 122, 30)
    im = new(w, H)
    container_side(im, 9, 17, w - 10, 28, (52, 104, 176), top_h=3)
    rect(im, 12, 11, 13, 16, (70, 64, 84))                         # cables
    rect(im, w - 14, 11, w - 13, 16, (70, 64, 84))
    for lx in (3, w - 9):                                          # patas
        rect(im, lx, 8, lx + 5, 31, yel)
        vline(im, lx, 8, 31, ytop)
        vline(im, lx + 5, 8, 31, ydk)
        for y in range(12, 31, 6):
            hline(im, lx + 1, lx + 4, y, ydk)
    rect(im, 1, 6, w - 2, 10, yel)                                 # viga
    hline(im, 1, w - 2, 6, ytop)
    hline(im, 1, w - 2, 10, ydk)
    rect(im, w - 18, 0, w - 6, 5, (214, 208, 214))                 # cabina arriba
    glass(im, w - 12, 1, w - 7, 4)
    hline(im, w - 18, w - 6, 0, (250, 244, 236))
    rect(im, 4, 3, 6, 5, (255, 170, 40))                           # rotativo
    for lx in (3, w - 9):
        wheel(im, lx + 3, 33, 4)
    im = outline(im)
    return under(shadow_ellipse(w, H, [0, 32, w - 1, H - 1]), im)


# ---------------------------------------------------------------- barcos
# Lienzo de 40 px de alto. Cubierta (cara de arriba, donde se sube Ane) en y≈21..29, casco frontal
# y≈30..35, espuma en la línea de flotación (y≈36..37). Proa a la DERECHA.
BH = 40
DECK_C, DECK_H = 24, 5         # centro y semialtura de la cubierta


def hull(im, w, hull_c, deck_c, stripe_c, bow=14, plank=True):
    """Casco a 3/4: cubierta (cara de arriba) + costado de babor visto de frente con amura en la proa."""
    hd, hl = mul(hull_c, 0.72), mul(hull_c, 1.22)
    yc, hh = DECK_C, DECK_H
    tip = w - 3
    y0 = yc + hh + 1                     # primera fila del costado
    yb = y0 + 5                          # última fila del costado

    def xr(y):   # borde derecho (proa) de la cubierta en la fila y
        t = abs(y - yc) / (hh + 0.5)
        return int(round(tip - t ** 1.6 * bow))

    def xl(y):
        t = abs(y - yc) / (hh + 0.5)
        return int(round(3 + t * t * 2))

    def bow_line(y):   # línea de la roda: de la punta de la cubierta hasta la flotación
        return int(round(tip - (y - yc) * (bow * 0.5 + 6) / (yb - yc)))
    # cubierta
    for y in range(yc - hh, yc + hh + 1):
        hline(im, xl(y), xr(y), y, deck_c)
        if plank and (y - yc) % 3 == 0:
            hline(im, xl(y) + 1, xr(y) - 2, y, mul(deck_c, 0.9))
    hline(im, xl(yc - hh), xr(yc - hh), yc - hh, mix(deck_c, (255, 236, 220), 0.45))   # borda del fondo
    # amura: parte del costado que se ve por delante de la cubierta en la proa
    for y in range(yc + 1, yc + hh + 1):
        hline(im, xr(y) + 1, bow_line(y), y, hl)
    # costado
    for i, y in enumerate(range(y0, yb + 1)):
        c = hl if i == 0 else (stripe_c if i == 4 else (hd if i == 5 else hull_c))
        hline(im, xl(yc + hh), bow_line(y), y, c)
    hline(im, xl(yc + hh), xr(yc + hh), y0 - 1, mix(hull_c, (255, 240, 225), 0.6))   # regala clara
    return yb + 1        # primera fila bajo el casco (línea de flotación)


def bow_x(w, bow):
    return int(round(w - 3 - (bow * 0.5 + 6)))


def foam(im, w, y, x1):
    for x in range(4, x1):
        if (x * 7) % 5 < 3:
            px(im, x, y, (214, 236, 250), 230)
        if (x * 3) % 7 == 0:
            px(im, x, y + 1, (170, 210, 240), 160)
    for i in range(5):                                         # ola de proa
        px(im, x1 + i, y - (1 if i < 2 else 0), (226, 242, 252), 220 - i * 30)


def cabin(im, x0, x1, ytop, ybot, wall=(232, 226, 228), roof=(250, 244, 236), win=True):
    rect(im, x0 + 1, ytop, x1 - 1, ytop + 2, roof)
    rect(im, x0, ytop + 3, x1, ybot, wall)
    hline(im, x0, x1, ytop + 3, (255, 252, 246))
    vline(im, x1, ytop + 3, ybot, mul(wall, 0.8))
    if win:
        for x in range(x0 + 2, x1 - 2, 4):
            rect(im, x, ytop + 5, x + 2, ytop + 7, (120, 150, 196))
            px(im, x, ytop + 5, (230, 210, 214))


def box3(im, x0, x1, ytop, ybot, base, top_h=3):
    """Caja/contenedor pequeño en cubierta: tapa + frente con nervios."""
    rect(im, x0, ytop, x1, ytop + top_h - 1, mix(base, (255, 220, 180), 0.35))
    rect(im, x0, ytop + top_h, x1, ybot, base)
    for x in range(x0 + 1, x1, 3):
        vline(im, x, ytop + top_h + 1, ybot - 1, mul(base, 0.8))
    hline(im, x0, x1, ytop + top_h, mul(base, 1.25))


def finish_boat(im, w, wl, bow_x):
    im = outline(im)
    foam(im, w, wl, bow_x)
    return im


CONT = [(196, 64, 56), (44, 146, 146), (226, 172, 54), (56, 98, 178), (222, 120, 52)]


def ship(w=172):
    im = new(w, BH)
    wl = hull(im, w, (40, 46, 82), (120, 70, 64), (190, 56, 56), bow=22, plank=False)
    # contenedores apilados en cubierta (frentes)
    rnd = random.Random(7)
    x = 34
    while x < w - 40:
        cw = 12
        c1, c2 = rnd.choice(CONT), rnd.choice(CONT)
        box3(im, x, x + cw - 1, 13, 21, c1)
        box3(im, x, x + cw - 1, 7, 12, c2, top_h=2) if rnd.random() < 0.6 else None
        x += cw + 1
    # puente de mando a popa
    cabin(im, 6, 28, 2, 21)
    rect(im, 12, 0, 16, 2, (40, 46, 82))                         # chimenea
    rect(im, 12, 1, 16, 1, (190, 56, 56))
    rect(im, w - 22, 17, w - 20, 21, (230, 226, 228))             # mástil de proa
    return finish_boat(im, w, wl, bow_x(w, 22))


def barge(w=132):
    im = new(w, BH)
    wl = hull(im, w, (196, 98, 40), (92, 84, 96), (60, 40, 50), bow=10, plank=False)
    rnd = random.Random(3)
    x = 26
    while x < w - 26:
        box3(im, x, x + 13, 14, 23, rnd.choice(CONT))
        x += 15
    cabin(im, 6, 20, 8, 23)
    rect(im, 9, 6, 11, 8, (54, 48, 66))
    return finish_boat(im, w, wl, bow_x(w, 10))


def flat(w=108):
    """Pontona / gabarra plana con cubierta de madera, cajas y salvavidas."""
    im = new(w, BH)
    wl = hull(im, w, (40, 132, 132), (176, 128, 84), (230, 226, 228), bow=12)
    box3(im, 16, 27, 16, 23, (150, 104, 64))                     # cajas de madera
    box3(im, 29, 36, 18, 23, (170, 120, 74))
    rect(im, w - 32, 18, w - 26, 23, (230, 226, 228))            # bita
    d = ImageDraw.Draw(im)
    d.ellipse([60, 17, 66, 23], fill=rgba((236, 96, 64)))         # salvavidas
    d.ellipse([62, 19, 64, 21], fill=rgba((176, 128, 84)))
    for x in range(8, w - 20, 9):                                 # barandilla
        vline(im, x, 17, 20, (236, 232, 236))
    hline(im, 8, w - 20, 17, (236, 232, 236))
    return finish_boat(im, w, wl, bow_x(w, 12))


def tug(w=76):
    im = new(w, BH)
    wl = hull(im, w, (196, 56, 52), (70, 62, 80), (240, 236, 236), bow=14, plank=False)
    cabin(im, 20, 44, 7, 23)
    rect(im, 26, 3, 38, 6, (240, 236, 236))                       # puente alto
    glass(im, 28, 4, 36, 6)
    rect(im, 14, 9, 18, 22, (40, 36, 52))                         # chimenea
    rect(im, 14, 12, 18, 13, (196, 56, 52))
    for x in (8, 26, 46):                                         # defensas colgadas de la regala
        rect(im, x, 30, x + 3, 32, (34, 28, 44))
    return finish_boat(im, w, wl, bow_x(w, 14))


# ---------------------------------------------------------------- contenedor fijo del patio
def yard_container(base):
    """Contenedor del patio visto por las puertas. Ocupa SOLO su casilla (40x40) con sombra."""
    im = new(T, T)
    top = mix(base, (255, 222, 186), 0.38)
    dk, dk2, hi = mul(base, 0.74), mul(base, 0.55), mul(base, 1.18)
    x0, x1 = 3, 35
    rect(im, x0 + 1, 3, x1 - 1, 11, top)                          # techo (cara de arriba)
    for y in range(4, 11, 2):
        hline(im, x0 + 2, x1 - 2, y, mul(top, 0.92))
    rect(im, x0, 12, x1, 34, base)                                # frente: puertas
    hline(im, x0, x1, 12, hi)
    rect(im, x0, 12, x0 + 1, 34, dk)                              # marco
    rect(im, x1 - 1, 12, x1, 34, dk2)
    rect(im, x0, 33, x1, 34, dk2)
    hline(im, x0, x1, 13, dk)
    vline(im, 19, 14, 32, dk2)                                    # junta de las dos puertas
    vline(im, 20, 14, 32, hi)
    for x in (7, 15, 23, 31):                                     # barras de cierre
        vline(im, x, 14, 32, (196, 190, 200))
        vline(im, x + 1, 14, 32, dk)
        rect(im, x - 1, 22, x + 1, 23, (214, 210, 218))           # manetas
    for cx, cy in ((x0, 12), (x1 - 2, 12), (x0, 32), (x1 - 2, 32)):  # cantoneras
        rect(im, cx, cy, cx + 2, cy + 2, (60, 52, 70))
    for x in range(x0 + 3, x0 + 9):                               # marcas blancas
        if x % 2:
            px(im, x, 16, (240, 236, 236))
    im = outline(im)
    # sombra proyectada hacia delante-derecha (sol bajo detrás, a la izquierda)
    s = new(T, T)
    d = ImageDraw.Draw(s)
    d.polygon([(4, 36), (37, 36), (39, 34), (39, 39), (2, 39)], fill=rgba(SH, 120))
    d.rectangle([37, 6, 39, 36], fill=rgba(SH, 90))
    return under(s, im)


def bollard():
    im = new(12, 14)
    d = ImageDraw.Draw(im)
    rect(im, 3, 5, 8, 11, (66, 60, 80))
    vline(im, 4, 5, 11, (110, 104, 124))
    d.ellipse([1, 2, 10, 6], fill=rgba((84, 78, 98)))
    hline(im, 3, 7, 3, (140, 134, 154))
    rect(im, 2, 11, 9, 12, (54, 48, 66))
    im = outline(im)
    return under(shadow_ellipse(12, 14, [0, 10, 11, 13], 100), im)


# ---------------------------------------------------------------- suelos (40x40, repetibles en X)
def noise_fill(im, y0, y1, base, rnd, amp=6, specks=()):
    for y in range(y0, y1 + 1):
        for x in range(im.width):
            k = 1 + (rnd.random() - 0.5) * amp / 100
            px(im, x, y, mul(base, k))
    for col, n in specks:
        for _ in range(n):
            px(im, rnd.randrange(im.width), rnd.randrange(y0, y1 + 1), col)


ASPH = (62, 56, 78)
CONC = (176, 156, 150)


def asphalt():
    rnd = random.Random(11)
    im = new(T, T)
    noise_fill(im, 0, T - 1, ASPH, rnd, 10, [((48, 42, 62), 70), ((80, 72, 94), 40), ((150, 96, 92), 5)])
    for y, x0, ln in ((9, 4, 13), (27, 22, 15), (31, 1, 6)):      # marcas de rodadas, suaves
        for i in range(ln):
            px(im, (x0 + i) % T, y, (54, 48, 68))
    return im


def dash():
    im = new(T, 4)
    rect(im, 6, 0, 25, 1, (236, 190, 76))
    hline(im, 6, 25, 2, (150, 110, 60))
    return im


def concrete(rnd, base=CONC):
    im = new(T, T)
    noise_fill(im, 0, T - 1, base, rnd, 7, [(mul(base, 0.86), 50), (mul(base, 1.08), 40)])
    vline(im, 0, 0, T - 1, mul(base, 0.8))                         # juntas de losa
    hline(im, 0, T - 1, 19, mul(base, 0.84))
    return im


def curb_front(im):
    """Bordillo visto de frente al pie de la fila (la carretera de abajo está más baja)."""
    rect(im, 0, T - 4, T - 1, T - 3, (214, 200, 190))
    hline(im, 0, T - 1, T - 2, (138, 122, 128))
    hline(im, 0, T - 1, T - 1, (40, 32, 58))


def curb_top(im):
    hline(im, 0, T - 1, 0, (40, 32, 58))
    hline(im, 0, T - 1, 1, (214, 200, 190))


def tile_quay():
    im = concrete(random.Random(21))
    curb_top(im)
    for x in range(2, T, 8):                                      # línea amarilla de seguridad
        rect(im, x, 4, x + 3, 5, (232, 186, 70))
    return im


def tile_yard():
    im = concrete(random.Random(31), (150, 140, 142))
    curb_top(im)
    curb_front(im)
    y = (232, 186, 70)
    vline(im, 0, 3, T - 6, y)                                     # plaza pintada en el suelo
    vline(im, T - 1, 3, T - 6, y)
    return im


def tile_quay_mid():
    im = concrete(random.Random(41))
    curb_front(im)
    rect(im, 0, 0, T - 1, 4, (196, 184, 178))                     # albardilla de piedra hacia el agua
    hline(im, 0, T - 1, 0, (236, 222, 208))
    hline(im, 0, T - 1, 5, (110, 96, 104))
    for x in (0, 13, 27):
        vline(im, x, 1, 4, (150, 136, 140))
    return im


def tile_goal():
    im = concrete(random.Random(51))
    # meta: banda a cuadros
    for y in range(3, 9):
        for x in range(T):
            px(im, x, y, (246, 240, 232) if ((x // 4) + (y - 3) // 3) % 2 == 0 else (40, 32, 58))
    hline(im, 0, T - 1, 2, (110, 96, 104))
    hline(im, 0, T - 1, 9, (110, 96, 104))
    # muro del muelle visto de frente (da al agua)
    rect(im, 0, 30, T - 1, 39, (122, 106, 114))
    hline(im, 0, T - 1, 30, (214, 200, 190))
    hline(im, 0, T - 1, 31, (150, 134, 140))
    for y in (35,):
        hline(im, 0, T - 1, y, (96, 82, 94))
    for x in (6, 26):
        vline(im, x, 32, 34, (96, 82, 94))
    for x in (16, 36):
        vline(im, x, 36, 39, (96, 82, 94))
    hline(im, 0, T - 1, 39, (40, 32, 58))
    d = ImageDraw.Draw(im)                                        # neumático defensa
    d.ellipse([15, 31, 22, 38], fill=rgba((34, 28, 44)))
    d.ellipse([17, 33, 20, 36], fill=rgba((122, 106, 114)))
    return im


WATER = (34, 52, 106)


def water(frame):
    rnd = random.Random(61)
    im = new(T, T)
    for y in range(T):
        for x in range(T):
            px(im, x, y, mul(WATER, 1 + (rnd.random() - 0.5) * 0.06))
    # crestas: trazos cortos que se desplazan con el fotograma (repetibles en X)
    strokes = [(rnd.randrange(T), rnd.randrange(T), rnd.randrange(3, 7), rnd.random()) for _ in range(16)]
    for x0, y, ln, k in strokes:
        sx = x0 + frame * (1 if y % 2 else -1)
        col = (74, 104, 168) if k < 0.7 else (110, 138, 196)
        for i in range(ln):
            px(im, (sx + i) % T, y, col)
        px(im, (sx + ln // 2) % T, (y + 1) % T, (26, 38, 82))
    # destellos del atardecer
    glints = [(rnd.randrange(T), rnd.randrange(T), rnd.random()) for _ in range(6)]
    for x0, y, k in glints:
        on = (frame + int(k * 4)) % 4
        if on < 3:
            col = (244, 150, 106) if on != 1 else (255, 206, 150)
            for i in range(2 + on):
                px(im, (x0 + i) % T, y, col)
    return im


# ---------------------------------------------------------------- principal
def main():
    os.makedirs(OUT, exist_ok=True)
    save(semi('truck_blue', (52, 96, 186), (196, 64, 56)), 'truck_blue')
    save(semi('truck_orange', (226, 118, 46), (44, 146, 146)), 'truck_orange')
    save(box_truck('truck_red', (200, 58, 58), (226, 214, 200)), 'truck_red')
    save(pickup(), 'pickup')
    save(van(), 'van')
    save(straddle(), 'straddle')
    save(ship(), 'ship')
    save(barge(), 'barge')
    save(flat(), 'flat')
    save(tug(), 'tug')
    for n, c in (('red', (186, 58, 52)), ('teal', (40, 138, 138)), ('yellow', (220, 166, 50)), ('blue', (52, 92, 170))):
        save(yard_container(c), 'cont_' + n)
    save(bollard(), 'bollard')
    save(asphalt(), 'tile_asphalt')
    save(dash(), 'tile_dash')
    save(tile_quay(), 'tile_quay')
    save(tile_yard(), 'tile_yard')
    save(tile_quay_mid(), 'tile_quay_mid')
    save(tile_goal(), 'tile_goal')
    for f in range(4):
        save(water(f), 'tile_water%d' % f)
    print('Arte del puerto generado en', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
