// PreToolUse-Hook: blockiert Schreibzugriffe auf geschützte Pfade.
//
// Claude Code übergibt die Ereignisdaten als JSON auf stdin.
// Exit-Code 2 = Aktion blockieren. Was auf stderr steht, bekommt Claude als
// Begründung zu sehen und kann darauf reagieren.
//
// In Node.js geschrieben, damit derselbe Hook unter Windows und in
// Linux-Cloud-Sitzungen läuft (Node ist an beiden Orten vorhanden).

import { readFileSync } from "node:fs";
import path from "node:path";

let payload;
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0); // ohne lesbare Daten nichts blockieren
}

const input = payload.tool_input ?? {};
const target = input.file_path ?? input.notebook_path;
if (!target) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
const rel = path.relative(root, path.resolve(root, target)).split(path.sep).join("/");

const rules = [
  [/^third_party\//, "third_party/ enthält unveränderte Fremdquellen. Änderungen gehören in eigenen Code oder in einen Fork (z. B. deadsway/IronRDP)."],
  [/(^|\/)target\//, "target/ ist Build-Ausgabe von Cargo."],
  [/(^|\/)node_modules\//, "node_modules/ wird von npm verwaltet."],
  [/(^|\/)dist\//, "dist/ ist Build-Ausgabe des Frontends."],
  [/^payload\/(out|cache)\//, "payload/out und payload/cache werden vom Build erzeugt."],
  [/(^|\/)\.env(\..*)?$/, ".env-Dateien können Geheimnisse enthalten."],
  [/(^|\/)Cargo\.lock$/, "Cargo.lock nicht von Hand bearbeiten – cargo aktualisiert sie selbst."],
  [/(^|\/)package-lock\.json$/, "package-lock.json nicht von Hand bearbeiten – npm aktualisiert sie selbst."],
];

// Pfade außerhalb des Projekts (z. B. /tmp für Screenshots) sind erlaubt.
if (rel.startsWith("..")) process.exit(0);

for (const [pattern, reason] of rules) {
  if (pattern.test(rel)) {
    process.stderr.write(`Blockiert durch .claude/hooks/protect-paths.mjs: '${rel}'. ${reason}\n`);
    process.exit(2);
  }
}
process.exit(0);
