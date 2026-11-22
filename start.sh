#!/bin/sh
# Serves this folder on http://localhost:8150 and opens it in the browser.
# The page uses JavaScript modules, which browsers refuse to load from a file opened by double-click.
# Needs Python 3. Press Ctrl + C to stop the server.
cd "$(dirname "$0")" || exit 1
PORT=8150
URL="http://localhost:$PORT/"

if command -v python3 >/dev/null 2>&1; then PY=python3
elif command -v python >/dev/null 2>&1; then PY=python
else
  echo "Python was not found. Install Python 3 and run this file again."
  exit 1
fi

# open the browser a moment after the server starts
(
  sleep 1
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v start >/dev/null 2>&1; then start "$URL"
  else echo "Open $URL in your browser."
  fi
) >/dev/null 2>&1 &

exec "$PY" -m http.server "$PORT"
