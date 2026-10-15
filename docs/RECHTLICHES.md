# Rechtliche Leitplanken

> Keine Rechtsberatung, sondern Orientierung. Vor einer Veröffentlichung im Zweifel fachkundig prüfen lassen.

## 1. Was beim Nachbau erlaubt ist

Funktionen, Arbeitsabläufe und Bedienkonzepte (Tabs, Session-Baum, SFTP-Seitenleiste, Split, MultiExec, Makros, Kommandozeilenschalter) sind als Ideen nicht urheberrechtlich geschützt. Ein eigenständig programmiertes Werkzeug mit gleichem Funktionsumfang ist zulässig – das Vorbild selbst baut auf PuTTY auf, und es gibt viele vergleichbare Programme (z. B. Submarine, Tabby).

Auch zulässig:
- **Gleiche Kommandozeilenschalter** (`-bookmark`, `-newtab` …) – das sind funktionale Schnittstellen, die Umsteigern helfen.
- **Import einer MobaXterm-INI des Nutzers** (SES-13) – Lesen der eigenen Daten zur Interoperabilität. Dabei nur die Datei auswerten, nicht das Programm untersuchen. Verschlüsselte Passwörter des Vorbilds **nicht** importieren.
- **Beschreibende Nennung**, z. B. „kann Sessions aus MobaXterm importieren“ – sachlich, ohne Logo.

## 2. Was tabu ist

- Namen, Logos, Symbole, Farben oder Gestaltung, die mit MobaXterm verwechselt werden können – **auch nicht nachgezeichnet**
- Texte aus Doku oder Oberfläche kopieren (eigene Formulierungen in der UI)
- Screenshots oder Grafiken des Vorbilds im Projekt
- Das Programm des Vorbilds disassemblieren, entpacken oder seinen Code übernehmen
- Werbung wie „kostenloser MobaXterm-Klon“ oder „MobaXterm-Alternative“ im Produktnamen, Logo oder als Hauptslogan
- Den Bildschirmschoner oder die Spiele des Vorbilds nachbilden – eigene Inhalte verwenden

> 💡 **Warum so streng bei der Gestaltung?** Das Urheberrecht schützt die konkrete Gestaltung (Symbole, Texte, Grafiken), das Markenrecht den Namen und alles, was Verwechslung auslöst. Funktionsgleichheit ist erlaubt, Verwechselbarkeit nicht.

## 3. Der Name „OpenXterm“

Eine Websuche (Oktober 2026) ergab kein bekanntes Produkt dieses Namens. Zu bedenken:

- „xterm“ ist der Name des klassischen X-Terminal-Emulators (MIT-Lizenz). Als Bestandteil eines Namens ist es weit verbreitet.
- „MobaXterm“ ist der Name von Mobatek. Die Ähnlichkeit liegt im Bestandteil „Xterm“; der prägende Teil „Moba“ fehlt. Das Risiko ist überschaubar, wird aber durch eine **klar eigene Gestaltung** (Logo, Farben, Symbole) weiter gesenkt.
- „Open“ weckt die Erwartung von Open Source – passt, wenn der Code veröffentlicht wird.

Vor einer Veröffentlichung:
1. Markenregister prüfen: DPMA (DPMAregister), EUIPO (eSearch), WIPO (Global Brand Database) in Klasse 9 (Software) und 42.
2. GitHub, winget, Chocolatey, Domains (`openxterm.org` …) auf Kollisionen prüfen.

## 4. Lizenz von OpenXterm

**Empfehlung: MIT** (oder „MIT oder Apache-2.0“ wie im Rust-Umfeld üblich) für den eigenen Code.
- passt zu Tauri, IronRDP, xterm.js und den meisten Rust-Crates,
- verträgt sich mit allen geplanten Abhängigkeiten,
- erlaubt anderen, den Code frei weiterzuverwenden.

Entscheidung vor dem ersten öffentlichen Release treffen und `LICENSE` anlegen.

## 5. Pflichten aus den Komponenten

| Komponente | Lizenz | Pflicht |
|---|---|---|
| Tauri, IronRDP | MIT / Apache-2.0 | Lizenzhinweise beilegen |
| russh, russh-sftp | Apache-2.0 | Lizenz- und ggf. NOTICE-Hinweise beilegen |
| xterm.js, React, Vite, CodeMirror | MIT | Hinweise beilegen |
| portable-pty | MIT | Hinweis beilegen |
| serialport | MPL-2.0 | geänderte Dateien dieses Crates offenlegen (wir ändern es nicht) |
| Cygwin `cygwin1.dll` | LGPLv3 | Quellcode anbieten, Austausch der DLL ermöglichen (separate Datei) |
| Cygwin-Programme (bash, coreutils …) | meist GPL | als eigenständige Programme ausliefern, **Quellcode anbieten** |
| X.Org / XWin | MIT/X11 | Hinweise beilegen |
| Submarine (nur als Vorlage) | MIT | übernommene Codeteile mit Copyright-Hinweis kennzeichnen |
| Portico SSH (eigenes Projekt) | Apache-2.0, eigener Code | frei nutzbar |

**Regeln:**
- Keine GPL-Crates einbinden – GPL-Programme nur als **separate Programme** (Cygwin-Payload) mitliefern und starten.
- `cargo-deny` (oder `cargo about`) prüft später automatisch die Lizenzen aller Crates und erzeugt die Hinweisdatei.

Alle Hinweise sammelt `THIRD-PARTY-NOTICES.md`; die Lizenztexte werden mit ausgeliefert.

## 6. Datenschutz

OpenXterm verbindet sich nur dorthin, wohin der Nutzer es anweist. Keine Telemetrie, keine automatische Update-Prüfung. Damit entfallen Datenschutzhinweise weitgehend; die Update-Prüfung (REL-04) nennt beim Klick, welche Adresse abgefragt wird.
