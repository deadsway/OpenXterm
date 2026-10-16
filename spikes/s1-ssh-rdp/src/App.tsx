import { useEffect, useState } from "react";
import { getSpikeConfig, type SpikeConfig, type TabId } from "./api";
import "./App.css";

const TABS: { id: TabId; label: string; placeholder: string }[] = [
  { id: "ssh", label: "SSH", placeholder: "SSH-Terminal folgt in Etappe B." },
  { id: "rdp", label: "RDP", placeholder: "RDP-Bild folgt in Etappe C." },
];

function App() {
  const [active, setActive] = useState<TabId>("ssh");
  const [config, setConfig] = useState<SpikeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpikeConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (cfg.auto) setActive(cfg.auto);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="app">
      <div className="tabbar" role="tablist" aria-label="Verbindungen">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={t.id === active}
            aria-controls={`panel-${t.id}`}
            className={t.id === active ? "tab active" : "tab"}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <main className="panel" role="tabpanel" id={`panel-${current.id}`} aria-labelledby={`tab-${current.id}`}>
        <p className="placeholder">{current.placeholder}</p>
      </main>

      <footer className="statusbar">
        {error ? (
          <span className="error">Fehler: {error}</span>
        ) : config ? (
          <>
            <span>SSH: {config.sshAddr}</span>
            <span className="sep">·</span>
            <span>RDP: {config.rdpAddr}</span>
            <span className="sep">·</span>
            <span>Auto: {config.auto ?? "aus"}</span>
          </>
        ) : (
          <span>Lade Konfiguration …</span>
        )}
      </footer>
    </div>
  );
}

export default App;
