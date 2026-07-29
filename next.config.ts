import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // GitHub Pages serves files, not a Node server. Everything here has to be
  // pre-rendered at build time into ./out. The Square and USPS calls live in
  // the Cloud Function under ./functions/api, not in this app.
  output: 'export',

  // Emits /cart/index.html instead of /cart.html, which is what GitHub Pages
  // expects when it resolves a directory URL.
  trailingSlash: true,

  images: {
    // No image optimization server exists on Pages, so ship the files as-is.
    // Product photos should be exported at the right size before they land in
    // /public rather than being resized at request time.
    unoptimized: true,
  },
};

export default nextConfig;
