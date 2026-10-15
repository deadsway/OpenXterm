# Third-Party Notices

OpenXterm verwendet bzw. plant die folgenden Komponenten. Beim Einbinden: tatsächlich verwendete Version, Lizenz-URL und den vollständigen Lizenztext ergänzen und den Status auf „eingebunden“ setzen. Ab Phase 1 erzeugt ein Werkzeug (`cargo about` bzw. `cargo-deny`) die vollständige Liste aller Crates automatisch.

| Komponente | Verwendung | Lizenz (vor Einbindung prüfen) | Projekt | Status |
|---|---|---|---|---|
| Tauri 2 | App-Gerüst | MIT / Apache-2.0 | https://tauri.app | geplant (Spike S1) |
| React, Vite, TypeScript | Oberfläche | MIT / Apache-2.0 | https://react.dev, https://vite.dev | geplant (Spike S1) |
| xterm.js (+ Addons) | Terminal | MIT | https://xtermjs.org | geplant (Spike S1) |
| russh, russh-sftp | SSH, SFTP, Tunnel | Apache-2.0 | https://github.com/Eugeny/russh | geplant (Spike S1) |
| IronRDP | RDP | MIT / Apache-2.0 | https://github.com/Devolutions/IronRDP | geplant (Spike S1) |
| tokio | asynchrone Laufzeit | MIT | https://tokio.rs | geplant (Spike S1) |
| portable-pty | lokale Shells | MIT | https://github.com/wezterm/wezterm | geplant (Phase 2) |
| serialport | serielle Konsole | MPL-2.0 | https://github.com/serialport/serialport-rs | geplant (Phase 1) |
| argon2, aes-gcm (RustCrypto) | Tresor | MIT / Apache-2.0 | https://github.com/RustCrypto | geplant (Phase 3) |
| CodeMirror 6 | Editor | MIT | https://codemirror.net | geplant (Phase 3) |
| suppaftp | FTP/FTPS | MIT / Apache-2.0 | https://github.com/veeso/suppaftp | geplant (Phase 5) |
| Cygwin | Unix-Umgebung, OpenSSH, Mosh | DLL LGPLv3, Programme diverse | https://cygwin.com | geplant (Phase 2) |
| X.Org (XWin) | X-Server | MIT/X11 | https://x.cygwin.com | geplant (Phase 6) |
