# OpenXterm

Freie All-in-One-Toolbox für Remote-Computing unter Windows: Terminal mit Tabs, SSH mit grafischem SFTP-Browser, RDP und VNC im Tab, lokale Shells (PowerShell, cmd, WSL, Bash), Unix-Werkzeuge, X-Server, Tunnel, Mini-Server und Netzwerkwerkzeuge – als **portable Anwendung ohne Installation und ohne Administratorrechte**.

OpenXterm bildet den Funktionsumfang von MobaXterm (Mobatek) möglichst vollständig nach – mit eigenem Code, eigenem Namen und eigener Gestaltung. Es steht in keiner Verbindung zu Mobatek.

> **Status:** Vorbereitung und Spike S1 (Phase 0). Noch kein nutzbares Programm.

## Technik

| Teil | Lösung |
|---|---|
| App-Gerüst | Tauri 2 (Rust + WebView2) |
| Oberfläche | TypeScript, React, Vite |
| Terminal | xterm.js |
| SSH, SFTP, Tunnel | russh, russh-sftp |
| RDP | IronRDP (Fork für eigene Änderungen: `deadsway/IronRDP`) |
| Lokale Shells | portable-pty (ConPTY) |
| Unix-Werkzeuge, X-Server | Cygwin (wie das Vorbild) |

Warum so: `docs/ARCHITEKTUR.md`, Abschnitt „Entscheidungen“.

## Projektziele

1. Ein vollwertiges, robustes Werkzeug für Windows-Admins und Entwickler.
2. Ein Lernprojekt für agentische Softwareentwicklung mit **Claude Code**: Agenten, Subagenten, Skills, Hooks, MCP – lokal und in der Cloud.

## Wegweiser

| Datei | Wofür |
|---|---|
| [`ANLEITUNG.md`](ANLEITUNG.md) | **Hier anfangen.** Schritt für Schritt vom leeren Rechner bis zum Spike, mit „Warum?“-Erklärungen |
| [`docs/SPIKE-S1.md`](docs/SPIKE-S1.md) | Was der erste Prototyp beweisen soll und woran man den Erfolg erkennt |
| [`docs/GRUNDLAGEN.md`](docs/GRUNDLAGEN.md) | Hintergrund: Agenten, Kontext, Skills, Hooks, MCP, Cloud |
| [`docs/GLOSSAR.md`](docs/GLOSSAR.md) | Begriffe von „Crate“ bis „Worktree“ |
| [`docs/CLAUDE-CODE-CLOUD.md`](docs/CLAUDE-CODE-CLOUD.md) | Claude Code in der Cloud für dieses Projekt |
| [`docs/FEATURES.md`](docs/FEATURES.md) | Vollständige Funktionsanalyse (181 Funktionen) mit IDs, Phase, Status |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phasen mit Ziel, Definition of Done, Lernziel |
| [`docs/ARCHITEKTUR.md`](docs/ARCHITEKTUR.md) | Aufbau, Datenflüsse, Bibliotheken, Entscheidungen |
| [`docs/MCP-LERNPFAD.md`](docs/MCP-LERNPFAD.md) | MCP nutzen und einen eigenen MCP-Server in Rust bauen |
| [`docs/RECHTLICHES.md`](docs/RECHTLICHES.md) | Name, Lizenzen, was beim Nachbau erlaubt ist |
| [`testing/`](testing/README.md) | Testserver (SSH, RDP) und Werkzeuge für Screenshots |
| `CLAUDE.md` | Projektgedächtnis für Claude Code |
| `.claude/` | Skills, Subagenten, Hooks, Berechtigungen |
| `.mcp.json` | MCP-Server für die Entwicklung |
| `cloud/setup.sh` | Setup-Skript für die Cloud-Umgebung |

## Lizenz

Noch offen (Empfehlung MIT, siehe `docs/RECHTLICHES.md`).
