# Eden Grace Jewelry Co.

Storefront for custom-made necklaces. Static site on GitHub Pages, one Cloud
Function for anything that needs a secret.

```
edengracejewelry.com          GitHub Pages, static export of this Next.js app
<function URL>             Cloud Function gen2: Stripe, USPS rating, order email
```

## Why it's split

GitHub Pages serves files, not code. Stripe Checkout needs a secret key to
create a session, and that key can never reach the browser, so the parts that
hold secrets live in `functions/api/`. The storefront calls it over CORS.

## Where prices live

`shared/catalog.js` is the only place a price is written down. Both halves
import it:

- the storefront, to render totals
- the Cloud Function, to decide what to actually charge

The browser sends item ids and a ZIP, never a price. `shared/pricing.js`
re-derives every amount server-side, so editing `localStorage` changes what you
see, not what you pay. Verified: a cart claiming the necklace costs 1 cent
produces a Stripe session charging $48.00.

`shared/` is copied into `functions/api/shared/` at deploy time (see
`deploy.sh`) because gcloud only uploads the source directory. That copy is
gitignored and regenerated on every deploy, so the two halves cannot drift.

## Shipping

USPS repriced Ground Advantage on 2026-07-12: the sub-1-lb commercial tiers
(4oz / 8oz / 12oz / 15.99oz) collapsed into one. Every piece here ships under a
pound, so **weight no longer changes the price** and only the destination zone
does. Rates are cached on ZIP3 for 12 hours, which is why the per-quote cost
rounds to nothing.

Rates come from **Shippo**, not USPS directly. USPS's own API needs CRID/MID
enrollment that takes 1 to 4 weeks, and without an Enterprise Payment Account it
only returns *retail* prices, which run 19-42% above what Jenna actually pays
for the label. Quoting retail would overcharge every customer.

The quote happens in the cart, before Stripe. Stripe's hosted checkout page has
no server callback to recalculate shipping after the customer types an address.
The alternative (embedded checkout with `permissions.update_shipping_details`)
does support live recalculation but silently disables Apple Pay and Google Pay,
which costs more in abandoned mobile carts than the rate precision is worth on a
$48 order.

If Shippo is slow or down, the function falls back to a flat rate rather than
blocking the sale. The fallback is set above the zone-8 price so it is never a
loss, and it is deliberately not cached.

## Labels

Labels are **not** bought at payment time. Pieces take 10 to 14 days to make; a
label bought on day zero spends real money on an order that might be refunded
and carries a ship date two weeks before the parcel exists.

Instead the order email carries an HMAC-signed link. Jenna clicks it when the
piece is finished, and that is when postage is purchased. Idempotency is stored
on the Stripe session (`metadata.label_url`), so a second click or a forwarded
email returns the label already bought instead of buying another.

## Local development

```bash
npm install
npm run dev                       # storefront on :3000

cd functions/api
npm install
cp -R ../../shared ./shared       # deploy.sh does this for you in CI
STRIPE_SECRET_KEY="$(stripe config --list | grep test_mode_api_key | sed "s/.*= *'//;s/'.*//")" \
LABEL_SIGNING_KEY=dev-only-key \
API_BASE_URL=http://localhost:8080 \
SITE_URL=http://localhost:3000 \
npm run dev                       # function on :8080
```

Test card `4242 4242 4242 4242`, any future expiry, any CVC.

To exercise the webhook locally:

```bash
stripe listen --forward-to localhost:8080/webhook
# paste the printed whsec_... into STRIPE_WEBHOOK_SECRET and restart
```

## Still needs provisioning

Nothing below is code. These are accounts and secrets someone has to create.

### 1. Shippo

Sign up at <https://apps.goshippo.com/join>. Same-day, no USPS account needed,
USPS commercial rates active immediately. Take the **live** token, not the test
one: Shippo's test mode returns mock rates for some USPS services. Rating is
about 1c per call; you are not charged for labels until one is bought.

The ship-from address is already set, as the `jj-origin` secret. It is not in
this repo: the repo is public and the origin is a private residence.

### 2. Gmail sending

A service account **cannot** send as an @gmail.com address; domain-wide
delegation requires Google Workspace. The function uses an OAuth refresh token
instead, reusing the client in `~/.claude/skills/gmail/`.

> **Check the OAuth client's publishing status.** If it is still "Testing" in
> the Google Cloud console, consumer refresh tokens expire after **7 days** and
> the order emails will break every week. It has to be "In production".

### 3. GCP secrets

```bash
PROJECT=dayta-analytics-sandbox

# Stripe: swap for sk_live_... when Jenna's own account exists
stripe config --list | grep test_mode_api_key | sed "s/.*= *'//;s/'.*//" \
  | gcloud secrets create jj-stripe-secret-key --data-file=- --project=$PROJECT

printf 'whsec_...' | gcloud secrets create jj-stripe-webhook-secret --data-file=- --project=$PROJECT
printf 'shippo_live_...' | gcloud secrets create jj-shippo-token --data-file=- --project=$PROJECT
openssl rand -hex 32 | gcloud secrets create jj-label-signing-key --data-file=- --project=$PROJECT

# Gmail OAuth, assembled from the existing skill credentials
python3 -c "
import json, os
h = os.path.expanduser('~')
c = json.load(open(h + '/.claude/skills/gmail/client_secret.json'))['installed']
t = json.load(open(h + '/.claude/skills/gmail/tokens.json'))
print(json.dumps({'client_id': c['client_id'], 'client_secret': c['client_secret'], 'refresh_token': t['refresh_token']}))
" | gcloud secrets create jj-gmail-oauth --data-file=- --project=$PROJECT
```

Then deploy:

```bash
cd functions/api && ./deploy.sh
```

Take the printed URL, put it in `.env.production` as `NEXT_PUBLIC_API_BASE`, and
push. Register the same URL + `/webhook` as a Stripe webhook endpoint for
`checkout.session.completed`.

### 4. DNS

Do this **last**, after Pages is serving. Records go in
`hpanel.hostinger.com` → Domains → edengracejewelry.com → DNS. The registrar panel
is the only place that takes effect.

## Layout

```
shared/            catalog.js, pricing.js   <- imported by BOTH halves
app/               routes (static export)
components/        storefront UI
functions/api/     Cloud Function: index.js, orders.js, mailer.js
.github/workflows/ Pages deploy
```
