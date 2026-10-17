import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  HardDrive,
  type LucideIcon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  SquareTerminal,
  Terminal,
  Usb,
  Wrench,
  Zap,
} from "lucide-react";

type SessionType = "ssh" | "rdp" | "local" | "serial";

interface TreeNode {
  label: string;
  depth: number;
  folder?: { open: boolean; count: number };
  type?: SessionType;
  hint?: string;
  selected?: boolean;
}

const TYPE_ICON: Record<SessionType, LucideIcon> = {
  ssh: SquareTerminal,
  rdp: Monitor,
  local: Terminal,
  serial: Usb,
};

// Example data only. Hosts use the documentation range 192.0.2.0/24.
const TREE: TreeNode[] = [
  { label: "Alle Sessions", depth: 0, folder: { open: true, count: 9 } },
  { label: "Produktion", depth: 1, folder: { open: true, count: 3 } },
  { label: "web-01", depth: 2, type: "ssh", hint: "192.0.2.10", selected: true },
  { label: "web-02", depth: 2, type: "ssh", hint: "192.0.2.11" },
  { label: "db-01", depth: 2, type: "ssh", hint: "192.0.2.20" },
  { label: "Büro", depth: 1, folder: { open: true, count: 3 } },
  { label: "ts-buero", depth: 2, type: "rdp", hint: "192.0.2.50" },
  { label: "nas-backup", depth: 2, type: "ssh", hint: "192.0.2.60" },
  { label: "Switch-Konsole", depth: 2, type: "serial", hint: "COM3" },
  { label: "Labor", depth: 1, folder: { open: false, count: 2 } },
  { label: "Lokale Shell", depth: 1, type: "local", hint: "bash" },
];

const RAIL_TABS: { label: string; icon: LucideIcon }[] = [
  { label: "Sessions", icon: FolderTree },
  { label: "Werkzeuge", icon: Wrench },
  { label: "Makros", icon: Zap },
  { label: "SFTP", icon: HardDrive },
];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function Sidebar({ open, onToggle }: SidebarProps) {
  return (
    <>
      <aside className="sidebar-rail" aria-label="Seitenleiste">
        {!open && (
          <button
            type="button"
            className="rail-toggle"
            onClick={onToggle}
            aria-label="Seitenleiste einblenden"
            title="Seitenleiste einblenden"
          >
            <PanelLeftOpen aria-hidden />
          </button>
        )}
        {RAIL_TABS.map(({ label, icon: Icon }, i) => (
          <button
            key={label}
            type="button"
            className={`rail-tab${i === 0 && open ? " active" : ""}`}
            aria-pressed={i === 0 && open}
          >
            <Icon aria-hidden />
            {label}
          </button>
        ))}
      </aside>
      {open && (
        <>
          <section className="sidebar-panel" aria-label="Sessions">
            <div className="sidebar-header">
              <span>Sessions</span>
              <span>
                <button type="button" className="icon-button" aria-label="Neue Session">
                  <Plus aria-hidden />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={onToggle}
                  aria-label="Seitenleiste ausblenden"
                  title="Seitenleiste ausblenden"
                >
                  <PanelLeftClose aria-hidden />
                </button>
              </span>
            </div>
            <div className="sidebar-search">
              <Search aria-hidden />
              Sessions filtern …
            </div>
            <ul className="tree" role="tree">
              {TREE.map((node) => (
                <TreeRow key={node.label} node={node} />
              ))}
            </ul>
          </section>
          <div className="splitter" aria-hidden />
        </>
      )}
    </>
  );
}

function TreeRow({ node }: { node: TreeNode }) {
  const indent = `calc(var(--space-2) + ${node.depth} * var(--tree-indent))`;
  let icon;
  if (node.folder) {
    const FolderIcon = node.folder.open ? FolderOpen : Folder;
    const Chevron = node.folder.open ? ChevronDown : ChevronRight;
    icon = (
      <>
        <Chevron className="chevron" aria-hidden />
        <FolderIcon className="folder" aria-hidden />
      </>
    );
  } else if (node.type) {
    const TypeIcon = TYPE_ICON[node.type];
    icon = (
      <>
        <span className="chevron-placeholder" />
        <TypeIcon className={`type-${node.type}`} aria-hidden />
      </>
    );
  }
  return (
    <li
      className={`tree-row${node.selected ? " selected" : ""}`}
      style={{ paddingLeft: indent }}
      role="treeitem"
      aria-selected={node.selected ?? false}
      aria-expanded={node.folder?.open}
    >
      {icon}
      <span className="tree-label">{node.label}</span>
      {node.folder && <span className="tree-count">({node.folder.count})</span>}
      {node.hint && <span className="tree-hint">{node.hint}</span>}
    </li>
  );
}
