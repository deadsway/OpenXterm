# Grundlagen: Wie Claude Code, Agenten und MCP funktionieren

Dieses Dokument erklärt die Ideen hinter den Werkzeugen. Du musst es nicht vor dem Start lesen, aber es hilft, wenn etwas nicht so läuft wie erwartet.

---

## 1. Vom Chatbot zum Agenten

Ein Sprachmodell wie Claude bekommt Text und erzeugt Text. Allein kann es weder Dateien lesen noch Programme starten.

**Claude Code** gibt dem Modell **Werkzeuge** (englisch *tools*): Datei lesen, Datei bearbeiten, Befehl ausführen, suchen, im Web nachschlagen. Statt nur zu antworten, kann Claude dann sagen „ich möchte `cargo test` ausführen“. Claude Code führt das aus (nach deiner Erlaubnis) und gibt das Ergebnis zurück. Claude liest das Ergebnis und entscheidet den nächsten Schritt.

```
Ziel ──► Claude überlegt ──► Werkzeugaufruf ──► Ergebnis ──┐
              ▲                                            │
              └────────────── nächster Schritt ◄───────────┘
                         ... bis das Ziel erreicht ist
```

Diese Schleife ist ein **Agent**. Der Unterschied zum Chat: Claude prüft seine eigene Arbeit (baut, testet, liest Fehlermeldungen) und korrigiert sich, bevor du das Ergebnis siehst.

**Folgerung für dich:** Gib Claude Möglichkeiten, sich selbst zu prüfen – Build-Skripte, Tests, klare Akzeptanzkriterien. Ein Agent ohne Testmöglichkeit rät.

---

## 2. Das Kontextfenster – Claudes Arbeitsgedächtnis

Claude hat kein dauerhaftes Gedächtnis über dein Projekt. Alles, was es „weiß“, steht im **Kontextfenster**: Systemanweisungen, CLAUDE.md, das bisherige Gespräch, gelesene Dateien, Befehlsausgaben.

- Das Fenster ist groß, aber begrenzt. Wird es voll, fasst Claude Code ältere Teile automatisch zusammen – Details gehen dabei verloren.
- **Bei jeder neuen Nachricht wird der gesamte Kontext erneut verarbeitet.** Ein langes Gespräch macht jede weitere Nachricht teurer.
- Je mehr irrelevantes Material im Kontext steht, desto eher übersieht Claude das Wichtige.

Darum:

| Maßnahme | Wirkung |
|---|---|
| `/clear` zwischen Aufgaben | leerer Kontext, nur CLAUDE.md wird neu geladen |
| `/compact` | Gespräch wird zusammengefasst, Platz wird frei |
| `/context` | zeigt, was gerade wie viel Platz belegt |
| Wissen in Dateien statt im Chat | Specs und Doku überleben `/clear` |
| Subagenten | erledigen Teilaufgaben in einem eigenen Kontext |

**Tokens** sind die Einheiten, in denen Text gezählt wird (grob: ein deutsches Wort ≈ 1–3 Tokens). Abrechnung und Limits richten sich nach Tokens.

---

## 3. Die Erweiterungen im Überblick

Claude Code kennt mehrere Wege, sein Verhalten an ein Projekt anzupassen. Die Doku von Anthropic fasst es so zusammen: CLAUDE.md für Kontext, der immer gilt; Skills für Wissen und Abläufe bei Bedarf; MCP für externe Verbindungen; Subagenten für Isolation; Hooks für Automatisierung. Plugins bündeln all das zum Weitergeben.

| Mechanismus | Vergleich aus dem Arbeitsleben | Wann geladen | Wer entscheidet | In diesem Projekt |
|---|---|---|---|---|
| **CLAUDE.md** | Einarbeitungsmappe am ersten Tag | immer, komplett | – | Befehle, Code-Regeln, Arbeitsweise |
| **Skill** | Fachbuch im Regal / Checkliste | Kurzbeschreibung immer, Inhalt bei Bedarf | Claude (passend zur Aufgabe) oder du per `/name` | `rust-backend`, `tauri-schnittstelle`, `ui-pruefen`, `sicherheit` … |
| **Subagent** | Kollege mit eigenem Schreibtisch | wenn delegiert | Claude oder du | `feature-analyst`, `code-reviewer`, `test-writer`, `upstream-watcher` |
| **Hook** | Hausregel, die automatisch durchgesetzt wird | bei Ereignissen (vor/nach Werkzeug, beim Beenden …) | niemand – läuft immer | Schutz von `third_party/`, Build-Prüfung |
| **MCP-Server** | Anschluss an ein externes System | beim Start verbunden, Werkzeuge bei Bedarf | Claude | Microsoft-Doku, Bibliotheksdoku, GitHub |
| **Plugin** | Werkzeugkoffer zum Weitergeben | bei Installation | du | später: eigenes Plugin aus unseren Skills |

### CLAUDE.md
Eine Markdown-Datei im Projektordner. Was dort steht, sieht Claude in *jeder* Sitzung. Deshalb: kurz, konkret, nur Dauerhaftes. Es gibt auch eine persönliche CLAUDE.md in deinem Benutzerordner (`~/.claude/CLAUDE.md`) für Vorlieben, die überall gelten.

### Skills
Ein Ordner mit einer `SKILL.md`. Oben steht ein Kopf (*Frontmatter*) mit `name` und `description`. Die **Beschreibung** ist entscheidend: Nur sie liest Claude ständig, und daran entscheidet es, ob es den Skill lädt. Skills können auch Skripte oder Vorlagen enthalten. Sie folgen einem offenen Standard (Agent Skills) und funktionieren auch in anderen Claude-Produkten.

Es gibt zwei Arten:
- **Nachschlage-Skills** (Wissen, z. B. „so reden Oberfläche und Rust miteinander“)
- **Handlungs-Skills** (Abläufe, z. B. `/feature-umsetzen`)

### Subagenten
Eine Markdown-Datei in `.claude/agents/` mit Rolle, erlaubten Werkzeugen und optional Modell. Der Hauptagent gibt ihnen einen Auftrag; sie arbeiten in einem **eigenen Kontext** und geben nur ihr Ergebnis zurück.

Vorteile: Hauptkontext bleibt sauber; Werkzeuge lassen sich einschränken (der Reviewer darf nichts ändern); unvoreingenommener Blick. Nachteil: Sie wissen nur, was im Auftrag steht – gute Aufträge sind wichtig.

### Hooks
Shell-Befehle, die Claude Code bei **Ereignissen** ausführt, zum Beispiel:
- `PreToolUse` – bevor ein Werkzeug läuft (kann es blockieren)
- `PostToolUse` – nachdem ein Werkzeug lief
- `Stop` – wenn Claude seine Antwort beenden will
- `SessionStart` – beim Start einer Sitzung

Ein Hook bekommt die Ereignisdaten als JSON auf stdin. Beendet er sich mit **Exit-Code 2**, wird die Aktion blockiert und seine Fehlerausgabe geht an Claude zurück – Claude sieht also, *warum* es nicht weitergeht, und reagiert darauf.

Wichtig: **Claude weiß nichts von Hooks**, sie laufen außerhalb. Darum eignen sie sich für Regeln, die zuverlässig gelten müssen.

### Berechtigungen
In `settings.json` legst du fest, was ohne Rückfrage (`allow`), mit Rückfrage (`ask`) oder nie (`deny`) erlaubt ist. Es gibt drei Ebenen:
- `~/.claude/settings.json` – für dich, alle Projekte
- `.claude/settings.json` – für das Projekt, wird eingecheckt
- `.claude/settings.local.json` – für dich in diesem Projekt, wird **nicht** eingecheckt

### Modi
Mit `Shift+Tab` wechselst du zwischen dem normalen Modus (jede Änderung bestätigen), dem automatischen Annehmen von Dateiänderungen und dem **Plan-Modus** (nur lesen und planen). Für Neues immer erst planen.

---

## 4. MCP – das Model Context Protocol

### Die Idee
Ohne Standard müsste jedes KI-Programm für jedes externe System (Doku, GitHub, Datenbank, Ticketsystem) eine eigene Anbindung haben. MCP ist ein offener Standard wie ein USB-Anschluss: Ein **MCP-Server** bietet Fähigkeiten an, ein **MCP-Client** (hier Claude Code) kann sie nutzen – egal, wer beides gebaut hat.

### Was ein Server anbietet
- **Tools** – Funktionen, die Claude aufrufen kann (z. B. `microsoft_docs_search(query)`)
- **Resources** – lesbare Inhalte (z. B. eine Datei, ein Datensatz)
- **Prompts** – vorgefertigte Aufträge

### Wie die Verbindung läuft
- **stdio:** Claude Code startet den Server als Prozess und spricht über stdin/stdout mit ihm. Typisch für lokale Werkzeuge. Folge: Der Server darf **nichts anderes** auf stdout schreiben, sonst zerstört er das Protokoll.
- **HTTP:** Der Server läuft irgendwo im Netz, Claude Code ruft ihn per HTTPS auf (z. B. Microsoft Learn).

Die Nachrichten sind **JSON-RPC 2.0**. Der Ablauf:

```
Client                                   Server
  │── initialize (Version, Fähigkeiten) ──►│
  │◄── Antwort (Version, Fähigkeiten) ─────│
  │── notifications/initialized ──────────►│
  │── tools/list ─────────────────────────►│
  │◄── Liste: Name, Beschreibung, Schema ──│
  │── tools/call {name, arguments} ───────►│
  │◄── Ergebnis (Text, Bilder …) ──────────│
```

In `docs/MCP-LERNPFAD.md` baust du genau das selbst in Rust – danach ist MCP kein Geheimnis mehr.

### Sicherheit
- Ein lokaler MCP-Server ist ein Programm mit deinen Rechten.
- Ein MCP-Server liefert Text, der in Claudes Kontext landet – auch Text aus dem Internet. Daraus kann **Prompt Injection** entstehen. Nur vertrauenswürdige Server verwenden.
- Tokens für Server (z. B. GitHub) mit minimalen Rechten erzeugen und als Umgebungsvariable übergeben, nicht in Dateien schreiben.

---

## 5. Lokal, Desktop-App, Cloud – wo läuft was?

| | Terminal (`claude`) | Desktop-App | Cloud (Web, `claude --cloud`) |
|---|---|---|---|
| Wo laufen Befehle? | auf deinem PC | auf deinem PC | auf einer Linux-VM von Anthropic |
| Zugriff auf deine Dateien | ja | ja | nein – nur auf das geklonte GitHub-Repo |
| Windows-Programme starten | ja | ja | **nein** |
| Läuft weiter, wenn PC aus | nein | nein | ja |
| Ergebnis | Änderungen im Ordner | Änderungen im Ordner | Branch / Pull Request |
| Gut für | alles mit Windows-Bezug | wie Terminal, mit grafischer Oberfläche | Bauen, Testen, App unter Xvfb bedienen und per Screenshot prüfen, Specs, Reviews, lange Aufgaben |

Für OpenXterm heißt das: Fast alles lässt sich in der Cloud bauen und prüfen – sogar die Oberfläche per Screenshot. Windows-Spezifisches (ConPTY, Cygwin, echtes RDP mit NLA, Installer) prüfst du lokal, und GitHub Actions baut bei jedem Push zusätzlich unter Windows. Details in `docs/CLAUDE-CODE-CLOUD.md`.

---

## 6. Git als Sicherheitsnetz

Mit Agenten wird Git noch wichtiger:

- **Vor größeren Aufträgen committen.** Dann ist „zurück“ immer ein `git restore .` entfernt.
- **Kleine Commits** pro Feature – leichter zu prüfen und gezielt rückgängig zu machen.
- **Branches + Pull Requests** auch allein: Der PR ist der Ort, an dem du den Diff in Ruhe ansiehst.
- **Worktrees** für parallele Sitzungen (siehe ANLEITUNG, Abschnitt 10).
- Claude Code hat zusätzlich **Checkpoints**: `Esc Esc` springt im Gespräch und in den Dateiänderungen zurück. Das ersetzt Git nicht, ist aber schneller für „das war nichts“.

---

## 7. Gute Aufträge formulieren

Ein guter Auftrag enthält:

1. **Ziel** – was soll danach gehen?
2. **Kontext** – welche Dateien/Specs sind relevant (`@pfad`)?
3. **Grenzen** – was soll *nicht* passieren („ändere nur src/sessions“)?
4. **Prüfung** – woran erkennt man Erfolg (Test, Befehl, Verhalten)?

Schwach:
> Mach den SFTP-Browser.

Gut:
> Setze FILE-02 laut @docs/specs/FILE-02.md um. Nur Upload per Drag & Drop, Download kommt später. Fortschritt im vorhandenen Transferpanel. Integrationstest gegen den SSH-Testserver (`testing/testenv.sh`). Fertig, wenn `cargo test --workspace -- --include-ignored` grün ist und ein Screenshot das Panel mit Fortschritt zeigt.

Weitere Tipps:
- Bei Unklarheit **Claude Fragen stellen lassen**: „Stelle mir vorher bis zu fünf Fragen.“
- **Erklären lassen**, wenn du etwas nicht verstehst. Du bist nicht nur Auftraggeber, sondern auch Lernender.
- **Belege verlangen** bei API-Aussagen („mit microsoft-learn prüfen“).

---

## 8. Grenzen und typische Fehler von KI-Agenten

| Fehlerbild | Gegenmittel |
|---|---|
| erfindet plausible, aber falsche API-Funktionen | Doku per MCP nachschlagen lassen, bauen und testen |
| „repariert“ Tests, statt den Code zu fixen | in CLAUDE.md verboten; im Review darauf achten |
| macht mehr als verlangt | Grenzen im Auftrag nennen; Plan-Modus |
| verliert in langen Sitzungen den Faden | `/clear`, Wissen in Specs auslagern |
| meldet „fertig“, obwohl etwas fehlt | Akzeptanzkriterien, Stop-Hook mit Build-Prüfung |
| übersieht UI-Probleme | UI selbst testen – Claude sieht deinen Bildschirm nicht |

Das ist kein Grund zur Sorge, sondern der Grund, warum dieses Projekt mit Specs, Tests, Hooks und Reviews aufgebaut ist.
