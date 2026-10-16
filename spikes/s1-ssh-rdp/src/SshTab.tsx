import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  onHostKey,
  onSessionClosed,
  onSshConnected,
  promptAnswer,
  sessionClose,
  sshConnect,
  sshResize,
  sshWrite,
  type HostKeyEvent,
} from "./api";
import HostKeyDialog from "./HostKeyDialog";

export interface SshStatus {
  state: "getrennt" | "verbinde" | "verbunden";
  fingerprint?: string;
  millis?: number;
  size?: string;
}

interface Props {
  addr: string;
  autoConnect: boolean;
  visible: boolean;
  onStatus: (s: SshStatus) => void;
}

export default function SshTab({ addr, autoConnect, visible, onStatus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<string | null>(null);
  const statusRef = useRef<SshStatus>({ state: "getrennt" });
  const autoDone = useRef(false);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<HostKeyEvent | null>(null);

  const report = useCallback(
    (patch: Partial<SshStatus>) => {
      statusRef.current = { ...statusRef.current, ...patch };
      onStatus(statusRef.current);
    },
    [onStatus],
  );

  const fit = useCallback(() => {
    const term = termRef.current;
    const el = hostRef.current;
    if (!term || !fitRef.current || !el || el.offsetWidth === 0) return;
    fitRef.current.fit();
    report({ size: `${term.cols}×${term.rows}` });
    const sid = sessionRef.current;
    if (sid) sshResize(sid, term.cols, term.rows).catch(() => {});
  }, [report]);

  // Terminal setup, once.
  useEffect(() => {
    const term = new Terminal({
      fontFamily: '"DejaVu Sans Mono", "Cascadia Mono", Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      theme: { background: "#11141a" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    termRef.current = term;
    fitRef.current = fitAddon;
    if (hostRef.current) term.open(hostRef.current);
    const sub = term.onData((data) => {
      const sid = sessionRef.current;
      if (sid) sshWrite(sid, data).catch(() => {});
    });
    const ro = new ResizeObserver(() => fit());
    if (hostRef.current) ro.observe(hostRef.current);
    return () => {
      ro.disconnect();
      sub.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, [fit]);

  // Global SSH events.
  useEffect(() => {
    const unlisten = [
      onHostKey((e) => {
        report({ fingerprint: e.fingerprint });
        if (e.autoAccepted) {
          termRef.current?.writeln(`\x1b[33m[Auto-Modus: Host-Key ${e.algorithm} ${e.fingerprint} akzeptiert]\x1b[0m`);
        } else {
          setPrompt(e);
        }
      }),
      onSshConnected((e) => {
        if (e.sessionId === sessionRef.current) report({ state: "verbunden", millis: e.millis });
      }),
      onSessionClosed((e) => {
        if (e.sessionId !== sessionRef.current) return;
        sessionRef.current = null;
        setConnected(false);
        setPrompt(null);
        report({ state: "getrennt" });
        termRef.current?.writeln(`\r\n\x1b[31m[Verbindung getrennt: ${e.reason}]\x1b[0m`);
      }),
    ];
    return () => unlisten.forEach((p) => p.then((f) => f()));
  }, [report]);

  const connect = useCallback(async () => {
    const term = termRef.current;
    if (!term || sessionRef.current) return;
    setBusy(true);
    fit();
    term.writeln(`\x1b[36m[Verbinde mit ${addr} …]\x1b[0m`);
    report({ state: "verbinde", fingerprint: undefined, millis: undefined });
    try {
      const sid = await sshConnect(addr, term.cols, term.rows, (bytes) => term.write(bytes));
      sessionRef.current = sid;
      setConnected(true);
      term.focus();
    } catch (e) {
      term.writeln(`\x1b[31m[Fehler: ${String(e)}]\x1b[0m`);
      report({ state: "getrennt" });
    } finally {
      setBusy(false);
    }
  }, [addr, fit, report]);

  useEffect(() => {
    if (autoConnect && !autoDone.current) {
      autoDone.current = true;
      void connect();
    }
  }, [autoConnect, connect]);

  useEffect(() => {
    if (visible) {
      fit();
      termRef.current?.focus();
    }
  }, [visible, fit]);

  const answer = (accept: boolean) => {
    if (prompt?.requestId) promptAnswer(prompt.requestId, accept).catch(() => {});
    setPrompt(null);
    termRef.current?.focus();
  };

  return (
    <div className="ssh-tab">
      <div className="toolbar">
        <span className="addr">{addr}</span>
        {connected ? (
          <button onClick={() => sessionRef.current && sessionClose(sessionRef.current)}>Trennen</button>
        ) : (
          <button onClick={() => void connect()} disabled={busy}>
            Verbinden
          </button>
        )}
      </div>
      <div className="term-host" ref={hostRef} />
      {prompt && <HostKeyDialog event={prompt} onAnswer={answer} />}
    </div>
  );
}
