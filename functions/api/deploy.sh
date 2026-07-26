#!/usr/bin/env bash
#
# Deploy the jennasjewelry.com API to Cloud Functions gen2.
#
# shared/ is the single source of prices and is imported by both the storefront
# and this function. gcloud only uploads the source directory, so it gets copied
# in here at deploy time rather than symlinked. The copy is regenerated on every
# deploy and gitignored, so the two halves cannot drift.
#
set -euo pipefail

PROJECT="${GCP_PROJECT:-dayta-analytics-sandbox}"
REGION="${REGION:-us-central1}"
NAME="${NAME:-jennas-jewelry-api}"
# The active gcloud account flips between terminals, so pin it per invocation
# rather than trusting whatever is currently configured.
ACCOUNT="${GCLOUD_ACCOUNT:-colviglandon@gmail.com}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

echo "==> Syncing shared/ into the function source"
rm -rf ./shared
cp -R ../../shared ./shared

echo "==> Deploying ${NAME} to ${PROJECT} (${REGION}) as ${ACCOUNT}"
gcloud functions deploy "$NAME" \
  --account="$ACCOUNT" \
  --project="$PROJECT" \
  --region="$REGION" \
  --gen2 \
  --runtime=nodejs22 \
  --source=. \
  --entry-point=api \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MiB \
  --timeout=30s \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="SITE_URL=https://jennasjewelry.com" \
  --set-secrets="STRIPE_SECRET_KEY=jj-stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=jj-stripe-webhook-secret:latest,SHIPPO_TOKEN=jj-shippo-token:latest"

echo
echo "==> Deployed. Endpoint:"
gcloud functions describe "$NAME" \
  --account="$ACCOUNT" --project="$PROJECT" --region="$REGION" --gen2 \
  --format='value(serviceConfig.uri)'

echo
echo "Point NEXT_PUBLIC_API_BASE at that URL, then rebuild the site."
