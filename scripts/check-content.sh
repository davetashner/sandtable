#!/usr/bin/env bash
# Content checks that run in CI before the full scenario-pack validator exists
# (sand-a55.7). Keeps today's content honest:
#   1. every JSON file under content/ parses
#   2. every media.json has the fields the imagery policy requires and is not
#      flagged BLOCKED / UNVERIFIED / UNKNOWN
#   3. no image binaries are tracked in git (they live in S3 — decision 0004)
#   4. every cue.json carries its provenance, and no audio binaries are tracked
#   5. the generated index.json the app reads still covers every manifest
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
  if jq -e '(.original.archive // "") | test("^Bundesarchiv")' "$m" >/dev/null && ! jq -e '.credit | test("Bundesarchiv, Bild")' "$m" >/dev/null; then
    bad "$m: Bundesarchiv image without the required 'Bundesarchiv, Bild …' credit string"
  fi
done < <(find content/shared/media -name 'media.json' -print)

echo "3) no tracked image binaries"
if git ls-files -z -- 'content/**/*.png' 'content/**/*.jpg' 'content/**/*.jpeg' 'content/**/*.webp' 'content/**/*.avif' 'content/**/*.tif' 'content/**/*.tiff' | grep -qz .; then
  bad "image binaries are tracked under content/ — they belong in the assets bucket (docs/decisions/0004-hosting.md)"
  git ls-files -- 'content/**/*.png' 'content/**/*.jpg' 'content/**/*.webp' | sed 's/^/    /'
fi

echo "4) score cues"
while IFS= read -r m; do
  for key in '.id' '.title' '.file' '.duration' '.credit' '.provenance.tool' '.provenance.licence'; do
    v=$(jq -r "$key // empty" "$m")
    if [ -z "$v" ]; then bad "$m: missing $key"; fi
  done
  # A cue that says it loops but carries no duration cannot be scheduled.
  if [ "$(jq -r '.loop // empty' "$m")" = "" ]; then bad "$m: missing .loop"; fi
  # Same bar as the imagery policy: no placeholders in a shipped manifest.
  if jq -e '[.provenance.licence, .provenance.tool, ."$comment"] | map(tostring) | join(" ") | test("BLOCKED|UNVERIFIED|UNKNOWN|HOLD|TODO|TBD"; "i")' "$m" >/dev/null; then
    bad "$m: cue is flagged BLOCKED/UNVERIFIED/UNKNOWN/HOLD/TODO — resolve before merging"
  fi
done < <(find content/shared/audio -name 'cue.json' -print 2>/dev/null)

echo "5) no tracked audio binaries"
if git ls-files -z -- 'content/**/*.wav' 'content/**/*.aif' 'content/**/*.aiff' 'content/**/*.flac' 'content/**/*.mp3' 'content/**/*.m4a' 'content/**/*.opus' 'content/**/*.ogg' | grep -qz .; then
  bad "audio binaries are tracked under content/ — masters stay local, derivatives go to the assets bucket (docs/decisions/0008-audio.md)"
  git ls-files -- 'content/**/*.wav' 'content/**/*.m4a' 'content/**/*.opus' | sed 's/^/    /'
fi

echo "6) generated indexes cover their manifests"
# `npm run media` and `npm run audio` write the index.json files the app reads,
# from the manifests that sit beside the binaries. The validator reads the
# manifests; the app reads the index. When the two drift, content citing an
# image passes every gate and the picture silently does not render — which is
# what happened to 49 images between PR #89 and sand-shn.16, because
# regenerating needs the git-ignored binaries and only one checkout has them.
#
# Both pipelines answer this themselves with `-- --check`, but this script also
# runs in the `lint` job, which has no node_modules; the same question in jq
# costs nothing and asks it in both places.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# kind, manifest root, manifest name, index, the command that rebuilds it, and
# optionally a file of ids allowed to be missing while a known gap is closed.
check_index() {
  local kind=$1 root=$2 manifest=$3 index=$4 rebuild=$5 backlog=${6:-}
  [ -d "$root" ] || return 0
  if [ ! -f "$index" ]; then bad "$index is missing — run: $rebuild"; return; fi
  find "$root" -name "$manifest" -exec jq -r '.id' {} \; | sort > "$tmp/$kind.manifests"
  jq -r '.entries[].id' "$index" | sort > "$tmp/$kind.index"
  if [ -n "$backlog" ]; then
    { grep -Ev '^[[:space:]]*(#|$)' "$backlog" || true; } | sort > "$tmp/$kind.backlog"
  else
    : > "$tmp/$kind.backlog"
  fi

  while IFS= read -r id; do
    bad "$id has a $manifest but no entry in $index — run: $rebuild"
  done < <(comm -23 "$tmp/$kind.manifests" "$tmp/$kind.index" | comm -23 - "$tmp/$kind.backlog")

  # An allowance must not outlive its reason, or the next reader trusts it. Both
  # ways it can go stale are a failure, so closing the gap forces the file out.
  while IFS= read -r id; do
    bad "$backlog lists $id, which $index now covers — delete that line"
  done < <(comm -12 "$tmp/$kind.backlog" "$tmp/$kind.index")
  while IFS= read -r id; do
    bad "$backlog lists $id, which has no $manifest — delete that line"
  done < <(comm -23 "$tmp/$kind.backlog" "$tmp/$kind.manifests")

  local allowed
  allowed=$(wc -l < "$tmp/$kind.backlog" | tr -d ' ')
  if [ "$allowed" -gt 0 ]; then
    note "$index holds $(wc -l < "$tmp/$kind.index" | tr -d ' ') of" \
         "$(wc -l < "$tmp/$kind.manifests" | tr -d ' ') $kind manifests; $allowed are"
    note "allowed to be missing by $backlog — those pictures do not render"
  fi
}

check_index media content/shared/media media.json \
  content/shared/media/index.json 'npm run media' scripts/media-index-backlog.txt
check_index audio content/shared/audio cue.json \
  content/shared/audio/index.json 'npm run audio'

if [ "$fail" -ne 0 ]; then
  echo "content checks FAILED"; exit 1
fi
echo "content checks passed"
