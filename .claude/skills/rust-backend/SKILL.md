---
name: rust-backend
description: Konventionen für Rust-Code in OpenXterm (Cargo-Workspace, Crates ox-*, async mit tokio, Fehlerbehandlung, Logging, Tests, IronRDP-Fork). Verwenden beim Schreiben oder Ändern von Rust-Code in crates/, app/src-tauri/ oder spikes/.
---

# Rust in OpenXterm

## Aufteilung
- Logik in `crates/ox-*` – **ohne** Abhängigkeit zu Tauri. Diese Crates sind mit `cargo test` unter Linux und Windows testbar.
- `app/src-tauri` ist eine dünne Schicht: Tauri-Befehle nehmen Parameter entgegen, rufen die Crates auf, geben Ergebnisse/Fehler zurück.
- Windows-Spezifisches hinter `#[cfg(windows)]`, mit einer Linux-Variante oder einem klaren Fehler, damit die Cloud weiter bauen kann.

## Fehler
- Bibliotheks-Crates: eigene Fehler-Enums mit `thiserror`. App/Spikes: `anyhow` mit `.context("…")`.
- Kein `unwrap()`/`expect()` außerhalb von Tests und Spikes. Clippy-Lints `unwrap_used`/`expect_used` im Workspace auf `warn`.
- An die Oberfläche gehen nur verständliche Meldungen (Deutsch), Details ins Log.

## Async
- tokio ist die Laufzeit. Jede Session ist ein eigener Task; Panics im Task abfangen und als Verbindungsfehler melden.
- Nie blockierende Aufrufe in async-Code (Datei-I/O großer Dateien, Serial, `std::thread::sleep`) – dafür `tokio::task::spawn_blocking`.
- Abbruch über `tokio_util::sync::CancellationToken` oder Schließen der Kanäle; Ressourcen beim Tab-Schließen sicher freigeben.
- Rückfragen an den Nutzer (Host-Key, Passwort, 2FA): Ereignis an die Oberfläche, Antwort über `tokio::sync::oneshot` mit Zeitlimit.

## Logging
- `tracing` mit Feldern (`session_id`, `protocol`, `host`). Niemals Passwörter, Passphrasen, Schlüssel oder Tresorinhalt.

## Abhängigkeiten
- Neue Crates nur nach Rückfrage; Lizenz prüfen (MIT/Apache/BSD/MPL), in `THIRD-PARTY-NOTICES.md` eintragen.
- Versionen zentral in `[workspace.dependencies]`.
- `russh` nutzt standardmäßig `aws-lc-rs` – unter Windows braucht der Build NASM und CMake (siehe ANLEITUNG A1).

## IronRDP
- Standard: Version von crates.io (`ironrdp-client` für den Client, Features `rustls` usw.).
- Eigene Änderungen: im Fork `https://github.com/deadsway/IronRDP` auf einem Branch, dann in der Workspace-`Cargo.toml`:
  ```toml
  [patch.crates-io]
  ironrdp-client = { git = "https://github.com/deadsway/IronRDP", branch = "ox/<thema>" }
  # alle betroffenen ironrdp-* Crates gleich patchen
  ```
- Im Fork gelten dessen `AGENTS.md`/`CLAUDE.md` und seine `rust-toolchain.toml`.
- Referenzen im IronRDP-Quelltext: `crates/ironrdp/examples/screenshot.rs` (blockierender Minimal-Client), `crates/ironrdp-viewer` (fertiger Client), `crates/ironrdp-client` (Engine).

## Tests
- Einheitentests neben dem Code (`#[cfg(test)]`), Integrationstests in `crates/<crate>/tests/`.
- Tests, die einen Testserver brauchen, mit `#[ignore = "braucht testing/testenv.sh"]` markieren; ausführen mit `cargo test -- --include-ignored`.
- Adressen der Testserver aus Umgebungsvariablen (`OX_SSH_ADDR`, `OX_RDP_ADDR`) mit den Standardwerten aus `testing/README.md`.

## Prüfen vor „fertig“
`cargo fmt --all` · `cargo clippy --workspace --all-targets -- -D warnings` · `cargo test --workspace`
