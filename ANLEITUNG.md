# Anleitung: OpenXterm mit Claude Code bauen

Diese Anleitung führt dich vom leeren Windows-PC bis zum fertigen **Spike S1** – einem Prototyp, der beweist, dass SSH-Terminal und RDP-Bild in einer Tauri-App funktionieren. Danach kennst du den Arbeitszyklus für alle weiteren Funktionen.

An jeder wichtigen Stelle steht ein **💡 Warum?**-Kasten. Begriffe erklärt [`docs/GLOSSAR.md`](docs/GLOSSAR.md), Hintergründe [`docs/GRUNDLAGEN.md`](docs/GRUNDLAGEN.md).

**Deine Ausgangslage:** leeres Repo `deadsway/OpenXterm`, Fork `deadsway/IronRDP`, Git/SSH/Terminal bekannt, Claude Code neu.

| Teil | Inhalt | Wo |
|---|---|---|
| A | Windows-PC einrichten | dein PC |
| B | Repository befüllen | dein PC |
| C | Claude Code kennenlernen | dein PC |
| D | Cloud einrichten | Browser + PC |
| E | Spike S1 Schritt für Schritt | Cloud, dann PC |
| F | Wie es danach weitergeht | beides |

---

## 0. Vorab: Wie die Arbeit verteilt ist

| Du | Claude |
|---|---|
| entscheidest, *was* gebaut wird | schlägt vor, *wie* |
| liest Pläne und Specs, beantwortest Rückfragen | schreibt Specs, Code, Tests |
| prüfst Ergebnisse (Diff, Screenshot, selbst ausprobieren) | baut, testet, macht Screenshots, korrigiert sich |
| gibst Riskantes frei (Pakete, Pushes, Merges) | fragt nach, wo die Regeln es verlangen |

> 💡 **Warum?** Claude Code ist kein Autopilot, sondern ein sehr schneller Entwickler, der dein Projekt nur so gut kennt, wie die Dateien es beschreiben. Dafür gibt es `CLAUDE.md`, die Specs und die Skills. Deine wichtigste Aufgabe ist das **Prüfen**.

---

# Teil A – Windows-PC einrichten

## A1. Werkzeuge installieren

PowerShell öffnen (als normaler Benutzer):

```powershell
winget install Git.Git
winget install GitHub.cli
winget install OpenJS.NodeJS.LTS
winget install Rustlang.Rustup
winget install NASM.NASM
winget install Kitware.CMake
winget install Microsoft.VisualStudioCode   # optional, zum Lesen und Prüfen
winget install Docker.DockerDesktop         # für lokale Testserver (braucht WSL2/Virtualisierung)
```

> 💡 **Wofür ist was?**
> - **Git, GitHub CLI (`gh`)** – Versionsverwaltung und GitHub vom Terminal aus. Git for Windows bringt außerdem die *Git Bash* mit, die Claude Code als Shell nutzt.
> - **Node.js** – baut die Oberfläche (TypeScript, Vite) und startet die Tauri-Werkzeuge.
> - **Rustup** – installiert und aktualisiert Rust.
> - **NASM, CMake** – werden von Krypto-Bibliotheken benötigt, die russh und IronRDP verwenden (aws-lc-rs). Ohne sie bricht der Build unter Windows mit kryptischen Fehlern ab.
> - **Docker Desktop** – startet Wegwerf-Server (SSH, RDP) für Tests auf deinem PC. In der Cloud brauchst du es nicht.

## A2. C++-Build-Tools von Microsoft

Rust erzeugt unter Windows Programme mit dem Microsoft-Linker. Lade die **„Build Tools für Visual Studio“** von visualstudio.microsoft.com herunter und wähle im Installer die Arbeitslast **„Desktopentwicklung mit C++“**.

**WebView2** ist unter Windows 10/11 bereits vorhanden.

> 💡 **Warum?** Tauri nennt genau diese beiden Punkte als Voraussetzung unter Windows. Ohne Build Tools kommt beim ersten `cargo build` „linker `link.exe` not found“.

## A3. Rust einrichten

**Neues** Terminal öffnen, dann:

```powershell
rustup default stable-msvc
rustup component add rustfmt clippy
```

## A4. Prüfen

```powershell
git --version; gh --version; node --version; npm --version
rustc --version; cargo --version
nasm -v; cmake --version
```

Meldet `nasm` „nicht gefunden“: `C:\Program Files\NASM` zum PATH hinzufügen (Startmenü → „Umgebungsvariablen“) und Terminal neu öffnen.

## A5. Claude Code installieren und anmelden

```powershell
irm https://claude.ai/install.ps1 | iex
claude --version
```

Dann `claude` starten, mit deinem **claude.ai-Konto** anmelden (`/login`) und mit `/status` prüfen, dass als Login-Methode ein claude.ai-Konto angezeigt wird.

> 💡 **Warum das claude.ai-Konto?** Cloud-Sitzungen gibt es nur mit einem Abo (Pro, Max, Team, passender Enterprise-Sitz). Mit einem reinen API-Schlüssel kannst du nur lokal arbeiten.
>
> **Was ist Claude Code?** Ein Programm, das Claude Werkzeuge gibt: Dateien lesen und ändern, Befehle ausführen, im Web suchen. Claude entscheidet selbst, welches Werkzeug als Nächstes dran ist, schaut sich das Ergebnis an und macht weiter – das nennt man **Agent**. Mehr dazu: `docs/GRUNDLAGEN.md`, Kapitel 1.

---

# Teil B – Repository befüllen

## B1. Bei GitHub anmelden

```powershell
gh auth login                 # GitHub.com, HTTPS, im Browser bestätigen
gh auth refresh -s workflow   # Recht, GitHub-Actions-Dateien zu pushen
```

> 💡 **Warum `workflow`?** Claude wird später die CI-Pipeline unter `.github/workflows/` anlegen. Ohne dieses Recht lehnt GitHub solche Pushes ab – auch aus der Cloud, die dein Token mitbenutzt.

## B2. Repo klonen und Paket hineinkopieren

```powershell
mkdir C:\dev; cd C:\dev
gh repo clone deadsway/OpenXterm
cd OpenXterm
```

Jetzt **alle Dateien aus diesem Paket** in den Ordner `C:\dev\OpenXterm` kopieren – auch die versteckten Einträge `.claude\`, `.mcp.json`, `.gitignore`, `.gitattributes`. (Im Explorer: Ansicht → Einblenden → Ausgeblendete Elemente.)

```powershell
git add -A
git status            # prüfen: .claude/ und testing/ sind dabei
git commit -m "chore: project docs, Claude Code config and test environment"
git push -u origin main
```

> 💡 **Warum zuerst Doku statt Code?** Claude liest bei jedem Start `CLAUDE.md`, dazu bei Bedarf Specs und Skills. Je besser diese Dateien sind, desto weniger musst du in jedem Gespräch erklären. Das ist die wirksamste Investition in dem ganzen Projekt.

## B3. Wofür ist dein IronRDP-Fork?

Für den Spike und die ersten Phasen nutzen wir IronRDP **direkt von crates.io**. Der Fork `deadsway/IronRDP` ist deine Werkbank für den Fall, dass du später etwas an IronRDP ändern musst (Fehler beheben, Funktion ergänzen). Dann:

1. im Fork einen Branch anlegen und dort ändern (Claude kann das in einer eigenen Sitzung im Fork tun),
2. in OpenXterms `Cargo.toml` per `[patch.crates-io]` auf diesen Branch zeigen,
3. die Änderung idealerweise als Pull Request an das Original zurückgeben.

Halte den Fork aktuell: auf GitHub im Fork **„Sync fork“** klicken, wenn du ihn brauchst.

> 💡 **Warum nicht gleich den Fork verwenden?** Die crates.io-Version ist geprüft und versioniert. Ein Fork ohne eigene Änderungen bringt nur Pflegeaufwand. Und: Das IronRDP-Repository enthält eine eigene `CLAUDE.md` und `AGENTS.md` – ein schönes Beispiel, wie ein großes Projekt Claude anleitet. Lies sie dir einmal durch.

---

# Teil C – Claude Code kennenlernen (lokal, 20 Minuten)

```powershell
cd C:\dev\OpenXterm
claude
```

Beim ersten Start fragt Claude Code, ob du dem Ordner vertraust, und zeigt die MCP-Server aus `.mcp.json` zur Freigabe. Beide freigeben.

## C1. Die wichtigsten Bedienelemente

| Eingabe | Wirkung | 💡 Warum wichtig |
|---|---|---|
| `/help` | alle Befehle | Nachschlagen statt raten |
| `/status` | Konto, Modell, Einstellungen | prüfen, wie du angemeldet bist |
| `/memory` | CLAUDE.md öffnen | das Projektgedächtnis pflegen |
| `/mcp` | MCP-Server und Status | sehen, ob die Doku-Werkzeuge verbunden sind |
| `/agents` | Subagenten | unsere Helfer aus `.claude/agents/` |
| `/hooks` | Hooks | sehen, was automatisch läuft |
| `/context` | Füllstand des Kontextfensters | erkennen, wann es zu voll wird |
| `/clear` | Gespräch leeren | **nach jeder Aufgabe** – spart Guthaben |
| `/compact` | Gespräch zusammenfassen | wenn eine Aufgabe lang wird |
| `/model` | Modell wählen | stark für Architektur, schneller für Routine |
| `Shift+Tab` | Modus wechseln, u. a. **Plan-Modus** | im Plan-Modus ändert Claude nichts |
| `Esc` | Claude unterbrechen | wenn es in die falsche Richtung läuft |
| `Esc` `Esc` | zu einem früheren Punkt zurück | Gespräch und Änderungen zurückdrehen |
| `@pfad` | Datei gezielt einbeziehen | z. B. `@docs/SPIKE-S1.md` |
| `!befehl` | Shell-Befehl direkt ausführen | z. B. `!git status` |

> 💡 **Warum fragt Claude um Erlaubnis?** Jede Dateiänderung und jeder Befehl muss bestätigt werden, außer er steht in `.claude/settings.json` unter `allow`. Dort sind Bauen, Testen und lesende Git-Befehle freigegeben; Commit, Push und neue Pakete stehen auf „nachfragen“.

## C2. Übung: Projekt erklären lassen

```
Lies README.md, CLAUDE.md, docs/ARCHITEKTUR.md und docs/SPIKE-S1.md.
Erkläre mir in eigenen Worten, wie im Spike ein Tastendruck im Terminal bis zum
SSH-Server und die Antwort zurück auf den Bildschirm kommt. Ändere nichts.
```

## C3. Übung: MCP ausprobieren

```
Welche Werkzeuge stellen dir die MCP-Server microsoft-learn und context7 zur Verfügung?
Suche mit context7 in der Tauri-2-Doku, wie tauri::ipc::Channel funktioniert,
und fasse es in fünf Sätzen zusammen.
```

> 💡 **Was passiert hier?** Claude hatte vorher keinen Zugriff auf diese Doku. Über **MCP** hat es ein Werkzeug „Doku durchsuchen“ bekommen – ohne dass du Code geschrieben hast. Genau dafür gibt es MCP. Mehr: `docs/MCP-LERNPFAD.md`.

## C4. Übung: Einen Hook in Aktion sehen

```
Lege die Datei third_party/test.txt mit dem Inhalt "hallo" an.
```

Claude meldet, dass `.claude/hooks/protect-paths.mjs` das blockiert hat – mit Begründung.

> 💡 **Warum Hooks?** Eine Regel in `CLAUDE.md` ist eine Bitte, ein Hook ist ein Gesetz. Hooks laufen außerhalb von Claude, bei jedem passenden Ereignis. Unser zweiter Hook (`build-check.mjs`) prüft vor dem Ende jeder Antwort, ob geänderter Rust- und TypeScript-Code noch kompiliert, und schickt Claude bei Fehlern zurück an die Arbeit.

Mit `/clear` aufräumen.

---

# Teil D – Cloud einrichten

## D1. GitHub mit der Cloud verbinden

In Claude Code (lokal, im Projektordner):

```
/web-setup
```

Claude Code liest dein `gh`-Token, fragt nach Bestätigung und verbindet es mit deinem Claude-Konto. Dabei wird eine Cloud-Umgebung **„Default“** angelegt.

> 💡 **Was ist eine Cloud-Sitzung?** Claude Code läuft dann auf einer Linux-VM von Anthropic statt auf deinem PC. Dein Repo wird dort geklont, Claude arbeitet, testet und schiebt am Ende einen **Branch** nach GitHub. Die Sitzung läuft weiter, wenn du den Browser schließt – du kannst sie auch vom Handy aus verfolgen.

## D2. Umgebung einrichten

1. https://claude.ai/code öffnen.
2. Über dem Eingabefeld auf das **Wolken-Symbol** (Name der Umgebung) klicken → Umgebung „Default“ bearbeiten.
3. **Netzwerkzugriff:** `Trusted` lassen.
4. **Setup script:** den kompletten Inhalt von [`cloud/setup.sh`](cloud/setup.sh) einfügen. Speichern.

> 💡 **Warum ein Setup-Skript?** Auf der Cloud-VM (Ubuntu 24.04) sind Rust, Node, GCC und Docker schon da. Für Tauri fehlen aber die WebKitGTK-Bibliotheken, für Screenshots Xvfb/ImageMagick/xdotool und für Tests der SSH- und RDP-Server. Das Skript installiert all das als root, bevor Claude startet. Das Ergebnis wird **zwischengespeichert** – solange das Skript in etwa fünf Minuten fertig ist, läuft es nicht bei jeder Sitzung neu.
>
> **Warum `Trusted`?** Damit sind Paketquellen (apt, crates.io, npm) und GitHub erreichbar, aber nicht das ganze Internet. Das reicht für uns und verringert das Risiko, dass Claude auf fragwürdige Seiten stößt.

## D3. Erste Cloud-Sitzung: Umgebung testen

Auf claude.ai/code: Repository **deadsway/OpenXterm**, Branch **main**, Modus **Plan** wählen und eingeben:

```
Prüfe die Cloud-Umgebung, ändere keine Dateien:
1. rustc, cargo, node, nasm Versionen ausgeben
2. bash testing/testenv.sh start, danach status
3. Per SSH (Passwort tester) auf 127.0.0.1:2222 "uname -a" ausführen
4. bash testing/testenv.sh stop
Berichte das Ergebnis als Tabelle.
```

Alles grün? Dann kann der Spike beginnen.

> 💡 **Alternative vom Terminal aus:** Im lokalen Projektordner startet `claude --cloud "…Auftrag…"` eine Cloud-Sitzung mit diesem Repository. Das Ergebnis siehst du auf claude.ai/code.

**Wenn das Setup scheitert:** Die Sitzung zeigt das Log. Häufigste Ursache ist ein nicht erreichbares Paket – dann in `cloud/setup.sh` die Zeile prüfen und in der Umgebung erneut speichern.

---

# Teil E – Spike S1 Schritt für Schritt

Lies vorher einmal [`docs/SPIKE-S1.md`](docs/SPIKE-S1.md). Dort stehen die Akzeptanzkriterien jeder Etappe – genau daran prüft Claude (und du) den Erfolg.

**Ablauf je Etappe:**
1. Neue Cloud-Sitzung (jede Etappe eine eigene Sitzung = frischer Kontext).
2. Modus **Plan**, Auftrag eingeben, Plan lesen, Rückfragen beantworten.
3. Modus auf **Accept edits** stellen und „Setze den Plan um.“
4. Am Ende: Screenshots und Diff im Browser ansehen, Kommentare an Zeilen hängen, ggf. nachbessern lassen.
5. **Create PR** → auf GitHub prüfen → mergen.

> 💡 **Warum jede Etappe einzeln?** Kleine Aufträge mit klarem Ziel liefern bessere Ergebnisse als ein großer. Und wenn eine Etappe schiefgeht, verlierst du nur diese.
>
> **Warum zuerst Plan-Modus?** Ein falscher Plan kostet ein paar Sätze, falscher Code eine ganze Sitzung.

## E1. Etappe A – Gerüst

```
Lies CLAUDE.md und docs/SPIKE-S1.md. Wir machen Etappe A des Spikes.

Lege unter spikes/s1-ssh-rdp ein eigenständiges Tauri-2-Projekt an
(npm create tauri-app, Vorlage react-ts, Bezeichner org.openxterm.spike).
Oberfläche: zwei Tabs "SSH" und "RDP" (noch ohne Funktion) und eine Statuszeile.
Lies die Testserver-Adressen aus OX_SSH_ADDR (Standard 127.0.0.1:2222) und
OX_RDP_ADDR (Standard 127.0.0.1:3389) und zeige sie in der Statuszeile an.

Prüfe das Ergebnis selbst: Debug-Build ohne Bundle bauen, mit testing/shot.sh
einen Screenshot machen und ihn dir ansehen. Lege den Screenshot als
spikes/s1-ssh-rdp/screenshots/a-geruest.png ab.
Committe und pushe am Ende auf deinen Branch.
```

**Was du prüfst:** Screenshot zeigt Fenster mit zwei Tabs und Statuszeile. Im Diff: ein neuer Ordner, nichts sonst.

> 💡 **Was du lernst:** Claude kann in der Cloud keine Fenster sehen – also macht es sich selbst einen virtuellen Bildschirm (`Xvfb`) und betrachtet einen Screenshot. Diese **Rückkopplung** ist der Kern agentischer Arbeit: tun, prüfen, korrigieren.

## E2. Etappe B – SSH-Tab

```
Lies docs/SPIKE-S1.md, Etappe B, und die Skills tauri-schnittstelle und ui-pruefen.
Setze den SSH-Tab in spikes/s1-ssh-rdp um: russh + xterm.js wie beschrieben,
Daten als Rohbytes über tauri::ipc::Channel, Host-Key-Dialog mit SHA256-Fingerprint,
Auto-Modus über OX_SPIKE_AUTO=ssh.

Teste gegen bash testing/testenv.sh start. Hake alle Akzeptanzkriterien der
Etappe einzeln ab und belege sie mit Screenshots (testing/ui-session.sh,
xdotool für Eingaben) in spikes/s1-ssh-rdp/screenshots/.
Notiere Probleme und Messwerte in spikes/s1-ssh-rdp/NOTIZEN.md.
Committe und pushe.
```

**Was du prüfst:** Fingerprint im Screenshot = Fingerprint aus der Ausgabe von `testenv.sh`. Umlaute und `€` korrekt. `vim`/`top` sauber gezeichnet.

> 💡 **Warum der Host-Key-Dialog schon im Spike?** Genau hier hatte Portico eine Schwachstelle (`AutoAddPolicy`). Der Spike klärt früh, wie eine Rückfrage aus einem Rust-Task an die Oberfläche und zurück funktioniert – das Muster brauchen wir später überall (Passwort-Abfrage, 2FA, RDP-Zertifikate).

## E3. Etappe C – RDP-Tab

```
Lies docs/SPIKE-S1.md, Etappe C, und die Skills tauri-schnittstelle, ui-pruefen
und sicherheit. Setze den RDP-Tab in spikes/s1-ssh-rdp um: ironrdp-client von
crates.io, für xrdp TLS ohne CredSSP mit Autologon, Bild als Rohbytes
(geänderte Rechtecke) über tauri::ipc::Channel in ein Canvas, Maus und Tastatur
zurück an IronRDP. Auto-Modus über OX_SPIKE_AUTO=rdp.

Sieh dir als Referenz im IronRDP-Repository crates/ironrdp/examples/screenshot.rs
und crates/ironrdp-viewer an (Quelltext liegt nach dem Bauen unter
~/.cargo/registry/src). Teste gegen xrdp aus testing/testenv.sh. Hake die
Akzeptanzkriterien ab, belege sie mit Screenshots und miss die Werte aus der Spec.
Ergänze NOTIZEN.md. Committe und pushe.
```

**Was du prüfst:** Screenshot mit grünem Desktop und `OPENXTERM-RDP-TEST`; zweiter Screenshot mit `spike-ok` im RDP-Terminal; Messwerte in `NOTIZEN.md`.

**Wenn es hakt:** Diese Etappe ist die schwierigste. Lass Claude bei Problemen erst *erklären*, statt weiter zu probieren:

```
Stopp. Fasse zusammen, was du versucht hast, was passiert ist und warum.
Schlage zwei unterschiedliche Lösungswege vor. Ändere noch nichts.
```

## E4. Ergebnis holen

Nach dem Mergen der PRs auf deinem PC:

```powershell
cd C:\dev\OpenXterm
git switch main
git pull
```

## E5. Etappe D – Test unter Windows (du)

```powershell
# Testserver starten (Docker Desktop muss laufen)
docker compose -f testing/compose.yaml up -d --build

cd spikes\s1-ssh-rdp
npm install
$env:OX_RDP_ADDR = "127.0.0.1:3390"     # unter Windows liegt xrdp auf 3390
npm run tauri dev
```

Durchgehen:
- [ ] SSH-Tab: verbinden, Fingerprint prüfen, ein paar Befehle, `vim`, Fenster vergrößern.
- [ ] RDP-Tab: Bild, Maus, Tastatur, Tab wechseln.
- [ ] Gefühlte Geschwindigkeit notieren.
- [ ] Falls ein Windows-Rechner mit Remotedesktop erreichbar ist: `$env:OX_RDP_ADDR = "<ip>:3389"`; dann NLA (CredSSP an) ausprobieren. Ergebnis notieren.

Beim ersten `npm run tauri dev` kompiliert Rust alle Abhängigkeiten – das dauert einige Minuten.

Die Docker-Testserver verwenden dieselbe Konfiguration wie die in der Cloud geprüften, wurden als Container aber noch nicht gebaut. Scheitert `docker compose`, lass dir lokal von Claude helfen – das ist eine gute kleine Übung.

**Probleme unter Windows lokal lösen lassen:** In `C:\dev\OpenXterm` `claude` starten:

```
Beim Start von spikes/s1-ssh-rdp unter Windows kommt dieser Fehler: <Fehler>.
Finde die Ursache und behebe sie. Erkläre mir, was es war.
```

> 💡 **Warum auch lokal?** Die Cloud ist Linux. WebView2, Windows-Schriften, Tastaturlayout und echtes RDP mit NLA gibt es nur auf deinem PC. Der Spike ist erst bestanden, wenn er hier läuft.

## E6. Etappe E – Ergebnis und Entscheidung

Neue Cloud-Sitzung:

```
Lies docs/SPIKE-S1.md, spikes/s1-ssh-rdp/NOTIZEN.md und die Screenshots.
Meine Beobachtungen unter Windows: <deine Notizen aus E5>.
Schreibe spikes/s1-ssh-rdp/ERGEBNIS.md nach Etappe E der Spec.
Nutze danach den Subagenten code-reviewer, um im Spike-Code Muster zu finden,
die wir in Phase 1 NICHT übernehmen sollten, und ergänze das im Ergebnis.
Committe und pushe.
```

Lies `ERGEBNIS.md` gründlich. Dann entscheidest du: **weiter mit Tauri** (dann Phase 1) oder Anpassungen.

---

# Teil F – Wie es danach weitergeht

## F1. Der Arbeitszyklus pro Feature (ab Phase 1)

1. **Spezifizieren** – `Nutze den Subagenten feature-analyst für SES-01.` → `docs/specs/SES-01.md` lesen und korrigieren.
2. **Umsetzen** – `/feature-umsetzen SES-01`
3. **Prüfen lassen** – `Lass den code-reviewer die Änderungen prüfen.`
4. **Selbst testen** – besonders was als „nur unter Windows prüfbar“ gemeldet wird.
5. **Mergen / committen**, dann `/clear` bzw. neue Sitzung.

> 💡 **Warum Subagenten?** Ein Subagent arbeitet in einem **eigenen Kontext**. Der `feature-analyst` liest viel Doku – davon landet nur die fertige Spec bei dir. Der `code-reviewer` hat die Umsetzung nicht „miterlebt“ und sieht sie deshalb unvoreingenommen, wie ein Kollege.

## F2. Parallel arbeiten

Unabhängige Features (z. B. Telnet und Serial) startest du als **zwei Cloud-Sitzungen** gleichzeitig. Jede bekommt ihren eigenen Branch. Lokal geht dasselbe mit Git-Worktrees:

```powershell
git worktree add ..\ox-telnet -b feat/telnet
cd ..\ox-telnet; claude
```

## F3. Guthaben sparen

| Gewohnheit | 💡 Warum |
|---|---|
| Neue Sitzung bzw. `/clear` je Aufgabe | jede Nachricht verarbeitet den ganzen bisherigen Verlauf erneut |
| erst Plan, dann Umsetzung | falscher Plan ist billig, falscher Code teuer |
| gute Specs mit Akzeptanzkriterien | weniger Rückfragen und Korrekturschleifen |
| Recherche an Subagenten | deren Zwischenschritte füllen nicht deinen Kontext |
| `Esc` bei Irrwegen | jede weitere Minute Irrweg kostet |
| `/model`: Routine mit schnellerem Modell | günstiger; das stärkste Modell für Architektur und knifflige Fehler |

## F4. Wenn etwas schiefgeht

| Problem | Was tun |
|---|---|
| Claude probiert immer wieder dasselbe | `Esc`, dann „Stopp. Fasse zusammen … zwei andere Ansätze …“ |
| Antworten werden schwammig | Kontext voll → `/compact` oder Notizen in eine Datei schreiben lassen, neue Sitzung |
| Ergebnis ist Murks | `Esc Esc` zurückspringen oder Branch verwerfen |
| CI rot, lokal grün | „Lies das Log mit `gh run view --log-failed` und finde den Unterschied.“ |
| Claude behauptet etwas über eine API | „Belege das mit context7 bzw. dem Quelltext der Crate.“ |
| Hook blockiert unerwartet | `/hooks` ansehen; Claude den Hook erklären lassen |
| Cloud-Setup schlägt fehl | Log in der Sitzung lesen, `cloud/setup.sh` anpassen, Umgebung neu speichern |

## F5. Sicherheit beim Arbeiten mit Agenten

- Keine echten Zugangsdaten in Prompts, Dateien oder Tests – dafür gibt es die Testserver.
- **Prompt Injection:** Webseiten, Issues oder Dateien können Text enthalten, der wie eine Anweisung aussieht. Diffs prüfen, bevor du mergst.
- MCP-Server laufen mit deinen Rechten bzw. Tokens: nur vertrauenswürdige, Tokens mit minimalen Rechten.
- Der Testserver hat feste Passwörter – er darf **nie** auf `0.0.0.0` oder ins Internet.

## F6. Was du in welcher Phase lernst

| Phase | Projekt | Claude Code |
|---|---|---|
| 0 | Spike S1 | CLAUDE.md, Plan-Modus, Cloud, Screenshots als Rückmeldung |
| 1 | Tabs, Sessions, SSH | Skills, `feature-analyst`, `code-reviewer`, Arbeitszyklus |
| 2 | Lokale Shells, Cygwin, portable | Hooks anpassen, lokal vs. Cloud bewusst wählen |
| 3 | SFTP, Tresor | `test-writer`, testgetrieben, Integrationstests |
| 4 | Split, MultiExec, Makros | Kontextmanagement, parallele Sitzungen |
| 5 | RDP, VNC, FTP | Arbeit im IronRDP-Fork, `[patch.crates-io]` |
| 6 | X11 | Recherche delegieren |
| 7 | Tunnel, Server | eigener MCP-Server (`docs/MCP-LERNPFAD.md`) |
| 8 | Werkzeuge, Extras | eigene Skills, Plugin, Routinen (`/schedule`) |

## F7. Rust nebenbei lernen

Du musst Rust nicht vorher können. Hilfreich:
- Lass dir Code erklären: „Erkläre mir `ox-ssh/src/session.rs` Zeile für Zeile, als würde ich Rust gerade lernen.“
- Das offizielle Buch „The Rust Programming Language“ (doc.rust-lang.org/book), eine deutsche Übersetzung gibt es ebenfalls.
- Kleine Aufgaben selbst schreiben und von Claude reviewen lassen statt umgekehrt.
