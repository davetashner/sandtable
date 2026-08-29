#!/usr/bin/env bash
# Sync a Vite build to S3 with the cache policy the hosting stack expects.
#   usage: scripts/deploy-static.sh <dist-dir> <s3://bucket[/prefix]>
#
# Hashed bundles under app/ and the content-hashed pack bundle under pack/
# (ADR 0018) are immutable (one year); everything else — index.html, files
# copied from public/ — is revalidated on every request and the deploy workflow
# invalidates CloudFront after syncing. Separate passes so that `--delete`
# still removes stale files in every group.
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

echo "→ $dest/pack/ (immutable)"
aws s3 sync "$dist/pack/" "$dest/pack/" --delete --no-progress \
  --cache-control "public, max-age=31536000, immutable"

# `.vite/manifest.json` is a build artefact the bundle budget reads (ADR 0024);
# nothing serves it, so it does not go up.
echo "→ $dest/ (revalidate)"
aws s3 sync "$dist/" "$dest/" --delete --no-progress \
  --exclude "app/*" --exclude "pack/*" --exclude ".vite/*" \
  --cache-control "public, max-age=0, must-revalidate"
