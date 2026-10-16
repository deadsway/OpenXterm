# Spike S1 – Notizen

## Etappe A – Gerüst (2026-10-16, Cloud)

- Erzeugt mit `npm create tauri-app@latest s1-ssh-rdp -- --template react-ts --manager npm --identifier org.openxterm.spike --yes`.
- Versionen: Tauri 2.12.4 (CLI 2.12.3, `@tauri-apps/api` 2.12.4), React 19.3.1, Vite 8.3.4, TypeScript 6.0.3, Rust 1.97.0 (Edition 2024).
- Aus der Vorlage entfernt: `greet`-Befehl, Logos, `tauri-plugin-opener` (Rust, npm, Capability).
- Befehl `spike_config` liefert `OX_SSH_ADDR`, `OX_RDP_ADDR` (Standards `127.0.0.1:2222` / `127.0.0.1:3389`) und `OX_SPIKE_AUTO`. Die Variablen werden zur Laufzeit in Rust gelesen – Vite würde `import.meta.env` beim Build einbacken.
- `OX_SPIKE_AUTO=ssh|rdp` wählt bisher nur den Starttab; das automatische Verbinden kommt in Etappe B/C.
- `npm run tauri build -- --debug --no-bundle`: ca. 1,5 min (kalter Cache, nach `cargo clippy`), Binärdatei `src-tauri/target/debug/s1-ssh-rdp` ≈ 200 MB (Debug-Infos).
- Screenshot: `screenshots/a-geruest.png` (Standardadressen). Kontrolllauf mit `OX_RDP_ADDR=10.0.0.5:3390 OX_SPIKE_AUTO=rdp` zeigte den RDP-Tab aktiv und die geänderte Adresse.
- Unter Xvfb harmlose Warnung im Log: `AT-SPI: Error retrieving accessibility bus address`.
- Offen (Windows, Etappe D): `npm run tauri dev` mit WebView2, Darstellung/DPI, Variablen in PowerShell (`$env:OX_RDP_ADDR="127.0.0.1:3390"`).
