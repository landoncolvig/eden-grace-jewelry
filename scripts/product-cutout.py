"""
Turn a phone snapshot of a necklace into a catalog image on the site cream.

Recipe from reference_rembg_birefnet_product_cutouts: birefnet-general, alpha
matting off, cut -> crop to alpha bbox -> flat-field -> levels -> composite.

  python cutout.py <source> <out-stem> [flat_strength]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageStat, ImageChops

# Must stay in sync with --color-bench in app/globals.css. If the palette moves
# and the photos do not, every product becomes a coloured rectangle.
BENCH = (253, 247, 242)
FULL, SMALL = 1500, 600

src_path, out_stem = sys.argv[1], sys.argv[2]
FLAT_STRENGTH = float(sys.argv[3]) if len(sys.argv) > 3 else 0.85

from rembg import remove, new_session

src = Image.open(src_path).convert("RGB")
cut = remove(src, session=new_session("birefnet-general"), alpha_matting=False)

alpha = cut.getchannel("A")
bbox = alpha.getbbox()
if not bbox:
    sys.exit("mask kept nothing")

frac = (np.asarray(alpha) > 8).mean()
print(f"mask kept {frac*100:.2f}% of frame")
if not (0.004 <= frac <= 0.55):
    sys.exit(f"cut looks wrong at {frac*100:.2f}%; an honest uncut photo beats a bad cut")

cut = cut.crop(bbox)

# Square canvas, padded, so a wide strand keeps both ends.
side = int(max(cut.size) * 1.16)
sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
sq.paste(cut, ((side - cut.width) // 2, (side - cut.height) // 2))
cut = sq

rgb = np.asarray(cut.convert("RGB")).astype(np.float32)
mask = (np.asarray(cut.getchannel("A")) > 128).astype(np.float32)

# ── Flat-field the illumination ──────────────────────────────────────────────
#
# Jenna shot this on a board with a shadow across it, so one side of the strand
# reads mint and the other olive. That is the light, not the beads.
#
# The illumination is estimated as a heavily blurred copy and divided out. The
# blur must ignore the cut-away background, so it is a normalized convolution,
# blur(image x mask) / blur(mask); a plain blur would drag the transparent edge
# inward and darken the strand's outline.
#
# Estimated at low resolution and scaled back up. That is faster, and it also
# guarantees the field is smooth: only the low-frequency lighting is removed,
# and bead-to-bead colour survives. Natural stone varying is the thing the site
# tells buyers to expect, so flattening that would be a lie about the product.
if FLAT_STRENGTH > 0:
    EST = 128
    small_rgb = np.asarray(
        Image.fromarray(rgb.astype(np.uint8)).resize((EST, EST), Image.BILINEAR)
    ).astype(np.float32)
    small_m = np.asarray(
        Image.fromarray((mask * 255).astype(np.uint8)).resize((EST, EST), Image.BILINEAR)
    ).astype(np.float32) / 255.0

    # PIL cannot Gaussian-blur mode "F", and rounding the field through uint8
    # would quantise the gain. Separable convolution instead; at 128px it is
    # instant. Zero padding at the border is fine because the same kernel is
    # applied to the mask and the two cancel in the division below.
    def blur(arr, r):
        n = max(3, int(r * 3) | 1)
        x = np.arange(n) - n // 2
        k = np.exp(-(x ** 2) / (2 * r * r))
        k /= k.sum()
        out = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 0, arr)
        return np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 1, out)

    R = EST * 0.14                        # >> one bead, << the whole strand
    mb = blur(small_m, R)
    field = np.zeros_like(small_rgb)
    for c in range(3):
        field[:, :, c] = blur(small_rgb[:, :, c] * small_m, R) / np.maximum(mb, 1e-3)

    # Per-channel target, so the correction removes the colour cast of the
    # shadow as well as its darkness.
    targets = [
        (small_rgb[:, :, c] * small_m).sum() / max(small_m.sum(), 1e-3) for c in range(3)
    ]

    gain_small = np.stack(
        [np.clip(targets[c] / np.maximum(field[:, :, c], 1e-3), 0.6, 1.7) for c in range(3)],
        axis=-1,
    )
    gain_small = 1.0 + (gain_small - 1.0) * FLAT_STRENGTH

    gain = np.stack(
        [
            np.asarray(
                Image.fromarray(gain_small[:, :, c], mode="F").resize(
                    cut.size, Image.BICUBIC
                )
            )
            for c in range(3)
        ],
        axis=-1,
    )
    rgb = np.clip(rgb * gain, 0, 255)
    print(
        f"flat-field: radius {R:.0f}/{EST}px, strength {FLAT_STRENGTH}, "
        f"gain {gain.min():.2f}-{gain.max():.2f}"
    )

rgb_img = Image.fromarray(rgb.astype(np.uint8))
a = cut.getchannel("A")

# One shared factor across all three channels, so the lift cannot shift hue.
# No grey-world white balance: the mask leaves only the necklace, which is
# mostly green, so grey-world reads the product's own colour as a cast and
# corrects it away. It turned the beads teal and the pearls lilac.
lum = ImageStat.Stat(rgb_img.convert("L"), a.point(lambda p: 255 if p > 128 else 0))
gain = min(1.18, max(1.0, 186.0 / max(lum.mean[0], 1)))
rgb_img = Image.merge("RGB", [c.point(lambda v: min(255, int(v * gain))) for c in rgb_img.split()])
print(f"levels x{gain:.3f} (shared across channels, hue preserved)")

cut = Image.merge("RGBA", (*rgb_img.split(), a))

# Composite: bench ground, faint radial lift, offset blurred shadow, product.
base = Image.new("RGB", cut.size, BENCH)
yy, xx = np.mgrid[0:cut.height, 0:cut.width]
d = np.sqrt((xx - cut.width / 2) ** 2 + (yy - cut.height / 2) ** 2) / (max(cut.size) * 0.62)
lift = Image.fromarray((np.clip(1 - d, 0, 1) * 26).astype(np.uint8), mode="L").filter(
    ImageFilter.GaussianBlur(cut.width * 0.05)
)
base = Image.composite(Image.new("RGB", cut.size, (255, 252, 248)), base, lift)

shadow = Image.new("RGBA", cut.size, (0, 0, 0, 0))
shadow.paste((60, 45, 38, 46), (0, 0), a)
shadow = shadow.filter(ImageFilter.GaussianBlur(cut.width * 0.014))
base.paste(shadow, (int(cut.width * 0.004), int(cut.height * 0.009)), shadow)
base.paste(cut, (0, 0), cut)

for size, suffix in ((FULL, ""), (SMALL, "-sm")):
    base.resize((size, size), Image.LANCZOS).save(
        f"{out_stem}{suffix}.webp", "WEBP", quality=88, method=6
    )
    print(f"wrote {out_stem}{suffix}.webp  {size}x{size}")
