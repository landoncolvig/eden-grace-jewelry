# Project History

## 2026-09-11 - Branded link card and QR flyer

- Added a self-contained `/links/` page using the storefront palette, typography, logo, Jenna portrait, and verified Instagram and TikTok profiles.
- Added `/links/` to the generated sitemap and hid storefront navigation on the focused card route.
- Added a reproducible US Letter flyer generator, licensed font sources, and final PDF/PNG outputs. The QR directly encodes `https://edengracejewelry.com/links/`.
- Verification: new page ESLint passed; Next.js static production build passed; prerendered HTML contains all three destinations; 390x844 and 1440x1100 screenshots passed visual review; macOS Vision decoded the QR from both its source image and the rendered flyer PNG to the exact live URL.
- Existing full-repo ESLint failures remain in unrelated configurator, 3D, and CommonJS Cloud Function files.

## 2026-09-11 - Simplified QR flyer

- Removed the product photo, tagline, product description, and location copy from the Eden Grace flyer.
- Rebuilt the flyer around the brand mark, QR code, website, Instagram handle, and TikTok handle.
- Verification: the revised PDF rendered cleanly at 200 DPI; extracted text contains only factual labels; macOS Vision decoded the rendered QR to `https://edengracejewelry.com/links/`.

## 2026-09-11 - Simplified link card copy

- Removed the tagline, product description, and Bedford location footer from `/links/`.
- Simplified page metadata to describe the three linked destinations directly.
- Verification: targeted ESLint and the Next.js production build passed.
