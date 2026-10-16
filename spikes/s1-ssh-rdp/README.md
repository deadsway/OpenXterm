# Spike S1 – SSH und RDP in Tauri

Wegwerf-Prototyp, Aufgabe und Etappen: [`docs/SPIKE-S1.md`](../../docs/SPIKE-S1.md). Notizen: [`NOTIZEN.md`](NOTIZEN.md).

```bash
npm install
npm run tauri dev                              # Entwickeln (lokal)
npm run tauri build -- --debug --no-bundle     # Debug-Build → src-tauri/target/debug/s1-ssh-rdp
```

Umgebungsvariablen: `OX_SSH_ADDR` (Standard `127.0.0.1:2222`), `OX_RDP_ADDR` (Standard `127.0.0.1:3389`, Windows/Docker: `127.0.0.1:3390`), `OX_SPIKE_AUTO=ssh|rdp` (öffnet den Tab sofort; `ssh` verbindet auch gleich und akzeptiert den Host-Key ohne Dialog – nur im Spike), `RUST_LOG` (Standard `info,russh=warn`).

SSH-Tab: „Verbinden“ → Host-Key-Dialog mit SHA256-Fingerprint → Shell als `tester`/`tester` (fest im Spike-Code).
