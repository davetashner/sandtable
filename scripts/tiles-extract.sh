#!/usr/bin/env bash
# Build a regional PMTiles extract from the Protomaps planet build and upload
# it to the assets bucket (ADR 0002/0004). Tiles are OpenStreetMap data under
# ODbL; the Protomaps build is a free daily artifact — never hotlink it, copy.
#
#   scripts/tiles-extract.sh <name> <west,south,east,north> <maxzoom> [build-date]
#   scripts/tiles-extract.sh central-europe-z10 -1.5,42,24,56 10
#   scripts/tiles-extract.sh central-europe-z10 -1.5,42,24,56 10 20260827
#
# The build date is discovered, not pinned. Protomaps publishes a planet build
# daily and retires old ones, so a date hard-coded here becomes a 404 with no
# explanation — which is exactly what happened to the 20260821 that used to be
# the default. Omit the argument and the script walks back from today for the
# newest build still being served; pass one to force a specific build.
#
# Needs the pmtiles CLI (brew install pmtiles) and the sandtable-deployer AWS
# profile. The app reads /assets/tiles/<name>.pmtiles (src/engine/map/tiles.ts),
# and a pack asks for one by name. A new extract therefore needs three records
# as well as the upload: docs/decisions/0002-geography.md (why),
# content/shared/geo/tiles/manifest.json (what), and TILE_ARCHIVES in
# src/packs/schema/tiles.ts + `npm run schema` (so a pack may name it).
set -euo pipefail

name=${1:?name, e.g. central-europe-z10}
bbox=${2:?bbox west,south,east,north}
maxzoom=${3:?maxzoom}
bucket=${ASSETS_BUCKET:-sandtable-assets-205074708100}
profile=${AWS_PROFILE:-sandtable-deployer}
out=${TMPDIR:-/tmp}/$name.pmtiles

# Ask the server which builds it still has, newest first, rather than trusting a
# date written down weeks ago. A HEAD is one request and costs nothing next to
# the multi-hundred-megabyte extract that follows.
newest_build() {
  local d code
  for back in $(seq 0 "${PROTOMAPS_LOOKBACK:-30}"); do
    if date -v-1d +%Y%m%d >/dev/null 2>&1; then
      d=$(date -v-"${back}"d +%Y%m%d)          # BSD date (macOS)
    else
      d=$(date -d "-${back} day" +%Y%m%d)      # GNU date (Linux, CI)
    fi
    code=$(curl -sS -o /dev/null -w '%{http_code}' -r 0-0 \
      "https://build.protomaps.com/$d.pmtiles" || echo 000)
    case "$code" in 200 | 206) echo "$d"; return 0 ;; esac
  done
  return 1
}

if [ "${4-}" ]; then
  build=$4
else
  echo "→ finding the newest Protomaps build (none given)" >&2
  build=$(newest_build) || {
    echo "no Protomaps build found in the last ${PROTOMAPS_LOOKBACK:-30} days." >&2
    echo "Check https://build.protomaps.com/ and pass a date as the 4th argument." >&2
    exit 1
  }
  echo "→ using build $build" >&2
fi

echo "→ extracting $name bbox=$bbox z≤$maxzoom from build $build"
pmtiles extract "https://build.protomaps.com/$build.pmtiles" "$out" --bbox="$bbox" --maxzoom="$maxzoom"
pmtiles show "$out" | head -12

echo "→ uploading to s3://$bucket/tiles/$name.pmtiles"
AWS_PROFILE=$profile aws s3 cp "$out" "s3://$bucket/tiles/$name.pmtiles" \
  --content-type application/vnd.pmtiles --cache-control "public, max-age=86400" --only-show-errors
echo "done: https://sandtable.davetashner.com/assets/tiles/$name.pmtiles"
