#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
bash tools/native-backend/build.sh
export WORDUEL_WASM="$(realpath .worduel-native/build/backend.wasm)"
node tools/native-backend/security-test.mjs
node tools/native-backend/account-transfer-test.mjs
node tools/native-backend/native-test.mjs
node tools/native-backend/ai-test.mjs
if [ -n "${WORDUEL_OLD_WASM:-}" ]; then
  node tools/native-backend/legacy-upgrade-test.mjs
fi
