import { useCallback, useEffect, useRef, useState } from "react";
import {
  onRdpConnected,
  onRdpSize,
  onRdpStats,
  onSessionClosed,
  rdpConnect,
  rdpInput,
  rdpResize,
  sessionClose,
  type RdpInput,
} from "./api";

export interface RdpStatus {
  state: "getrennt" | "verbinde" | "verbunden";
  millis?: number;
  size?: string;
  fps?: number;
  kbps?: number;
  /** Rectangles actually painted into the canvas in the last second (WebView side). */
  paints?: number;
  message?: string;
}

interface Props {
  addr: string;
  autoConnect: boolean;
  visible: boolean;
  onStatus: (s: RdpStatus) => void;
}

const HEADER = 16;

/** Changes the canvas size but keeps the pixels (setting width/height clears a canvas). */
function resizeCanvas(c: HTMLCanvasElement, w: number, h: number) {
  if (c.width === w && c.height === h) return;
  const ctx = c.getContext("2d");
  const old = ctx && c.width > 0 && c.height > 0 ? ctx.getImageData(0, 0, c.width, c.height) : null;
  c.width = w;
  c.height = h;
  if (ctx && old) ctx.putImageData(old, 0, 0);
}

export default function RdpTab({ addr, autoConnect, visible, onStatus }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<string | null>(null);
  const statusRef = useRef<RdpStatus>({ state: "getrennt" });
  const autoDone = useRef(false);
  const pendingMove = useRef<{ x: number; y: number } | null>(null);
  const paintCount = useRef(0);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);

  const report = useCallback(
    (patch: Partial<RdpStatus>) => {
      statusRef.current = { ...statusRef.current, ...patch };
      onStatus(statusRef.current);
    },
    [onStatus],
  );

  const send = useCallback((event: RdpInput) => {
    const sid = sessionRef.current;
    if (sid) rdpInput(sid, event).catch(() => {});
  }, []);

  /** One packet = one changed rectangle: [x, y, w, h as u32 LE][RGBA …]. */
  const paint = useCallback((buf: ArrayBuffer) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || buf.byteLength < HEADER) return;
    const view = new DataView(buf);
    const x = view.getUint32(0, true);
    const y = view.getUint32(4, true);
    const w = view.getUint32(8, true);
    const h = view.getUint32(12, true);
    if (w === 0 || h === 0 || buf.byteLength !== HEADER + w * h * 4) return;
    if (x + w > canvas.width || y + h > canvas.height) {
      resizeCanvas(canvas, Math.max(canvas.width, x + w), Math.max(canvas.height, y + h));
    }
    const img = new ImageData(new Uint8ClampedArray(buf, HEADER, w * h * 4), w, h);
    ctx.putImageData(img, x, y);
    paintCount.current += 1;
  }, []);

  // Session events.
  useEffect(() => {
    const unlisten = [
      onRdpConnected((e) => {
        if (e.sessionId !== sessionRef.current) return;
        report({ state: "verbunden", millis: e.millis, size: `${e.width}×${e.height}` });
      }),
      onRdpSize((e) => {
        if (e.sessionId !== sessionRef.current || !canvasRef.current) return;
        resizeCanvas(canvasRef.current, e.width, e.height);
        report({ size: `${e.width}×${e.height}` });
      }),
      onRdpStats((e) => {
        if (e.sessionId !== sessionRef.current) return;
        report({ fps: e.fps, kbps: Math.round(e.bytes / 1024), paints: paintCount.current });
        paintCount.current = 0;
      }),
      onSessionClosed((e) => {
        if (e.sessionId !== sessionRef.current) return;
        sessionRef.current = null;
        setConnected(false);
        report({ state: "getrennt", fps: undefined, kbps: undefined, message: e.reason });
      }),
    ];
    return () => unlisten.forEach((p) => p.then((f) => f()));
  }, [report]);

  const hostSize = () => {
    const el = hostRef.current;
    const w = Math.max(200, Math.floor((el?.clientWidth ?? 1024) / 2) * 2);
    const h = Math.max(200, el?.clientHeight ?? 768);
    return { w, h };
  };

  const connect = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || sessionRef.current) return;
    setBusy(true);
    const { w, h } = hostSize();
    canvas.width = w;
    canvas.height = h;
    report({ state: "verbinde", millis: undefined, size: undefined, message: undefined });
    try {
      const sid = await rdpConnect(addr, w, h, paint);
      sessionRef.current = sid;
      setConnected(true);
      canvas.focus();
    } catch (e) {
      report({ state: "getrennt", message: String(e) });
    } finally {
      setBusy(false);
    }
  }, [addr, paint, report]);

  useEffect(() => {
    if (autoConnect && !autoDone.current) {
      autoDone.current = true;
      void connect();
    }
  }, [autoConnect, connect]);

  // Releasing all keys/buttons when the tab is hidden avoids stuck modifiers on the server.
  useEffect(() => {
    if (!visible) send({ kind: "releaseAll" });
    else canvasRef.current?.focus();
  }, [visible, send]);

  // Optional: dynamic resolution, debounced.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let timer: number | undefined;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const sid = sessionRef.current;
        const c = canvasRef.current;
        if (!sid || !c || el.clientWidth === 0) return;
        const { w, h } = hostSize();
        if (w !== c.width || h !== c.height) rdpResize(sid, w, h).catch(() => {});
      }, 600);
    });
    ro.observe(el);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
    };
  }, []);

  const toRemote = (e: { clientX: number; clientY: number }) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - r.left) * c.width) / Math.max(1, r.width)),
      y: Math.round(((e.clientY - r.top) * c.height) / Math.max(1, r.height)),
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const first = pendingMove.current === null;
    pendingMove.current = toRemote(e);
    if (first) {
      requestAnimationFrame(() => {
        const p = pendingMove.current;
        pendingMove.current = null;
        if (p) send({ kind: "mouseMove", ...p });
      });
    }
  };

  const onMouseButton = (e: React.MouseEvent, pressed: boolean) => {
    e.preventDefault();
    if (pressed) canvasRef.current?.focus();
    pendingMove.current = null;
    send({ kind: "mouseButton", button: e.button, pressed, ...toRemote(e) });
  };

  const onKey = (e: React.KeyboardEvent, pressed: boolean) => {
    e.preventDefault();
    send({ kind: "key", code: e.code, pressed });
  };

  useEffect(() => {
    // Non-passive wheel listener so preventDefault works.
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      send({ kind: "wheel", deltaY: e.deltaY, ...toRemote(e) });
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [send]);

  return (
    <div className="ssh-tab rdp-tab">
      <div className="toolbar">
        <span className="addr">{addr}</span>
        {connected ? (
          <button onClick={() => sessionRef.current && sessionClose(sessionRef.current)}>Trennen</button>
        ) : (
          <button onClick={() => void connect()} disabled={busy}>
            Verbinden
          </button>
        )}
        {statusRef.current.message && <span className="toolbar-msg">{statusRef.current.message}</span>}
      </div>
      <div className="rdp-host" ref={hostRef}>
        <canvas
          ref={canvasRef}
          tabIndex={0}
          className={connected ? "rdp-canvas live" : "rdp-canvas"}
          onMouseMove={onMouseMove}
          onMouseDown={(e) => onMouseButton(e, true)}
          onMouseUp={(e) => onMouseButton(e, false)}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => onKey(e, true)}
          onKeyUp={(e) => onKey(e, false)}
          onBlur={() => send({ kind: "releaseAll" })}
        />
      </div>
    </div>
  );
}
