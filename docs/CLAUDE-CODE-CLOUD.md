# Claude Code in der Cloud für OpenXterm

## Was ist eine Cloud-Sitzung?

Claude Code läuft auf einer virtuellen Maschine von Anthropic statt auf deinem PC. Dein GitHub-Repository wird dort geklont, Claude arbeitet, testet und schiebt am Ende einen **Branch** nach GitHub. Im Browser siehst du den Diff, kannst Kommentare an einzelne Zeilen hängen und daraus einen Pull Request machen. Die Sitzung läuft weiter, wenn du den Browser schließt.

Starten: https://claude.ai/code, Desktop-App, Claude-App am Handy oder im Terminal mit `claude --cloud "Auftrag"`.

**Voraussetzung:** Abo Pro, Max oder Team (bzw. passender Enterprise-Sitz). Einrichtung: `ANLEITUNG.md`, Teil D.

## Was die Cloud für OpenXterm kann

Die VM ist **Ubuntu 24.04**. Vorinstalliert sind u. a. Rust, Node.js, GCC/Clang, CMake, Docker, git und gh. Unser Setup-Skript ergänzt Tauri-Bibliotheken, Werkzeuge für Screenshots und die Testserver.

| In der Cloud ✅ (geprüft, Oktober 2026) | Nur unter Windows ❌ |
|---|---|
| Rust-Crates bauen und testen (`cargo test`) | WebView2-Besonderheiten, Windows-Schriften |
| Tauri-App bauen und unter Xvfb **starten** | ConPTY: PowerShell-, cmd-, WSL-Tabs |
| App **bedienen** (xdotool) und **Screenshots** ansehen | Cygwin-Payload, X-Server unter Windows |
| SSH-Tests gegen lokalen OpenSSH-Server | RDP mit **NLA** gegen echtes Windows |
| RDP-Tests gegen xrdp (TLS, Autologon) | Installer, Code-Signatur, SmartScreen |
| Specs, Reviews, Doku, CI-Fehler analysieren | Gefühlte Geschwindigkeit, Tastaturlayout |

> 💡 **Warum ist das so wertvoll?** Claude kann in der Cloud die komplette Schleife allein durchlaufen: Code ändern → bauen → App starten → klicken/tippen → Screenshot ansehen → korrigieren. Du kommst erst dazu, wenn ein Ergebnis vorliegt. Den Windows-Teil prüfst du anschließend lokal, und GitHub Actions baut bei jedem Push auf einem echten Windows-Rechner.

## Einrichtung (Kurzfassung)

1. `gh auth login` und `gh auth refresh -s workflow`
2. In Claude Code: `/login` (claude.ai-Konto), dann `/web-setup`
3. Auf claude.ai/code die Umgebung bearbeiten: Netzwerk **Trusted**, Setup-Skript aus [`cloud/setup.sh`](../cloud/setup.sh)
4. Testlauf: `ANLEITUNG.md`, Abschnitt D3

## Modi in Cloud-Sitzungen

| Modus | Verhalten | Wann |
|---|---|---|
| **Plan** | Claude schlägt einen Plan vor und wartet | Start jeder neuen Aufgabe |
| **Accept edits** | Claude ändert Dateien ohne Rückfrage | nach Freigabe des Plans |
| **Auto** | eine Prüfinstanz bewertet Aktionen statt dich zu fragen (wenn verfügbar) | später, für gut eingespielte Aufgaben |

## Werkzeuge im Repository für die Cloud

| Werkzeug | Zweck |
|---|---|
| `testing/testenv.sh start\|stop\|status` | SSH (2222) und RDP/xrdp (3389) mit Benutzer `tester` |
| `testing/shot.sh <png> <sek> <programm>` | App starten, nach N Sekunden Screenshot |
| `testing/ui-session.sh start\|run\|type\|key\|click\|shot\|stop` | App Schritt für Schritt bedienen |
| Skill `ui-pruefen` | erklärt Claude, wie es diese Werkzeuge nutzt |
| Hooks (`.claude/hooks/*.mjs`) | laufen auch in der Cloud (Node.js) |

## Netzwerkstufen

| Stufe | Bedeutung |
|---|---|
| None | kein ausgehender Zugriff (außer GitHub-Proxy und Anthropic-API) |
| **Trusted** | Allowlist: Paketquellen (apt, crates.io, npm, Docker Hub), GitHub, Cloud-SDKs – **empfohlen** |
| Full | alles |
| Custom | eigene Allowlist |

Ist ein MCP-Server aus `.mcp.json` in der Cloud nicht erreichbar (z. B. `mcp.context7.com`), funktioniert die Sitzung trotzdem; bei Bedarf die Domain über **Custom** freigeben.

## Typische Aufträge

```
Nutze den Subagenten feature-analyst und erstelle die Specs für SSH-01 bis SSH-04.
```

```
Die GitHub-Actions-Pipeline auf main ist rot. Lies das Log mit gh, finde die Ursache,
behebe sie und pushe.
```

```
Prüfe mit dem Subagenten code-reviewer den Pull Request #3 und schreibe die
Ergebnisse als PR-Kommentar.
```

## Zwischen Cloud und PC wechseln

- **PC → Cloud:** `claude --cloud "Auftrag"` im Projektordner.
- **Cloud → PC:** PR mergen und `git pull`, oder den Branch direkt holen: `git fetch; git switch <branch>`. Eine laufende Cloud-Sitzung lässt sich auch ins lokale Terminal übernehmen („Teleport“, siehe Doku „Use Claude Code in the cloud“).

## Routinen (Phase 8)

```
/schedule Jeden Montag: Prüfe mit dem Subagenten upstream-watcher, ob es neue
Versionen von IronRDP, russh, Tauri oder xterm.js gibt. Wenn ja, lege ein
GitHub-Issue mit den relevanten Änderungen an.
```

## Quellen

- Get started with Claude Code in the cloud: https://code.claude.com/docs/en/web-quickstart
- Configure cloud environments: https://code.claude.com/docs/en/cloud-environments
