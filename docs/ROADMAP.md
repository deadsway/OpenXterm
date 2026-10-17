# Roadmap

181 Funktionen in neun Phasen plus Vorbereitung. Jede Phase endet mit einem lauffähigen, committeten Stand und grüner CI. Feature-IDs siehe `FEATURES.md`. SEC-07 und SEC-08 gelten in allen Phasen.

> 💡 **Warum diese Reihenfolge?** Zuerst klären, ob die Technik trägt (Spike), dann das, was alles andere trägt (Tabs mit Terminal), dann das, was man täglich braucht (lokale Shell, SFTP), dann Komfort, dann Breite. Riskante Technik beginnt immer mit einem Spike.

---

## Phase 0 – Vorbereitung und Spike S1 ✅
> **Abgeschlossen am 17.10.2026.** Ergebnis: `spikes/s1-ssh-rdp/ERGEBNIS.md`. Entscheidung: weiter mit Tauri. Offen: NLA gegen Windows, wird in Phase 5 vor dem Bau des RDP-Tabs geprüft.

**Ziel:** Werkzeuge und Cloud stehen; der Spike beweist, dass SSH-Terminal und RDP-Bild in einer Tauri-App funktionieren.

Vorbereitung:
- Windows-Werkzeuge, Claude Code, GitHub-Repo, Cloud-Umgebung (`ANLEITUNG.md` Teil A und B)
- Projektdateien aus diesem Paket im Repo

Spike S1 (Details: `docs/SPIKE-S1.md`):
- Tauri-2-App unter `spikes/s1-ssh-rdp` mit zwei Tabs
- Tab „SSH“: russh + xterm.js gegen den SSH-Testserver, mit Host-Key-Dialog
- Tab „RDP“: IronRDP → Canvas gegen xrdp (TLS), Maus und Tastatur
- Screenshots aus der Cloud, Test unter Windows, `ERGEBNIS.md`

**DoD:** Alle Akzeptanzkriterien in `SPIKE-S1.md` erfüllt oder begründet als Risiko notiert; Entscheidung „weiter mit Tauri“ dokumentiert.
**Lernziel:** CLAUDE.md, Plan-Modus, Cloud-Sitzungen, Screenshots als Rückmeldung, Hooks beobachten.

## Phase 1 – Fundament und SSH-Tabs (MVP)
Fundament: Cargo-Workspace und `app/` laut `ARCHITEKTUR.md`, Crates `ox-core`, `ox-ssh`, GitHub Actions (Linux: Tests + Screenshot; Windows: Build), Erkenntnisse aus dem Spike übernehmen (nicht den Spike-Code kopieren, sondern sauber neu).

SES-01, SES-02, SES-03, SES-04, SES-11 · TERM-01, TERM-02, TERM-05, TERM-06, TERM-11, TERM-20, TERM-21 · UI-01, UI-02, UI-07, UI-13, UI-15, UI-16 · SSH-01, SSH-02, SSH-03, SSH-04, SSH-05, SSH-06, SSH-07, SSH-12, SSH-19, SSH-20 · PROTO-01, PROTO-02, PROTO-04, PROTO-07 · CFG-01, CFG-02, CFG-06

**DoD:** SSH, Telnet, Rlogin, Serial und Raw als Tabs; Sessions im Baum, gespeichert in `OpenXterm.toml`; Host-Keys werden geprüft und gespeichert; `vim`, `htop`, `mc` werden korrekt dargestellt; Größenänderung funktioniert.
**Lernziel:** Skills, Subagenten `feature-analyst` und `code-reviewer`, Arbeitszyklus pro Feature.

## Phase 2 – Lokales Terminal und portable EXE
**Start mit Spike S2:** Cygwin-Minimalumgebung neben der EXE, Bash darin über portable-pty starten.

TERM-19 · LOCAL-01, LOCAL-02, LOCAL-03, LOCAL-04, LOCAL-05, LOCAL-07, LOCAL-09 · REL-01, REL-07

**DoD:** Tabs für Bash (Cygwin), cmd, PowerShell und WSL; `/drives/c` funktioniert; OpenSSH- und OpenSSL-Werkzeuge im Terminal; OpenXterm läuft vom USB-Stick ohne Installation und ohne Adminrechte.
**Lernziel:** Hooks anpassen, Windows-spezifisches lokal prüfen, MCP `microsoft-learn` (ConPTY).

## Phase 3 – SFTP-Browser und Sicherheit
SES-16 · SSH-08, SSH-09, SSH-13, SSH-14, SSH-15, SSH-16, SSH-17 · FILE-01 … FILE-06 · SEC-01 … SEC-05 · CFG-04 · TOOL-01

**DoD:** SFTP-Seitenleiste mit Drag & Drop und Bearbeiten-und-Zurückspeichern; Jump-Host für Terminal und Browser; Passwörter nur verschlüsselt gespeichert; Master-Passwort; Agent und Schlüsselgenerator; Editor.
**Lernziel:** Subagent `test-writer`, testgetrieben, Integrationstests gegen den Testserver in der Cloud.

## Phase 4 – Komfort
SES-05, SES-07, SES-10, SES-12, SES-13, SES-14 · TERM-03, TERM-04, TERM-07 … TERM-10, TERM-12 … TERM-18 · UI-03 … UI-06, UI-08 … UI-12, UI-14 · SSH-21 · AUTO-01, AUTO-03

**DoD:** 4er-Split mit MultiExec; Makro aufnehmen und auf anderem Server abspielen; alle Kürzel konfigurierbar; Import aus MobaXterm- und PuTTY-Konfiguration; Fernüberwachungsleiste.
**Lernziel:** Kontextmanagement bei großen UI-Features, mehrere Cloud-Sitzungen parallel.

## Phase 5 – Weitere Session-Typen
FILE-07, FILE-08, FILE-09 · RDP-01 … RDP-06 · VNC-01 … VNC-04 · PROTO-03, PROTO-05, PROTO-06

**DoD:** RDP mit Umleitungen und dynamischer Größe im Tab (gegen xrdp und echten Windows-Rechner); VNC gegen einen Testserver; FTPS-Browser; Mosh im Tab.
**Lernziel:** Arbeit im IronRDP-Fork (`deadsway/IronRDP`) inkl. `[patch.crates-io]`, falls Änderungen nötig sind.

## Phase 6 – X11
**Start mit Spike S3:** Cygwin XWin starten, `xclock` per X11-Forwarding anzeigen.

LOCAL-10 · SSH-10, SSH-11 · X11-01 … X11-08

**DoD:** Remote-GUI-Programme erscheinen als Windows-Fenster; XDMCP-Desktop; X11-Einstellungen wirksam.
**Lernziel:** Recherche an Subagenten delegieren.

## Phase 7 – Tunnel, Server, Netzwerkwerkzeuge
RDP-07, VNC-05 · NET-01 … NET-09 · SRV-01 … SRV-10

**DoD:** Tunnel-Manager mit Autostart und Wiederverbinden; HTTP/FTP/TFTP/SSH-Server per Klick; Port- und Netzwerkscanner.
**Lernziel:** eigener MCP-Server `tools/oxdev-mcp` (`MCP-LERNPFAD.md`).

## Phase 8 – Werkzeuge und Extras
SES-06, SES-08, SES-09, SES-15 · TERM-22 · LOCAL-06, LOCAL-08, LOCAL-11 · SSH-18 · RDP-08 · SEC-06 · AUTO-02, AUTO-04, AUTO-05, AUTO-06 · CFG-03, CFG-05 · TOOL-02 … TOOL-07 · EXT-01 … EXT-05 · REL-02 … REL-06

**DoD:** Funktionsgleichheit laut `FEATURES.md`; Installer und portable EXE signiert; Hilfe; Customizer.
**Lernziel:** eigene Skills/Agenten schreiben, Plugin aus den Projekt-Skills, Cloud-Routinen (`/schedule`).

---

## Release-Checkliste (ab Phase 3 sinnvoll)
- [ ] `THIRD-PARTY-NOTICES.md` vollständig, Lizenztexte im Paket
- [ ] Quellcode-Angebot für Cygwin/GPL-Komponenten (z. B. als Release-Asset)
- [ ] EXE und Installer signiert
- [ ] Manuelle Testcheckliste je Session-Typ durchlaufen
- [ ] Keine Netzverbindung beim Start (Ressourcenmonitor prüfen)
- [ ] Name und Gestaltung gegen `RECHTLICHES.md` geprüft
