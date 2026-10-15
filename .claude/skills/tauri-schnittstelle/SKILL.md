---
name: tauri-schnittstelle
description: Vertrag zwischen Oberfläche (TypeScript) und Rust in OpenXterm – Tauri-Befehle (invoke), Kanäle (tauri::ipc::Channel) für Datenströme, Ereignisse, Binärformate für Terminal- und RDP-Daten. Verwenden beim Hinzufügen oder Ändern von Befehlen, Kanälen oder Ereignissen auf einer der beiden Seiten.
---

# Schnittstelle Oberfläche ↔ Rust

## Wann was
| Weg | Wofür | Regel |
|---|---|---|
| **Befehl** `#[tauri::command]` / `invoke()` | Aktionen mit Antwort | Parameter und Rückgabe als serde-Typen; Fehler als `Result<T, String>` mit deutscher Meldung |
| **Kanal** `tauri::ipc::Channel` | Datenströme Rust → Oberfläche | große Daten **als Rohbytes**, nie als JSON-Zahlenfeld |
| **Ereignis** `emit` / `listen` | seltene, globale Meldungen | kleine JSON-Objekte |

## Namensregeln
- Befehle: `<bereich>_<verb>` in snake_case: `ssh_connect`, `ssh_write`, `ssh_resize`, `rdp_connect`, `rdp_input`, `session_close`.
- Ereignisse: `<bereich>://<was>`: `ssh://host-key`, `rdp://certificate`, `session://closed`.
- Jede Verbindung hat eine `session_id` (UUID als String), die die Oberfläche bei jedem Aufruf mitgibt.

## Binärformate
**Terminal-Ausgabe** (Kanal): reine Bytes vom Server, unverändert. Die Oberfläche übergibt sie als `Uint8Array` an `term.write()` – UTF-8-Zeichen können über Paketgrenzen geteilt sein, xterm.js kommt damit zurecht.

**Terminal-Eingabe** (Befehl `…_write`): Bytes als `Vec<u8>` bzw. String aus `term.onData`.

**RDP-/VNC-Bild** (Kanal), ein Paket je geändertem Rechteck:
```
Offset  Länge  Inhalt
0       4      x      (u32, little endian)
4       4      y      (u32, LE)
8       4      width  (u32, LE)
12      4      height (u32, LE)
16      w*h*4  Pixel RGBA, zeilenweise
```
Oberfläche: `new ImageData(new Uint8ClampedArray(buf, 16), w, h)` → `ctx.putImageData(img, x, y)`.
Viele kleine Rechtecke in Rust zu wenigen größeren zusammenfassen und höchstens ~60-mal pro Sekunde senden.

**Rohbytes senden (Rust):** Parameter vom Typ `tauri::ipc::Channel<tauri::ipc::InvokeResponseBody>`, senden mit `channel.send(InvokeResponseBody::Raw(bytes))` – in der Oberfläche kommt ein `ArrayBuffer` an. (Im Quelltext von Tauri 2.12 geprüft; bei neueren Versionen kurz gegenprüfen.)

## Rückfragen an den Nutzer
Muster für Host-Key, RDP-Zertifikat, Passwort, 2FA:
1. Rust erzeugt `request_id`, legt einen `oneshot::Sender` in einer Map ab, sendet Ereignis (`ssh://host-key` mit `request_id`, Host, Algorithmus, SHA256-Fingerprint, Status `unknown|changed`).
2. Oberfläche zeigt Dialog und ruft `prompt_answer(request_id, antwort)`.
3. Rust wartet mit Zeitlimit (z. B. 120 s); ohne Antwort → Abbruch.

## Sicherheit
- Passwörter gehen nur **einmal** von der Oberfläche nach Rust (bei Eingabe) und nie zurück.
- Befehle prüfen alle Parameter (Ports, Pfade, Längen).
- Tauri-Berechtigungen (`capabilities/`) so eng wie möglich: nur die Befehle freigeben, die das Fenster braucht.

## Pflege
Neue oder geänderte Befehle/Kanäle/Ereignisse **hier eintragen** und auf beiden Seiten gleichzeitig ändern. Ab Phase 1 gehören die TypeScript-Typen in `app/src/api/` (eine Datei je Bereich).
