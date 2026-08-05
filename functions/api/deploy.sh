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
RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT:-jennas-jewelry-runtime@${PROJECT}.iam.gserviceaccount.com}"
BUILD_SERVICE_ACCOUNT="${BUILD_SERVICE_ACCOUNT:-jennas-jewelry-build@${PROJECT}.iam.gserviceaccount.com}"
# Resolve the account once, then pin every command to it. Only the two approved
# maintainers may deploy this function from the script.
ACCOUNT="${GCLOUD_ACCOUNT:-$(gcloud config get-value account --quiet 2>/dev/null)}"
case "$ACCOUNT" in
  colviglandon@gmail.com|jennacolvig@gmail.com) ;;
  *)
    echo "Set GCLOUD_ACCOUNT to an approved Eden Grace maintainer account." >&2
    exit 1
    ;;
esac
# The service URL is stable for this deployed function. Supplying it here keeps
# Square's signed webhook URL exact across deployments.
API_BASE_URL="${API_BASE_URL:-https://jennas-jewelry-api-qrowd7xcqq-uc.a.run.app}"
SQUARE_WEBHOOK_URL="${SQUARE_WEBHOOK_URL:-${API_BASE_URL}/webhook}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

echo "==> Syncing shared/ into the function source"
rm -rf ./shared
cp -R ../../shared ./shared

# Public invoker access is configured once on the live function. Routine
# deploys preserve it, so limited deployers do not need permission to rewrite
# the function's IAM policy.
echo "==> Deploying ${NAME} to ${PROJECT} (${REGION}) as ${ACCOUNT}"
gcloud functions deploy "$NAME" \
  --account="$ACCOUNT" \
  --project="$PROJECT" \
  --region="$REGION" \
  --gen2 \
  --runtime=nodejs22 \
  --service-account="$RUNTIME_SERVICE_ACCOUNT" \
  --build-service-account="projects/${PROJECT}/serviceAccounts/${BUILD_SERVICE_ACCOUNT}" \
  --source=. \
  --entry-point=api \
  --trigger-http \
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
