# Spike S0 – Layout-Mockup Hauptfenster

Statisches Mockup (Vite + React + TypeScript, **ohne Tauri, ohne Funktion**) für das Hauptfenster:
Menü, große Symbolleiste, Seitenleiste mit senkrechten Reitern und Session-Baum, Tab-Leiste mit
Terminal-Platzhalter, Statusleiste. Reagieren tun nur der Theme-Knopf (Statusleiste) und das
Ein-/Ausklappen der Seitenleiste.

## Starten

```bash
npm install
npm run dev          # http://localhost:5173
```

URL-Parameter für Screenshots: `?theme=classic-dark`, `?sidebar=closed`.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/styles/tokens.css` | theme-unabhängig: Schriften, Schriftgrößen, Abstände, Maße |
| `src/styles/themes/*.css` | je Theme ein Satz Farb-Tokens auf `:root[data-theme="…"]` |
| `src/styles/app.css` | Layout; nutzt **nur** `var(--…)`, keine festen Farben/Größen |
| `src/themes.ts` | Liste der Themes, Umschalten über `data-theme` auf `<html>` |
| `src/components/` | MenuBar, Toolbar, Sidebar, TabBar, TerminalMock, StatusBar |

## Neues Theme hinzufügen (z. B. später „modern-pastel“, UI-17)

1. `src/styles/themes/classic-light.css` nach `modern-pastel.css` kopieren, Selektor auf
   `:root[data-theme="modern-pastel"]` ändern und **alle** Farb-Tokens neu setzen.
2. Datei in `src/main.tsx` importieren.
3. Eintrag in `THEMES` (`src/themes.ts`) ergänzen.
4. Braucht ein Theme andere Abstände/Radien (z. B. rundere Ecken), dieselben Token aus
   `tokens.css` im Theme-Block überschreiben – `app.css` bleibt unverändert.

Screenshots: `screenshots/` (1280×800, Chromium unter Xvfb).
