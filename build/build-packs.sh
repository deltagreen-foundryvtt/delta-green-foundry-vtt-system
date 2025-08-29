#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

npx --no-install fvtt package workon "deltagreen" --type "System"

for folder in packs/source/*; do
    name=$(basename $folder)
    npx --no-install fvtt package pack "$name" --in "$folder" --out "packs"
done
