import { Clock, Lock, Moon, Sun } from "lucide-react";
import { THEMES } from "../themes";

interface StatusBarProps {
  theme: string;
  onNextTheme: () => void;
}

export function StatusBar({ theme, onNextTheme }: StatusBarProps) {
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  return (
    <footer className="statusbar">
      <span className="status-item">
        <span className="status-dot" aria-hidden />
        Verbunden
      </span>
      <span className="status-item">
        <Lock aria-hidden />
        SSH · admin@192.0.2.10:22
      </span>
      <span className="status-item">UTF-8</span>
      <span className="status-item">120 × 32</span>
      <span className="status-item">
        <Clock aria-hidden />
        00:42:17
      </span>
      <span className="status-spacer" />
      <span className="status-item">3 Sessions offen</span>
      <button
        type="button"
        className="theme-button"
        onClick={onNextTheme}
        aria-label={`Theme wechseln zu ${next.label}`}
        title={`Theme wechseln zu ${next.label}`}
      >
        {current.dark ? <Moon aria-hidden /> : <Sun aria-hidden />}
        Theme: {current.label}
      </button>
    </footer>
  );
}
