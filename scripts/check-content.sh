#!/usr/bin/env bash
# Content checks that run in CI before the full scenario-pack validator exists
# (sand-a55.7). Keeps today's content honest:
#   1. every JSON file under content/ parses
#   2. every media.json has the fields the imagery policy requires and is not
#      flagged BLOCKED / UNVERIFIED / UNKNOWN
#   3. no image binaries are tracked in git (they live in S3 — decision 0004)
set -euo pipefail

fail=0
note() { printf '  %s\n' "$*"; }
bad()  { printf '  ✗ %s\n' "$*"; fail=1; }

echo "1) JSON parses"
while IFS= read -r f; do
  if ! jq empty "$f" 2>/dev/null; then bad "invalid JSON: $f"; fi
done < <(find content -name '*.json' -print)

echo "2) media manifests"
while IFS= read -r m; do
  # required, non-empty
  for key in '.id' '.file' '.caption' '.credit' '.original.licence' '.colorization.status' '.content_policy'; do
    v=$(jq -r "$key // empty" "$m")
    if [ -z "$v" ]; then bad "$m: missing $key"; fi
  done
  # archive record: archive_url or an explicit archive description
  if [ "$(jq -r '.original.archive_url // empty' "$m")" = "" ] && [ "$(jq -r '.original.archive // empty' "$m")" = "" ]; then
    bad "$m: no archive record (original.archive_url or original.archive)"
  fi
  # policy flags
  if jq -e '[.original.licence, .colorization.status, .colorization.licence, ."$comment"] | map(tostring) | join(" ") | test("BLOCKED|UNVERIFIED|UNKNOWN|HOLD"; "i")' "$m" >/dev/null; then
    bad "$m: manifest is flagged BLOCKED/UNVERIFIED/UNKNOWN/HOLD — resolve before merging"
  fi
  # colorized images must say so in the caption
  if [ "$(jq -r '.colorized' "$m")" = "true" ] && ! jq -e '.caption | test("colori[sz]ed"; "i")' "$m" >/dev/null; then
    bad "$m: colorized=true but caption does not say so"
  fi
  # Bundesarchiv images must carry the attribution string
  if jq -e '(.original.archive // "") | test("Bundesarchiv")' "$m" >/dev/null && ! jq -e '.credit | test("Bundesarchiv, Bild")' "$m" >/dev/null; then
    bad "$m: Bundesarchiv image without the required 'Bundesarchiv, Bild …' credit string"
  fi
done < <(find content/shared/media -name 'media.json' -print)

echo "3) no tracked image binaries"
if git ls-files -z -- 'content/**/*.png' 'content/**/*.jpg' 'content/**/*.jpeg' 'content/**/*.webp' 'content/**/*.avif' 'content/**/*.tif' 'content/**/*.tiff' | grep -qz .; then
  bad "image binaries are tracked under content/ — they belong in the assets bucket (docs/decisions/0004-hosting.md)"
  git ls-files -- 'content/**/*.png' 'content/**/*.jpg' 'content/**/*.webp' | sed 's/^/    /'
fi

if [ "$fail" -ne 0 ]; then
  echo "content checks FAILED"; exit 1
fi
echo "content checks passed"
