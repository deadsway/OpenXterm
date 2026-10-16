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

// --- RDP (Etappe C) ---------------------------------------------------------

export interface RdpConnectedEvent {
  sessionId: string;
  millis: number;
  width: number;
  height: number;
}

/** Framebuffer size changed (also sent once at the start). */
export interface RdpSizeEvent {
  sessionId: string;
  width: number;
  height: number;
}

export interface RdpStatsEvent {
  sessionId: string;
  updates: number;
  fps: number;
  packets: number;
  bytes: number;
  copyMs: number;
}

export type RdpInput =
  | { kind: "mouseMove"; x: number; y: number }
  | { kind: "mouseButton"; button: number; pressed: boolean; x: number; y: number }
  | { kind: "wheel"; deltaY: number; x: number; y: number }
  | { kind: "key"; code: string; pressed: boolean }
  | { kind: "releaseAll" };

/**
 * Starts an RDP session. Every packet on `onPacket` is one changed rectangle:
 * x, y, width, height (u32 LE) followed by width*height RGBA pixels.
 */
export function rdpConnect(
  addr: string,
  width: number,
  height: number,
  onPacket: (buf: ArrayBuffer) => void,
): Promise<string> {
  const onFrame = new Channel<ArrayBuffer>();
  onFrame.onmessage = onPacket;
  return invoke<string>("rdp_connect", { addr, width, height, onFrame });
}

export function rdpInput(sessionId: string, event: RdpInput): Promise<void> {
  return invoke("rdp_input", { sessionId, event });
}

export function rdpResize(sessionId: string, width: number, height: number): Promise<void> {
  return invoke("rdp_resize", { sessionId, width, height });
}

export function onRdpConnected(cb: (e: RdpConnectedEvent) => void): Promise<UnlistenFn> {
  return listen<RdpConnectedEvent>("rdp://connected", (e) => cb(e.payload));
}

export function onRdpStats(cb: (e: RdpStatsEvent) => void): Promise<UnlistenFn> {
  return listen<RdpStatsEvent>("rdp://stats", (e) => cb(e.payload));
}

export function onRdpSize(cb: (e: RdpSizeEvent) => void): Promise<UnlistenFn> {
  return listen<RdpSizeEvent>("rdp://size", (e) => cb(e.payload));
}
