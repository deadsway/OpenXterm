# Spike S1 – Ergebnis

Stand: 2026-10-17 · Spec: `docs/SPIKE-S1.md` · Laufende Notizen und alle Rohmesswerte: `NOTIZEN.md`

> **Entscheidung (deadsway, 17.10.2026):** Weiter mit Tauri. NLA gegen Windows wird in Phase 5 vor dem Bau des RDP-Tabs geprüft.

**Kurz:** Der Stack trägt. SSH mit russh und xterm.js funktioniert in der Cloud und unter Windows ohne Einschränkung. RDP mit IronRDP in ein Canvas funktioniert ebenfalls und ist im Release-Build gut benutzbar. Es bleibt ein leichtes Nachziehen, das in Phase 5 angegangen wird. **Empfehlung: weiter mit Tauri 2 + Rust + React.** Größtes offenes Risiko ist **NLA (CredSSP) gegen einen echten Windows-Rechner**, das noch niemand getestet hat.

## 1. Antworten auf die drei Fragen

| # | Frage | Antwort | Begründung |
|---|---|---|---|
| 1 | SSH-Terminal mit russh + xterm.js flüssig und korrekt? | **Ja** | Prompt nach 160–210 ms, ≥ 2,3 MB/s inkl. Zeichnen, Unicode, Farben, `top`/`vim`, Größenänderung, Host-Key-Dialog und Abbruch korrekt (Cloud). Unter Windows: Verbindung, Host-Key-Dialog und Befehle funktionieren. `vim`/`vi` dort noch nicht getestet, weil sie im Docker-Container fehlten (jetzt ergänzt, siehe 3.). |
| 2 | RDP mit IronRDP im Canvas, bedienbar und schnell genug? | **Ja, mit Einschränkung** | Erstes Bild nach 142–262 ms, 55–58 Bilder/s im Release-Build (Cloud). Unter Windows funktionieren Bild, Maus und Tastatur. Einschränkungen: im Release-Build leichtes Nachziehen beim Verschieben von Fenstern (Abschnitt 4). NLA gegen Windows ungetestet. Die TLS-Zertifikatsprüfung fehlt im Spike noch. |
| 3 | Läuft beides unter Windows und lässt es sich in der Linux-Cloud bauen, testen und per Screenshot prüfen? | **Ja** | Cloud: Debug- und Release-Build, Testserver, Bedienung per `xdotool`, Screenshots (Abschnitt 7). Windows 11: Build mit Rust, NASM, CMake und WebView2 funktioniert, beide Tabs laufen gegen den Docker-Testserver. |

## 2. Messwerte

Cloud-Werte stammen aus Xvfb mit Software-Rendering (WebKitGTK). Windows-Werte sind subjektive Eindrücke (Etappe D), keine Messungen.

### SSH (Cloud, Debug-Build)
| Messung | Wert |
|---|---|
| TCP-Verbindung → erste Ausgabe | 160–212 ms |
| Durchsatz `seq 1 500000` (≈ 3,4 MB) inkl. Zeichnen | ≤ 1,45 s → ≥ 2,3 MB/s |
| Speicher (RSS) | App 160 MB, WebKitWebProcess 232 MB, WebKitNetworkProcess 48 MB |

### RDP (Cloud, Fläche 1100×611, xrdp 0.9.24 lokal)
| Messung | Debug | Release |
|---|---|---|
| Zeit bis zum ersten Bild | 183–262 ms | 142–159 ms |
| Bilder/s beim Fenster-Ziehen (RemoteFX) | 7–12 | 55–57 (60-Hz-Grenze) |
| Daten an die WebView beim Ziehen | 10–17 MiB/s | 35–44 MiB/s (RemoteFX) · 21–23 MiB/s (ohne RemoteFX) |
| Kopieren/Umwandeln in Rust | 60–100 ms/s | 8–19 ms/s |
| `Channel::send` | ~1 ms/s | ~1,6 ms/s |
| In Ruhe | – | 3–6 Bilder/s, ~17 KiB/s |
| CPU beim Ziehen | – | App ~10 %, WebKitWebProcess ~10 % |
| Speicher (RSS) | App 191 MB | App 160–165 MB, WebKitWebProcess ~175 MB |
| Binärgröße | 446 MB | 20 MB (ohne LTO) |

### Windows 11 (Etappe D, Docker-Testserver, subjektiv)
| Bereich | Eindruck |
|---|---|
| Build | funktioniert (Rust, NASM, CMake, WebView2) |
| SSH-Terminal | flüssig, Befehle und Host-Key-Dialog in Ordnung |
| RDP, Debug-Build (`npm run tauri dev`) | Bild zieht beim Verschieben von Fenstern deutlich nach |
| RDP, Release-Build (`npm run tauri build`) | gut benutzbar, nur noch leichtes Nachziehen |

Folgerung: **Geschwindigkeit nur im Release-Build beurteilen.** Im Debug-Build ist die unoptimierte Dekodierung in IronRDP selbst der Engpass (in der Cloud gemessen: 7–12 statt 55–57 Bilder/s).

## 3. Probleme und Umgehungen

| Problem | Umgehung / Stand | Quelle |
|---|---|---|
| `ironrdp-client` 0.1.0 (crates.io) lässt sich nicht zusammen mit russh ≥ 0.62 bauen. `picky =7.0.0-rc.25` pinnt Krypto-Release-Candidates, die mit russh kollidieren. | IronRDP aus Git, fester Commit `62246b3`. Dort passen `picky rc.26`/`sspi 0.23` zu russh 0.64.1. | `NOTIZEN.md` Etappe C · [IronRDP](https://github.com/Devolutions/IronRDP), [Commit 62246b3](https://github.com/Devolutions/IronRDP/commit/62246b364a0282bab85087f658a81fe4207b6b31) |
| `ironrdp-client` 0.1.0 verwirft die Region der Grafik-Updates und schickt immer das ganze Bild. | Am Commit `62246b3` liefert `with_desktop_updates()` nur die geänderte Region. Kein eigener Kachelvergleich und kein Fork-Patch nötig. | `NOTIZEN.md` Etappe C |
| RemoteFX hinterlässt gegen xrdp blasse Ränder und ein 64×64-Raster (verlustbehaftet, keine Nachbesserung durch xrdp). | `with_codecs(["remotefx:off"])`. Damit ist das Bild exakt, und es fließen sogar weniger Daten (22 statt 40 MiB/s). `with_lossy_compression(false)` allein reicht nicht. | `screenshots/c4-bewegung.png` vs. `c4b-bewegung-ohne-remotefx.png` |
| Terminal schrumpfte beim Verkleinern nicht. | `min-height: 0; overflow: hidden` an den Flex-Kindern. | `NOTIZEN.md` Etappe B |
| `xdotool type` brach bei Umlauten ab (keine Locale in der Cloud-Shell). | `LC_ALL=C.UTF-8` in `testing/ui-session.sh`. | Commit `bfd4271` |
| IronRDP meldet einen vom Server beendeten Ablauf als `UserInitiated`. | Im Spike nicht behoben. Phase 1: eigene Abbruchgründe. | `NOTIZEN.md` Etappe C |
| `testenv.sh start` startet xrdp nach `pkill -x xrdp` nicht neu. | `rm -f /var/run/xrdp/xrdp.pid; xrdp` | `NOTIZEN.md` Etappe C |
| Im Windows-SSH-Container fehlten `vim`/`vi` und `top`. | `testing/sshd/Dockerfile` installiert jetzt `vim-tiny` und `procps`. `vim-tiny` bringt nur `vi`/`vim.tiny` mit, deshalb gibt es zusätzlich den Link `/usr/local/bin/vim`. Unterschied zur Cloud: `vim-tiny` hat keine Syntaxfarben (die Cloud nutzt `vim.basic`). Für den Darstellungstest reicht das. | dieser Commit |
| Zugangsdaten fest im Code, TLS-Zertifikat ungeprüft, Host-Key im Auto-Modus akzeptiert | Bewusst nur im Spike. Phase 1 siehe Abschnitt 5. | Skill `sicherheit` |

## 4. Bewertung: leichtes Nachziehen im Release-Build (Windows)

### Was es nicht ist
- **Kachelvergleich über das ganze Bild:** Der Spike vergleicht keine Kacheln. Der zuerst geplante 64×64-Vergleich wurde nie gebaut, weil `with_desktop_updates()` die geänderten Regionen direkt liefert. Kosten dafür: keine.
- **Fehlende Region aus ironrdp-client:** Das galt für 0.1.0 von crates.io. Am verwendeten Commit kommt die Region mit, und der Spike schickt nur geänderte Rechtecke. Für Phase 5 bleibt ein **Versionsrisiko**: Falls wir auf eine crates.io-Version ohne diese API zurückfallen müssten, wäre das Problem wieder da (siehe Abschnitt 6).
- **Unser Rust-Code:** Kopieren/Umwandeln kostet im Release-Build 8–19 ms pro Sekunde, `Channel::send` ~1,6 ms pro Sekunde (Cloud). Das sind wenige Prozent eines Kerns.

### Wahrscheinliche Ursachen (nach eingeschätzter Wirkung)
1. **Kein Gegendruck zwischen Rust und WebView.** Rust sendet bis zu 60-mal pro Sekunde, ohne zu wissen, ob die WebView das letzte Bild schon gemalt hat. `DesktopUpdate` ist in IronRDP „muss zugestellt werden“, und der Tauri-Kanal puffert unbegrenzt. Ist WebView2 auch nur etwas langsamer als der Datenstrom, wächst beim Ziehen eine Warteschlange, und das Bild hinkt um deren Länge hinterher. Nach dem Loslassen holt es auf. Das passt genau zu „zieht nach“ (Verzögerung) statt „ruckelt“ (Bilder fehlen).
2. **Datenmenge pro Bild.** Rund 0,7 MiB pro Flush mit RemoteFX (35–44 MiB/s bei ~57/s), ~0,4 MiB ohne RemoteFX. Ein Vollbild bei 1100×611 sind 2,6 MiB, bei 1920×1080 schon 7,9 MiB. Ursachen: unkomprimiertes RGBA (4 Byte/Pixel), RemoteFX-Kacheln auf 64er-Raster, und das Zusammenfassen zur Bounding-Box darf bis zu doppelt so viel Fläche schicken wie geändert wurde. Beim Fenster-Ziehen ist die Box aus alter und neuer Position oft groß.
3. **Transport in WebView2.** Große `Channel`-Daten holt die WebView per IPC-Anfrage ab. Unter WebView2 läuft das über ein eigenes Protokoll (Web-Resource-Requests), das nach unserer Kenntnis langsamer ist als unter WebKitGTK, wo wir gemessen haben. **Vermutung, unter Windows nicht gemessen.**
4. **`putImageData` in WebView2.** Jedes Paket erzeugt ein `ImageData` und lädt es synchron vom Hauptspeicher in die GPU-Textur des Canvas (Chromium beschleunigt Canvas per GPU, `putImageData` umgeht das). Der Spike malt außerdem sofort bei jedem Paket statt einmal pro `requestAnimationFrame`. Mehrere Pakete pro Bildschirm-Frame bedeuten mehrere Uploads, und sie sind nicht auf den Bildaufbau abgestimmt.
5. **Takt unter Windows.** Der Flush-Takt kommt aus `tokio::time::sleep_until` (16 ms). Windows-Timer haben ohne erhöhte Auflösung oft ~15,6 ms Granularität, aus 16 ms können dann ~31 ms werden. Das bremst auf ~30 Bilder/s oder bringt Jitter. **Vermutung, nicht gemessen.**
6. **Testserver.** xrdp läuft unter Docker Desktop in der WSL2-VM, kodiert RemoteFX in Software, und die Daten gehen über die Portweiterleitung von Docker Desktop. Ein Teil des Nachziehens kann schon dort entstehen.
7. **Eingabeweg.** Mausbewegungen werden pro `requestAnimationFrame` zusammengefasst und einzeln per `invoke` geschickt. Das kostet bis zu einen Frame (16 ms) zusätzlich bis zum Server.
8. **DPI-Skalierung.** Bei 125/150 % Windows-Skalierung streckt WebView2 das 1:1-Canvas. Das kostet Zeit und macht das Bild unscharf (im Spike nicht behandelt).

### Vorschlag für Phase 5 (RDP-01 ff.)
1. **Erst messen, dann bauen.** Paketkopf um Bildnummer und Zeitstempel erweitern. Die WebView meldet „gemalt“ zurück. So sehen wir die Ende-zu-Ende-Zeit (Update von IronRDP → gemalt) und die Länge der Warteschlange. Gegenprobe: `mstsc.exe` gegen denselben Docker-xrdp. Zieht auch das nach, liegt es am Testserver (Ursache 6). Zusätzlich einmal gegen einen echten Windows-RDP-Server messen.
2. **Flusskontrolle statt festem Takt.** Höchstens 1–2 Bilder unterwegs. Die WebView quittiert jedes gemalte Bild, und Rust sammelt in der Zwischenzeit die geänderten Rechtecke im Schattenpuffer („neuester Stand gewinnt“). Damit entsteht keine Warteschlange mehr, und der Windows-Timer (Ursache 5) spielt keine Rolle.
3. **Ein Flush = eine Nachricht, gemalt im `requestAnimationFrame`.** Alle Rechtecke eines Flushes in ein Paket, die WebView malt sie gesammelt beim nächsten Frame.
4. **WebGL2 statt `putImageData`.** Rechtecke per `texSubImage2D` in eine Textur laden und als Vollbild-Viereck zeichnen. Skalierung für DPI und „an Tab anpassen“ übernimmt der Shader. Die Umwandlung 0RGB → RGBA kann ebenfalls der Shader erledigen, dann spart Rust das Umkopieren (BGRA direkt übergeben).
5. **Weniger Daten.** Rechtecke feiner zusammenfassen (z. B. höchstens 25 % Verschnitt statt 100 %). Codec je Session wählbar (RemoteFX / verlustfrei), Standard je nach Messung gegen Windows.
6. **Langfristig H.264 (AVC420/444 über RDPGFX).** Komprimierte Daten über den Kanal schicken und in der WebView mit WebCodecs `VideoDecoder` (Hardware-Dekodierung in WebView2) entschlüsseln. Das senkt die Datenmenge um Größenordnungen. Vorher prüfen, wie weit IronRDP RDPGFX/H.264 unterstützt. Gegebenenfalls ist das Arbeit im Fork `deadsway/IronRDP`.
7. **Kein natives Fenster über der WebView** (ADR-4, „Airspace“). Nur falls 1–6 nicht reichen, als letzte Option neu bewerten.
8. **Zielwerte festlegen** (Vorschlag): Release-Build bei 1920×1080 mit ≥ 50 Bildern/s beim Fenster-Ziehen und ≤ 50 ms von Update bis gemalt, gemessen unter Windows.

## 5. Was in Phase 1 anders gemacht werden soll

### Aus dem Spike-Betrieb
- **Logik in Crates ohne Tauri.** SSH-/RDP-Ablauf in `ox-ssh`/`ox-rdp`, Rückfragen über ein Trait (z. B. `HostKeyVerifier`), Ereignisse über einen eigenen Typ per `mpsc`. `app/src-tauri` übersetzt nur noch.
- **IronRDP-Version:** zuerst prüfen, ob es ein neues crates.io-Release mit `picky ≥ rc.26` und `with_desktop_updates()` gibt. Sonst den Fork `deadsway/IronRDP` über `[patch.crates-io]` (laut CLAUDE.md), nicht die Git-Abhängigkeit des Spikes. Russh und IronRDP immer zusammen aktualisieren und den Abhängigkeitsbaum prüfen.
- **Geschwindigkeit nur im Release-Build messen.** CI-Profil ohne LTO für schnelle Release-Builds (siehe `NOTIZEN.md`).
- **Abbruchgründe selbst formulieren** (nicht „user initiated“ bei Serverabbruch).
- **Layout:** `min-height: 0` an Flex-Kindern mit Terminal/Canvas.

### Muster aus dem Spike-Code, die wir NICHT übernehmen (Review mit Subagent `code-reviewer`)
Nach Wichtigkeit sortiert. Pfade relativ zu `spikes/s1-ssh-rdp/`.

**Sicherheit und Projektregeln**
1. **Zugangsdaten als Konstanten** (`src-tauri/src/ssh.rs:18-19`, `rdp.rs:20-21`). → Passwort einmal von der Oberfläche an Rust, dort als `SecretString` (`zeroize`) mit eigenem `Debug` ohne Inhalt. Testpasswörter nur im Testcode, aus Umgebungsvariablen.
2. **TLS-Zertifikat ungeprüft, CredSSP fest aus** (`rdp.rs`). → Dialog mit SHA-256-Fingerprint über `CertificateValidationCallback` (synchron, Antwort auf eigenem Thread abwarten), Speichern in `rdp_certs.toml`, Warnung bei Änderung. NLA ist Standard, „ohne NLA“ nur als Option je Session (xrdp).
3. **Kein `known_hosts`, Auto-Modus akzeptiert jeden Host-Key** (`ssh.rs:108-116`). → `known_hosts` mit Status `unknown`/`changed`, Abgleich als reine, getestete Funktion in `ox-ssh`. Kein Auto-Modus in der App.
4. **Host-Key-Dialog: Fokus auf „Vertrauen“, nur zwei Knöpfe** (`src/HostKeyDialog.tsx:22`). → „Vertrauen und speichern / Nur diesmal / Abbrechen“. Fokus auf „Abbrechen“. Bei `changed` deutliche Warnung mit altem und neuem Fingerprint.
5. **CSP aus** (`tauri.conf.json`: `"csp": null`). → Strenge CSP (`default-src 'self'`).
6. **Capabilities pauschal** (`capabilities/default.json`: `core:default`, eigene Befehle für jedes Fenster). → Berechtigungen einzeln, eigene Befehle über das App-Manifest je Capability.

**Architektur und Rust**

7. **Protokolllogik hängt an `AppHandle`/`emit`/`app.state()`** (`ssh.rs:86-279`, `rdp.rs:311-450`). → siehe „Logik in Crates ohne Tauri“ oben.
8. **Fehler als `String`, Fehlerkette per `format!("{e:#}")` an die Oberfläche** (`ssh.rs:167`, `rdp.rs:384-389`). → `thiserror`-Enums in den Crates. Die App macht daraus eine kurze deutsche Meldung, die Kette geht nur ins Log.
9. **IDs als Zähler, `session_close` probiert „erst RDP, dann SSH“** (`ssh.rs:36-40`, `rdp.rs:146`, `lib.rs:52`). → UUIDs (Skill `tauri-schnittstelle`) und eine gemeinsame `SessionRegistry` mit Enum für die Session-Art.
10. **Tasks/Threads ohne `JoinHandle`, Panic-Abfang und `CancellationToken`; Schließen per `try_send(Close)`, das bei voller Queue scheitert** (`ssh.rs:162`, `rdp.rs:57,166-182`). → Token und Handle je Session. Eine Panic führt zu `session://closed` und zum Aufräumen.
11. **Ein gemeinsamer 150-s-Timeout für TCP, Handshake und Dialog, keiner für Anmeldung und RDP-Aufbau** (`ssh.rs:207-215`). → Getrennte Zeitlimits: Verbindung ~15 s, Anmeldung, Rückfrage 120 s (läuft nur während der Rückfrage).
12. **Slice-Zugriff ohne Bereichsprüfung bei Server-Rechtecken** (`rdp.rs:259-261`). Ein Rechteck außerhalb des Bilds führt zur Panic. → Mit Clipping und `get()`, Tests für Randfälle.
13. **`ssh_write` ist async** (`ssh.rs:282`). Tauri führt async-Befehle nebenläufig aus, schnelle Eingaben könnten die Reihenfolge tauschen. → Synchroner Befehl wie `rdp_input` oder Sequenznummer.
14. **Jedes SSH-Paket einzeln über den Kanal, ohne Gegendruck** (`ssh.rs:253`). → Ausgabe alle ~8–16 ms bündeln, Bündelgröße begrenzen (vgl. Abschnitt 4 für RDP).
15. **`try_send` verwirft Eingaben bei voller Queue, auch das Loslassen von Tasten** (`rdp.rs:565-568`) → klemmende Tasten. → Loslassen und `releaseAll` nie verwerfen, nur Mausbewegungen zusammenfassen.
16. **`expect` in `run()`, `unwrap_or(0/MAX)` verdeckt Fehler** (`lib.rs:83`, `rdp.rs:290,459,507`). → Clippy-Lints `unwrap_used`/`expect_used`, echte Fehler zurückgeben.
17. **Verhalten über Umgebungsvariablen, Tastaturlayout `0x0409` und Client-Daten fest** (`lib.rs:28`, `rdp.rs:117-131`). → Einstellungen und Session-Profil, Layout vom System. Umgebungsvariablen nur in Tests.
18. **Session-Ereignisse per `app.emit` an alle, jeder Tab filtert selbst** (`rdp.rs:347,368,437`, `ssh.rs:199,212`). → Status je Session über einen eigenen Kanal oder `emit_to`. Global bleiben nur Rückfragen und `session://closed`. Im Skill `tauri-schnittstelle` eintragen.

**Oberfläche**

19. **`onHostKey` filtert nicht nach `sessionId`** (`src/SshTab.tsx:91`). Bei mehreren Tabs zeigt jeder den Dialog. → Rückfragen zentral im Store, nach `sessionId` zugeordnet.
20. **Zustand in Refs, gerendert ohne Neuzeichnen** (`SshTab.tsx:36-38`, `RdpTab.tsx:47-48,233`). → Sessions in einem Store.
21. **`.catch(() => {})` verschluckt Fehler** (`SshTab.tsx:58,76`, `RdpTab.tsx:65,166`). → Loggen bzw. in der Statuszeile zeigen.
22. **DPI ignoriert** (`RdpTab.tsx:114-127`, `rdp.rs:586` `scale_factor: 100`). → `devicePixelRatio` beachten, Skalierungsfaktor an RDP übergeben.
23. **Resize ohne Entprellen, kein `attachCustomKeyEventHandler`, Texte und Farben fest im Code** (`SshTab.tsx:58`). → ~50 ms entprellen (Skill), i18n, CSS-Variablen.

### Muster, die wir übernehmen
- Rohbytes über `InvokeResponseBody::Raw`, Paketformat mit 16-Byte-Kopf und Tests dazu (`rdp.rs:708-760`).
- Schattenpuffer, Zusammenfassen geänderter Rechtecke, gedrosseltes Senden. RDP-Protokoll auf eigenem Thread mit current-thread-Runtime (Muster aus `ironrdp-viewer`).
- Rückfrage per `oneshot` mit Zeitlimit und Aufräumen, keine Antwort = ablehnen.
- Nach jedem Sitzungsende aufräumen und `session://closed` senden.
- `rdp_input` synchron (Reihenfolge), `KeyboardEvent.code` → Scancode-Tabelle, `ironrdp_input::Database`, `releaseAll` bei Blur und Tabwechsel.
- Eingaben prüfen (Adresslänge, Größe 200–8192, gerade Breite, cols/rows ≤ 1000, Koordinaten begrenzt).
- `tracing` mit Feld `session_id`, ohne Geheimnisse. Begrenzte Queues.
- Typisierte Wrapper in `src/api.ts` (Phase 1: je Bereich eine Datei), Tabs bleiben gemountet, `ResizeObserver` mit Aufräumen, nicht-passiver Wheel-Listener, `resizeCanvas` erhält den Inhalt.

## 6. Offene Risiken für spätere Phasen

| Risiko | Bewertung | Wann klären |
|---|---|---|
| **NLA (CredSSP) gegen einen echten Windows-Rechner** | **Hoch, ungetestet.** Nur gegen den IronRDP-Beispielserver geprüft (Handshake ok). xrdp kann kein NLA, Etappe D hatte kein Windows-RDP-Ziel. Ohne NLA funktioniert RDP gegen die meisten Windows-Rechner nicht. Mögliche Stolpersteine: NTLM/Kerberos in `sspi`, Domänenkonten, Kennwort mit Sonderzeichen, CredSSP-Version. | **Entschieden:** in Phase 5 vor dem Bau des RDP-Tabs. Ziel: Windows-VM oder Rechner mit aktiviertem Remotedesktop, Spike mit `with_credssp(true)` |
| RDP-Zertifikatsprüfung | Mittel. Haken `CertificateValidationCallback` existiert, ist aber synchron. Die Antwort aus dem Dialog muss auf einem eigenen Thread abgewartet werden. | Phase 5 (RDP-01) |
| IronRDP-Version / Abhängigkeitskonflikt mit russh | Mittel. crates.io-Release unbrauchbar, Spike auf Git-Commit. Jedes Update von russh oder IronRDP kann die Krypto-Pins wieder kollidieren lassen. | Phase 1 (Workspace) und bei jedem Update (`upstream-watcher`) |
| Leichtes Nachziehen bei RDP, größere Auflösungen (1080p, 4K) | Mittel. Ursachen und Plan in Abschnitt 4. Bei 1920×1080 ist die Datenmenge ~3-mal so groß wie im Test. | Phase 5 |
| H.264/AVC (RDPGFX) | Mittel. Unterstützung in IronRDP prüfen. Für gute Leistung gegen Windows-Server wahrscheinlich nötig. | Phase 5 |
| Mehrfachmonitor | Mittel. Vom Canvas-Ansatz nicht abgedeckt (ADR-4). Ausweg „in Remotedesktopverbindung öffnen“. | Phase 5 |
| Dynamische Auflösung gegen Windows | Gering bis mittel. xrdp nimmt Display Control nicht an, IronRDP verbindet neu. Gegen Windows sollte Display Control greifen, ungetestet. | Phase 5 |
| DPI-Skalierung unter Windows | Mittel. Canvas 1:1 in CSS-Pixeln, unscharf bei 125/150 %. Koordinaten müssen umgerechnet werden. | Phase 1 (Terminal), Phase 5 (RDP) |
| Tastatur: deutsches Layout, AltGr, tote Tasten, IME | Mittel. Der Spike meldet US-Layout (0x0409). Eingabe unter Windows funktioniert grundsätzlich, Sonderfälle nicht gezielt geprüft. | Phase 1 (SSH), Phase 5 (RDP) |
| Build-Abhängigkeiten NASM/CMake (`aws-lc-sys`) | Gering. Unter Windows funktioniert es. In der CI (Windows-Runner) und in der Bauanleitung einplanen. | Phase 1 (CI) |
| WebView2-Durchsatz über `Channel` | Gering bis mittel. Nur unter WebKitGTK gemessen. | Phase 5, Messung aus Abschnitt 4 |
| `vim` im Windows-Testserver | Gering. Jetzt mit `vim-tiny` vorhanden, aber noch nicht getestet. Die DoD von Phase 1 nennt auch `htop` und `mc`. Beide sind jetzt in `cloud/setup.sh` und `testing/sshd/Dockerfile` ergänzt, aber noch nicht getestet. | Phase 1 |

## 7. Screenshots

Alle unter `screenshots/` (Cloud, Xvfb):

| Datei | Inhalt |
|---|---|
| `a-geruest.png` | Gerüst mit beiden Tabs und Statuszeile |
| `b1-prompt.png` | SSH-Prompt, Fingerprint in der Statuszeile |
| `b2-hostkey-dialog.png`, `b2-hostkey-abgelehnt.png`, `b2-hostkey-vertraut.png` | Host-Key-Dialog, Ablehnen, Vertrauen |
| `b3-ls-unicode.png` | `ls -la /` und Unicode-Test |
| `b4-top.png`, `b4-vim-resize.png` | `top`, `vim` nach Größenänderung (99×25) |
| `b5-durchsatz.png` | `seq 1 500000` |
| `b6-abbruch.png`, `b6-trennen-und-server-aus.png` | Verbindungsabbruch, Trennen, Server aus |
| `c1-desktop.png` | xrdp-Desktop mit `OPENXTERM-RDP-TEST` |
| `c2-eingabe.png` | `echo spike-ok` per Maus und Tastatur im RDP-Bild |
| `c3-tabwechsel.png` | Bild bleibt nach Tabwechsel erhalten |
| `c4-bewegung.png`, `c4b-bewegung-ohne-remotefx.png` | Fenster-Ziehen mit RemoteFX (Spuren, 42 MiB/s) und ohne (sauber, 23 MiB/s) |
| `c5-resize.png` | Neue Auflösung nach Größenänderung |
| `c6-abbruch.png` | RDP-Verbindungsabbruch |

Windows-Screenshots aus Etappe D liegen nicht vor.
