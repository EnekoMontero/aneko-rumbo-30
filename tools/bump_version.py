"""Actualiza el número de versión (?v=...) de los scripts en index.html.
Ejecútalo antes de cada publicación: obliga a los navegadores (también al móvil de Ane) a descargar
la versión nueva en vez de usar la guardada en caché (GitHub Pages deja guardar 10 minutos).
Uso: python tools/bump_version.py
"""
import os, re, sys, time

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'index.html')
v = time.strftime('%Y%m%d%H%M')
html = open(p, encoding='utf-8').read()
html, n = re.subn(r'<script src="([^"?]+)(?:\?v=\w+)?"></script>', lambda m: f'<script src="{m.group(1)}?v={v}"></script>', html)
open(p, 'w', encoding='utf-8', newline='\n').write(html)
print(f'versión {v} en {n} scripts de index.html')
