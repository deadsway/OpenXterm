#!/usr/bin/env bash
# Startet ein Programm mit Fenster in einem virtuellen Bildschirm (Xvfb) und macht
# nach N Sekunden einen Screenshot. So kann Claude in der Cloud (ohne Monitor)
# sehen, wie die Oberfläche aussieht. Den PNG-Screenshot liest Claude danach
# mit seinem Read-Werkzeug.
#
# Nutzung: bash testing/shot.sh <ausgabe.png> <sekunden> <programm> [argumente...]
# Beispiel: bash testing/shot.sh /tmp/ox.png 15 target/debug/openxterm
# Log des Programms: /tmp/ox-shot-app.log
# Pakete (installiert cloud/setup.sh): xvfb imagemagick
set -u
out="$1"; wait_s="$2"; shift 2
export WEBKIT_DISABLE_DMABUF_RENDERER=1 LIBGL_ALWAYS_SOFTWARE=1
xvfb-run -a -s "-screen 0 1280x800x24" bash -c '
  "$@" > /tmp/ox-shot-app.log 2>&1 &
  app=$!
  sleep '"$wait_s"'
  import -window root "'"$out"'"
  kill $app 2>/dev/null; wait $app 2>/dev/null; true
' _ "$@"
