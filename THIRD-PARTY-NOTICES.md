# Third-Party Notices

OpenXterm verwendet bzw. plant die folgenden Komponenten. Beim Einbinden: tatsächlich verwendete Version, Lizenz-URL und den vollständigen Lizenztext ergänzen und den Status auf „eingebunden“ setzen. Ab Phase 1 erzeugt ein Werkzeug (`cargo about` bzw. `cargo-deny`) die vollständige Liste aller Crates automatisch.

| Komponente | Verwendung | Lizenz (vor Einbindung prüfen) | Projekt | Status |
|---|---|---|---|---|
| Tauri 2 | App-Gerüst | MIT / Apache-2.0 | https://tauri.app | im Spike S1 verwendet (2.12.4) |
| React, Vite, TypeScript | Oberfläche | MIT / Apache-2.0 | https://react.dev, https://vite.dev | im Spike S1 verwendet (React 19.3.1, Vite 8.3.4, TS 6.0.3) |
| xterm.js (+ Addons) | Terminal | MIT | https://xtermjs.org | im Spike S1 verwendet (`@xterm/xterm` 6.0.0, `@xterm/addon-fit` 0.11.0) |
| russh, russh-sftp | SSH, SFTP, Tunnel | Apache-2.0 | https://github.com/Eugeny/russh | russh im Spike S1 verwendet (0.64.1, zieht aws-lc-rs: ISC/Apache-2.0); russh-sftp geplant |
| IronRDP | RDP | MIT / Apache-2.0 | https://github.com/Devolutions/IronRDP | im Spike S1 verwendet: Git-Commit `62246b3` (ironrdp-client 0.1.0, ironrdp-input 0.7.0, ironrdp-pdu 0.9.0, Feature `rustls` → rustls 0.23: Apache-2.0/ISC/MIT); nicht crates.io wegen Versionskonflikt mit russh |
| smallvec | Eingabe-Ereignisse für IronRDP | MIT / Apache-2.0 | https://github.com/servo/rust-smallvec | im Spike S1 verwendet (1.16.3) |
| tokio | asynchrone Laufzeit | MIT | https://tokio.rs | im Spike S1 verwendet (1.53.3) |
| tracing, tracing-subscriber | Logging | MIT | https://github.com/tokio-rs/tracing | im Spike S1 verwendet (0.1.44 / 0.3.23) |
| anyhow | Fehlerbehandlung (Apps) | MIT / Apache-2.0 | https://github.com/dtolnay/anyhow | im Spike S1 verwendet (1.0.104) |
| portable-pty | lokale Shells | MIT | https://github.com/wezterm/wezterm | geplant (Phase 2) |
| serialport | serielle Konsole | MPL-2.0 | https://github.com/serialport/serialport-rs | geplant (Phase 1) |
| argon2, aes-gcm (RustCrypto) | Tresor | MIT / Apache-2.0 | https://github.com/RustCrypto | geplant (Phase 3) |
| CodeMirror 6 | Editor | MIT | https://codemirror.net | geplant (Phase 3) |
| suppaftp | FTP/FTPS | MIT / Apache-2.0 | https://github.com/veeso/suppaftp | geplant (Phase 5) |
| Cygwin | Unix-Umgebung, OpenSSH, Mosh | DLL LGPLv3, Programme diverse | https://cygwin.com | geplant (Phase 2) |
| X.Org (XWin) | X-Server | MIT/X11 | https://x.cygwin.com | geplant (Phase 6) |
