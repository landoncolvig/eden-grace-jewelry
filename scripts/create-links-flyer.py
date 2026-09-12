#!/usr/bin/env python3
"""Create the Eden Grace /links flyer as a US Letter PDF."""

from pathlib import Path
import subprocess

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "eden-grace-links-flyer.pdf"
QR = ROOT / "tmp" / "pdfs" / "eden-grace-links-qr.png"
DISPLAY = ROOT / "assets" / "fonts" / "CormorantGaramond.ttf"
BODY = ROOT / "assets" / "fonts" / "Manrope.ttf"
DESTINATION = "https://edengracejewelry.com/links/"

CREAM = HexColor("#fdf7f2")
COCOA = HexColor("#4a3b38")
ROSE = HexColor("#98474b")
SAGE = HexColor("#5c7563")
BRASS = HexColor("#ba863f")
MUTED = HexColor("#7a6862")


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

    # Oversized strand lines give the paper a branded jewelry detail without photography.
    c.setStrokeColor(HexColor("#e7d2bf"))
    c.setLineWidth(1.1)
    c.circle(-68, 500, 188, stroke=1, fill=0)
    c.circle(width + 88, 262, 208, stroke=1, fill=0)

    draw_mark(c, width / 2, 696, 16)
    c.setFillColor(COCOA)
    c.setFont("Cormorant", 42)
    c.drawCentredString(width / 2, 637, "Eden Grace")
    c.setFillColor(MUTED)
    c.setFont("Manrope", 10)
    c.drawCentredString(width / 2, 610, "J E W E L R Y   C O .")

    qr_size = 232
    qr_x, qr_y = (width - qr_size) / 2, 320
    c.setFillColor(HexColor("#ffffff"))
    c.roundRect(qr_x - 16, qr_y - 16, qr_size + 32, qr_size + 32, 14, stroke=0, fill=1)
    c.drawImage(str(QR), qr_x, qr_y, width=qr_size, height=qr_size, mask="auto")

    c.setFillColor(COCOA)
    c.setFont("Manrope", 9)
    c.drawCentredString(width / 2, 279, "SCAN FOR LINKS")

    c.setStrokeColor(HexColor("#dbc9bc"))
    c.setLineWidth(0.7)
    c.line(158, 247, width - 158, 247)

    c.setFillColor(MUTED)
    c.setFont("Manrope", 8.5)
    c.drawCentredString(width / 2, 214, "EDENGRACEJEWELRY.COM")
    c.drawCentredString(width / 2, 190, "INSTAGRAM  @EDENGRACEJEWELRYCO")
    c.drawCentredString(width / 2, 166, "TIKTOK  @EDEN.GRACE.JEWELR")

    for x, color, size in [(width / 2 - 14, ROSE, 4), (width / 2, SAGE, 3.5), (width / 2 + 13, BRASS, 3)]:
        c.setFillColor(color)
        c.circle(x, 125, size, stroke=0, fill=1)

    c.setFillColor(COCOA)
    c.rect(0, 0, width, 70, stroke=0, fill=1)
    c.setFillColor(CREAM)
    c.setFont("Cormorant", 17)
    c.drawCentredString(width / 2, 27, "Eden Grace Jewelry Co.")

    c.showPage()
    c.save()
    print(OUT)


if __name__ == "__main__":
    create()
