"""Genera dist/ane-juego.html: TODO el juego en un solo archivo (scripts, fuente e imágenes incrustados).
No hace falta para publicar en GitHub Pages (allí se sube la carpeta tal cual); sirve para tener
una copia de un solo archivo. Uso: python tools/build_standalone.py
"""
import base64, json, mimetypes, os, re, sys

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIME = {'.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
        '.mp3': 'audio/mpeg', '.ttf': 'font/ttf'}


def data_uri(rel):
    ext = os.path.splitext(rel)[1].lower()
    mime = MIME.get(ext) or mimetypes.guess_type(rel)[0] or 'application/octet-stream'
    with open(os.path.join(ROOT, rel), 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()


def main():
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    # Fuente
    html = html.replace("url('fonts/PressStart.ttf')", "url('" + data_uri('fonts/PressStart.ttf') + "')")
    # Recursos (assets/**) -> window.ANE_INLINE, lo lee G.asset()
    inline = {}
    for d, _, files in os.walk(os.path.join(ROOT, 'assets')):
        for fn in files:
            rel = os.path.relpath(os.path.join(d, fn), ROOT).replace(os.sep, '/')
            if os.path.splitext(fn)[1].lower() in MIME:
                inline[rel] = data_uri(rel)
    # Scripts: <script src="x.js"></script> -> <script>/* x.js */ ...</script>
    def repl(m):
        rel = m.group(1)
        code = open(os.path.join(ROOT, rel), encoding='utf-8').read()
        if rel == 'js/core/namespace.js':     # los recursos van antes que todo lo demás
            code = 'window.ANE_INLINE=' + json.dumps(inline) + ';\n' + code
        return f'<script>/* {rel} */\n{code}</script>'
    html = re.sub(r'<script src="([^"]+)"></script>', repl, html)
    # Iconos y la imagen de la pantalla de carga también incrustados; el manifest no sirve en un archivo suelto
    html = re.sub(r'(src|href)="(assets/icons/[^"]+)"', lambda m: f'{m.group(1)}="{data_uri(m.group(2))}"', html)
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    out = os.path.join(ROOT, 'dist', 'ane-juego.html')
    open(out, 'w', encoding='utf-8', newline='\n').write(html)
    print(f'{out}  ({os.path.getsize(out) / 1e6:.1f} MB, {len(inline)} recursos)')


if __name__ == '__main__':
    main()
