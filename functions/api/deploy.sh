#!/usr/bin/env bash
#
# Deploy the Eden Grace Jewelry API to Cloud Functions gen2.
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
# The service URL is stable for this deployed function. Supplying it here keeps
# Square's signed webhook URL exact across deployments.
API_BASE_URL="${API_BASE_URL:-https://jennas-jewelry-api-qrowd7xcqq-uc.a.run.app}"
SQUARE_WEBHOOK_URL="${SQUARE_WEBHOOK_URL:-${API_BASE_URL}/webhook}"

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
  --set-env-vars="SITE_URL=https://edengracejewelry.com,SQUARE_WEBHOOK_URL=${SQUARE_WEBHOOK_URL},SQUARE_LOCATION_ID=L9TN6YV1BZ8MF" \
  --set-secrets="SQUARE_ACCESS_TOKEN=jj-square-access-token:latest,SQUARE_WEBHOOK_SIGNATURE_KEY=jj-square-webhook-signature-key:latest,SHIPPO_TOKEN=jj-shippo-token:latest,GMAIL_OAUTH=jj-gmail-oauth:latest,ORIGIN_JSON=jj-origin:latest"

echo
echo "==> Deployed. Endpoint:"
gcloud functions describe "$NAME" \
  --account="$ACCOUNT" --project="$PROJECT" --region="$REGION" --gen2 \
  --format='value(serviceConfig.uri)'

echo
echo "Point NEXT_PUBLIC_API_BASE at that URL, then rebuild the site."
