# Eden Grace Jewelry Co.

Custom-necklace storefront. GitHub Pages serves the static Next.js site. A
single Cloud Function keeps payment and shipping credentials private.

```
edengracejewelry.com   GitHub Pages static export
functions/api/         Square checkout, Shippo rate and label workflow
shared/                catalog and server-side pricing rules
```

## Checkout flow

The browser sends product IDs, specifications, quantities, and a destination
ZIP. It never sends a price that the server trusts. `shared/pricing.js` runs in
both the site and the function, and the function recalculates each product,
shipping rate, and total before it creates a Square hosted payment link.

Square collects the shipping address and card details on its own hosted page.
The storefront never handles card data. Square redirects a paid buyer to
`/success/` and sends a signed `payment.updated` webhook to the function. The
function retrieves the completed payment and order, then emails Jenna the
bench-ready custom specification.

## Shipping and labels

Shippo supplies a live USPS Ground Advantage rate from the buyer ZIP. A quote
is cached by ZIP3 for 12 hours. If Shippo is unavailable, checkout uses the
catalog's conservative fallback rate instead of blocking a sale.

Postage is bought only when Jenna finishes a piece. Her order email includes a
signed label link. Before Shippo is called, the function writes a label claim
to the open Square order. The claim prevents a second browser click from buying
another label. The completed Shippo transaction ID is stored back on that order
and later clicks retrieve the existing label.

The ship-from address is held in Secret Manager as `jj-origin`. It is never
committed to this public repository.

## Local development

```bash
npm install
npm run dev

cd functions/api
npm install
cp -R ../../shared ./shared
SQUARE_ACCESS_TOKEN=replace-me \
SQUARE_LOCATION_ID=replace-me \
SQUARE_WEBHOOK_SIGNATURE_KEY=replace-me \
SQUARE_WEBHOOK_URL=http://localhost:8080/webhook \
LABEL_SIGNING_KEY=dev-only-key \
API_BASE_URL=http://localhost:8080 \
SITE_URL=http://localhost:3000 \
npm run dev
```

Use a Square Sandbox access token for live checkout experiments. Production
access tokens belong only in Secret Manager.

## Production secrets

The function deployment binds these secrets:

- `jj-square-access-token`
- `jj-square-webhook-signature-key`
- `jj-shippo-token`
- `jj-gmail-oauth`
- `jj-label-signing-key`
- `jj-origin`

The production Square location ID and the exact webhook URL are ordinary
function environment variables. They are not browser variables and do not ship
in the Pages bundle.

## Deploy

```bash
cd functions/api
./deploy.sh

cd ../..
git push origin main
```

The GitHub Actions workflow publishes the static export on each push to
`main`. The function and Pages site use the same public API base URL.

## Layout

```
shared/            catalog.js, pricing.js
app/               static routes
components/        storefront UI
functions/api/     Cloud Function, Square, Shippo, mail
.github/workflows/ GitHub Pages deployment
```
