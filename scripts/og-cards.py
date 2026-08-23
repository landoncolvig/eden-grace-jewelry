"""
Builds the OpenGraph share cards in public/og/.

Why these exist as JPEGs when every product photo on the site is a WebP:
Facebook, Instagram and X will not render a WebP og:image. The share card is
the whole point of the tag, and Instagram is where Jenna shares, so the cards
are baked to JPEG here rather than pointing og:image at the site's own assets.

1200x630 is the size every scraper crops to. The photo takes the left third
and the piece is named on the right, so the card reads as a product even at
the small size a group text renders it.

    python3 scripts/og-cards.py
"""

import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "og"
PRODUCTS_DIR = ROOT / "public" / "products"

W, H = 1200, 630
PHOTO_W = 600
PAD = 58

# Straight from app/globals.css. --color-bench must stay in sync.
BENCH = (253, 247, 242)
INK = (74, 59, 56)
INK_SOFT = (122, 104, 98)
INK_FAINT = (132, 110, 100)
ROSE = (152, 71, 75)
RULE = (219, 194, 177)

# Didot for the name and Optima for everything else is the closest pair macOS
# has to the site's Cormorant Garamond and Manrope.
DISPLAY = "/System/Library/Fonts/Supplemental/Didot.ttc"
SANS = "/System/Library/Fonts/Optima.ttc"


def font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size, index=index)


def width_of(draw: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont) -> int:
    return int(draw.textbbox((0, 0), text, font=f)[2])


def wrap(draw, text: str, f, max_w: int) -> list[str]:
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if width_of(draw, trial, f) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def tracked(draw, xy, text: str, f, fill, tracking: float):
    """Optima has no small-caps, so uppercase plus manual tracking stands in."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += width_of(draw, ch, f) + tracking
    return x


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    """Scale to fill and centre-crop, so no card is letterboxed."""
    scale = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    left = (im.width - w) // 2
    top = (im.height - h) // 2
    return im.crop((left, top, left + w, top + h))


def card(photo: Path, name: str, tagline: str, price: str | None, out: Path) -> None:
    canvas = Image.new("RGB", (W, H), BENCH)
    canvas.paste(cover(Image.open(photo).convert("RGB"), PHOTO_W, H), (0, 0))

    draw = ImageDraw.Draw(canvas)
    draw.line([(PHOTO_W, 0), (PHOTO_W, H)], fill=RULE, width=2)

    text_x = PHOTO_W + PAD
    text_w = W - text_x - PAD

    tracked((draw), (text_x, 74), "EDEN GRACE JEWELRY CO.",
            font(SANS, 19), INK_FAINT, 2.6)

    # Shrink the name until two lines clear the price block.
    size = 74
    while size > 40:
        f = font(DISPLAY, size)
        lines = wrap(draw, name, f, text_w)
        if len(lines) <= 2:
            break
        size -= 4
    f_name = font(DISPLAY, size)
    y = 168
    for line in wrap(draw, name, f_name, text_w):
        draw.text((text_x, y), line, font=f_name, fill=INK)
        y += int(size * 1.14)

    f_tag = font(SANS, 27)
    y += 14
    for line in wrap(draw, tagline, f_tag, text_w):
        draw.text((text_x, y), line, font=f_tag, fill=INK_SOFT)
        y += 38

    if price:
        draw.line([(text_x, H - 150), (text_x + 74, H - 150)], fill=RULE, width=2)
        draw.text((text_x, H - 126), price, font=font(SANS, 40), fill=ROSE)
        tracked(draw, (text_x, H - 68), "STRUNG BY HAND IN BEDFORD, TEXAS",
                font(SANS, 17), INK_FAINT, 1.9)
    else:
        tracked(draw, (text_x, H - 96), "STRUNG BY HAND IN BEDFORD, TEXAS",
                font(SANS, 18), INK_FAINT, 2.0)

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"  {out.relative_to(ROOT)}  {out.stat().st_size // 1024} KB")


def catalog() -> list[dict]:
    js = "console.log(JSON.stringify(require('./shared/catalog.js').PRODUCTS))"
    raw = subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True,
                         text=True, check=True).stdout
    return json.loads(raw)


def main() -> None:
    print("OG cards:")
    for p in catalog():
        card(PRODUCTS_DIR / f"{p['image']}.webp", p["name"], p["tagline"],
             f"${p['priceCents'] // 100}", OUT / f"{p['slug']}.jpg")

    card(PRODUCTS_DIR / "eden-brown-horseshoe-hero.webp",
         "Necklaces strung one at a time",
         "Beaded gemstone strands and monogram necklaces, made to order in small batches.",
         None, OUT / "default.jpg")

    # Her portrait, not a necklace. The about page is the page about her.
    card(ROOT / "public" / "portrait" / "jenna.webp",
         "Hi, I\u2019m Jenna",
         "I make beaded necklaces one at a time, strung by hand in Bedford, Texas.",
         None, OUT / "about.jpg")


if __name__ == "__main__":
    main()
