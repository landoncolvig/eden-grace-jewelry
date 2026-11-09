# Project History

## 2026-11-09 - Wider storefront and bounded tablet photography deployed

- Landon authorized both audit recommendations. Added the shared Tailwind `--container-storefront: 80rem` token and applied `max-w-storefront` to the header, homepage sections, About, product pages, and footer. The live outer cap is 1280px, with 1216px after desktop padding. Focused page and paragraph caps are unchanged.
- Added shared `.storefront-media` styles to hero, About portrait, and product photographs. Below the 1024px two-column breakpoint, images retain natural proportions with a 640px height cap and a frame that fits the image. Desktop photos continue to fill their column. Updated the hero's sizes hint to reflect the actual layout.
- Local production build and prerender checks passed. ESLint passed for the changed homepage, About, hero, header, and footer files. Configurator ESLint still reports its existing `react-hooks/set-state-in-effect` finding at line 63; the same failure was reproduced against the original HEAD content. No pricing, checkout, backend, credentials, or dependencies changed.
- Source commit `2c49bf5607118cb37c84077d3f309afc4d6785bb` was pushed to main and verified against the remote. GitHub Pages build and deployment succeeded: https://github.com/landoncolvig/eden-grace-jewelry/actions/runs/42682116220.
- Verified canonical production HTML and its new stylesheet, then measured local and production layouts at 320-2560px, including both sides of the 1024px breakpoint. Shared caps/alignment, image bounds and natural aspect ratios, and page overflow checks passed. At 1023px, the hero is now 640px square; The Eden photo is approximately 427px by 640px rather than 957px by 1434px. No measured document overflow.
- Browser evidence uses live Chromium DOM geometry and computed styles. Automated DOM screenshots retain known text-rendering artifacts; these were not treated as accurate pixel evidence. No Safari, real-device, populated-cart, or completed-payment verification was performed for this layout-only change.
- Release report and raw receipts: `/Users/qb/Documents/Codex/2026-11-09/ca/outputs/eden-grace-layout-release.txt`, `local-width-verification.json`, and `production-width-verification.json` in the same outputs directory. No required implementation or deployment work remains.

## 2026-11-09 - Live max-width audit

- Audited the live homepage, About, two representative product pages, empty cart, confirmation without an order identifier, and Links at CSS viewport widths from 320px through 2560px, including both sides of the 1024px layout breakpoint. Used same-origin iframe viewports with loaded fonts and a hydration delay, without resizing browser windows.
- Main storefront wrappers consistently resolve to 1152px including desktop padding, leaving 1088px of usable content. Cart is 1024px, confirmation 672px, and the Links card 496px. Header, main storefront sections, and footer align. No document-level horizontal overflow appeared in these measured states.
- Largest improvement: stacked imagery lacks a separate tablet cap. At 1023px, the hero is 959px square and The Eden photo is 957px by 1434px; at 1024px, their widths fall to approximately 469px and 494px. Recommend independent stacked-media limits before deciding whether to widen the desktop shell. The 1152px shell's wide-screen gutters are expected behavior, not a broken max-width rule.
- Audit only. No storefront implementation, deployment, checkout, or configuration changes. Populated cart, completed purchase, browser zoom, Safari, and real devices were not tested. DOM screenshots showed renderer artifacts and compositor capture was permission-blocked; conclusions use live geometry, computed CSS, and source inspection.
- Report: `/Users/qb/Documents/Codex/2026-11-09/ca/outputs/eden-grace-max-width-audit.txt`. Raw measurements: `/Users/qb/Documents/Codex/2026-11-09/ca/outputs/eden-grace-width-measurements.json`.

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

## 2026-09-11 - Link card logo replacement

- Replaced Jenna's portrait on `/links/` with the same necklace-mark logo component used by the storefront.
- Removed the smaller duplicate mark beside the Eden Grace wordmark.
- Verification: targeted ESLint and the Next.js production build passed; the static HTML contains the large logo SVG and no portrait reference.
