"""
Generate PokerStats' app icons. Same approach as Ritual's tools/generate_icons.py.

    python3 tools/generate_icons.py

Writes into public/. The outputs are committed, so building never needs Pillow.

The mark is a poker chip: a gold disc with six edge inserts, and a spade on its
face. public/icon.svg is the same drawing by hand; keep the two in step.
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw

BG = (11, 18, 16, 255)  # --color-bg
GOLD = (227, 179, 65, 255)  # --color-accent
FELT = (19, 32, 27, 255)  # --color-surface

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"

# Drawn at 4x and downscaled: Pillow does not antialias shape edges.
SUPERSAMPLE = 4


def draw_mark(size: int, ratio: float) -> Image.Image:
    """Render the chip at `size` px, the chip spanning `ratio` of the canvas.

    Maskable and Apple icons get a smaller ratio: Android crops maskable icons
    to the launcher's shape, and iOS rounds the corners of every icon.
    """
    c = size * SUPERSAMPLE
    img = Image.new("RGBA", (c, c), BG)
    d = ImageDraw.Draw(img)
    cx = cy = c / 2
    r = c * ratio / 2

    # Chip body and its six edge inserts.
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD)
    for k in range(6):
        a = math.radians(k * 60)
        w = math.radians(11)
        ro, ri = r, r * 0.78
        pts = [
            (cx + ro * math.cos(a - w), cy + ro * math.sin(a - w)),
            (cx + ro * math.cos(a + w), cy + ro * math.sin(a + w)),
            (cx + ri * math.cos(a + w), cy + ri * math.sin(a + w)),
            (cx + ri * math.cos(a - w), cy + ri * math.sin(a - w)),
        ]
        d.polygon(pts, fill=FELT)

    # Face.
    rf = r * 0.66
    d.ellipse([cx - rf, cy - rf, cx + rf, cy + rf], fill=FELT)

    # Spade: two lobes, a point on top, a flared stem.
    s = rf * 0.95
    lobe = s * 0.30
    ly = cy + s * 0.06
    for dx in (-lobe * 0.95, lobe * 0.95):
        d.ellipse([cx + dx - lobe, ly - lobe, cx + dx + lobe, ly + lobe], fill=GOLD)
    d.polygon([(cx, cy - s * 0.62), (cx - lobe * 1.92, ly - lobe * 0.15), (cx + lobe * 1.92, ly - lobe * 0.15)], fill=GOLD)
    d.polygon([(cx, ly), (cx - s * 0.2, cy + s * 0.6), (cx + s * 0.2, cy + s * 0.6)], fill=GOLD)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    PUBLIC_DIR.mkdir(exist_ok=True)
    draw_mark(192, 0.84).save(PUBLIC_DIR / "icon-192.png")
    draw_mark(512, 0.84).save(PUBLIC_DIR / "icon-512.png")
    draw_mark(512, 0.66).save(PUBLIC_DIR / "icon-maskable-512.png")
    # iOS: opaque 180px, no transparency (iOS fills transparency with black).
    draw_mark(180, 0.78).convert("RGB").save(PUBLIC_DIR / "apple-touch-icon.png")
    print("icons written to", PUBLIC_DIR)


if __name__ == "__main__":
    main()
