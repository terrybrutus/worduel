#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
bash tools/native-backend/build.sh
if [ ! -d tools/native-backend/node_modules/@dfinity/pic ]; then
  npm --prefix tools/native-backend install --no-audit --no-fund
fi
exec node tools/native-backend/live.mjs
