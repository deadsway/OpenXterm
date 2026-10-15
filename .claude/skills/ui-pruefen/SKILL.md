---
name: ui-pruefen
description: Wie Claude die Tauri-Oberfläche von OpenXterm ohne Monitor startet, mit xdotool bedient und per Screenshot prüft (Xvfb, testing/shot.sh, testing/ui-session.sh). Verwenden, wann immer eine Änderung sichtbar sein soll oder Akzeptanzkriterien die Oberfläche betreffen – vor allem in Cloud-Sitzungen.
---

# Oberfläche prüfen (Cloud / Linux)

Grundsatz: **Eine Oberflächenänderung ist erst fertig, wenn du sie im Screenshot gesehen hast.** Screenshots mit dem Read-Werkzeug ansehen.

## 1. Bauen
Im Ordner der App (bzw. des Spikes):
```bash
npm install            # nur beim ersten Mal
npm run tauri build -- --debug --no-bundle
# Programm: src-tauri/target/debug/<name>   (Name steht in src-tauri/Cargo.toml)
```
`npm run tauri dev` ist für die Cloud ungeeignet (Dateiüberwachung, kein Ende).

## 2a. Nur ansehen
```bash
bash testing/shot.sh /tmp/ox.png 15 <pfad/zum/programm>
```
Danach `/tmp/ox.png` lesen. Programm-Log: `/tmp/ox-shot-app.log`.

## 2b. Bedienen
```bash
bash testing/ui-session.sh start
bash testing/ui-session.sh run env OX_SPIKE_AUTO=ssh <pfad/zum/programm>
sleep 10
bash testing/ui-session.sh shot /tmp/s1.png          # ansehen, Koordinaten ablesen
bash testing/ui-session.sh click 400 300
bash testing/ui-session.sh type "ls -la /"
bash testing/ui-session.sh key Return
sleep 2
bash testing/ui-session.sh shot /tmp/s2.png
bash testing/ui-session.sh stop
```
Bildschirm ist 1280×800. Koordinaten aus dem vorherigen Screenshot ablesen.

## Tipps
- Wartezeiten großzügig wählen: erster Start der WebView dauert einige Sekunden.
- Für Akzeptanztests einen **Auto-Modus** per Umgebungsvariable vorsehen (z. B. direkt verbinden), statt sich durch Dialoge zu klicken.
- Ausschnitte vergrößern: `convert /tmp/s2.png -crop 600x200+0+0 /tmp/s2-crop.png`.
- Belegscreenshots, die im Repository bleiben sollen, im jeweiligen `screenshots/`-Ordner ablegen (PNG, sprechender Name).
- Weißes/leeres Fenster: Log lesen; `WEBKIT_DISABLE_DMABUF_RENDERER=1` ist in den Skripten bereits gesetzt.
- Was nur unter Windows sichtbar wäre (Schriften, WebView2, DPI), ausdrücklich als „unter Windows prüfen“ melden.
