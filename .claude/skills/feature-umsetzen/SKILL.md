---
name: feature-umsetzen
description: Standardablauf, um ein Feature aus docs/FEATURES.md anhand seiner ID (z. B. SSH-04, FILE-02, RDP-01) umzusetzen. Verwenden, wenn der Nutzer ein Feature per ID bauen, fortsetzen oder abschließen möchte.
---

# Feature umsetzen

Argument: Feature-ID, z. B. `SSH-04`. Mehrere IDs nur, wenn die Spec sie ausdrücklich zusammenfasst.

1. **Kontext laden**
   - Zeile der ID in `docs/FEATURES.md` (Komponente, Phase, Umsetzungshinweis).
   - `docs/specs/<ID>.md`. Fehlt sie: **stoppen** und vorschlagen, zuerst den Subagenten `feature-analyst` zu nutzen.
   - Offene Fragen in der Spec? Erst klären lassen.
   - Abhängigkeiten ✅? Sonst den Nutzer informieren.
2. **Passende Skills laden:** `rust-backend` (Rust-Code), `tauri-schnittstelle` (Befehle/Kanäle/Ereignisse), `tauri-oberflaeche` (Frontend), `sicherheit` (Zugangsdaten, Host-Keys, Zertifikate, Netz), `ui-pruefen` (Screenshots), `testserver` (SSH/RDP-Tests), `cygwin-payload` (lokale Bash, X-Server).
3. **Plan vorlegen:** betroffene Dateien, neue Typen, Schnittstellen- und Konfigurationsänderungen, Tests. Bei mehr als drei Dateien auf Freigabe warten.
4. **Status** in `docs/FEATURES.md` auf 🟨.
5. **Tests zuerst** für Logik in `crates/` (`cargo test`).
6. **Implementieren.** API-Fragen über docs.rs / Crate-Quelltext / MCP `context7` bzw. `microsoft-learn` klären, nicht raten.
7. **Prüfen:**
   - `cargo fmt --all`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`
   - Frontend: `npx tsc --noEmit`, `npm test`
   - Netzwerk-Features: Integrationstests gegen `testing/testenv.sh` (Cloud) bzw. `testing/compose.yaml` (Windows)
   - Oberfläche: Screenshot nach Skill `ui-pruefen` und selbst ansehen
8. **Akzeptanzkriterien** der Spec einzeln abhaken. Was nur unter Windows prüfbar ist, als Checkliste für den Nutzer ausgeben.
9. **Status** auf ✅ – oder 🟨 lassen und offene Punkte nennen.
10. **Abschluss:** kurze Zusammenfassung auf Deutsch, Conventional-Commit-Message. In Cloud-Sitzungen committen und pushen; lokal nur auf Wunsch.

Nicht tun: Tests abschwächen oder löschen, um grün zu werden; Funktionen anderer IDs „nebenbei“ einbauen; Dateien in `third_party/` ändern; Spike-Code kopieren.
