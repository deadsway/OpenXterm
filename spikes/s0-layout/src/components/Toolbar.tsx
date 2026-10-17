import {
  Cable,
  CircleHelp,
  Columns2,
  FolderTree,
  Keyboard,
  type LucideIcon,
  PanelsTopLeft,
  Server,
  Settings,
  SquarePlus,
  Wrench,
} from "lucide-react";
import { Fragment } from "react";

interface ToolbarItem {
  label: string;
  icon: LucideIcon;
  title: string;
}

// Groups are separated by a vertical line. "null" marks the flexible gap
// that pushes settings/help to the right edge.
const GROUPS: (ToolbarItem[] | null)[] = [
  [
    { label: "Session", icon: SquarePlus, title: "Neue Session anlegen" },
    { label: "Server", icon: Server, title: "Lokale Server" },
    { label: "Werkzeuge", icon: Wrench, title: "Netzwerk- und Systemwerkzeuge" },
    { label: "Sessions", icon: FolderTree, title: "Gespeicherte Sessions" },
  ],
  [
    { label: "Ansicht", icon: PanelsTopLeft, title: "Ansicht anpassen" },
    { label: "Split", icon: Columns2, title: "Terminals nebeneinander anzeigen" },
    { label: "MultiExec", icon: Keyboard, title: "Eingabe an mehrere Terminals" },
    { label: "Tunnel", icon: Cable, title: "SSH-Tunnel verwalten" },
  ],
  null,
  [
    { label: "Einstellungen", icon: Settings, title: "Einstellungen" },
    { label: "Hilfe", icon: CircleHelp, title: "Hilfe" },
  ],
];

export function Toolbar() {
  return (
    <div className="toolbar" role="toolbar" aria-label="Symbolleiste">
      {GROUPS.map((group, gi) =>
        group === null ? (
          <div key={gi} className="toolbar-spacer" />
        ) : (
          <Fragment key={gi}>
            {gi > 0 && GROUPS[gi - 1] !== null && <div className="toolbar-separator" />}
            {group.map(({ label, icon: Icon, title }) => (
              <button key={label} type="button" className="toolbar-button" title={title}>
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </Fragment>
        ),
      )}
    </div>
  );
}
