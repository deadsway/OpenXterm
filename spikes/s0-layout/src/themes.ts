// Available themes. A theme is a CSS file in styles/themes/ that sets every
// color token on :root[data-theme="<id>"]. To add one (e.g. a future
// "modern-pastel"): create the CSS file, import it in main.tsx, add it here.
export interface ThemeInfo {
  id: string;
  label: string;
  dark: boolean;
}

export const THEMES: ThemeInfo[] = [
  { id: "classic-light", label: "Hell", dark: false },
  { id: "classic-dark", label: "Dunkel", dark: true },
];

export function initialTheme(): string {
  const fromUrl = new URLSearchParams(window.location.search).get("theme");
  return THEMES.some((t) => t.id === fromUrl) ? (fromUrl as string) : THEMES[0].id;
}

export function applyTheme(id: string): void {
  document.documentElement.dataset.theme = id;
}
