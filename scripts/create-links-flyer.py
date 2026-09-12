#!/usr/bin/env python3
"""Create the Eden Grace /links flyer as a US Letter PDF."""

from pathlib import Path
import subprocess

from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "eden-grace-links-flyer.pdf"
QR = ROOT / "tmp" / "pdfs" / "eden-grace-links-qr.png"
PHOTO = ROOT / "public" / "products" / "capri-pink-bust.webp"
DISPLAY = ROOT / "assets" / "fonts" / "CormorantGaramond.ttf"
BODY = ROOT / "assets" / "fonts" / "Manrope.ttf"
DESTINATION = "https://edengracejewelry.com/links/"

CREAM = HexColor("#fdf7f2")
COCOA = HexColor("#4a3b38")
ROSE = HexColor("#98474b")
SAGE = HexColor("#5c7563")
BRASS = HexColor("#ba863f")
MUTED = HexColor("#7a6862")


def draw_cover(c: canvas.Canvas, image_path: Path, x: float, y: float, width: float, height: float) -> None:
    image = ImageReader(str(image_path))
    iw, ih = image.getSize()
    scale = max(width / iw, height / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    path = c.beginPath()
    path.rect(x, y, width, height)
    c.clipPath(path, stroke=0, fill=0)
    c.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, width=dw, height=dh, mask="auto")
    c.restoreState()


def draw_mark(c: canvas.Canvas, cx: float, cy: float, radius: float) -> None:
    colors = [ROSE, ROSE, BRASS, CREAM, ROSE, ROSE, ROSE, ROSE, ROSE, ROSE, ROSE, ROSE]
    sizes = [2.4, 2.1, 2.7, 2.2, 2.8, 2.1, 2.5, 2.0, 2.6, 2.2, 2.8, 2.1]
    import math
    for i, (color, size) in enumerate(zip(colors, sizes)):
        angle = math.radians(360 * i / len(colors) - 90)
        c.setFillColor(color)
        c.setStrokeColor(COCOA if color == CREAM else color)
        c.setLineWidth(0.5)
        c.circle(cx + math.cos(angle) * radius, cy + math.sin(angle) * radius, size, stroke=1, fill=1)
    c.setStrokeColor(BRASS)
    c.setLineWidth(1.2)
    c.circle(cx - 2, cy + radius + 6, 2.5, stroke=1, fill=0)
    c.line(cx + 3, cy + radius + 6, cx + 10, cy + radius + 6)


def create() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    QR.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "qrencode", "-l", "H", "-m", "4", "-s", "20", "-o", str(QR), DESTINATION
    ], check=True)

    pdfmetrics.registerFont(TTFont("Cormorant", str(DISPLAY)))
    pdfmetrics.registerFont(TTFont("Manrope", str(BODY)))

    width, height = letter
    c = canvas.Canvas(str(OUT), pagesize=letter, pageCompression=1)
    c.setTitle("Eden Grace Jewelry Co. links flyer")
    c.setAuthor("Eden Grace Jewelry Co.")
    c.setSubject("Scan to shop and follow Eden Grace Jewelry Co.")

    c.setFillColor(CREAM)
    c.rect(0, 0, width, height, stroke=0, fill=1)

    photo_y = 360
    draw_cover(c, PHOTO, 0, photo_y, width, height - photo_y)

    # A restrained overlay makes the wordmark legible without flattening the photograph.
    c.setFillColor(Color(0.29, 0.23, 0.22, alpha=0.78))
    c.roundRect(38, height - 84, 246, 42, 12, stroke=0, fill=1)
    draw_mark(c, 61, height - 63, 9)
    c.setFillColor(CREAM)
    c.setFont("Cormorant", 20)
    c.drawString(82, height - 69, "Eden Grace Jewelry Co.")

    # Hairline transition between photography and the tactile paper field.
    c.setStrokeColor(BRASS)
    c.setLineWidth(1.5)
    c.line(0, photo_y, width, photo_y)

    c.setFillColor(COCOA)
    c.setFont("Cormorant", 34)
    c.drawString(46, 304, "Made by hand.")
    c.drawString(46, 270, "Chosen with heart.")

    c.setFillColor(MUTED)
    c.setFont("Manrope", 9.5)
    c.drawString(48, 235, "BEADED GEMSTONE NECKLACES")
    c.drawString(48, 219, "SMALL BATCHES  •  MADE TO ORDER")

    c.setFillColor(COCOA)
    c.setFont("Manrope", 8.6)
    c.drawString(48, 178, "SCAN TO SHOP & FOLLOW")
    c.setFillColor(MUTED)
    c.setFont("Manrope", 8.2)
    c.drawString(48, 159, "Instagram  •  TikTok  •  Website")

    qr_size = 146
    qr_x, qr_y = width - qr_size - 43, 139
    c.setFillColor(HexColor("#ffffff"))
    c.roundRect(qr_x - 11, qr_y - 11, qr_size + 22, qr_size + 22, 10, stroke=0, fill=1)
    c.drawImage(str(QR), qr_x, qr_y, width=qr_size, height=qr_size, mask="auto")

    # Three beads bridge the print piece back to the strand motif on the page.
    for x, color, size in [(52, ROSE, 5), (68, SAGE, 4), (81, BRASS, 3.5)]:
        c.setFillColor(color)
        c.circle(x, 117, size, stroke=0, fill=1)

    c.setFillColor(COCOA)
    c.rect(0, 0, width, 80, stroke=0, fill=1)
    c.setFillColor(CREAM)
    c.setFont("Manrope", 10)
    c.drawString(46, 47, "EDENGRACEJEWELRY.COM")
    c.setFont("Manrope", 7.5)
    c.setFillColor(HexColor("#dbc2b1"))
    c.drawRightString(width - 46, 47, "STRUNG BY HAND IN BEDFORD, TEXAS")

    c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    create()
