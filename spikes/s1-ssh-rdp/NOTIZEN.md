# Spike S1 – Notizen

## Etappe A – Gerüst (2026-10-16, Cloud)

- Erzeugt mit `npm create tauri-app@latest s1-ssh-rdp -- --template react-ts --manager npm --identifier org.openxterm.spike --yes`.
- Versionen: Tauri 2.12.4 (CLI 2.12.3, `@tauri-apps/api` 2.12.4), React 19.3.1, Vite 8.3.4, TypeScript 6.0.3, Rust 1.97.0 (Edition 2024).
- Aus der Vorlage entfernt: `greet`-Befehl, Logos, `tauri-plugin-opener` (Rust, npm, Capability).
- Befehl `spike_config` liefert `OX_SSH_ADDR`, `OX_RDP_ADDR` (Standards `127.0.0.1:2222` / `127.0.0.1:3389`) und `OX_SPIKE_AUTO`. Die Variablen werden zur Laufzeit in Rust gelesen – Vite würde `import.meta.env` beim Build einbacken.
- `OX_SPIKE_AUTO=ssh|rdp` wählt bisher nur den Starttab; das automatische Verbinden kommt in Etappe B/C.
- `npm run tauri build -- --debug --no-bundle`: ca. 1,5 min (kalter Cache, nach `cargo clippy`), Binärdatei `src-tauri/target/debug/s1-ssh-rdp` ≈ 200 MB (Debug-Infos).
- Screenshot: `screenshots/a-geruest.png` (Standardadressen). Kontrolllauf mit `OX_RDP_ADDR=10.0.0.5:3390 OX_SPIKE_AUTO=rdp` zeigte den RDP-Tab aktiv und die geänderte Adresse.
- Unter Xvfb harmlose Warnung im Log: `AT-SPI: Error retrieving accessibility bus address`.
- Offen (Windows, Etappe D): `npm run tauri dev` mit WebView2, Darstellung/DPI, Variablen in PowerShell (`$env:OX_RDP_ADDR="127.0.0.1:3390"`).

## Etappe B – SSH-Tab (2026-10-16, Cloud)

### Umsetzung
- Neue Abhängigkeiten: `russh` 0.64.1, `tokio` 1.53.3, `anyhow` 1.0.104, `tracing` 0.1.44, `tracing-subscriber` 0.3.23 (Feature `env-filter`); npm `@xterm/xterm` 6.0.0, `@xterm/addon-fit` 0.11.0.
- russh zieht `aws-lc-rs`/`aws-lc-sys` (Standard-Krypto) – unter Windows braucht der Build NASM und CMake (Etappe D prüfen).
- Rust: `src-tauri/src/ssh.rs`. Ein tokio-Task je Sitzung; `tokio::select!` über `channel.wait()` (Server → Kanal) und eine `mpsc`-Befehlsschlange (`Write`/`Resize`/`Close` aus den Tauri-Befehlen).
- Terminalausgabe: `Channel<InvokeResponseBody>` + `InvokeResponseBody::Raw(bytes)` → in der WebView kommt ein `ArrayBuffer` an → `term.write(new Uint8Array(buf))`. Kein JSON.
- Eingabe: `term.onData` → `invoke("ssh_write", { sessionId, data })` (String, in Rust `into_bytes()`).
- Größe: `ResizeObserver` → `FitAddon.fit()` → `ssh_resize(cols, rows)` → `window_change`. PTY wird mit der Startgröße angefordert (`xterm-256color`).
- Host-Key: `check_server_key` berechnet `fingerprint(HashAlg::Sha256)` (aus `russh::keys`, kein eigenes `sha2` nötig), legt einen `oneshot::Sender` unter einer `request_id` ab, sendet `ssh://host-key` und wartet mit 120 s Zeitlimit. `prompt_answer(requestId, accept)` löst auf. Auto-Modus: Fingerprint ins Log (WARN) und als gelbe Zeile ins Terminal, Statuszeile zeigt ihn ebenfalls.
- Ende jeder Sitzung (Server weg, Exit, „Trennen“, Fehler, Host-Key abgelehnt): `session://closed` mit Grund → rote Zeile im Terminal, Button wird wieder „Verbinden“.
- Panels bleiben beim Tabwechsel gemountet (`hidden`), damit das Terminal erhalten bleibt (auch Vorbereitung für das RDP-Canvas).

### Akzeptanz – Belege
| Kriterium | Ergebnis | Screenshot |
|---|---|---|
| Verbindung als `tester`, Prompt | ✅ Auto-Modus, Prompt nach 160–210 ms | `b1-prompt.png` |
| Fingerprint = `testenv.sh start` | ✅ beide `SHA256:DaCOYAHgwzziPRYyyK6N6D3XzJTaeqklH5lvfJMmmGo` (ED25519). Dialog ohne Auto-Modus, „Abbrechen“ → Abbruch „Unknown server key“, „Vertrauen“ → Prompt | `b2-hostkey-dialog.png`, `b2-hostkey-abgelehnt.png`, `b2-hostkey-vertraut.png` |
| `ls -la /` + `printf 'äöü € ✓\n'` | ✅ Farben, Spalten und Unicode korrekt | `b3-ls-unicode.png` |
| `top`/`vim`, Fenstergröße | ✅ 134×37 bei 1100×700; nach `xdotool windowsize` 820×520 → 99×25, vim nutzt genau die Fläche | `b4-top.png`, `b4-vim-resize.png` |
| Eingaben per `xdotool type` | ✅ alle Befehle oben wurden so getippt, inkl. Umlauten | `b3-ls-unicode.png` |
| Verbindungsabbruch | ✅ sshd-Sitzung serverseitig beendet → „[Verbindung getrennt: vom Server getrennt]“, App läuft weiter; ebenso „Trennen“ und Verbinden bei gestopptem Server („Connection refused“) | `b6-abbruch.png`, `b6-trennen-und-server-aus.png` |

### Messwerte (Debug-Build, Xvfb, Software-Rendering)
- Zeit bis zur ersten Ausgabe (TCP-Verbindung → erste Daten): **160–212 ms** (Log `first data`), davon ~205 ms bis `shell requested`. Mit Dialog zählt die Bedenkzeit mit (2241 ms im Test).
- Durchsatz: `seq 1 500000` (≈ 3,4 MB) war nach **≤ 1,45 s** vollständig gezeichnet (Screenshot alle ~0,5 s), also ≥ 2,3 MB/s inklusive Rendering. Keine Hänger, Eingabe danach sofort möglich. Serverseitig `time … | base64` von 3 MB: 0,32 s.
- Speicher nach den Tests: App-Prozess 160 MB RSS, `WebKitWebProcess` 232 MB, `WebKitNetworkProcess` 48 MB (Debug-Build).
- Build: `npm run tauri build -- --debug --no-bundle` 1 min 43 s (inkr. nach neuen Crates); Binärdatei 262 MB (Debug-Infos).

### Probleme und Umgehungen
- **xdotool und Umlaute**: `xdotool type` brach mit „Invalid multi-byte sequence encountered“ ab, weil die Cloud-Shell keine Locale setzt. Lösung: `LC_ALL=C.UTF-8` in `testing/ui-session.sh` exportiert.
- **Terminal schrumpfte nicht**: Beim Verkleinern blieb die alte Zeilenzahl, Statuszeile rutschte aus dem Fenster. Ursache: Flex-Kinder ohne `min-height: 0` wachsen mit dem Inhalt (dem alten xterm-Canvas). Lösung: `min-height: 0; overflow: hidden` an Panel, Tab und Terminal-Container. Für Phase 1 merken.
- **Fenster per xdotool finden**: `xdotool search --name s1-ssh-rdp` liefert ein 10×10-Hilfsfenster; richtig ist `--onlyvisible --name "OpenXterm Spike S1"`.
- `pkill -f "sshd: tester"` aus einer Shell trifft auch die eigene Shell (Muster steht in deren Kommandozeile) – besser PID gezielt beenden.
- Log-Warnung `Couldn't get key from code: Unidentified(Gtk(8))` (tao/GTK bei xdotool-Tasten) – harmlos.
- Session-IDs sind im Spike ein Zähler (`ssh-1`, `ssh-3` …, geteilt mit den Prompt-IDs), keine UUID – Phase 1: `uuid`.
- Passwort `tester` steht fest im Code (nur Spike). Phase 1: Passwortabfrage über dasselbe Prompt-Muster, known_hosts-Speicher, Status `changed`.

### Nur unter Windows prüfbar
- Build mit `aws-lc-sys` (NASM, CMake), WebView2-Darstellung von xterm.js (Schrift „Cascadia Mono“/Consolas, DPI-Skalierung), echte Tastatur (AltGr, tote Tasten, Umlaute über IME), gefühlte Geschwindigkeit.
