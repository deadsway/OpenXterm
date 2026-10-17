import { useEffect, useState } from "react";
import { MenuBar } from "./components/MenuBar";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { TabBar } from "./components/TabBar";
import { TerminalMock } from "./components/TerminalMock";
import { StatusBar } from "./components/StatusBar";
import { applyTheme, initialTheme, THEMES } from "./themes";

// Static layout mockup: only theme switching and sidebar collapsing react.
export function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => new URLSearchParams(window.location.search).get("sidebar") !== "closed",
  );

  useEffect(() => applyTheme(theme), [theme]);

  const nextTheme = () => {
    const index = THEMES.findIndex((t) => t.id === theme);
    setTheme(THEMES[(index + 1) % THEMES.length].id);
  };

  return (
    <div className="app">
      <MenuBar />
      <Toolbar />
      <div className="workspace">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((o) => !o)} />
        <main className="main">
          <TabBar />
          <TerminalMock />
        </main>
      </div>
      <StatusBar theme={theme} onNextTheme={nextTheme} />
    </div>
  );
}
