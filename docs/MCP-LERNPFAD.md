# MCP-Lernpfad

MCP (Model Context Protocol) ist der offene Standard, über den Claude Code externe Werkzeuge nutzt. Die Grundidee steht in `GRUNDLAGEN.md`, Kapitel 4. Hier lernst du MCP in vier Stufen: **nutzen → beobachten → selbst bauen → bewusst einsetzen**.

---

## Stufe 1 – MCP nutzen (ab Phase 0)

Die Datei `.mcp.json` im Projekt definiert zwei Server. Weil sie im Repository liegt, gilt sie für alle, die das Projekt öffnen (Scope „project“). Claude Code fragt beim ersten Start, ob du sie zulassen willst.

| Server | Transport | Wozu in OpenXterm |
|---|---|---|
| `context7` | HTTP (remote) | aktuelle Doku zu Bibliotheken: Tauri, russh, IronRDP, xterm.js, React |
| `microsoft-learn` | HTTP (remote, ohne Anmeldung) | Windows-APIs: ConPTY, DPAPI, WebView2, Registry |

Beide laufen über HTTP und funktionieren deshalb unter Windows und in der Cloud gleich. Context7 funktioniert ohne Schlüssel; ein kostenloser API-Schlüssel erhöht die Limits.

**GitHub?** Dafür reicht in diesem Projekt die GitHub CLI (`gh`), die lokal und in der Cloud vorhanden ist. Einen GitHub-MCP-Server kannst du später als Übung hinzufügen.

> 💡 **Warum HTTP-Server bevorzugen?** Lokale (stdio-)Server werden als Programm gestartet – unter Windows z. B. über `cmd /c npx …`, unter Linux direkt mit `npx …`. Eine einzige `.mcp.json` für beide Welten ist mit HTTP-Servern einfacher.

Übungen:
1. `claude` starten, `/mcp` – Status ansehen, Server freigeben.
2. *„Welche Werkzeuge hat context7? Nenne Namen und Parameter.“*
3. *„Suche mit context7, wie man in Tauri 2 Rohbytes über einen Channel an das Frontend schickt.“* Beobachte den Werkzeugaufruf.
4. Dieselbe Frage einmal ohne MCP stellen (`/mcp` → Server deaktivieren) und die Antworten vergleichen.

Weitere Server per Kommandozeile:

```powershell
claude mcp add --transport http <name> <url>              # remote
claude mcp add --scope user <name> -- cmd /c npx -y <paket> # lokal unter Windows, nur für dich
claude mcp list
claude mcp remove <name>
```

---

## Stufe 2 – Beobachten, was passiert

Der **MCP Inspector** spricht einen Server direkt an und zeigt jede JSON-Nachricht:

```powershell
npx @modelcontextprotocol/inspector
```

Im Browser öffnet sich eine Oberfläche. Verbinde dich mit `https://learn.microsoft.com/api/mcp` (Transport „Streamable HTTP“), rufe `tools/list` auf und dann ein Werkzeug. Achte auf:

- `initialize`: Client und Server handeln Protokollversion und Fähigkeiten aus.
- `tools/list`: Jedes Werkzeug hat `name`, `description` und ein `inputSchema` (JSON Schema). **An der Beschreibung entscheidet Claude, ob es das Werkzeug nutzt** – genau wie bei Skills.
- `tools/call`: Das Ergebnis ist eine Liste von Inhalten (meist Text).

---

## Stufe 3 – Eigener MCP-Server in Rust (Phase 7)

Für Rust gibt es ein offizielles MCP-SDK. Wir schreiben den ersten Server trotzdem **von Hand** – nur mit `serde_json`. So siehst du, dass MCP aus wenigen JSON-Nachrichten besteht. Danach kannst du ihn als Übung auf das SDK umstellen.

Der Server `oxdev-mcp` ist ein Entwicklerwerkzeug, **nicht** Teil der ausgelieferten App. Er gibt Claude zwei Werkzeuge:

| Tool | Zweck |
|---|---|
| `feature_status(prefix?)` | Fortschritt aus `docs/FEATURES.md` zählen |
| `tail_app_log(lines?)` | letzte Zeilen des Debug-Logs von OpenXterm |

Regeln für stdio-Server:
- **Eine JSON-Nachricht pro Zeile**, nur `\n` als Zeilenende.
- **stdout gehört nur dem Protokoll.** Jede andere Ausgabe nach stderr (`eprintln!`) – ein einziges `println!` zerstört die Verbindung.
- Nachrichten ohne `id` sind Benachrichtigungen und bekommen keine Antwort.
- Fehler eines Werkzeugs als normales Ergebnis mit `"isError": true`, damit Claude darauf reagieren kann; Protokollfehler (unbekannte Methode) als JSON-RPC-Fehler.

### `tools/oxdev-mcp/Cargo.toml`

```toml
[package]
name = "oxdev-mcp"
version = "0.1.0"
edition = "2021"
publish = false

[dependencies]
serde_json = "1"
```

### `tools/oxdev-mcp/src/main.rs`

Getestet mit Rust 1.97 (Oktober 2026).

```rust
//! Minimaler MCP-Server (stdio, JSON-RPC 2.0) für die OpenXterm-Entwicklung.
//!
//! Absichtlich ohne MCP-SDK geschrieben, damit sichtbar wird, wie wenig
//! hinter dem Protokoll steckt. Regeln für stdio-Server:
//! - eine JSON-Nachricht pro Zeile,
//! - stdout gehört ausschließlich dem Protokoll, Diagnose geht nach stderr,
//! - Nachrichten ohne `id` sind Benachrichtigungen und bekommen keine Antwort.

use serde_json::{json, Value};
use std::io::{self, BufRead, Write};
use std::path::PathBuf;

const DEFAULT_PROTOCOL_VERSION: &str = "2025-06-18";

fn project_dir() -> PathBuf {
    std::env::var_os("CLAUDE_PROJECT_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
}

fn log(msg: &str) {
    eprintln!("[oxdev-mcp] {msg}");
}

// ---------- Tools ----------

/// Zählt in docs/FEATURES.md die Status-Symbole, optional nur für ein ID-Präfix.
fn feature_status(args: &Value) -> Result<String, String> {
    let prefix = args.get("prefix").and_then(Value::as_str).unwrap_or("").to_uppercase();
    let file = project_dir().join("docs").join("FEATURES.md");
    let text = std::fs::read_to_string(&file).map_err(|e| format!("{}: {e}", file.display()))?;
    let (mut open, mut busy, mut done, mut paused) = (0, 0, 0, 0);
    for line in text.lines() {
        // Tabellenzeilen beginnen mit "| ID-NUMMER |"
        let Some(id) = line.strip_prefix("| ").and_then(|l| l.split(" |").next()) else { continue };
        if !id.contains('-') || !id.starts_with(&prefix) {
            continue;
        }
        if line.contains('⬜') { open += 1 }
        else if line.contains('🟨') { busy += 1 }
        else if line.contains('✅') { done += 1 }
        else if line.contains('⏸') { paused += 1 }
    }
    Ok(format!(
        "Präfix \"{prefix}\": {open} offen, {busy} in Arbeit, {done} fertig, {paused} zurückgestellt"
    ))
}

/// Gibt die letzten Zeilen des Debug-Logs der App zurück.
fn tail_app_log(args: &Value) -> Result<String, String> {
    let lines = args.get("lines").and_then(Value::as_u64).unwrap_or(50).clamp(1, 500) as usize;
    let file = project_dir().join("logs").join("openxterm.log");
    let text = std::fs::read_to_string(&file)
        .map_err(|_| format!("Keine Logdatei gefunden: {}", file.display()))?;
    let all: Vec<&str> = text.lines().collect();
    Ok(all[all.len().saturating_sub(lines)..].join("\n"))
}

fn tool_list() -> Value {
    json!([
        {
            "name": "feature_status",
            "description": "Zählt in docs/FEATURES.md offene, laufende und fertige Features. Optional nur für ein ID-Präfix wie SSH oder RDP.",
            "inputSchema": {
                "type": "object",
                "properties": { "prefix": { "type": "string", "description": "ID-Präfix, z. B. SSH" } }
            }
        },
        {
            "name": "tail_app_log",
            "description": "Gibt die letzten Zeilen des Debug-Logs von OpenXterm zurück (logs/openxterm.log im Projekt).",
            "inputSchema": {
                "type": "object",
                "properties": { "lines": { "type": "integer", "description": "Anzahl Zeilen, 1 bis 500" } }
            }
        }
    ])
}

// ---------- Dispatcher ----------

/// Bearbeitet eine Nachricht. `None` = keine Antwort (Benachrichtigung).
fn handle(req: &Value) -> Option<Value> {
    let id = req.get("id")?.clone();
    let method = req.get("method").and_then(Value::as_str).unwrap_or("");
    let params = req.get("params").cloned().unwrap_or(json!({}));

    let result = match method {
        "initialize" => json!({
            "protocolVersion": params.get("protocolVersion").and_then(Value::as_str).unwrap_or(DEFAULT_PROTOCOL_VERSION),
            "capabilities": { "tools": {} },
            "serverInfo": { "name": "oxdev-mcp", "version": env!("CARGO_PKG_VERSION") }
        }),
        "ping" => json!({}),
        "tools/list" => json!({ "tools": tool_list() }),
        "tools/call" => {
            let name = params.get("name").and_then(Value::as_str).unwrap_or("");
            let args = params.get("arguments").cloned().unwrap_or(json!({}));
            let outcome = match name {
                "feature_status" => feature_status(&args),
                "tail_app_log" => tail_app_log(&args),
                _ => {
                    return Some(json!({"jsonrpc": "2.0", "id": id,
                        "error": {"code": -32602, "message": format!("Unbekanntes Tool: {name}")}}))
                }
            };
            // Werkzeugfehler gehen als normales Ergebnis mit isError zurück,
            // damit Claude den Fehler lesen und darauf reagieren kann.
            let (text, is_error) = match outcome {
                Ok(t) => (t, false),
                Err(e) => (e, true),
            };
            json!({ "content": [{ "type": "text", "text": text }], "isError": is_error })
        }
        _ => {
            return Some(json!({"jsonrpc": "2.0", "id": id,
                "error": {"code": -32601, "message": format!("Methode nicht gefunden: {method}")}}))
        }
    };
    Some(json!({ "jsonrpc": "2.0", "id": id, "result": result }))
}

fn main() {
    log(&format!("gestartet, Projekt: {}", project_dir().display()));
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    for line in stdin.lock().lines() {
        let Ok(line) = line else { break };
        if line.trim().is_empty() {
            continue;
        }
        let req: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                log(&format!("Ungültiges JSON: {e}"));
                continue;
            }
        };
        if let Some(resp) = handle(&req) {
            // genau eine Zeile pro Antwort
            writeln!(stdout, "{resp}").ok();
            stdout.flush().ok();
        }
    }
    log("beendet");
}
```

### Bauen und testen

```powershell
cd tools\oxdev-mcp
cargo build --release
```

Von Hand testen (PowerShell 7):

```powershell
'{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1"}}}',
'{"jsonrpc":"2.0","id":2,"method":"tools/list"}',
'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"feature_status","arguments":{"prefix":"SSH"}}}' |
  .\target\release\oxdev-mcp.exe
```

Erwartete dritte Antwort (am Projektstart): `Präfix "SSH": 21 offen, 0 in Arbeit, 0 fertig, 0 zurückgestellt`.

Danach im MCP Inspector („STDIO“, Befehl `target\release\oxdev-mcp.exe`) und schließlich in Claude Code registrieren:

```powershell
claude mcp add oxdev -- C:\dev\OpenXterm\tools\oxdev-mcp\target\release\oxdev-mcp.exe
```

Frage Claude: *„Wie weit sind wir mit den RDP-Features?“* – es sollte `feature_status` mit `prefix: "RDP"` aufrufen.

### Übungen
1. Ein Werkzeug `list_sessions` ergänzen, das Session-Namen aus einer Test-Konfiguration liest (ohne Passwörter!).
2. Absichtlich `println!("debug")` einbauen und beobachten, wie die Verbindung bricht. Dann zurück zu `eprintln!`.
3. Eine **Resource** anbieten (`resources/list`, `resources/read`, z. B. `features://summary`) und den Unterschied zu einem Tool verstehen: Ressourcen sind Inhalte, die der Client lesen kann, Tools sind Aktionen.
4. Die Werkzeugbeschreibung absichtlich vage formulieren und beobachten, ob Claude das Werkzeug dann noch findet.
5. Den Server auf das offizielle Rust-MCP-SDK umstellen und vergleichen, was das SDK dir abnimmt.

> 💡 **Warum gerade diese Werkzeuge?** Sie lösen ein echtes Problem: Claude sieht das Laufzeitlog der Windows-App nicht von selbst. Mit `tail_app_log` kann es nach einem Testlauf selbst nachsehen, was passiert ist.

---

## Stufe 4 – Bewusst einsetzen

- **Wann MCP, wann Skill, wann Kommandozeile?** Reicht ein Befehl im Terminal (`gh run view`), braucht es kein MCP. MCP lohnt sich, wenn Daten strukturiert und wiederholt gebraucht werden oder nicht per Shell erreichbar sind. Ein Skill kann beschreiben, *wann* Claude welches MCP-Werkzeug nutzen soll.
- **Plugins:** Später kannst du `oxdev-mcp` zusammen mit unseren Skills und Agenten als Plugin verpacken.
- **Sicherheit:** Jeder MCP-Server läuft mit deinen Rechten bzw. deinem Token. Nur vertrauenswürdige Server, minimale Rechte, Tokens nie in Dateien.
- **Ausblick:** OpenXterm selbst könnte einen MCP-Server anbieten, über den Agenten Sessions steuern. IronRDP hat dafür übrigens schon ein Gegenstück (`ironrdp-agent`, ein RDP-Client für KI-Agenten). Vorher braucht es ein Sicherheitskonzept (Freigabe je Session, Bestätigung je Befehl, Protokollierung) – ein gutes Thema für eine eigene Spec nach Phase 8.
