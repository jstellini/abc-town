#!/usr/bin/env bash
# Assemble the static site into ./deploy — only what the game needs at runtime.
# Used by Netlify (see netlify.toml); mirrors the folder layout built by deploy.ps1.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf deploy
mkdir -p deploy/css deploy/js deploy/assets/characters deploy/assets/voice
cp index.html deploy/
cp css/* deploy/css/
cp js/* deploy/js/
cp assets/characters/*.svg deploy/assets/characters/
cp assets/voice/* deploy/assets/voice/

echo "Built deploy/: $(find deploy -type f | wc -l) files"
