#!/usr/bin/env bash
# Build a regional PMTiles extract from the Protomaps planet build and upload
# it to the assets bucket (ADR 0002/0004). Tiles are OpenStreetMap data under
# ODbL; the Protomaps build is a free daily artifact — never hotlink it, copy.
#
#   scripts/tiles-extract.sh <name> <west,south,east,north> <maxzoom> [build-date]
#   scripts/tiles-extract.sh western-europe-z10 -1.5,46,10.5,53 10 20260821
#
# Needs the pmtiles CLI (brew install pmtiles) and the sandtable-deployer AWS
# profile. The app reads /assets/tiles/<name>.pmtiles (see
# src/engine/map/style.ts DEFAULT_TILES_URL); record new extracts in
# docs/decisions/0002-geography.md.
set -euo pipefail

name=${1:?name, e.g. western-europe-z10}
bbox=${2:?bbox west,south,east,north}
maxzoom=${3:?maxzoom}
build=${4:-20260821}
bucket=${ASSETS_BUCKET:-sandtable-assets-205074708100}
profile=${AWS_PROFILE:-sandtable-deployer}
out=${TMPDIR:-/tmp}/$name.pmtiles

echo "→ extracting $name bbox=$bbox z≤$maxzoom from build $build"
pmtiles extract "https://build.protomaps.com/$build.pmtiles" "$out" --bbox="$bbox" --maxzoom="$maxzoom"
pmtiles show "$out" | head -12

echo "→ uploading to s3://$bucket/tiles/$name.pmtiles"
AWS_PROFILE=$profile aws s3 cp "$out" "s3://$bucket/tiles/$name.pmtiles" \
  --content-type application/vnd.pmtiles --cache-control "public, max-age=86400" --only-show-errors
echo "done: https://sandtable.davetashner.com/assets/tiles/$name.pmtiles"
