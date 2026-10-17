import { type LucideIcon, Monitor, Plus, SquareTerminal, Terminal, X } from "lucide-react";

interface TabInfo {
  label: string;
  icon: LucideIcon;
  type: "ssh" | "rdp" | "local";
  active?: boolean;
}

const TABS: TabInfo[] = [
  { label: "1. web-01 (SSH)", icon: SquareTerminal, type: "ssh", active: true },
  { label: "2. ts-buero (RDP)", icon: Monitor, type: "rdp" },
  { label: "3. Lokale Shell", icon: Terminal, type: "local" },
];

export function TabBar() {
  return (
    <div className="tabbar" role="tablist" aria-label="Geöffnete Sessions">
      {TABS.map(({ label, icon: Icon, type, active }) => (
        <div key={label} className={`tab${active ? " active" : ""}`} role="tab" aria-selected={active ?? false}>
          <Icon className={`type-${type}`} aria-hidden />
          <span className="tab-label">{label}</span>
          <button type="button" className="tab-close" aria-label={`${label} schließen`}>
            <X aria-hidden />
          </button>
        </div>
      ))}
      <button type="button" className="icon-button tab-new" aria-label="Neuer Tab" title="Neuer Tab">
        <Plus aria-hidden />
      </button>
    </div>
  );
}
