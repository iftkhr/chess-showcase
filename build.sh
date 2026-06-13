#!/usr/bin/env bash
# Builds both chess apps and assembles the deployable dist/ folder.
# Run: ./build.sh   then deploy the dist/ directory to any static host.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DIST="$ROOT/dist"

build_app() {
  local src="$1" out="$2"
  echo "▶ Building apps/$src → dist/$out"
  pushd "$ROOT/apps/$src" >/dev/null
  [ -d node_modules ] || npm install
  npm run build
  popd >/dev/null
  rm -rf "$DIST/$out"
  mkdir -p "$DIST/$out"
  cp -R "$ROOT/apps/$src/dist/." "$DIST/$out/"
}

rm -rf "$DIST"
mkdir -p "$DIST"

build_app fable5 fable5
build_app opus48 opus48

# copy the showcase shell (index.html, favicon) to the dist root
cp -R "$ROOT/shell/." "$DIST/"

echo "✓ Assembled dist/ — deploy this folder to any static host."
