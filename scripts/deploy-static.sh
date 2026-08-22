#!/usr/bin/env bash
# Sync a Vite build to S3 with the cache policy the hosting stack expects.
#   usage: scripts/deploy-static.sh <dist-dir> <s3://bucket[/prefix]>
#
# Hashed bundles under app/ are immutable (one year); everything else —
# index.html, files copied from public/ — is revalidated on every request and
# the deploy workflow invalidates CloudFront after syncing. Two passes so that
# `--delete` still removes stale files in both groups.
set -euo pipefail

dist=${1:?dist dir}
dest=${2:?s3 destination}
dest=${dest%/}

if [ ! -f "$dist/index.html" ]; then
  echo "no $dist/index.html — run the build first" >&2
  exit 1
fi

echo "→ $dest/app/ (immutable)"
aws s3 sync "$dist/app/" "$dest/app/" --delete --no-progress \
  --cache-control "public, max-age=31536000, immutable"

echo "→ $dest/ (revalidate)"
aws s3 sync "$dist/" "$dest/" --delete --no-progress --exclude "app/*" \
  --cache-control "public, max-age=0, must-revalidate"
