---
name: cygwin-payload
description: Aufbau, Build und Laufzeit der mitgelieferten Cygwin-Umgebung (Bash, Unix-Werkzeuge, OpenSSH, OpenSSL, Mosh, X-Server XWin, Plugins) für OpenXterm. Verwenden bei Arbeit an payload/, lokalen Bash-Terminals, Plugins (.oxt), Paketmanager, X-Server oder dem Bereitstellen der Umgebung beim Start.
---

# Cygwin-Payload

Wie beim Vorbild liefert OpenXterm eine Unix-Umgebung für Windows mit. Grundlage ist Cygwin. Das meiste davon ist **nur unter Windows** bau- und testbar – in der Cloud nur Skripte und Logik vorbereiten.

## Bauen (Windows, ab Phase 2)
- Paketliste: `payload/packages.txt` (ein Paket pro Zeile, `#` für Kommentare). Änderungen begründen.
- Build-Skript (entsteht im Spike S2): Cygwin-Setup im Quiet-Mode in ein frisches Verzeichnis
  `setup-x86_64.exe -q -n -N -d -R <root> -l <cache> -s <mirror> -P <pakete>`, danach aufräumen (Doku, Manpages, Header, statische Bibliotheken – Liste `payload/strip.txt`), eigene Dateien aus `payload/overlay/` darüberlegen, als `payload.zip` packen und SHA-256 notieren.
- `payload/out` und `payload/cache` nie einchecken (Hook blockiert Änderungen dort).
- Quellpakete der ausgelieferten GPL-Programme sammeln (Quellcode-Angebot, REL-07).

## Bereitstellen zur Laufzeit (Entscheidung im Spike S2, ADR-5)
- Variante A: `payload.zip` neben der EXE, beim ersten Start entpacken.
- Variante B: in die EXE eingebettet (`include_bytes!`) – größere EXE, dafür nur eine Datei.
- Ziel: persistentes Root aus den Einstellungen, sonst `%LOCALAPPDATA%\OpenXterm\root`. Nur neu entpacken, wenn der Hash abweicht.
- `/etc/fstab`: `none /drives cygdrive binary,posix=0,user 0 0` ergibt `/drives/c`.
- Windows-PATH nur anhängen, wenn eingestellt (LOCAL-04).
- Plugins: alle `*.oxt` (ZIP mit `/bin`, `/lib`, `/usr`, `/etc`) nach dem Payload ins Root entpacken.

## Lokales Bash-Terminal
- Start über `portable-pty` (ConPTY): `<root>\bin\bash.exe --login -i` mit passender Umgebung (`HOME`, `PATH`, `CHERE_INVOKING=1`).
- Im Spike S2 prüfen: Verhalten von Cygwin-Programmen unter ConPTY (Farben, `vim`, `Strg+C`, Größenänderung). Ergebnis in `spikes/s2-cygwin/ERGEBNIS.md`.

## X-Server (Phase 6)
- `XWin.exe` aus dem Payload als eigener Prozess, `DISPLAY` für Sessions setzen; Modi (Multiwindow, Fenster, Fenstermanager) über Startparameter.
