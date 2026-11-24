"""
Genera el arte extra de la intro a partir de assets/story/bedroom.png (144x256):

  assets/story/bedroom_empty.png  -> la misma habitación con la cama VACÍA (Ane ya se ha
                                     levantado): donde estaba dormida queda el edredón
                                     revuelto, hecho con la textura de la propia colcha.

Uso: python tools/make_intro_art.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/story/bedroom.png'
OUT = ROOT / 'assets/story/bedroom_empty.png'

OUTLINE = (92, 40, 38)      # contorno del bulto del edredón
SHADOW = (150, 72, 64)      # sombra en los pliegues
PILLOW_LINE = (122, 82, 60)  # contorno de la almohada


def main():
    im = Image.open(SRC).convert('RGB')
    W, H = im.size
    px = im.load()

    # 1) Cabecero: se reconstruye la tabla de madera detrás del pelo copiando el perfil
    #    vertical de una columna limpia (x=121) siguiendo la inclinación del borde superior.
    def top_edge(x):            # borde superior del cabecero (sube hacia la izquierda)
        return 92 + (x - 74) * 0.196
    ref_x = 121
    ref_top = top_edge(ref_x)
    ref = [px[ref_x, y] for y in range(H)]
    for x in range(70, 118):
        dy = round(top_edge(x) - ref_top)
        for y in range(int(top_edge(x)) + 1, 120):
            sy = y - dy
            # textura: alterna columnas de referencia para que no quede plano
            col = px[ref_x + (x % 3), sy] if 0 <= sy < H else ref[min(H - 1, max(0, sy))]
            px[x, y] = col

    def poly_mask(points):
        mk = Image.new('L', (W, H), 0)
        ImageDraw.Draw(mk).polygon(points, fill=255)
        return mk.load()

    def outline(mk, color):
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if mk[x, y] and (not mk[x - 1, y] or not mk[x + 1, y] or not mk[x, y - 1] or not mk[x, y + 1]):
                    px[x, y] = color

    # 2) Almohada: tapa el pelo y la cara con una almohada crema con un hueco en el centro
    pillow = poly_mask([(60, 116), (63, 109), (70, 104), (82, 102), (98, 102), (106, 105), (111, 110),
                        (114, 116), (114, 126), (108, 130), (80, 131), (64, 130), (59, 124)])
    P_HI, P_LIGHT, P_MID, P_SHADOW = (250, 226, 186), (238, 208, 166), (220, 186, 146), (196, 160, 124)
    for y in range(H):
        for x in range(W):
            if not pillow[x, y]:
                continue
            # hueco suave donde estaba la cabeza (dos tonos) y sombra en la base
            dx, dy = (x - 88) / 16, (y - 117) / 7
            e = dx * dx + dy * dy
            if e < 0.45:
                c = P_SHADOW if dy < 0.2 else P_MID
            elif e < 1:
                c = P_MID if dy < 0.5 else P_LIGHT
            elif y > 125:
                c = P_MID
            elif not pillow[x, y - 2]:
                c = P_HI
            else:
                c = P_LIGHT
            px[x, y] = c
    outline(pillow, PILLOW_LINE)

    # 3) Edredón echado hacia atrás (textura de la propia colcha) tapando el cuerpo
    duvet_pts = [(56, 132), (62, 126), (70, 128), (78, 124), (88, 127), (98, 123), (106, 126),
                 (112, 131), (114, 142), (112, 151), (104, 154), (90, 154), (78, 149), (66, 143)]
    duvet = poly_mask(duvet_pts)
    src = im.copy().load()
    for y in range(H):
        for x in range(W):
            if not duvet[x, y]:
                continue
            r, g, b = src[max(0, min(W - 1, x - 58)), max(0, min(H - 1, y + 46))]
            k = 1.1 - (y - 122) / 32 * 0.22      # luz arriba (ventana), sombra abajo
            px[x, y] = (min(255, int(r * k)), min(255, int(g * k)), min(255, int(b * k)))
    d = ImageDraw.Draw(im)
    d.line([(64, 136), (74, 140), (86, 141)], fill=SHADOW, width=1)
    d.line([(92, 133), (100, 138), (108, 139)], fill=SHADOW, width=1)
    d.line([(80, 146), (92, 149), (104, 148)], fill=SHADOW, width=1)
    outline(duvet, OUTLINE)
    # brillo en el canto superior del edredón
    for x in range(58, 112):
        for y in range(118, 140):
            if duvet[x, y] and px[x, y] == OUTLINE and y + 1 < H and duvet[x, y + 1]:
                r, g, b = px[x, y + 1]
                px[x, y + 1] = (min(255, r + 40), min(255, g + 36), min(255, b + 30))
                break

    im.save(OUT)
    print('ok', OUT)


if __name__ == '__main__':
    main()
