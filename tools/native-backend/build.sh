#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p .worduel-native/build
find_package() {
  local version="$1"
  if [ -d ".mops/$version/src" ]; then realpath ".mops/$version/src";
  elif [ -d "$HOME/.cache/mops/packages/$version/src" ]; then printf '%s\n' "$HOME/.cache/mops/packages/$version/src";
  else printf 'Missing Motoko package %s. Install the dependencies from mops.toml in WSL.\n' "$version" >&2; exit 1; fi
}
packages=()
while IFS=$'\t' read -r alias version; do
  packages+=(--package "$alias" "$(find_package "${alias%%@*}@$version")")
done < <(node -e 'const fs=require("node:fs");for(const [a,v]of Object.entries(JSON.parse(fs.readFileSync("mops.lock","utf8")).deps)) console.log(`${a}\t${v}`)')
moc="$HOME/.cache/mops/moc/1.7.0/moc"
if [ ! -x "$moc" ]; then moc="$(command -v moc || true)"; fi
if [ -z "$moc" ]; then printf 'Install the pinned Motoko 1.7.0 compiler with Mops in WSL.\n' >&2; exit 1; fi
"$moc" --release --idl --stable-types --default-persistent-actors --actor-idl src/backend/system-idl --implicit-package core -no-check-ir -E=M0236,M0235,M0223,M0237 -A=M0198 "${packages[@]}" -o .worduel-native/build/backend.wasm src/backend/main.mo
if [ -f .old/src/backend/dist/backend.most ]; then
  "$moc" --stable-compatible .old/src/backend/dist/backend.most .worduel-native/build/backend.most
fi
