# Ergebnis Spike S0 – Layout-Mockup

**Frage:** Wie wirkt das Hauptfenster als nüchternes Windows-Admin-Werkzeug, und lässt sich die
Gestaltung vollständig über CSS-Variablen in Themes fassen?

**Antwort:** Ja. Zwei Themes (klassisch hell/dunkel) unterscheiden sich nur in je einer CSS-Datei mit
rund 45 Farb-Tokens; Layout und Komponenten enthalten keine festen Farben, Abstände oder
Schriftgrößen.

## Screenshots (1280×800)

- `screenshots/classic-light.png` – Theme „Hell“
- `screenshots/classic-dark.png` – Theme „Dunkel“ (per Klick auf den Knopf in der Statusleiste umgeschaltet)
- `screenshots/classic-dark-sidebar-collapsed.png` – Seitenleiste eingeklappt, nur Reiterleiste sichtbar

## Erkenntnisse

- **Token-Schichten:** `tokens.css` (Maße, Schrift) getrennt von `themes/*.css` (Farben). Ein späteres
  Pastell-Theme (UI-17) kann zusätzlich Radien/Abstände überschreiben, ohne `app.css` anzufassen.
- **Semantische Namen** (`--color-selected`, `--color-type-ssh`, `--term-green` …) statt Farbnamen –
  sonst passt der Name im nächsten Theme nicht mehr.
- **Symbolleiste:** 28-px-Symbole über 12-px-Beschriftung, Knöpfe 74×60 px – gut lesbar; Gruppen mit
  Trennern, Einstellungen/Hilfe rechtsbündig.
- **Senkrechte Reiter** gehen mit `writing-mode: vertical-rl` ohne Grafiken; Symbol per `rotate(90deg)`.
- **Lucide-Symbolstärke** lässt sich per CSS (`stroke-width: var(--toolbar-icon-stroke)`) steuern –
  SVG-Attribute akzeptieren keine CSS-Variablen.
- **Terminalfarben** gehören ebenfalls ins Theme (`--term-*`); für xterm.js später daraus ein
  `ITheme`-Objekt bauen (`getComputedStyle`).
- **Chromium unter Xvfb** für Screenshots: `--test-type`, `--disable-features=Translate`,
  `GOOGLE_API_KEY=no` und `<meta name="google" content="notranslate">` verhindern Hinweisleisten.

## Offene Punkte / nur unter Windows prüfbar

- Echte Darstellung mit **Segoe UI** und **Cascadia Mono** (unter Linux greifen Fallback-Schriften).
- Wirkung bei Windows-Skalierung 125 %/150 % und im **WebView2**.
- Ob das dunkle Theme der Windows-Einstellung folgen soll (`prefers-color-scheme`) – Entscheidung in UI-12.

## Empfehlung für Phase 1

Token-Dateien als Ausgangspunkt für `app/src/styles/` neu schreiben (kein Code kopieren, nur Struktur
übernehmen); Theme-Wahl als Einstellung speichern.
