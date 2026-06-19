"""
Génère un logo PSG (Paris Saint-Germain) de qualité suffisante
avec les couleurs officielles: bleu marine #001C58, rouge #DA291C, or #FFD700
"""
import os, math
from PIL import Image, ImageDraw

OUT = "c:/site-antigra/site-antigra/public/logos/teams/paris_saint-germain.png"
SIZE = 256

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

cx, cy, r = SIZE // 2, SIZE // 2, SIZE // 2 - 4

# Fond cercle bleu marine
draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(0, 28, 88, 255))

# Bande rouge horizontale centrale
band_h = int(SIZE * 0.22)
draw.rectangle([cx - r + 6, cy - band_h // 2, cx + r - 6, cy + band_h // 2], fill=(218, 41, 28, 255))

# Lettres PSG (dessinées pixel par pixel via ellipses et rectangles)
gold = (255, 215, 0, 255)
white = (255, 255, 255, 255)

# "P" - gauche
px, py, pw, ph = cx - 55, cy - 18, 22, 36
draw.rectangle([px, py, px + 6, py + ph], fill=gold)
draw.arc([px, py, px + pw, py + ph // 2], start=270, end=90, fill=gold, width=6)

# "S" - centre
sx, sy, sw, sh = cx - 12, cy - 18, 24, 36
# Top arc
draw.arc([sx, sy, sx + sw, sy + sh // 2], start=0, end=180, fill=gold, width=6)
# Bottom arc
draw.arc([sx, sy + sh // 2, sx + sw, sy + sh], start=180, end=360, fill=gold, width=6)

# "G" - droite
gx, gy, gw, gh = cx + 15, cy - 18, 26, 36
draw.arc([gx, gy, gx + gw, gy + gh], start=45, end=315, fill=gold, width=6)
draw.rectangle([gx + gw // 2, gy + gh // 2 - 3, gx + gw - 2, gy + gh // 2 + 6], fill=gold)

# Bordure or externe
for i in range(3):
    draw.ellipse([cx - r + i, cy - r + i, cx + r - i, cy + r - i], outline=(255, 215, 0, 200), width=1)

# Tour Eiffel stylisée (mini icône en haut)
tx, ty = cx, cy - 38
draw.polygon([(tx, ty - 10), (tx - 5, ty), (tx + 5, ty)], fill=gold)
draw.line([(tx - 3, ty), (tx + 3, ty)], fill=gold, width=2)
draw.line([(tx - 7, ty + 8), (tx + 7, ty + 8)], fill=gold, width=2)
draw.line([(tx - 3, ty), (tx - 7, ty + 8)], fill=gold, width=2)
draw.line([(tx + 3, ty), (tx + 7, ty + 8)], fill=gold, width=2)

img.save(OUT, "PNG")
print(f"Logo PSG généré: {OUT} ({os.path.getsize(OUT)} bytes)")
