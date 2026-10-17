#!/usr/bin/env bash
# Setup-Skript für die Claude-Code-Cloud-Umgebung von OpenXterm.
# Läuft als root auf Ubuntu 24.04, bevor Claude startet. Das Ergebnis wird
# zwischengespeichert, solange das Skript in ca. 5 Minuten fertig ist.
#
# Einfügen unter: claude.ai/code -> Umgebung (Wolken-Symbol) -> bearbeiten -> Setup script
# Netzwerkzugriff der Umgebung: "Trusted"
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
  `# Tauri 2 unter Linux (laut Tauri-Doku)` \
  libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev \
  `# Werkzeuge für Krypto-Crates (aws-lc-rs, IronRDP)` \
  nasm cmake pkg-config \
  `# Oberfläche ohne Monitor testen und Screenshots machen` \
  xvfb imagemagick xdotool \
  `# Testserver: SSH und RDP (xrdp) – gestartet von testing/testenv.sh` \
  openssh-server xrdp xorgxrdp dbus-x11 xterm icewm x11-xserver-utils sshpass \
  `# Vollbild-Terminalprogramme für Darstellungstests (Phase-1-DoD)` \
  htop mc

# xrdp/sshd nicht automatisch als Dienst laufen lassen – testenv.sh startet sie bei Bedarf
systemctl disable xrdp xrdp-sesman ssh 2>/dev/null || true

# Rust ist vorinstalliert; stabile Toolchain mit Formatierer und Linter sicherstellen
rustup default stable
rustup component add rustfmt clippy

# Abhängigkeiten vorab laden, falls das Projekt schon Cargo/npm-Dateien hat (beschleunigt Sitzungen)
if [ -f Cargo.toml ]; then cargo fetch || true; fi
if [ -f package.json ]; then npm ci --no-audit --no-fund || true; fi

rustc --version
node --version
nasm -v
