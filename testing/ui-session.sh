#!/usr/bin/env bash
# Virtueller Bildschirm für Oberflächentests in der Cloud (ohne Monitor).
# Damit kann Claude die App starten, mit xdotool klicken/tippen und
# zwischendurch Screenshots machen – Schritt für Schritt.
#
#   bash testing/ui-session.sh start                 # Xvfb auf :99 starten
#   bash testing/ui-session.sh run <programm> [args] # App im Hintergrund starten (Log: /tmp/ox-ui-app.log)
#   bash testing/ui-session.sh type "text"           # Text tippen (aktives Fenster)
#   bash testing/ui-session.sh key Return            # Taste(n) senden, z. B. ctrl+c
#   bash testing/ui-session.sh click <x> <y>         # Linksklick auf Bildschirmkoordinate
#   bash testing/ui-session.sh shot <datei.png>      # Screenshot des ganzen Bildschirms
#   bash testing/ui-session.sh stop                  # App und Xvfb beenden
#
# Screenshots liest Claude anschließend mit dem Read-Werkzeug.
# Pakete (installiert cloud/setup.sh): xvfb imagemagick xdotool
set -euo pipefail

export DISPLAY=:99
export WEBKIT_DISABLE_DMABUF_RENDERER=1   # WebKitGTK ohne GPU stabil betreiben
export LIBGL_ALWAYS_SOFTWARE=1
export LC_ALL=C.UTF-8                     # sonst bricht xdotool type bei Umlauten ab
STATE=/tmp/openxterm-ui
mkdir -p "$STATE"

case "${1:-}" in
  start)
    if [ -f "$STATE/xvfb.pid" ] && kill -0 "$(cat "$STATE/xvfb.pid")" 2>/dev/null; then
      echo "Xvfb läuft bereits auf $DISPLAY"
    else
      Xvfb "$DISPLAY" -screen 0 1280x800x24 >/dev/null 2>&1 &
      echo $! > "$STATE/xvfb.pid"
      sleep 1
      echo "Xvfb gestartet auf $DISPLAY (1280x800)"
    fi ;;
  run)
    shift
    "$@" > /tmp/ox-ui-app.log 2>&1 &
    echo $! > "$STATE/app.pid"
    echo "gestartet (PID $(cat "$STATE/app.pid")), Log: /tmp/ox-ui-app.log" ;;
  type)
    xdotool type --delay 40 -- "$2" ;;
  key)
    shift; xdotool key "$@" ;;
  click)
    xdotool mousemove "$2" "$3" click 1 ;;
  shot)
    import -window root "$2"; echo "Screenshot: $2" ;;
  stop)
    [ -f "$STATE/app.pid" ] && kill "$(cat "$STATE/app.pid")" 2>/dev/null || true
    [ -f "$STATE/xvfb.pid" ] && kill "$(cat "$STATE/xvfb.pid")" 2>/dev/null || true
    rm -f "$STATE"/*.pid
    echo "beendet" ;;
  *)
    sed -n '2,15p' "$0"; exit 2 ;;
esac
