# OpenXterm – Projektanweisungen für Claude

OpenXterm ist ein möglichst vollständiger, eigenständig programmierter Nachbau von MobaXterm für Windows: Tauri 2, Rust-Backend, TypeScript/React-Oberfläche.
Funktionen: `docs/FEATURES.md` · Architektur: `docs/ARCHITEKTUR.md` · Phasen: `docs/ROADMAP.md` · aktueller Spike: `docs/SPIKE-S1.md`.

Der Nutzer lernt Claude Code und Rust mit diesem Projekt. Erkläre Entscheidungen kurz, wenn sie nicht offensichtlich sind, und antworte auf Deutsch.

## Wo wird gearbeitet?

- **Cloud-Sitzung** (`CLAUDE_CODE_REMOTE=true`, Ubuntu): bauen, testen, Oberfläche per Screenshot prüfen. Kein Windows.
- **Lokal unter Windows**: alles Windows-Spezifische (ConPTY, Cygwin, echtes RDP mit NLA, Installer).
- Nenne am Ende immer, was nur unter Windows geprüft werden kann.

## Struktur (ab Phase 1)

- `app/` – Tauri-App: `src/` Oberfläche (React/TS), `src-tauri/` Rust-Befehle und Kanäle (dünne Schicht)
- `crates/ox-*` – Logik ohne Tauri, mit `cargo test` testbar (`ox-core`, `ox-ssh`, `ox-rdp`, `ox-local`, …)
- `spikes/` – Wegwerf-Prototypen mit `ERGEBNIS.md`; kein Code daraus kopieren, nur Erkenntnisse
- `testing/` – Testserver und UI-Werkzeuge (siehe `testing/README.md`)
- `third_party/` – unveränderte Fremdquellen (Hook blockiert Änderungen)

## Befehle

- Rust prüfen: `cargo check --workspace --all-targets` · Tests: `cargo test --workspace` · Lint: `cargo clippy --workspace --all-targets -- -D warnings` · Format: `cargo fmt --all`
- Frontend (in `app/` bzw. im Spike-Ordner): `npm run build`, `npx tsc --noEmit`, `npm test`
- App entwickeln: `npm run tauri dev` · Debug-Build ohne Installer: `npm run tauri build -- --debug --no-bundle`
- Testserver Cloud: `bash testing/testenv.sh start|stop|status` (SSH 127.0.0.1:2222, RDP 127.0.0.1:3389, tester/tester)
- Testserver Windows: `docker compose -f testing/compose.yaml up -d --build` (RDP dort auf Port 3390)
- Oberfläche in der Cloud ansehen/bedienen: `testing/shot.sh`, `testing/ui-session.sh` – Skill `ui-pruefen`

## Regeln

- Rust: kein `unwrap()`/`expect()` außerhalb von Tests und Spikes; Fehler mit `anyhow` (Apps) bzw. `thiserror` (Crates). Kein blockierender Code in async-Tasks. Details: Skill `rust-backend`.
- Schnittstelle Oberfläche ↔ Rust nur wie im Skill `tauri-schnittstelle` beschrieben; neue Befehle/Kanäle dort eintragen.
- Große Datenmengen (Terminal, Bilder) als Rohbytes über `tauri::ipc::Channel`, nie als JSON.
- Geheimnisse (Passwörter, Passphrasen, Schlüssel) bleiben im Rust-Teil: nie ans Frontend, nie ins Log, nie in Fehlermeldungen. Skill `sicherheit`.
- Host-Keys und RDP-Zertifikate immer prüfen lassen (Dialog mit Fingerprint). Kein „alles akzeptieren“ außerhalb von Spikes.
- Keine ungefragten Netzverbindungen aus der App, keine Registry-Einträge ohne Nutzeraktion.
- Keine Namen, Logos, Icons, Texte oder Screenshots von MobaXterm verwenden. Eigene Begriffe in der Oberfläche.
- Neue Abhängigkeiten nur nach Rückfrage; Lizenz prüfen (MIT, Apache-2.0, BSD, MPL bevorzugt) und in `THIRD-PARTY-NOTICES.md` eintragen. Keine GPL-Abhängigkeiten.
- Bezeichner, Kommentare, Commit-Messages auf Englisch; Doku und Oberfläche auf Deutsch (Englisch als zweite Sprache).

## IronRDP

Standard ist die Version von crates.io. Eigene Änderungen gehören in den Fork `https://github.com/deadsway/IronRDP` (eigener Branch) und werden über `[patch.crates-io]` eingebunden. Im Fork gelten dessen eigene `AGENTS.md`/`CLAUDE.md`.

## Arbeitsweise

1. Vor jedem Feature: ID in `docs/FEATURES.md`, Spec in `docs/specs/<ID>.md`. Fehlt die Spec → Subagent `feature-analyst`.
2. Mehr als drei Dateien betroffen → erst Plan, dann Umsetzung.
3. Nach Änderungen prüfen (cargo check/test, tsc, bei UI ein Screenshot). Erst „fertig“ melden, wenn alles grün ist.
4. Status in `docs/FEATURES.md` pflegen (⬜ → 🟨 → ✅).
5. Kleine Commits im Conventional-Commits-Stil (`feat(ssh): verify host keys`). In Cloud-Sitzungen am Ende pushen; lokal nur committen, wenn der Nutzer es möchte.

## Doku nachschlagen statt raten

- Rust-Crates: docs.rs, Quelltext unter `~/.cargo/registry/src`, MCP `context7`
- Tauri 2: v2.tauri.app, MCP `context7`
- Windows-APIs (ConPTY, DPAPI, WebView2): MCP `microsoft-learn`
- RDP-Protokoll: IronRDP-Repository, Microsoft Open Specifications (MS-RDPBCGR u. a.)
