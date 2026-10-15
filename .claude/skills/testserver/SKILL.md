---
name: testserver
description: Wegwerf-Testserver für SSH und RDP (xrdp) in OpenXterm – starten, Zugangsdaten, Ports, Eigenheiten (xrdp ohne NLA, Autologon, Erkennungstext) und Integrationstests dagegen. Verwenden bei allen Tests von SSH, SFTP, Tunneln oder RDP.
---

# Testserver

| | Cloud / Linux | Windows (Docker Desktop) |
|---|---|---|
| Start | `bash testing/testenv.sh start` | `docker compose -f testing/compose.yaml up -d --build` |
| Stopp | `bash testing/testenv.sh stop` | `docker compose -f testing/compose.yaml down` |
| SSH | `127.0.0.1:2222` | `127.0.0.1:2222` |
| RDP | `127.0.0.1:3389` | `127.0.0.1:3390` |
| Benutzer | `tester` / `tester` | `tester` / `tester` |

Umgebungsvariablen für Code und Tests: `OX_SSH_ADDR`, `OX_RDP_ADDR` (Standard: Cloud-Werte).

## SSH
- `testenv.sh start` gibt den **SHA256-Fingerprint** des Host-Keys aus – damit prüfst du den Host-Key-Dialog.
- SFTP ist aktiv (`internal-sftp`).

## RDP (xrdp)
- **Kein NLA/CredSSP.** Client: TLS an, CredSSP aus, **Autologon an** – sonst erscheint der Anmeldedialog von xrdp.
- Nach der Anmeldung: grüner Desktop, Terminalfenster mit `OPENXTERM-RDP-TEST`. Das ist das Erfolgskriterium im Screenshot.
- Der Desktop sendet laufend Updates (blinkender Cursor). Code, der auf „keine Aktivität mehr“ wartet, endet deshalb nie – Zeitlimit verwenden.
- Geprüft: IronRDP 0.17 ↔ xrdp 0.9.24 (TLS, Autologon) funktioniert.

## NLA testen
- Ohne Windows: Beispielserver aus IronRDP mit Zertifikat:
  ```bash
  openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/k.pem -out /tmp/c.pem -days 7 -subj "/CN=localhost"
  # im IronRDP-Quelltext:
  cargo run -p ironrdp --example=server --features "cliprdr,connector,rdpsnd,server" -- \
    --bind-addr 127.0.0.1:3390 --cert /tmp/c.pem --key /tmp/k.pem --user tester --pass tester --sec hybrid
  ```
  Ohne `--cert/--key` wählt der Server Standard-RDP-Sicherheit und NLA scheitert. Der Handshake klappt; der Demo-Server beendet danach die Sitzung.
- Echt: gegen einen Windows-Rechner – nur der Nutzer lokal.

## Regeln
- Testserver nur an `127.0.0.1`. Nie Ports nach außen öffnen.
- Integrationstests markieren (`#[ignore = "braucht testing/testenv.sh"]`) und vorher prüfen, ob der Port offen ist; sonst mit klarer Meldung überspringen.
