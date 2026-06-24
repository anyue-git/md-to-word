#!/bin/zsh
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  npm install || exit 1
fi

npm run app:open
