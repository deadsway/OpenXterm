// Stop-Hook: Bevor Claude seine Antwort beendet, wird geprüft, ob der Code
// noch kompiliert – aber nur für Teile, die seit dem letzten Commit geändert
// wurden:
//   *.rs / Cargo.toml   -> `cargo check` im zugehörigen Cargo-Projekt
//   *.ts / *.tsx        -> `npx tsc --noEmit` im zugehörigen npm-Projekt
// Schlägt etwas fehl, endet der Hook mit Exit-Code 2: Claude wird nicht
// beendet, sondern bekommt die Fehler zu sehen und muss sie zuerst beheben.
//
// Läuft unter Windows und in Linux-Cloud-Sitzungen gleich (Node.js).

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8"));
} catch {
  /* ohne Daten trotzdem prüfen */
}

// Schutz vor Endlosschleifen: Wurde Claude bereits einmal durch einen
// Stop-Hook zurückgeschickt, jetzt nicht erneut blockieren.
if (payload.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
const isWin = process.platform === "win32";

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8", shell: isWin, timeout: 15 * 60 * 1000 });
}

// Geänderte und neue Dateien laut git
const st = run("git", ["status", "--porcelain", "--untracked-files=all"], root);
if (st.status !== 0) process.exit(0); // kein Git-Repo -> nichts zu tun
const changed = st.stdout
  .split("\n")
  .filter(Boolean)
  .map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop())
  .filter((f) => !/(^|\/)(target|node_modules|dist)\//.test(f));

// Nächstgelegenes Verzeichnis mit einer bestimmten Datei suchen
function findUp(file, marker) {
  let dir = path.dirname(path.resolve(root, file));
  while (dir.startsWith(path.resolve(root))) {
    if (existsSync(path.join(dir, marker))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const cargoDirs = new Set();
const tsDirs = new Set();
for (const f of changed) {
  if (/\.rs$|(^|\/)Cargo\.toml$/.test(f)) {
    const d = findUp(f, "Cargo.toml");
    if (d) cargoDirs.add(d);
  }
  if (/\.(ts|tsx|mts)$/.test(f)) {
    const d = findUp(f, "tsconfig.json");
    if (d && existsSync(path.join(d, "node_modules"))) tsDirs.add(d);
  }
}

const failures = [];
for (const dir of cargoDirs) {
  const r = run("cargo", ["check", "--all-targets", "--quiet", "--message-format=short"], dir);
  if (r.status !== 0) failures.push(`cargo check in ${path.relative(root, dir) || "."}:\n${(r.stderr || r.stdout || "").trim()}`);
}
for (const dir of tsDirs) {
  const r = run("npx", ["--no-install", "tsc", "--noEmit", "-p", "."], dir);
  if (r.status !== 0) failures.push(`tsc in ${path.relative(root, dir) || "."}:\n${(r.stdout || r.stderr || "").trim()}`);
}

if (failures.length) {
  const text = failures.map((f) => f.split("\n").slice(-40).join("\n")).join("\n\n");
  process.stderr.write(
    "Automatische Prüfung (.claude/hooks/build-check.mjs) fehlgeschlagen. Bitte zuerst beheben:\n\n" + text + "\n",
  );
  process.exit(2);
}
process.exit(0);
