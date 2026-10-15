# Funktionsanalyse OpenXterm

Ziel: **alle** Funktionen von MobaXterm (Home **und** Professional) nachbilden. Grundlage sind die offizielle Online-Dokumentation, die Feature-Seite, der Changelog bis Version 26.5 (September 2026) und Testberichte. Funktionen sind in eigenen Worten beschrieben und neu gruppiert.

## Legende

**Quelle:** `D 4.1` = Abschnitt der Online-Doku · `F` = Feature-Seite · `CL` = Changelog · `P` = in MobaXterm nur Professional · `?` = Details in der aktuellen Version selbst nachsehen, bevor die Spec geschrieben wird

**Komponente:**
`APP` Tauri-App (Oberfläche in TypeScript/React + Rust-Befehle) · `TERM` Terminal (xterm.js + Datenstrom aus Rust) · `SSH` crate `ox-ssh` (russh, russh-sftp) · `RDP` crate `ox-rdp` (IronRDP) · `LOC` crate `ox-local` (portable-pty/ConPTY) · `CYG` Cygwin-Payload · `EXT` externes Programm

**Priorität:** P1 Kern · P2 wichtig · P3 Abrundung
**Status:** ⬜ offen · 🟨 in Arbeit · ✅ fertig · ⏸ zurückgestellt

**Phasen:** 0 Fundament & Spike · 1 SSH-Tabs · 2 Lokales Terminal & portable EXE · 3 SFTP & Sicherheit · 4 Komfort · 5 Weitere Sessions · 6 X11 · 7 Tunnel, Server, Netz · 8 Werkzeuge & Extras (siehe `ROADMAP.md`)

> Die Home-Edition des Vorbilds begrenzt u. a. die Anzahl gespeicherter Sessions, Tunnel, Makros und die Laufzeit der Server. OpenXterm übernimmt **keine** künstlichen Grenzen.

---

## SES – Sessions und Session-Manager

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| SES-01 | Dialog „Neue Session“ mit Symbolleiste aller Session-Typen und typabhängigen Einstellungsseiten | D 1.2, D 4 | P1 | 1 | APP | Formular mit Seiten je Typ; gemeinsame Reiter „Erweitert“, „Terminal“, „Netzwerk“, „Lesezeichen“ | ⬜ |
| SES-02 | Session-Baum in der Seitenleiste: Ordner, Symbole je Typ, Suchen/Filtern | D 1.2 | P1 | 1 | APP | Baumkomponente im Frontend, Filterfeld | ⬜ |
| SES-03 | Sessions automatisch speichern | D 1.2, D 2.1 | P1 | 1 | APP | `OpenXterm.toml` (serde), Ordnerbaum | ⬜ |
| SES-04 | Bearbeiten, Duplizieren, Löschen, Umbenennen, Verschieben (Drag & Drop) per Kontextmenü | D 1.2 | P1 | 1 | APP | | ⬜ |
| SES-05 | Alle Sessions eines Ordners gemeinsam starten | D 1.2 | P2 | 4 | APP | | ⬜ |
| SES-06 | Desktop-Verknüpfung zu Session oder Ordner | D 1.2, D 2.1 | P3 | 8 | APP | `.lnk` mit `-bookmark` | ⬜ |
| SES-07 | Sessions eines Ordners exportieren/importieren | D 6.7 | P2 | 4 | APP | Datei ohne Passwörter | ⬜ |
| SES-08 | Geteilte Sessions von Kollegen (Ordner, HTTP(S), FTP(S), SFTP), schreibgeschützt im Baum | D 3.1, D 5.5 | P3 | 8 | APP | | ⬜ |
| SES-09 | „Diese Sessions mit dem Team teilen“ – Export für SES-08 | D 5.5 | P3 | 8 | APP | | ⬜ |
| SES-10 | Quick Connect (`user@host:port` bzw. Protokoll-Präfix) | D 5.3 | P2 | 4 | APP | Eingabefeld | ⬜ |
| SES-11 | Lesezeichen-Optionen: Tab-Titel sperren, Reconnect-Abfrage am Ende, Symbol/Farbe | D 4.11 | P2 | 1 | APP/TERM | | ⬜ |
| SES-12 | Programm-Schließen blockieren, solange Session aktiv | D 4.2 | P3 | 4 | APP | | ⬜ |
| SES-13 | Import vorhandener Sessions aus einer MobaXterm-INI des Nutzers | eigene | P2 | 4 | APP | nur lesend, für Umsteiger; siehe `RECHTLICHES.md` | ⬜ |
| SES-14 | Sessions aus PuTTY-Einstellungen importieren | eigene | P3 | 4 | APP | Registry `HKCU\Software\SimonTatham\PuTTY\Sessions` lesen (`winreg`-Crate) | ⬜ |
| SES-15 | „Benutzerdefiniertes Shell-Skript“ als Lesezeichen | D 5.4 | P3 | 8 | APP/CYG | | ⬜ |
| SES-16 | Gespeicherte Zugangsdaten je Session („Credentials“), wiederverwendbar | ? | P2 | 3 | APP | Verweis auf Tresor | ⬜ |

## TERM – Terminal (gilt für alle Text-Sessions)

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| TERM-01 | Terminal-Emulation xterm-kompatibel, 256 Farben/Truecolor, Unicode | D 1.5 | P1 | 1 | TERM | xterm.js | ⬜ |
| TERM-02 | Schrift, Größe, Kantenglättung, Zeichensatz (UTF-8 Standard) global und je Session | D 3.2, D 4.9 | P1 | 1 | APP/TERM | xterm.js-Optionen, Fonts im Frontend | ⬜ |
| TERM-03 | Farbschemata, eigene Schemata, Hintergrund/Vordergrund | D 3.2 | P1 | 4 | APP/TERM | | ⬜ |
| TERM-04 | Feste Zeilen/Spalten erzwingen | D 4.9 | P3 | 4 | TERM | | ⬜ |
| TERM-05 | Scrollback, Scrollbar ein/aus, Scroll-Kürzel (Shift+PgUp/PgDn/Home/End/Pfeile) | D 3.2, D 5.3 | P1 | 1 | TERM | | ⬜ |
| TERM-06 | Copy-on-select, Einfügen mit Rechtsklick (Kontextmenü dann mit Strg/Shift+Rechtsklick), Shift+Einfg | D 3.2, D 6.6 | P1 | 1 | TERM | | ⬜ |
| TERM-07 | Warnung vor mehrzeiligem Einfügen | D 3.2 | P2 | 4 | TERM | | ⬜ |
| TERM-08 | Einfüge-Verzögerung pro Zeile | D 4.9 | P3 | 4 | TERM | | ⬜ |
| TERM-09 | Doppelklick-Auswahl mit einstellbaren Trennzeichen | D 6.6 | P3 | 4 | TERM | xterm.js `wordSeparator` | ⬜ |
| TERM-10 | Spaltenauswahl Strg+Alt+Klick | D 5.3 | P3 | 4 | TERM | xterm.js Spaltenauswahl (Tastenkombination prüfen) | ⬜ |
| TERM-11 | Backspace sendet ^H oder ^? | D 3.2, D 4.9 | P1 | 1 | TERM | | ⬜ |
| TERM-12 | Suchen im Terminal (Strg+Shift+F, F3) | D 5.3 | P2 | 4 | TERM | | ⬜ |
| TERM-13 | Ausgabe in Logdatei je Session/global | D 3.2, D 4.9 | P2 | 4 | TERM | Rohdaten im Rust-Lesetask mitschreiben | ⬜ |
| TERM-14 | Terminaltext speichern und drucken | D 5.3 | P3 | 4 | TERM/APP | | ⬜ |
| TERM-15 | Syntaxhervorhebung/Schlüsselwort-Färbung, auch wenn der Server keine Farben sendet; eigene Definitionen | F, D 3.2 | P2 | 4 | TERM | Regelwerk-Datei, Färbung beim Rendern | ⬜ |
| TERM-16 | Aktivitätsanzeige im Tab (Punkt, Titelfarbe) | D 3.2 | P2 | 4 | APP | Ereignis aus dem Lesetask | ⬜ |
| TERM-17 | Bestätigung beim Schließen, wenn noch ein Programm läuft | D 3.2 | P3 | 4 | APP | | ⬜ |
| TERM-18 | Strg+Klick öffnet URL, Datei oder Ordner | D 2.2 | P3 | 4 | TERM | | ⬜ |
| TERM-19 | Trennlinie zwischen Befehlen im lokalen Terminal | D 3.2 | P3 | 2 | TERM/CYG | Prompt-Markierung (OSC 133) | ⬜ |
| TERM-20 | Tab-Titel per Escape-Sequenz, abschaltbar | D 4.11 | P2 | 1 | TERM | | ⬜ |
| TERM-21 | Reconnect per Taste nach Session-Ende | D 4.11 | P2 | 1 | TERM | | ⬜ |
| TERM-22 | Bildschirmschoner im Terminal (eigene Animation) | D 6.7 | P3 | 8 | APP | eigene Figuren, abschaltbar | ⬜ |

## UI – Hauptfenster und Bedienung

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| UI-01 | Hauptfenster: Menü, große Symbolleiste (Session, Server, Werkzeuge, Spiele, Sessions, Ansicht, Split, MultiExec, Tunnel, Pakete, Einstellungen, Hilfe), Seitenleiste, Tab-Leiste, Statusleiste | D 1.1, D 2.1 | P1 | 1 | APP | eigene Symbole | ⬜ |
| UI-02 | Tabs: neu, schließen, umbenennen, duplizieren, wechseln (Strg+Tab, Strg+Alt+F‹n›) | D 2.1, D 5.3 | P1 | 1 | APP | Tab-Leiste im Frontend; Session-Komponente je Typ | ⬜ |
| UI-03 | Split-Modi: 1, 2 vertikal, 2 horizontal, 4 Terminals | D 1.3, D 2.1 | P2 | 4 | APP | | ⬜ |
| UI-04 | MultiExec: Eingabe gleichzeitig an alle sichtbaren Terminals; einzelne ausschließen | D 1.3 | P2 | 4 | APP/TERM | Eingabe im Frontend an mehrere Sessions verteilen | ⬜ |
| UI-05 | Tab ablösen / wieder andocken, auch per Drag & Drop aus dem Fenster | D 2.1, D 6.7 | P2 | 4 | APP | | ⬜ |
| UI-06 | Vollbild (F11) | D 5.3 | P2 | 4 | APP | | ⬜ |
| UI-07 | Seitenleiste ein/aus; Reiter Sessions, Werkzeuge, Makros, SFTP | D 5.3 | P1 | 1 | APP | | ⬜ |
| UI-08 | Kompaktmodus (nur Tabs, Menü über Knopf) | D 6.7 | P3 | 4 | APP | | ⬜ |
| UI-09 | In Infobereich minimieren / Strg+M | D 5.3 | P3 | 4 | APP | Tauri Tray-API | ⬜ |
| UI-10 | Pop-up-Terminal per globalem Hotkey (Strg+Alt+M) | D 5.3 | P3 | 4 | APP | `RegisterHotKey` | ⬜ |
| UI-11 | Alle Tastenkürzel konfigurierbar (Liste aus D 5.3 als Standard) | D 3.1, D 5.3 | P2 | 4 | APP | | ⬜ |
| UI-12 | Skins/Themes, Transparenz, Hell/Dunkel | D 2.1 | P2 | 4 | APP | | ⬜ |
| UI-13 | Hohe DPI, Skalierungsparameter `-dpi` | D 5.4, D 6.7 | P1 | 1 | APP | WebView skaliert selbst; Zoomstufe als Einstellung | ⬜ |
| UI-14 | Flimmerfreies Hauptfenster (Option) | D 3.4 | P3 | 4 | APP | entfällt weitgehend (WebView) | ⬜ |
| UI-15 | Startbildschirm mit Schnellzugriff und zuletzt genutzten Sessions | F | P2 | 1 | APP | | ⬜ |
| UI-16 | Zweisprachige Oberfläche (Deutsch/Englisch) | eigene | P2 | 1 | APP | i18n-Bibliothek im Frontend, JSON je Sprache | ⬜ |

## LOCAL – Lokales Terminal und Unix-Umgebung

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| LOCAL-01 | Lokales Bash-Terminal mit Unix-Befehlen (bash, ls, cat, sed, grep, awk, rsync, wget, vim …) | D 1.5, D 2.2 | P1 | 2 | LOC/CYG/TERM | Cygwin-Bash über portable-pty (ConPTY); Spike in Phase 2 | ⬜ |
| LOCAL-02 | Lokale Windows-Shells: cmd, PowerShell | ? | P1 | 2 | LOC | portable-pty (ConPTY) | ⬜ |
| LOCAL-03 | WSL-Distributionen als Session | CL | P1 | 2 | LOC | ConPTY + `wsl.exe -d` | ⬜ |
| LOCAL-04 | Windows-Programme aus der Bash starten, Windows-PATH anhängen (Option) | D 2.2, D 3.2 | P2 | 2 | CYG | | ⬜ |
| LOCAL-05 | `/drives/<x>`-Einhängepunkte, `/registry`-Pfad, `//rechner/freigabe` | D 2.2 | P2 | 2 | CYG | Cygwin-Mount-Präfix und `/proc/registry` | ⬜ |
| LOCAL-06 | Hilfsbefehle `open`, `cygpath`, Prozess-/Systeminfo-Befehle | D 2.2 | P3 | 8 | CYG | eigene Skripte unter eigenen Namen | ⬜ |
| LOCAL-07 | Persistentes Home- und Root-Verzeichnis (sonst temporär) | D 3.1 | P1 | 2 | APP/CYG | | ⬜ |
| LOCAL-08 | Profilskript (`.bashrc`) in den Einstellungen bearbeiten | CL, P | P3 | 8 | APP | | ⬜ |
| LOCAL-09 | Eingebaute Netzwerk-Clients im Terminal (ssh, telnet, rlogin, rsh, ftp, sftp, scp, rcp, rsync, wget, httping, iperf) | D 2.3 | P2 | 2 | CYG | Cygwin-Pakete inkl. OpenSSH und OpenSSL | ⬜ |
| LOCAL-10 | `DISPLAY` automatisch setzen, Startmeldung mit Hinweis | D 2.3 | P2 | 6 | APP/CYG | | ⬜ |
| LOCAL-11 | Startmeldung/Logo im Terminal anpassbar | CL, P | P3 | 8 | APP | | ⬜ |

## SSH

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| SSH-01 | Verbindung mit Host, Port, optional Benutzer (sonst Login-Abfrage) | D 4.1 | P1 | 1 | SSH | russh | ⬜ |
| SSH-02 | Passwort und Keyboard-Interactive (2FA) | D 6.8 | P1 | 1 | SSH | | ⬜ |
| SSH-03 | Privater Schlüssel (OpenSSH- und PPK-Format), Passphrase | D 4.1 | P1 | 1 | SSH | | ⬜ |
| SSH-04 | Host-Key-Prüfung, Warnung bei Änderung, Verwaltung der bekannten Hosts | D 6.8 | P1 | 1 | SSH/APP | eigene `known_hosts`-Datei, Dialog mit SHA256-Fingerprint | ⬜ |
| SSH-05 | Befehl nach Login ausführen, optional verbunden bleiben | D 4.1 | P2 | 1 | SSH | | ⬜ |
| SSH-06 | Kompression | D 4.1 | P3 | 1 | SSH | | ⬜ |
| SSH-07 | Keepalive (globale Option) | D 6.8 | P2 | 1 | SSH | | ⬜ |
| SSH-08 | Jump-Host / SSH-Gateway, auch für SFTP-Browser und X11 | D 4.10 | P1 | 3 | SSH | russh: Ziel über `direct-tcpip`-Kanal des Gateways | ⬜ |
| SSH-09 | Proxy: SOCKS4/5, HTTP | D 6.3 | P2 | 3 | SSH | Verbindungsaufbau über SOCKS/HTTP CONNECT (Crate prüfen) | ⬜ |
| SSH-10 | X11-Forwarding | D 4.1, D 6.2 | P1 | 6 | SSH | russh-Unterstützung prüfen; sonst `ssh.exe -X` im lokalen Terminal | ⬜ |
| SSH-11 | „Entfernte Umgebung“: kompletten Desktop (LXDE, Xfce …) per SSH in neuem Fenster starten | D 4.1 | P3 | 6 | SSH/CYG | | ⬜ |
| SSH-12 | Lokale Spracheinstellungen an Server senden | D 4.1 | P3 | 1 | SSH | `LANG`/`LC_*` per Env-Request | ⬜ |
| SSH-13 | SSH-Browser-Typ wählbar: keiner, SFTP, SCP (schnell), SCP (klassisch) | D 4.1 | P2 | 3 | SSH | | ⬜ |
| SSH-14 | SFTP-Browser folgt dem Terminalverzeichnis | D 4.1 | P3 | 3 | TERM/SSH | OSC 7 bzw. Prompt-Hook | ⬜ |
| SSH-15 | Eingebauter SSH-Agent bzw. Nutzung eines externen Agenten (Pageant) | ? | P2 | 3 | SSH | russh-Agent-Modul; Anbindung an Pageant/OpenSSH-Agent prüfen | ⬜ |
| SSH-16 | Agent-Forwarding | ? | P2 | 3 | SSH | | ⬜ |
| SSH-17 | Zertifikate (OpenSSH-Zertifikate) | ? | P3 | 3 | SSH | russh-Unterstützung prüfen | ⬜ |
| SSH-18 | Hardware-/FIDO-Schlüssel | ? | P3 | 8 | SSH | Machbarkeit prüfen (OpenSSH-Agent unter Windows) | ⬜ |
| SSH-19 | Workaround „Connection reset by peer“ (Option) | D 6.8 | P3 | 1 | SSH | | ⬜ |
| SSH-20 | Legacy-Algorithmen (z. B. `ssh-rsa`) bewusst zuschaltbar | CL | P3 | 1 | SSH | | ⬜ |
| SSH-21 | Fernüberwachungsleiste: CPU, RAM, Netz, Platte, Nutzer des Servers unten im SSH-Tab | ? | P2 | 4 | APP/SSH | zweiter Kanal, periodische Abfrage | ⬜ |

## FILE – Dateiübertragung und Dateibrowser

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| FILE-01 | SFTP-Browser erscheint automatisch in der Seitenleiste bei SSH | D 1.6 | P1 | 3 | APP/SSH | | ⬜ |
| FILE-02 | Upload/Download per Drag & Drop (auch in lokale Unterordner), Fortschritt, Warteschlange, Abbrechen | D 1.6, CL | P1 | 3 | APP/SSH | | ⬜ |
| FILE-03 | Remote-Datei per Doppelklick bearbeiten, Speichern lädt automatisch hoch | D 1.6 | P1 | 3 | APP/SSH | Temp-Datei + Dateiüberwachung | ⬜ |
| FILE-04 | Dateioperationen: neu, umbenennen, löschen, Rechte ändern, Ordner anlegen, Pfad eingeben, Aktualisieren | F | P1 | 3 | APP/SSH | | ⬜ |
| FILE-05 | Eigenständige SFTP-Session (Dateibrowser als Tab) | D 4.7 | P2 | 3 | APP/SSH | | ⬜ |
| FILE-06 | ASCII-Modus (Zeilenenden konvertieren) | D 4.6, D 4.7 | P3 | 3 | SSH | | ⬜ |
| FILE-07 | FTP- und FTPS-Session: passiv/aktiv, Datenkanal verschlüsseln, ASCII-Modus | D 4.6 | P2 | 5 | APP | suppaftp (mit TLS) | ⬜ |
| FILE-08 | „File“-Session: lokaler/UNC-Dateibrowser als Tab | ? | P3 | 5 | APP | | ⬜ |
| FILE-09 | Objektspeicher-Session (S3-kompatibel) | ? | P3 | 5 | APP | eigene Signatur (SigV4) + HTTPS | ⬜ |

## RDP

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| RDP-01 | RDP-Session als Tab (Host, Port, Benutzer oder Anmeldebildschirm) | D 4.4 | P1 | 5 | RDP | IronRDP (`ironrdp-client`), Bild in Canvas; Spike S1 | ⬜ |
| RDP-02 | Konsolensitzung (/admin) | D 4.4 | P2 | 5 | RDP | IronRDP-Option prüfen | ⬜ |
| RDP-03 | Umleitung: Laufwerke, Drucker, Ports, Zwischenablage, Smartcard | D 4.4 | P2 | 5 | RDP | | ⬜ |
| RDP-04 | Erweiterte Grafik, Tastenkürzel an Remote weiterleiten | D 4.4 | P2 | 5 | RDP | | ⬜ |
| RDP-05 | CredSSP/NLA ein/aus | D 4.4 | P2 | 5 | RDP | | ⬜ |
| RDP-06 | Strg+Alt+Ende sendet Strg+Alt+Entf | D 6.4 | P2 | 5 | RDP | | ⬜ |
| RDP-07 | RDP über SSH-Gateway | D 4.10 | P2 | 7 | APP/SSH | lokaler Tunnel vor Verbindungsaufbau | ⬜ |
| RDP-08 | WebAuthn/Windows-Hello-Umleitung | CL | P3 | 8 | RDP | IronRDP enthält ein WebAuthn-Kanal-Crate (`ironrdp-rdpewa`) – prüfen | ⬜ |

## VNC

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| VNC-01 | VNC-Session als Tab | D 4.5 | P2 | 5 | APP | vorhandenes Rust-Crate prüfen, sonst eigener RFB-Client (RFC 6143) | ⬜ |
| VNC-02 | Kodierungen Raw, CopyRect, RRE, Hextile, TRLE, ZRLE, Tight | CL | P2 | 5 | APP | | ⬜ |
| VNC-03 | Authentifizierung: VNC, Tight, UltraVNC MsLogon2, SASL | CL | P3 | 5 | APP | | ⬜ |
| VNC-04 | Automatische Größenanpassung, Strg+Mausrad-Zoom, Tastenkürzel, Zwischenablage | CL | P2 | 5 | APP | | ⬜ |
| VNC-05 | VNC über SSH-Gateway | D 4.10 | P2 | 7 | APP/SSH | | ⬜ |

## X11 – X-Server

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| X11-01 | Eingebauter X-Server (X.Org) mit OpenGL und aktuellen Erweiterungen (Composite, RandR) | D 1.4, F | P1 | 6 | CYG/EXT | Cygwin XWin | ⬜ |
| X11-02 | Start beim Programmstart (Option), Start/Stopp per Kürzel, Statussymbol | D 3.3, D 5.3 | P1 | 6 | APP | | ⬜ |
| X11-03 | Modi: Multiwindow (transparent), Fenstermodus, Fenstermodus mit Fenstermanager, Tiling-Tab | D 3.3, D 6.2 | P2 | 6 | APP/CYG | | ⬜ |
| X11-04 | Einstellungen: Tastatur, Monitor, Display-Offset, Zwischenablage, OpenGL Hardware/Software/aus, Zugriffskontrolle | D 3.3 | P2 | 6 | APP | | ⬜ |
| X11-05 | XDMCP-Session (beliebiger oder bestimmter Server, Bildschirm, Numlock) | D 4.3 | P2 | 6 | APP/CYG | `XWin -query` | ⬜ |
| X11-06 | Schriftenserver nutzen | D 2.1 | P3 | 6 | CYG | | ⬜ |
| X11-07 | Lauscht auf allen Netzwerkadaptern, Display-Adresse in Startmeldung | D 6.2 | P2 | 6 | CYG | | ⬜ |
| X11-08 | Nur X-Server starten, ohne Hauptfenster (`-hideterm`) | D 6.2 | P3 | 6 | APP | | ⬜ |

## PROTO – Weitere Session-Typen

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| PROTO-01 | Telnet (Benutzer, Port) | D 4.2 | P1 | 1 | TERM | eigener Telnet-Client (RFC 854) | ⬜ |
| PROTO-02 | Rlogin | D 1.2 | P2 | 1 | TERM | eigener Rlogin-Client (RFC 1282) | ⬜ |
| PROTO-03 | Rsh (Befehl ausführen) | D 1.2 | P3 | 5 | CYG | Cygwin `rsh` im Terminal | ⬜ |
| PROTO-04 | Serielle Konsole: Port-Auswahl mit Erkennung, Baudrate, Datenbits, Parität, Stoppbits, Flusskontrolle | D 1.2 | P1 | 1 | TERM/APP | `serialport`-Crate inkl. Port-Liste | ⬜ |
| PROTO-05 | Mosh | D 4.8 | P2 | 5 | CYG | Cygwin `mosh` im lokalen Terminal-Tab | ⬜ |
| PROTO-06 | Browser-Session (Webseite als Tab) | ? | P3 | 5 | APP | zweites Tauri-Webview – Sicherheitsfolgen in der Spec klären | ⬜ |
| PROTO-07 | Raw-TCP | eigene | P3 | 1 | TERM | TCP-Strom direkt ans Terminal | ⬜ |

## NET – Tunnel und Netzwerkwerkzeuge

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| NET-01 | Grafischer Tunnel-Manager: lokal, entfernt, dynamisch (SOCKS) | D 2.1, D 6.5 | P1 | 7 | APP/SSH | russh-Port-Forwarding, ein Task je Tunnel | ⬜ |
| NET-02 | Tunnel starten/stoppen, Autostart, automatisches Wiederverbinden, Statusanzeige | D 6.5 | P2 | 7 | APP/SSH | | ⬜ |
| NET-03 | Tunnel über Jump-Host, Schlüssel je Tunnel | D 6.5 | P2 | 7 | SSH | | ⬜ |
| NET-04 | Netzwerkscanner (Hosts im Subnetz finden, offene Dienste) | F | P2 | 7 | APP | ICMP + TCP-Connect, Threads | ⬜ |
| NET-05 | Portscanner | F | P2 | 7 | APP | | ⬜ |
| NET-06 | Liste offener lokaler Ports mit Prozess | D 2.3 | P2 | 7 | APP | `GetExtendedTcpTable` | ⬜ |
| NET-07 | Paketmitschnitt (TCP-Capture) | D 2.3 | P3 | 7 | APP | Raw-Sockets (Adminrechte nötig) – Grenzen in Spec festhalten | ⬜ |
| NET-08 | Prozessliste und Prozess beenden | D 2.2 | P3 | 7 | APP | | ⬜ |
| NET-09 | Einfache Netzwerkwerkzeuge: Ping, Traceroute, DNS-Abfrage, Wake-on-LAN | eigene | P3 | 7 | APP | | ⬜ |

## SRV – Eingebaute Server (Dienste)

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| SRV-01 | Server-Fenster: Liste aller Dienste, Start/Stopp, Einstellungen, Status, Autostart | D 2.1 | P1 | 7 | APP | | ⬜ |
| SRV-02 | HTTP-Server (Ordner freigeben) | D 2.1 | P2 | 7 | APP | axum oder tiny_http | ⬜ |
| SRV-03 | FTP-Server | D 2.1 | P2 | 7 | APP | libunftp | ⬜ |
| SRV-04 | TFTP-Server | D 2.1 | P2 | 7 | APP | TFTP-Crate prüfen | ⬜ |
| SRV-05 | SSH/SFTP-Server | D 2.1 | P2 | 7 | CYG | russh-Server oder Cygwin `sshd` | ⬜ |
| SRV-06 | Telnet-Server | D 2.1 | P3 | 7 | APP | eigener kleiner Telnet-Server + portable-pty | ⬜ |
| SRV-07 | VNC-Server | CL | P3 | 7 | EXT | Lizenz prüfen | ⬜ |
| SRV-08 | NFS-Server | CL | P3 | 7 | CYG/EXT | Machbarkeit prüfen | ⬜ |
| SRV-09 | Cron-Dienst | CL | P3 | 7 | CYG | Cygwin `cron` | ⬜ |
| SRV-10 | Iperf-Server | CL | P3 | 7 | CYG | | ⬜ |

## SEC – Sicherheit und Zugangsdaten

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| SEC-01 | Passwörter nach Rückfrage speichern | D 3.1 | P1 | 3 | APP | Tresor | ⬜ |
| SEC-02 | Master-Passwort | F, D 3.1 | P1 | 3 | APP | PBKDF2 → AES-GCM (Windows CNG); ohne Master-PW: DPAPI | ⬜ |
| SEC-03 | Gespeicherte Passwörter verwalten | D 3.1 | P2 | 3 | APP | | ⬜ |
| SEC-04 | Gespeicherte Passwörter bleiben im Rust-Teil und gelangen nie ins Frontend | eigene | P1 | 3 | APP/TERM | Tresor nur in Rust, Frontend kennt nur IDs | ⬜ |
| SEC-05 | Schlüsselgenerator (RSA, ECDSA, Ed25519), Umwandeln OpenSSH ↔ PPK | D 4.1 | P2 | 3 | SSH | `ssh-key`-Crate; PPK-Import prüfen | ⬜ |
| SEC-06 | Sicherheitseinstellungen: Server, Scanner, Mitschnitt, unsichere Protokolle, lokale Terminals, Debug-Log abschaltbar | D 6.7, CL, P | P3 | 8 | APP | Abschnitt in der Konfiguration + Customizer | ⬜ |
| SEC-07 | Keine ungefragten Internetverbindungen, Update-Prüfung nur auf Klick | D 6.1 | P1 | alle | APP | | ⬜ |
| SEC-08 | Keine Registry-Einträge ohne ausdrückliche Aktion | D 6.1 | P1 | alle | APP | | ⬜ |

## AUTO – Automatisierung und Kommandozeile

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| AUTO-01 | Makros aufzeichnen (Tastatureingaben) und auf beliebigen Sessions abspielen, Makro-Verwaltung | F | P2 | 4 | APP/TERM | | ⬜ |
| AUTO-02 | Kommandozeile: `-exec`, `-newtab`, `-bookmark`, `-runmacro`, `-openfolder`, `-hideterm`, `-exitwhendone`, `-i <ini>`, `-log`, `-config`, `-shortcuts`, `-doc`, `-picview`, `-edit`, `-compfiles`, `-compfolders`, `-noX`, `-dpi`, `-justunpack` | D 5.4 | P2 | 8 | APP | gleiche Schalter für Umsteiger | ⬜ |
| AUTO-03 | Einzelinstanz: `-newtab` öffnet Tab in laufender Instanz | D 5.4 | P2 | 4 | APP | Named Pipe | ⬜ |
| AUTO-04 | Shell-Skript beim Start ausführen (`OpenXterm.exe <skript>`) | D 5.4 | P3 | 8 | APP/CYG | | ⬜ |
| AUTO-05 | Explorer-Kontextmenü „OpenXterm hier starten“ (`-installshellext`) | D 3.1, D 5.4 | P3 | 8 | APP | HKCU, nur auf Wunsch | ⬜ |
| AUTO-06 | URL-Protokoll-Handler für Sessions aus Webseiten (`-installprotohandler`) | D 5.4 | P3 | 8 | APP | HKCU, nur auf Wunsch | ⬜ |

## CFG – Konfiguration

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| CFG-01 | Einstellungsdialog: Allgemein, Terminal, X11, SSH, Anzeige, Tastenkürzel, Sicherheit | D 3 | P1 | 1 | APP | Seiten wachsen mit den Phasen | ⬜ |
| CFG-02 | Ablage der Konfiguration: neben der EXE (portabel), Dokumente oder `%AppData%` – wie beim Vorbild | D 6.7 | P1 | 1 | APP | | ⬜ |
| CFG-03 | Konfigurationspfad per `-i`, auch Netzlaufwerk oder HTTP(S) (schreibgeschützt) | D 6.7 | P3 | 8 | APP | | ⬜ |
| CFG-04 | Standard-Editor wählbar (eingebauter oder externer) | D 3.1 | P2 | 3 | APP | | ⬜ |
| CFG-05 | Gemeinsame Konfiguration für Teams (Konfiguration auf Freigabe, schreibgeschützt) | D 6.7 | P3 | 8 | APP | | ⬜ |
| CFG-06 | Zusätzliche Debug-Protokollierung (`-log`) | D 5.4 | P2 | 1 | APP | ohne Geheimnisse | ⬜ |

## TOOL – Werkzeuge

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| TOOL-01 | Texteditor für Entwickler: Syntaxhervorhebung, Tabs, Suchen/Ersetzen, Zeilenenden, Kodierung | D 2.4 | P1 | 3 | APP | CodeMirror 6 | ⬜ |
| TOOL-02 | Text-Diff | D 2.4 | P2 | 8 | APP | eigener Diff (Myers) | ⬜ |
| TOOL-03 | Ordner-Diff | D 2.4 | P3 | 8 | APP | | ⬜ |
| TOOL-04 | Bildbetrachter mit Vollbild und Zoom | D 2.4 | P3 | 8 | APP | | ⬜ |
| TOOL-05 | Doppelte Dateien finden | D 2.4 | P3 | 8 | CYG | `fdupes`-Paket | ⬜ |
| TOOL-06 | Rechner/Computeralgebra im Terminal | D 2.4 | P3 | 8 | CYG | passendes Cygwin-Paket | ⬜ |
| TOOL-07 | Werkzeug-Menü und Seitenleisten-Reiter „Werkzeuge“ | F | P2 | 8 | APP | | ⬜ |

## EXT – Erweiterungen, Pakete, Extras

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| EXT-01 | Plugins: ZIP mit `/bin`, `/lib`, `/usr`, `/etc`, Endung `.oxt`, neben der EXE ablegen | D 2.4, D 6.7 | P2 | 8 | APP/CYG | beim Start ins Root einspielen | ⬜ |
| EXT-02 | Paketmanager im Terminal (Cygwin-Pakete nachinstallieren) | D 2.4 | P2 | 8 | CYG | eigener Wrapper, Befehl `oxapt` | ⬜ |
| EXT-03 | Spiele (eigene Auswahl) | D 6.7 | P3 | 8 | APP | eigene kleine Spiele im Frontend | ⬜ |
| EXT-04 | Customizer: eigene EXE mit eigenem Logo, vorgegebenen Sessions und Einstellungen, Funktionen abschalten | F, P | P3 | 8 | APP | Konfiguration neben/in der EXE, eigenes Icon | ⬜ |
| EXT-05 | Spiele, Bildschirmschoner und Werkzeuge entfernbar | CL, P | P3 | 8 | APP | über Customizer/Konfiguration | ⬜ |

## REL – Auslieferung

| ID | Funktion | Quelle | Prio | Phase | Komp. | Umsetzung | Status |
|---|---|---|---|---|---|---|---|
| REL-01 | Eine portable EXE; Payload wird beim Start entpackt; keine Adminrechte | F, D 6.1 | P1 | 2 | APP/CYG | Tauri erzeugt eine EXE; Cygwin-Payload als ZIP daneben oder eingebettet (ADR-5) | ⬜ |
| REL-02 | Installer-Variante | F | P2 | 8 | EXT | Tauri-Bundler (NSIS) | ⬜ |
| REL-03 | Vorab-Entpacken in schreibgeschützten Ordner für restriktive Gruppenrichtlinien (`-justunpack`) | D 6.7 | P3 | 8 | APP | | ⬜ |
| REL-04 | „Nach Updates suchen“ (manuell) | D 6.1 | P2 | 8 | APP | GitHub-Releases-API, nur auf Klick | ⬜ |
| REL-05 | Hilfe/Dokumentation im Programm | D 5.4 | P2 | 8 | APP | eigene Doku | ⬜ |
| REL-06 | Code-Signatur | eigene | P2 | 8 | – | sonst SmartScreen-Warnungen | ⬜ |
| REL-07 | Quellcode-Angebot für mitgelieferte GPL-Komponenten | eigene | P1 | 2 | – | siehe RECHTLICHES | ⬜ |
