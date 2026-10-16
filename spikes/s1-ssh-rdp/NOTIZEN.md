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

## Etappe C – RDP-Tab (2026-10-16, Cloud)

### Abhängigkeiten: Konflikt mit russh → IronRDP aus Git
- **Problem:** `ironrdp-client` 0.1.0 von crates.io lässt sich **nicht** zusammen mit russh bauen. `ironrdp-connector` 0.10.0 (crates.io) pinnt `picky =7.0.0-rc.25`, das wiederum `curve25519-dalek =5.0.0-rc.1`, `p256 =0.14.0-rc.14`, `ecdsa =0.17.0-rc.22` und `ed25519-dalek =3.0.0-rc.1`. Jede russh-Version ab 0.62 verlangt andere Versionen (0.62.3+ `curve25519-dalek ^5`; 0.62.0–0.62.2 `p256 =0.14.0-rc.15`). Release-Candidates gelten bei Cargo als semver-kompatibel zu `5.0.0`, deshalb kann nur eine Version im Graphen stehen, und die Auflösung scheitert.
- **Lösung (Entscheidung Nutzer):** IronRDP aus Git, fester Commit `62246b364a0282bab85087f658a81fe4207b6b31` (master, Oktober 2026). Dort pinnt `ironrdp-connector` `picky =7.0.0-rc.26` (ohne die Krypto-Pins) und `sspi 0.23`. Deren `rsa =0.10.0-rc.18`/`pkcs1 =0.8.0-rc.4` passen genau zu russh 0.64.1, und russh bleibt unverändert.
- Kontrolle mit `cargo tree | grep ironrdp`: alle 23 ironrdp-*-Crates kommen aus `git+…?rev=62246b36`, keines aus crates.io.
- Direkte Abhängigkeiten: `ironrdp-client` (Feature `rustls`, zieht rustls 0.23.46), `ironrdp-input`, `ironrdp-pdu` (alle vom selben Commit), `smallvec` 1.
- **Phase 1:** Prüfen, ob ein neues crates.io-Release von IronRDP erschienen ist (mit picky ≥ rc.26). Sonst auf denselben festen Commit setzen oder den Fork `deadsway/IronRDP` verwenden.

### Region der Grafik-Updates
- `ironrdp-client` **0.1.0 (crates.io)** verwirft die Region von `ActiveStageOutput::GraphicsUpdate(_region)` und schickt bei jedem Update das ganze Bild (`RdpOutputEvent::Image`, `Vec<u32>` 0RGB). Für Phase 1/5 war deshalb zu prüfen: (a) `ironrdp-session` direkt verwenden oder (b) `ironrdp-client` im Fork `deadsway/IronRDP` so erweitern, dass die Region mitkommt, und das als Pull Request an Devolutions vorschlagen.
- **Stand Commit 62246b3:** Upstream hat (b) schon umgesetzt. `RdpClient::with_desktop_updates()` liefert `RdpOutputEvent::DesktopUpdate` mit dicht gepackten Pixeln **nur der geänderten Region** (inklusive Koordinaten, Vollbild beim ersten Update und bei jeder Größenänderung). Der zunächst geplante 64×64-Kachelvergleich in Rust war damit unnötig, der Spike nutzt die echten Regionen. Für Phase 1: diese API verwenden, sobald sie auf crates.io erscheint. Ein eigener PR ist dafür nicht nötig.
- Die API am Commit unterscheidet sich deutlich von 0.1.0: `output_channel()` mit `DropPolicy` (Bilder/Zeiger „neuester gewinnt“, `DesktopUpdate` „muss zugestellt werden“), `RdpInputSender` mit begrenzter Warteschlange (`try_send`), neue Ereignisse (`Connected`, `AutoReconnecting` mit Antwortkanal, RAIL, …). Außerdem gibt es jetzt `ironrdp_tls::CertificateValidationCallback = Arc<dyn Fn(&[u8] /*DER*/, &str, &str) -> bool>`, den Haken für den Fingerprint-Dialog. Er ist **synchron**, deshalb muss Phase 1 die Antwort der Oberfläche blockierend abwarten (eigener Thread oder `block_in_place`).

### Umsetzung
- Rust: `src-tauri/src/rdp.rs`.
  - Config: TLS an, CredSSP aus, Autologon an, Tastaturlayout 0x0409, Software-Mauszeiger (der Cursor wird ins Bild gezeichnet, das Canvas blendet den lokalen aus). Pflichtfelder `client_build`/`client_dir`/`client_name`/`platform` wie in `ironrdp-viewer`.
  - `RdpClient::run()` läuft auf einem **eigenen Thread mit current-thread-Runtime** (Muster aus `ironrdp-viewer`), weil die Protokollschleife viel CPU braucht und nicht auf der Tauri-Runtime laufen soll.
  - Ausgabe-Task (Tauri-Runtime): `DesktopUpdate` → RGBA-Schattenpuffer (0RGB → RGBA, A=255) + Liste geänderter Rechtecke. Höchstens alle 16 ms (≈ 60/s) ein „Flush“: Bei > 16 Rechtecken oder wenn die Bounding-Box höchstens doppelt so groß wie die Summe ist, wird nur die Box gesendet, sonst jedes Rechteck einzeln. Paketformat wie im Skill: `[x,y,w,h u32 LE][RGBA…]`, gesendet mit `InvokeResponseBody::Raw`.
  - Eingabe: `rdp_input` ist ein **synchroner** Befehl (Reihenfolge bleibt erhalten) mit Tagged-Enum (`mouseMove`/`mouseButton`/`wheel`/`key`/`releaseAll`). `ironrdp_input::Database` verwaltet Tasten- und Maustastenzustand und erzeugt die Fast-Path-Ereignisse. Tabelle `KeyboardEvent.code` → Scancode Set 1 (inkl. E0-Tasten) in Rust. `releaseAll` bei Blur und Tabwechsel gegen hängende Modifier.
  - `rdp_resize` → `RdpInputEvent::Resize`. xrdp nimmt Display Control hier nicht an, IronRDP verbindet automatisch mit neuer Größe neu.
  - `session_close` ist jetzt ein gemeinsamer Befehl in `lib.rs` (RDP zuerst, sonst SSH).
- Oberfläche: `src/RdpTab.tsx` mit Canvas 1:1 (keine Skalierung), Startgröße = Panelgröße. `putImageData` je Paket. Bei `rdp://size` wird das Canvas unter Erhalt des Inhalts vergrößert/verkleinert (`width`/`height` setzen löscht ein Canvas sonst). Mausbewegung per `requestAnimationFrame` gedrosselt, Rad mit nicht-passivem Listener, Kontextmenü unterdrückt. Statuszeile: Zeit bis zum ersten Bild, Auflösung, fps (Flushes), KiB/s und die tatsächlich gemalten Rechtecke/s (Zähler auf WebView-Seite).
- Messschalter nur im Spike: `OX_RDP_LOSSLESS=1` schaltet RemoteFX und verlustbehaftete Bitmap-Kompression ab.
- Unit-Tests (`cargo test`): Paketlayout, Zusammenfassen von Rechtecken, Scancodes.

### Akzeptanz – Belege
| Kriterium | Ergebnis | Screenshot |
|---|---|---|
| xrdp-Desktop mit `OPENXTERM-RDP-TEST` | ✅ Auto-Modus `OX_SPIKE_AUTO=rdp`, erstes Bild nach 183 ms | `c1-desktop.png` |
| Mausklick + Tastatur: `echo spike-ok` per xdotool | ✅ Klick ins xterm, `xdotool type`, Ausgabe `spike-ok` erscheint | `c2-eingabe.png` |
| Tab wechseln und zurück, Bild bleibt | ✅ Canvas bleibt gemountet, kein Neuaufbau (kein zweites `first frame` im Log) | `c3-tabwechsel.png` (links SSH, rechts zurück auf RDP) |
| Messwerte | ✅ siehe unten | `c4-bewegung.png`, `c4b-bewegung-ohne-remotefx.png` |
| Optional: dynamische Größe | ✅ Fenster 1100×700 → 900×560: Canvas 1100×611 → 900×471, IronRDP verbindet neu, X-Sitzung bleibt (xterm-Inhalt erhalten) | `c5-resize.png` |
| (zusätzlich) Verbindungsabbruch | ✅ xrdp beendet → Meldung in der Werkzeugleiste, Button wieder „Verbinden“, letztes Bild bleibt stehen, App läuft weiter | `c6-abbruch.png` |

### Messwerte (Xvfb 1280×800, Software-Rendering, RDP-Fläche 1100×611, xrdp 0.9.24 lokal)
- **Zeit bis zum ersten Bild** (Klick bzw. Auto-Start → erstes `DesktopUpdate`): Debug-Build 183–262 ms (5 Läufe: 183, 262, 239, 254, 244), davon ~165–185 ms bis „Aktivierung fertig“. Release-Build 142–159 ms. Gemessen bei bestehender xrdp-Sitzung, die erste Anmeldung nach dem Start von xrdp lag ebenfalls bei 183 ms.
- **Bewegung** (xterm-Fenster 3 Runden per xdotool über den Desktop ziehen, Werte pro Sekunde):

  | Build / Codec | Updates von IronRDP | Flushes (fps) | Canvas-Rechtecke/s | Daten an WebView | Kopieren in Rust | `Channel::send` |
  |---|---|---|---|---|---|---|
  | Debug, RemoteFX (Standard) | 40–170 | **7–12** | – | 10–17 MiB/s | 60–100 ms/s | ~1 ms/s |
  | Release, RemoteFX (Standard) | 117–130 | **55–57** | 60 | 35–44 MiB/s | 16–19 ms/s | ~1,6 ms/s |
  | Release, `OX_RDP_LOSSLESS=1` | 222–236 | **56–58** | – | 21–23 MiB/s | 8–10 ms/s | ~1,6 ms/s |

  - Im Debug-Build ist IronRDP selbst der Engpass (unoptimierte Dekodierung). `send` und unser Kopieren sind es nicht. Messungen zur Geschwindigkeit deshalb immer mit Release-Build (`CARGO_PROFILE_RELEASE_LTO=false CARGO_PROFILE_RELEASE_CODEGEN_UNITS=16 npm run tauri build -- --no-bundle`, 4,5 min kalt).
  - Release: Die 60-Hz-Grenze wird erreicht, und die WebView malt alle gesendeten Rechtecke (60/s laut Zähler). `Channel::send` mit Rohbytes kostet fast nichts (Tauri legt große Daten in eine Warteschlange, die WebView holt sie per IPC ab).
  - In Ruhe (blinkender Cursor, Uhr): 3–6 Flushes/s, ~17 KiB/s.
- **Speicher (RSS)**: Release: App 160–165 MB, `WebKitWebProcess` 173–175 MB, `WebKitNetworkProcess` 48 MB. Debug: App 191 MB, `WebKitWebProcess` 171–186 MB.
- **CPU** (Release, während des Ziehens, `top`): App ~10 %, `WebKitWebProcess` ~10 %.
- Binärgröße: Release (ohne LTO) 20 MB, Debug 446 MB.

### Probleme und Umgehungen
- **RemoteFX-Spuren:** Mit dem Standard von IronRDP (RemoteFX an) bleiben nach dem Verschieben eines Fensters blasse Ränder auf dem Desktop stehen (±1–2 Farbstufen). Auch das Grundbild weicht leicht ab (`#1E6F5C` → `(29,110,91)`), im kontrastverstärkten Bild sieht man ein 64×64-Raster. RemoteFX ist verlustbehaftet, und xrdp verfeinert die Kacheln offenbar nicht nach. `with_lossy_compression(false)` allein hilft nicht, erst `with_codecs(["remotefx:off"])`. Dann ist das Bild exakt (`#1E6F5C`), ohne Spuren, und braucht gegen xrdp sogar **weniger** Daten (22 statt 40 MiB/s). Für Phase 1: Codec je Session wählbar machen. Gegen xrdp eher ohne RemoteFX, unter Windows (Etappe D) beides vergleichen.
- Beim Größenwechsel per Neuverbindung zeichnet xrdp/IceWM den Hintergrund neu, die grüne `xsetroot`-Farbe geht verloren (Testumgebung, kein Fehler des Clients).
- Ein vom Server beendeter Ablauf (xrdp per `pkill -x xrdp` gestoppt) meldet IronRDP als `Terminated(Ok(UserInitiated))`. Die Meldung „user initiated disconnect“ ist dann irreführend. Phase 1: eigene Gründe/Texte, beim Abbruch nicht „Benutzer“ behaupten.
- Log-Warnungen von IronRDP gegen xrdp, harmlos: „Server Control (Cooperate) has non-zero grant_id“ und „Ignoring invalid Fast-Path update … unsupported fast-path update code“.
- `testenv.sh start` startet xrdp nach `pkill -x xrdp` nicht neu (sesman läuft noch, die Prüfung meldet „läuft bereits“). Umgehung: `rm -f /var/run/xrdp/xrdp.pid; xrdp`.
- Nach einem Neustart der Cloud-Sitzung fehlte `node_modules` (`tsc` scheiterte) → `npm ci`.
- xrdp hält die X-Sitzung über Neuverbindungen hinweg. Fensterpositionen aus früheren Läufen bleiben also bestehen, Zieh-Skripte müssen die Titelleiste neu suchen.
- Wieder `pkill -f …` in einer Shell, die das Muster selbst enthält → beendet die eigene Shell (Exit 144). Den App-Prozess über `/tmp/openxterm-ui/app.pid` beenden.

### Sicherheit (nur Spike)
- **Das TLS-Zertifikat des RDP-Servers wird nicht geprüft** (`CertificateValidation::DangerouslyAcceptInvalidCertificate` ist der Standard von ironrdp-client). Der Spike schreibt beim Verbinden eine WARN-Zeile ins Log. OpenXterm braucht laut Skill `sicherheit` einen Fingerprint-Dialog (SHA-256 des Zertifikats, Speichern in `rdp_certs.toml`, Warnung bei Änderung). Der Haken dafür ist `CertificateValidationCallback` (siehe oben, synchron).
- Zugangsdaten `tester`/`tester` stehen fest im Code (nur Spike). Das Passwort taucht nicht im Log auf: Die `Config` wird nicht geloggt, und IronRDP entfernt Geheimnisse selbst aus seinem `PropertySet`.

### Nur unter Windows prüfbar
- Build mit IronRDP aus Git unter Windows (rustls, aws-lc-sys wie bei russh), RDP gegen Docker-xrdp auf **Port 3390** (`$env:OX_RDP_ADDR="127.0.0.1:3390"`), NLA gegen einen echten Windows-Rechner (dafür `with_credssp(true)`; im Spike fest aus → für Etappe D umschaltbar machen).
- WebView2: Durchsatz von `Channel` mit großen Rohdaten und `putImageData` (hier WebKitGTK). DPI-Skalierung des Canvas (`devicePixelRatio` ≠ 1 → Bild unscharf oder Koordinaten falsch, im Spike nicht behandelt). Echte Tastatur: deutsches Layout (der Spike meldet 0x0409/US an den Server), AltGr, tote Tasten, IME. Gefühlte Geschwindigkeit, RemoteFX gegen Windows-Server.
