---
name: sicherheit
description: Sicherheitsregeln für Passwörter, Passphrasen, Schlüssel, Tresor/Master-Passwort, SSH-Host-Keys, RDP-Zertifikate, Tunnel, Server und Netzzugriffe in OpenXterm. Verwenden bei allem, was Zugangsdaten, Verbindungsaufbau, Kryptografie, Dienste oder Registry berührt.
---

# Sicherheit in OpenXterm

## Zugangsdaten
- Geheimnisse leben nur im Rust-Teil. Die Oberfläche sendet ein eingegebenes Passwort **einmal** an Rust und bekommt es nie zurück; gespeicherte Passwörter kennt sie nur als ID.
- Speichern nur nach Zustimmung (Dialog „Speichern / Nicht speichern / Nie für diesen Server“).
- Nie loggen, nie in Fehlermeldungen, nie in Fenstertitel. Typen mit Geheimnissen: `secrecy::SecretString` bzw. `zeroize`, eigenes `Debug` ohne Inhalt.

## Tresor
- Mit Master-Passwort: Schlüssel per **Argon2id** (zufälliges Salt, Parameter in der Datei gespeichert) → **AES-256-GCM** (zufällige Nonce je Eintrag). Bibliotheken: `argon2`, `aes-gcm` (RustCrypto).
- Ohne Master-Passwort: **DPAPI** (`CryptProtectData`, Benutzerbindung) über das `windows`-Crate – auf einem anderen Rechner nicht entschlüsselbar; das in der Oberfläche erklären.
- Krypto nie selbst erfinden. Dateiformat versionieren (`v1`).
- Master-Passwort prüfen über einen verschlüsselten Testwert, nicht über einen Hash des Passworts.

## SSH-Host-Keys
- In `check_server_key` (russh) **immer** prüfen. Unbekannt → Dialog mit SHA256-Fingerprint: „Vertrauen und speichern / Nur diesmal / Abbrechen“. Geändert → deutliche Warnung mit altem und neuem Fingerprint, Standard „Abbrechen“.
- Ablage in eigener `known_hosts`-Datei (OpenSSH-Format, `[host]:port` bei Nicht-Standard-Port).
- Kein „alle akzeptieren“ außerhalb von Spikes.

## RDP-Zertifikate
- `ironrdp-client` prüft TLS-Zertifikate standardmäßig **nicht**. OpenXterm muss das selbst tun: Zertifikat-Fingerprint (SHA-256) beim ersten Kontakt per Dialog bestätigen und speichern (`rdp_certs.toml`), bei Änderung warnen. Alternativ die strenge Prüfung von IronRDP (`CertificateValidation::Strict`) für Server mit gültigem Zertifikat anbieten.
- NLA (CredSSP) ist Standard; „ohne NLA“ nur als bewusste Option je Session.

## Netz und Dienste
- Keine Verbindung ohne Nutzeraktion. Update-Prüfung nur auf Klick.
- Tunnel und Server binden standardmäßig an `127.0.0.1`; `0.0.0.0` nur mit ausdrücklicher Bestätigung.
- Server zeigen beim Start, worauf sie lauschen und was freigegeben ist; unverschlüsselte Dienste (FTP, Telnet) kennzeichnen.
- Unsichere Protokolle bleiben verfügbar, aber abschaltbar (SEC-06).

## Tauri
- Content-Security-Policy in `tauri.conf.json` setzen; keine fremden Skripte/CDNs, alles lokal gebündelt.
- `capabilities/` so eng wie möglich; keine Dateisystem- oder Shell-Rechte für das Frontend, die es nicht braucht.
- Befehle prüfen alle Eingaben (Längen, Ports, Pfade).

## Registry und System
- Keine Registry-Einträge ohne ausdrückliche Aktion (nur HKCU). Keine Adminrechte anfordern.

## Tests
- Nur gegen Wegwerf-Testserver (`testing/`). Testpasswörter nur im Testcode.
- Tresor: Rundlauf-Tests und Tests mit festen Testvektoren; Test, dass falsches Master-Passwort sauber scheitert.
