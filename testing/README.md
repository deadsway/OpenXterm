# Testumgebung

Wegwerf-Server, gegen die OpenXterm (und der Spike) getestet wird. **Nur für Tests** – feste Passwörter, selbstsignierte Zertifikate, nur an `127.0.0.1` gebunden.

| Was | Cloud-Sitzung / Linux | Windows-PC (Docker Desktop) |
|---|---|---|
| Starten | `bash testing/testenv.sh start` | `docker compose -f testing/compose.yaml up -d --build` |
| Stoppen | `bash testing/testenv.sh stop` | `docker compose -f testing/compose.yaml down` |
| SSH | `127.0.0.1:2222`, tester / tester | `127.0.0.1:2222`, tester / tester |
| RDP (xrdp) | `127.0.0.1:3389`, tester / tester | `127.0.0.1:3390`, tester / tester |
| Screenshot einer App | `bash testing/shot.sh out.png 15 <programm>` | – (du siehst den Bildschirm ja selbst) |
| App bedienen (klicken, tippen, Screenshots) | `bash testing/ui-session.sh start` … siehe Kopf des Skripts | – |

Wichtig für RDP:
- **xrdp kann kein NLA (CredSSP).** Der Client muss TLS ohne CredSSP verwenden und die automatische Anmeldung (`autologon`) setzen, sonst erscheint der xrdp-Anmeldedialog.
- Erfolgreich ist der Test, wenn auf dem Bild ein grüner Desktop mit einem Terminalfenster und dem Text `OPENXTERM-RDP-TEST` zu sehen ist.
- NLA testest du gegen einen echten Windows-Rechner – oder gegen den Beispielserver aus IronRDP (`cargo run --example=server -- --sec hybrid --cert … --key …`).

Geprüft (Oktober 2026): `testenv.sh`, `shot.sh` und `ui-session.sh` auf Ubuntu 24.04 (Tauri-2-App unter Xvfb bedient, Eingabe kam bis in Rust an); IronRDP 0.17 verbindet sich mit xrdp 0.9.24 per TLS mit Autologon und dekodiert den Desktop. Die Dockerfiles verwenden dieselbe Konfiguration, wurden aber noch nicht als Container gebaut.
