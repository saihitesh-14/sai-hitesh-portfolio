#!/bin/zsh
cd -- "$(dirname -- "$0")"
printf 'Your local portfolio: http://127.0.0.1:4173\nStop the server with Control-C.\n'
python3 -m http.server 4173 --bind 127.0.0.1
