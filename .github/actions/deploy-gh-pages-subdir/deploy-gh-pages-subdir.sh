#!/usr/bin/env bash
# Push publish-dir to a subdirectory on gh-pages (sibling paths preserved). Git only — no extra Node runtime.
set -euo pipefail

REPO_URL="https://x-access-token:${INPUT_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
PUB="${GITHUB_WORKSPACE}/${INPUT_PUBLISH_DIR}"
DEST_REL="${INPUT_DEST_DIR}"

if [[ ! -d "$PUB" ]]; then
  echo "::error::Publish dir not found: ${PUB}"
  exit 1
fi

WORK=$(mktemp -d)
trap 'rm -rf "${WORK}"' EXIT

git clone "${REPO_URL}" "${WORK}/repo"
R="${WORK}/repo"
cd "${R}"

if git ls-remote --heads origin gh-pages | grep -q .; then
  git fetch origin gh-pages:gh-pages
  git checkout gh-pages
else
  git checkout --orphan gh-pages
  git rm -rf . 2>/dev/null || true
fi

mkdir -p "${R}/${DEST_REL}"
rsync -a --delete "${PUB}/" "${R}/${DEST_REL}/"

touch "${R}/.nojekyll"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add -A

if git diff --staged --quiet; then
  echo "No changes to push to gh-pages."
  exit 0
fi

git commit -m "docs(allure): deploy ${DEST_REL}"

if ! git push origin HEAD:gh-pages; then
  git fetch origin gh-pages
  git rebase origin/gh-pages
  git push origin HEAD:gh-pages
fi
