#!/usr/bin/env bash
# Upload content/shared/geo to the assets bucket, in two passes.
#
# The GeoJSON needs a content type CloudFront will compress (`sand-pmz.43`).
# `application/geo+json` is RFC 7946's type and what the `.geojson` extension
# maps to, so it is what `aws s3 sync` sets — but it is not on CloudFront's
# fixed list of compressible types, and those files shipped raw:
#
#   1914.geojson          229,098 bytes on the wire, 40 kB gzipped
#   western-front.geojson 185,075 bytes on the wire, 10 kB gzipped
#
# about 17% of a campaign cold load. Nothing reads the MIME: `borders.ts` and
# `front.ts` both call `res.json()`.
#
# `cp --recursive` and not `sync` for the second pass, deliberately: `sync`
# skips objects whose size and timestamp are unchanged, so it would leave every
# existing file with the old content type and fix nothing. Geo data is a couple
# of megabytes and changes rarely, so re-uploading it each deploy is cheap.
#
# One script rather than the same two commands in deploy.yml and preview.yml,
# which write to the SAME assets bucket — if they disagreed, whichever ran last
# would decide the content type.
#
# Usage: deploy-geo.sh <assets-bucket-name>
set -euo pipefail

bucket="${1:?usage: deploy-geo.sh <assets-bucket-name>}"
dest="s3://${bucket}/geo"
cache="public, max-age=3600"

aws s3 sync content/shared/geo "$dest" \
  --no-progress --cache-control "$cache" --exclude "*.geojson"

aws s3 cp content/shared/geo "$dest" \
  --recursive --no-progress --cache-control "$cache" \
  --exclude "*" --include "*.geojson" --content-type application/json
