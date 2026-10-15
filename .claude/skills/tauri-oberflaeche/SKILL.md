---
name: tauri-oberflaeche
description: Konventionen für die Oberfläche von OpenXterm (React, TypeScript, Vite, xterm.js, Canvas für RDP/VNC, Tabs, Dialoge, Texte auf Deutsch/Englisch). Verwenden beim Erstellen oder Ändern von Dateien unter app/src oder der Oberfläche eines Spikes.
---

# Oberfläche (React + TypeScript)

## Grundsätze
- TypeScript strikt (`"strict": true`), keine `any` ohne Kommentar.
- Funktionale Komponenten mit Hooks. Zustand, den mehrere Komponenten brauchen (Sessions, Tabs, Einstellungen), in einem kleinen Store (z. B. zustand) statt durchgereichter Props.
- Tauri-Aufrufe nur über typisierte Funktionen in `app/src/api/` – Komponenten rufen nie `invoke` direkt auf.
- Keine Logik, die Geheimnisse sieht: Passwortfelder geben den Wert sofort an Rust und vergessen ihn.

## Terminal (xterm.js)
- Pakete `@xterm/xterm`, `@xterm/addon-fit`; später `addon-search`, `addon-web-links`, `addon-webgl`.
- Eine `Terminal`-Instanz pro Tab; beim Tab-Wechsel **nicht** neu erzeugen, nur ein-/ausblenden und danach `fit()`.
- Größenänderung: `ResizeObserver` → `fit()` → Befehl `…_resize(cols, rows)` (entprellt, ~50 ms).
- Eingabe: `term.onData` → Befehl `…_write`. Ausgabe: Kanal → `term.write(new Uint8Array(buf))`.
- Tastenkürzel der App vor xterm.js abfangen (`attachCustomKeyEventHandler`), damit z. B. Strg+Tab nicht im Terminal landet.

## RDP/VNC (Canvas)
- Canvas in Gerätepixeln anlegen (`width = cssWidth * devicePixelRatio`), Bildpakete laut Skill `tauri-schnittstelle` zeichnen.
- Maus: Koordinaten in Remote-Pixel umrechnen; Tastatur: `KeyboardEvent.code` (physische Taste) an Rust, nicht `key`.
- Fokus sichtbar machen; bei Fokusverlust alle gedrückten Tasten loslassen (sonst „klemmende“ Strg-Taste).

## Texte und Gestaltung
- Alle Texte über die i18n-Funktion, Deutsch und Englisch. Eigene Begriffe – keine Texte, Symbole oder Farben des Vorbilds übernehmen.
- Hell/Dunkel über CSS-Variablen.
- Barrierearm: Tastaturbedienung für Tabs, Baum und Dialoge; `aria-label` für Symbolknöpfe.

## Prüfen
`npx tsc --noEmit` · `npm test` (Vitest) · Screenshot laut Skill `ui-pruefen`.
