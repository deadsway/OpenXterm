# Glossar

## Claude Code und KI

| Begriff | Bedeutung |
|---|---|
| **Agent** | KI, die selbstständig Werkzeuge nutzt, Ergebnisse prüft und weitermacht, bis ein Ziel erreicht ist |
| **Agentische Schleife** | der Kreislauf Überlegen → Werkzeug → Ergebnis → Überlegen |
| **CLAUDE.md** | Projektdatei mit Regeln, die Claude bei jedem Start liest |
| **Checkpoint** | automatischer Rücksprungpunkt in Claude Code (`Esc Esc`) |
| **Cloud-Umgebung** | Konfiguration (Netzzugriff, Variablen, Setup-Skript) für Cloud-Sitzungen |
| **Cloud-Sitzung** | Claude Code läuft auf einer VM von Anthropic statt auf deinem PC |
| **Frontmatter** | Kopfbereich einer Markdown-Datei zwischen `---`-Zeilen mit Metadaten |
| **Hook** | Skript, das bei einem Ereignis automatisch läuft und Aktionen blockieren kann |
| **Kontextfenster** | alles, was Claude in einem Moment „im Kopf“ hat |
| **MCP** | Model Context Protocol – Standard, über den KI-Programme externe Werkzeuge nutzen |
| **MCP-Client / -Server** | Nutzer (Claude Code) bzw. Anbieter (z. B. Microsoft Learn) von MCP-Werkzeugen |
| **Plan-Modus** | Modus, in dem Claude nur liest und plant |
| **Plugin** | Paket aus Skills, Subagenten, Hooks und MCP-Servern zum Installieren |
| **Prompt** | deine Anweisung an Claude |
| **Prompt Injection** | versteckte Anweisungen in Daten (Webseite, Datei), die die KI manipulieren sollen |
| **Routine** | in der Cloud geplante, wiederkehrende Aufgabe (`/schedule`) |
| **Setup-Skript** | Bash-Skript, das eine Cloud-Umgebung vorbereitet (Pakete installieren) |
| **Skill** | Ordner mit `SKILL.md`: Wissen oder Ablauf, den Claude bei Bedarf lädt |
| **Spike** | Wegwerf-Prototyp, der eine einzige technische Frage beantwortet |
| **Subagent** | Hilfsagent mit eigener Rolle, eigenen Werkzeugen und eigenem Kontext |
| **Token** | Zähleinheit für Text; Grundlage für Limits und Kosten |
| **Worktree** | zusätzlicher Arbeitsordner eines Git-Repos auf eigenem Branch |

## Terminal und Protokolle

| Begriff | Bedeutung |
|---|---|
| **ANSI-/VT-Sequenzen** | Steuerzeichen im Terminal (Farben, Cursor), Standard seit VT100 |
| **ConPTY** | Windows-API (ab Windows 10 1809) für Pseudo-Terminals; Grundlage für cmd/PowerShell/WSL-Tabs |
| **Cygwin** | POSIX-Schicht für Windows (`cygwin1.dll`) plus Unix-Programme |
| **IAC** | „Interpret As Command“ – Steuerbyte im Telnet-Protokoll |
| **Jump-Host / Gateway** | Zwischenserver, über den man einen sonst unerreichbaren Server per SSH erreicht |
| **known_hosts** | Liste vertrauter Server-Schlüssel, schützt vor Man-in-the-Middle |
| **Mosh** | „Mobile Shell“, UDP-basiert, übersteht Netzwechsel |
| **OSC** | „Operating System Command“ – Terminal-Sequenz z. B. für Fenstertitel |
| **Pageant / SSH-Agent** | Programm, das entsperrte private Schlüssel bereithält |
| **PTY** | Pseudo-Terminal: Paar aus „Master“ (Terminal) und „Slave“ (Shell) |
| **RDP** | Remote Desktop Protocol (Windows-Fernsteuerung) |
| **RFB** | Protokoll hinter VNC |
| **SCP / SFTP** | Dateiübertragung über SSH (SFTP mit Verzeichnisfunktionen) |
| **SOCKS** | Proxy-Protokoll; Grundlage für dynamische SSH-Tunnel |
| **X11 / X-Server** | Unix-Grafiksystem; der X-Server zeigt Fenster entfernter Programme lokal an |
| **X11-Forwarding** | X11-Verkehr durch die SSH-Verbindung tunneln |
| **XDMCP** | Protokoll, um einen kompletten entfernten Unix-Desktop anzuzeigen |

## Rust, Tauri und Web

| Begriff | Bedeutung |
|---|---|
| **async / await, Tokio** | Rusts Art, viele Verbindungen gleichzeitig zu bedienen; Tokio ist die Laufzeitumgebung dafür |
| **Canvas** | HTML-Zeichenfläche; dort malen wir das RDP-/VNC-Bild |
| **Cargo** | Rusts Build-Werkzeug und Paketmanager (`cargo build`, `cargo test`) |
| **Channel (Tauri)** | Datenstrom von Rust zur Oberfläche, z. B. Terminal-Ausgabe als Rohbytes |
| **Clippy / rustfmt** | Linter bzw. Formatierer für Rust |
| **Crate** | ein Rust-Paket (Bibliothek oder Programm), veröffentlicht auf crates.io |
| **`[patch.crates-io]`** | Eintrag in `Cargo.toml`, um eine Crate durch eine eigene Version (z. B. aus einem Fork) zu ersetzen |
| **Command / invoke (Tauri)** | Funktion in Rust, die die Oberfläche aufrufen kann (`invoke("ssh_connect", …)`) |
| **Fork** | eigene Kopie eines fremden GitHub-Repositorys, z. B. `deadsway/IronRDP` |
| **portable-pty** | Rust-Crate für Pseudo-Terminals; nutzt unter Windows ConPTY |
| **React** | Bibliothek für Benutzeroberflächen aus Komponenten |
| **Tauri** | Rahmen für Desktop-Apps: Oberfläche als Webseite, Logik in Rust |
| **TypeScript** | JavaScript mit Typen; Sprache der Oberfläche |
| **`unwrap()`** | „Fehler ignorieren und notfalls abstürzen“ – in Produktivcode verboten |
| **Vite** | Entwicklungs- und Build-Werkzeug für die Oberfläche |
| **WebView2** | in Windows eingebaute Browser-Engine (Edge), in der Tauri die Oberfläche zeigt |
| **Workspace (Cargo)** | mehrere Crates in einem Repository, gemeinsam gebaut |
| **xterm.js** | Terminal-Emulator im Browser (u. a. in VS Code verwendet) |

## Windows und Test

| Begriff | Bedeutung |
|---|---|
| **CNG / DPAPI** | Krypto-API von Windows bzw. Funktion, Daten an das Benutzerkonto gebunden zu verschlüsseln |
| **Docker Desktop** | startet Container (hier: Wegwerf-Testserver) unter Windows |
| **Payload** | die mitgelieferte Cygwin-Umgebung |
| **Spike** | Wegwerf-Prototyp für genau eine technische Frage |
| **xdotool** | steuert Maus und Tastatur unter Linux per Befehl – damit bedient Claude die App in der Cloud |
| **xrdp** | RDP-Server für Linux; unser Testserver (kann kein NLA) |
| **Xvfb** | virtueller Bildschirm ohne Monitor; damit läuft die App in der Cloud |
