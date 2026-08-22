#!/usr/bin/env bash
# Create or update a single marker-tagged comment on a pull request.
#   usage: scripts/pr-sticky-comment.sh <pr-number> <markdown body>
# Needs GH_TOKEN and GITHUB_REPOSITORY (set in Actions).
set -euo pipefail

pr=${1:?pr number}
body=${2:?body}
marker='<!-- sandtable-preview -->'
repo=${GITHUB_REPOSITORY:?}

existing=$(gh api "repos/$repo/issues/$pr/comments" --paginate \
  --jq ".[] | select(.body | startswith(\"$marker\")) | .id" | head -n1)

if [ -n "$existing" ]; then
  gh api -X PATCH "repos/$repo/issues/comments/$existing" -f body="$marker
$body" --silent
  echo "updated comment $existing"
else
  gh api "repos/$repo/issues/$pr/comments" -f body="$marker
$body" --silent
  echo "created comment"
fi
