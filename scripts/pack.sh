#!/usr/bin/env bash
# Pack the extension into a ZIP suitable for Chrome Web Store upload.
# Excludes dev files (.git, node_modules, store/, scripts/, README, screenshots).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./manifest.json').version")
OUT="dist/taste-canvas-extension-v${VERSION}.zip"
mkdir -p dist
rm -f "$OUT"
zip -r "$OUT" \
  manifest.json \
  background.js \
  content.js \
  popup \
  lib \
  icons \
  styles \
  -x "*/.DS_Store" "*/node_modules/*"
echo "Packed: $OUT ($(du -h "$OUT" | cut -f1))"
