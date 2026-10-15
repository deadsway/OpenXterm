# Spike S1 – SSH-Terminal und RDP-Bild in einer Tauri-App

> Ein **Spike** ist ein Wegwerf-Prototyp, der genau eine Frage beantwortet. Der Code darf schnell und unordentlich sein. Wichtig ist das Ergebnis in `spikes/s1-ssh-rdp/ERGEBNIS.md`. Der Spike-Code wird später **nicht** weiterentwickelt, sondern in Phase 1 sauber neu geschrieben.

## Die Frage

Trägt der geplante Stack für OpenXterm?

1. Lässt sich ein **SSH-Terminal** mit russh (Rust) und xterm.js (WebView) flüssig und korrekt betreiben?
2. Lässt sich eine **RDP-Sitzung** mit IronRDP in ein `<canvas>` zeichnen und per Maus/Tastatur bedienen – schnell genug für den Alltag?
3. Funktioniert beides **unter Windows** und lässt es sich **in der Linux-Cloud** bauen, testen und per Screenshot prüfen?

## Was schon vorab geprüft wurde (Oktober 2026)

| Prüfung | Ergebnis |
|---|---|
| IronRDP 0.17 (Beispiel `screenshot`) → xrdp 0.9.24, TLS **ohne** NLA, `autologon` an | ✅ Verbindung, Anmeldung und Bild (Desktop mit `OPENXTERM-RDP-TEST`) |
| dasselbe mit NLA (CredSSP) gegen xrdp | ❌ erwartbar: xrdp kann kein NLA |
| IronRDP mit NLA gegen den IronRDP-Beispielserver (`--sec hybrid`, mit Zertifikat) | ✅ Handshake erfolgreich (Demo-Server beendet danach die Sitzung) |
| Tauri-2-App (Vorlage `vanilla-ts`) unter Xvfb starten, Screenshot mit `testing/shot.sh` | ✅ Oberfläche sichtbar |
| `testing/testenv.sh start` (sshd + xrdp), SSH-Login als `tester` | ✅ |

Daraus folgt für den Spike: **RDP gegen xrdp immer mit TLS, ohne CredSSP, mit Autologon.**

## Rahmen

- Ort: `spikes/s1-ssh-rdp/` – eigenständiges Tauri-2-Projekt (Vorlage `react-ts`), **kein** Teil eines Workspaces.
- Crates (jeweils aktuelle Version per `cargo add`): `tauri`, `tokio`, `russh`, `ironrdp-client` (mit TLS-Feature `rustls`), `anyhow`, `serde`, `tracing`.
- npm: `@xterm/xterm`, `@xterm/addon-fit`.
- IronRDP **von crates.io** verwenden, nicht den Fork. (Der Fork `deadsway/IronRDP` ist für spätere eigene Änderungen da.)
- Testserver: `bash testing/testenv.sh start` (Cloud) bzw. `docker compose -f testing/compose.yaml up -d --build` (Windows).
- Adressen per Umgebungsvariable: `OX_SSH_ADDR` (Standard `127.0.0.1:2222`), `OX_RDP_ADDR` (Standard `127.0.0.1:3389`; unter Windows mit Docker `127.0.0.1:3390`).
- Zugangsdaten der Testserver (`tester`/`tester`) dürfen im Spike fest im Code oder per Umgebungsvariable stehen – **nur hier**.
- Screenshots unter `spikes/s1-ssh-rdp/screenshots/`, laufende Notizen und Messwerte in `spikes/s1-ssh-rdp/NOTIZEN.md`.

## Etappe A – Gerüst

- Tauri-App mit zwei Tabs („SSH“, „RDP“) und einer Statuszeile.
- Startet unter Linux (Cloud) und Windows.
- Automatischer Start für Screenshots: Ist `OX_SPIKE_AUTO=ssh` bzw. `=rdp` gesetzt, öffnet die App sofort den Tab und verbindet zum Testserver.

**Akzeptanz**
- [ ] `npm run tauri build -- --debug --no-bundle` läuft in der Cloud durch.
- [ ] Screenshot mit `testing/shot.sh` zeigt das Fenster mit beiden Tabs.

## Etappe B – SSH-Tab

Ablauf:
```
xterm.js onData ──invoke ssh_write(bytes)──► russh Channel.data()
russh Lesetask ──tauri::ipc::Channel (Rohbytes)──► term.write(Uint8Array)
fit-Addon / Fenstergröße ──invoke ssh_resize(cols, rows)──► window_change
```

Host-Key: In `check_server_key` den SHA256-Fingerprint ermitteln, ein Ereignis an die Oberfläche schicken und **auf die Antwort warten** (z. B. `tokio::sync::oneshot`). Die Oberfläche zeigt einen Dialog „Vertrauen / Abbrechen“. Im Auto-Modus wird der Fingerprint ins Log geschrieben und automatisch akzeptiert – nur im Spike.

**Akzeptanz**
- [ ] Verbindung zu `127.0.0.1:2222` als `tester`, Prompt erscheint.
- [ ] Der angezeigte Fingerprint stimmt mit der Ausgabe von `testenv.sh start` überein.
- [ ] Im Screenshot: Ausgabe von `ls -la /` und ein Unicode-Test (`printf 'äöü € ✓\n'`) korrekt.
- [ ] `vim` oder `top` werden korrekt gezeichnet (Screenshot), Fenstergröße stimmt.
- [ ] Eingaben per `xdotool type` landen im Terminal (Cloud-Test der Tastaturkette).
- [ ] Verbindungsabbruch wird angezeigt, App stürzt nicht ab.

## Etappe C – RDP-Tab

Ablauf:
```
ironrdp-client (tokio)  ──Ausgabe-Ereignisse (mpsc)──► Rust-Task
  Rust-Task: geänderte Bereiche als RGBA ausschneiden
  ──tauri::ipc::Channel, Rohbytes: [x,y,w,h als u32 LE][RGBA…]──► Canvas putImageData
Canvas mouse*/key* ──invoke rdp_input(...)──► Eingabe an ironrdp-client
```

Hinweise:
- Konfiguration für xrdp: TLS an, CredSSP aus (`ConfigBuilder::with_credssp(false)`), Autologon an. Wie die Autologon-Option im `ironrdp-client`-Builder heißt, in der Crate-Doku nachsehen (im Connector heißt sie `autologon`).
- Referenz für den Ablauf: `crates/ironrdp/examples/screenshot.rs` im IronRDP-Repository (blockierend) sowie `ironrdp-viewer` (fertiger Client auf Basis von `ironrdp-client`).
- `ironrdp-client` prüft TLS-Zertifikate standardmäßig **nicht**. Für den Spike in Ordnung. Notieren, dass OpenXterm später einen Fingerprint-Dialog braucht (Skill `sicherheit`).
- Keine Bilddaten als JSON senden – nur Rohbytes über den Kanal.
- Messen: Zeit bis zum ersten Bild, Bytes und Bilder pro Sekunde bei Bewegung (z. B. Fenster im xrdp-Desktop verschieben), Speicherverbrauch.

**Akzeptanz**
- [ ] Screenshot zeigt den xrdp-Desktop mit dem Text `OPENXTERM-RDP-TEST`.
- [ ] Mausklick und Tastatur: per `xdotool` in das xterm im RDP-Bild `echo spike-ok` tippen – Text erscheint im nächsten Screenshot.
- [ ] Tab wechseln und zurück: Bild bleibt erhalten.
- [ ] Messwerte stehen im Ergebnis.
- [ ] Optional: dynamische Größe (Canvas-Größe ändern → neue Auflösung).

## Etappe D – Windows (machst du)

- [ ] Repo klonen, `npm install`, `npm run tauri dev` in `spikes/s1-ssh-rdp`.
- [ ] Testserver per Docker Desktop (RDP auf Port **3390**!) – SSH- und RDP-Tab funktionieren.
- [ ] Wenn verfügbar: RDP zu einem echten Windows-Rechner **mit NLA** (CredSSP an). Ergebnis notieren.
- [ ] Gefühlte Geschwindigkeit bei Terminal und RDP notieren.

## Etappe E – Ergebnis

`spikes/s1-ssh-rdp/ERGEBNIS.md` mit:
1. Antwort auf die drei Fragen (ja / ja mit Einschränkung / nein)
2. Messwerte
3. Probleme und Umgehungen (mit Links auf Issues/Doku)
4. Was in Phase 1 anders gemacht werden soll
5. Offene Risiken für spätere Phasen (z. B. H.264, Mehrfachmonitor, Zertifikatsprüfung)
6. Screenshots (PNG im Spike-Ordner)

## Ausdrücklich nicht Teil des Spikes

Session-Verwaltung, Einstellungen, Tresor, Design, SFTP, Fehlertexte auf Deutsch, Tests über das Nötigste hinaus.
