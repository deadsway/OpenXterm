import { Channel, invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type TabId = "ssh" | "rdp";

export interface SpikeConfig {
  sshAddr: string;
  rdpAddr: string;
  /** Set via OX_SPIKE_AUTO: opens this tab right away. */
  auto: TabId | null;
}

export function getSpikeConfig(): Promise<SpikeConfig> {
  return invoke<SpikeConfig>("spike_config");
}

// --- SSH (Etappe B) ---------------------------------------------------------

export interface HostKeyEvent {
  /** null in auto mode (already accepted). */
  requestId: string | null;
  sessionId: string;
  host: string;
  algorithm: string;
  fingerprint: string;
  status: "unknown" | "changed";
  autoAccepted: boolean;
}

export interface ClosedEvent {
  sessionId: string;
  reason: string;
}

export interface ConnectedEvent {
  sessionId: string;
  millis: number;
}

/** Starts an SSH session; terminal output arrives as raw bytes on `onBytes`. */
export function sshConnect(
  addr: string,
  cols: number,
  rows: number,
  onBytes: (bytes: Uint8Array) => void,
): Promise<string> {
  const onData = new Channel<ArrayBuffer>();
  onData.onmessage = (buf) => onBytes(new Uint8Array(buf));
  return invoke<string>("ssh_connect", { addr, cols, rows, onData });
}

export function sshWrite(sessionId: string, data: string): Promise<void> {
  return invoke("ssh_write", { sessionId, data });
}

export function sshResize(sessionId: string, cols: number, rows: number): Promise<void> {
  return invoke("ssh_resize", { sessionId, cols, rows });
}

export function sessionClose(sessionId: string): Promise<void> {
  return invoke("session_close", { sessionId });
}

export function promptAnswer(requestId: string, accept: boolean): Promise<void> {
  return invoke("prompt_answer", { requestId, accept });
}

export function onHostKey(cb: (e: HostKeyEvent) => void): Promise<UnlistenFn> {
  return listen<HostKeyEvent>("ssh://host-key", (e) => cb(e.payload));
}

export function onSshConnected(cb: (e: ConnectedEvent) => void): Promise<UnlistenFn> {
  return listen<ConnectedEvent>("ssh://connected", (e) => cb(e.payload));
}

export function onSessionClosed(cb: (e: ClosedEvent) => void): Promise<UnlistenFn> {
  return listen<ClosedEvent>("session://closed", (e) => cb(e.payload));
}
