const MENUS = ["Datei", "Bearbeiten", "Ansicht", "Sessions", "Werkzeuge", "Fenster", "Hilfe"];

export function MenuBar() {
  return (
    <nav className="menubar" aria-label="Menü">
      {MENUS.map((m) => (
        <button key={m} type="button">
          {m}
        </button>
      ))}
    </nav>
  );
}
