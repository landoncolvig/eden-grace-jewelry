# Project History

## 2026-09-11 - Branded link card and QR flyer

- Added a self-contained `/links/` page using the storefront palette, typography, logo, Jenna portrait, and verified Instagram and TikTok profiles.
- Added `/links/` to the generated sitemap and hid storefront navigation on the focused card route.
- Added a reproducible US Letter flyer generator, licensed font sources, and final PDF/PNG outputs. The QR directly encodes `https://edengracejewelry.com/links/`.
- Verification: new page ESLint passed; Next.js static production build passed; prerendered HTML contains all three destinations; 390x844 and 1440x1100 screenshots passed visual review; macOS Vision decoded the QR from both its source image and the rendered flyer PNG to the exact live URL.
- Existing full-repo ESLint failures remain in unrelated configurator, 3D, and CommonJS Cloud Function files.
