import { useEffect, useState } from "react";
import { getSpikeConfig, type SpikeConfig, type TabId } from "./api";
import SshTab, { type SshStatus } from "./SshTab";
import "./App.css";

const TABS: { id: TabId; label: string; placeholder: string }[] = [
  { id: "ssh", label: "SSH", placeholder: "" },
  { id: "rdp", label: "RDP", placeholder: "RDP-Bild folgt in Etappe C." },
];

function App() {
  const [active, setActive] = useState<TabId>("ssh");
  const [config, setConfig] = useState<SpikeConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ssh, setSsh] = useState<SshStatus>({ state: "getrennt" });

  useEffect(() => {
    getSpikeConfig()
      .then((cfg) => {
        setConfig(cfg);
        if (cfg.auto) setActive(cfg.auto);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);


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

      {/* Panels stay mounted so a tab switch keeps the terminal/canvas. */}
      {TABS.map((t) => (
        <main
          key={t.id}
          className="panel"
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
        >
          {t.id === "ssh" ? (
            config && (
              <SshTab
                addr={config.sshAddr}
                autoConnect={config.auto === "ssh"}
                visible={active === "ssh"}
                onStatus={setSsh}
              />
            )
          ) : (
            <p className="placeholder">{t.placeholder}</p>
          )}
        </main>
      ))}

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
            <span className="sep">·</span>
            <span>
              SSH {ssh.state}
              {ssh.millis !== undefined && ` (${ssh.millis} ms)`}
              {ssh.size && ` · ${ssh.size}`}
            </span>
            {ssh.fingerprint && (
              <>
                <span className="sep">·</span>
                <span className="mono">{ssh.fingerprint}</span>
              </>
            )}
          </>
        ) : (
          <span>Lade Konfiguration …</span>
        )}
      </footer>
    </div>
  );
}

export default App;
