//! RDP tab of the spike: ironrdp-client (git rev 62246b3) with dirty-region delivery,
//! regions merged into a shadow framebuffer and sent as raw RGBA packets over a Tauri channel,
//! mouse/keyboard from the canvas translated to fast-path input via `ironrdp_input::Database`.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use ironrdp_client::config::{ConfigBuilder, Destination};
use ironrdp_client::output_channel::{OutputEventReceiver, output_channel};
use ironrdp_client::rdp::{RdpClient, RdpInputEvent, RdpInputSender, RdpOutputEvent};
use ironrdp_input::{Database, MouseButton, MousePosition, Operation, Scancode, WheelRotations};
use ironrdp_pdu::rdp::capability_sets::MajorPlatformType;
use serde::{Deserialize, Serialize};
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, Emitter, Manager, State};

/// Spike only: credentials of the throwaway xrdp test server.
const RDP_USER: &str = "tester";
const RDP_PASSWORD: &str = "tester";
/// Minimum time between two flushes to the UI (~60 per second).
const FLUSH_INTERVAL: Duration = Duration::from_millis(16);
/// Packet header: x, y, width, height as u32 little endian.
const HEADER_LEN: usize = 16;

struct RdpSession {
    input: RdpInputSender,
    db: Mutex<Database>,
    /// Current desktop size, used to clamp pointer coordinates.
    size: Mutex<(u16, u16)>,
}

#[derive(Default)]
pub struct RdpState {
    next_id: AtomicU64,
    sessions: Mutex<HashMap<String, Arc<RdpSession>>>,
}

impl RdpState {
    fn session(&self, session_id: &str) -> Result<Arc<RdpSession>, String> {
        self.sessions
            .lock()
            .map_err(|_| "Interner Fehler".to_owned())?
            .get(session_id)
            .cloned()
            .ok_or_else(|| "Sitzung nicht gefunden".to_owned())
    }

    /// Asks the session to disconnect. Returns false if the id is unknown.
    pub fn close(&self, session_id: &str) -> Result<bool, String> {
        let Ok(session) = self.session(session_id) else {
            return Ok(false);
        };
        session
            .input
            .try_send(RdpInputEvent::Close)
            .map_err(|_| "Sitzung beendet".to_owned())?;
        Ok(true)
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectedEvent {
    session_id: String,
    millis: u128,
    width: u16,
    height: u16,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SizeEvent {
    session_id: String,
    width: u16,
    height: u16,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct StatsEvent {
    session_id: String,
    /// Region updates received from ironrdp-client in the last second.
    updates: u32,
    /// Flushes (canvas repaints) in the last second.
    fps: u32,
    packets: u32,
    bytes: u64,
    /// Time spent copying regions into the shadow buffer and packing packets.
    copy_ms: f64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ClosedEvent {
    session_id: String,
    reason: String,
}

#[tauri::command]
pub fn rdp_connect(
    app: AppHandle,
    state: State<'_, RdpState>,
    addr: String,
    width: u32,
    height: u32,
    on_frame: Channel<InvokeResponseBody>,
) -> Result<String, String> {
    if addr.trim().is_empty() || addr.len() > 255 {
        return Err("Ungültige Adresse".to_owned());
    }
    let (width, height) = desktop_size(width, height)?;
    let destination =
        Destination::new(addr.trim()).map_err(|e| format!("Ungültige Adresse: {e}"))?;

    let lossless = std::env::var_os("OX_RDP_LOSSLESS").is_some();
    // xrdp cannot do NLA: plain TLS security, no CredSSP, autologon so xrdp skips its login screen.
    let config = ConfigBuilder::new()
        .with_destination(destination)
        .with_username(RDP_USER)
        .with_password(RDP_PASSWORD)
        .with_tls(true)
        .with_credssp(false)
        .with_autologon(true)
        .with_desktop_width(width)
        .with_desktop_height(height)
        .with_keyboard_layout(0x0409)
        .with_client_build(0)
        .with_client_dir("C:\\Windows\\System32\\mstscax.dll")
        .with_client_name("openxterm-spike")
        .with_platform(MajorPlatformType::UNIX)
        // Composite the remote cursor into the framebuffer; the spike has no cursor overlay.
        .with_pointer_software_rendering(true)
        // Spike measurement switch: OX_RDP_LOSSLESS=1 turns off RemoteFX (lossy, 64×64 tiles)
        // and lossy bitmap compression.
        .with_lossy_compression(!lossless)
        .with_codecs(if lossless {
            vec!["remotefx:off".to_owned()]
        } else {
            Vec::new()
        })
        .build()
        .map_err(|e| format!("Konfiguration ungültig: {e}"))?;

    let session_id = format!("rdp-{}", state.next_id.fetch_add(1, Ordering::Relaxed) + 1);
    let (out_tx, out_rx) = output_channel(64);
    let client = RdpClient::new(config, out_tx).with_desktop_updates();
    let session = Arc::new(RdpSession {
        input: client.input_sender(),
        db: Mutex::new(Database::new()),
        size: Mutex::new((width, height)),
    });
    state
        .sessions
        .lock()
        .map_err(|_| "Interner Fehler".to_owned())?
        .insert(session_id.clone(), Arc::clone(&session));

    tracing::warn!(session_id, %addr, "TLS certificate of the RDP server is NOT verified (spike only)");
    tracing::info!(session_id, %addr, width, height, "rdp connecting");

    // The client future is driven on its own thread with a current-thread runtime, as
    // ironrdp-viewer does; this keeps the protocol loop off the Tauri runtime.
    let thread_sid = session_id.clone();
    std::thread::Builder::new()
        .name(format!("{session_id}-client"))
        .spawn(move || {
            match tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
            {
                Ok(rt) => rt.block_on(client.run()),
                Err(e) => {
                    tracing::error!(session_id = %thread_sid, error = %e, "rdp runtime failed")
                }
            }
        })
        .map_err(|e| format!("Thread konnte nicht gestartet werden: {e}"))?;

    let sid = session_id.clone();
    tauri::async_runtime::spawn(async move {
        let reason = forward_output(&app, &sid, &session, out_rx, on_frame).await;
        if let Ok(mut sessions) = app.state::<RdpState>().sessions.lock() {
            sessions.remove(&sid);
        }
        // Make sure the client stops if the UI side ended first.
        let _ = session.input.try_send(RdpInputEvent::Close);
        tracing::info!(session_id = %sid, %reason, "rdp session closed");
        let _ = app.emit(
            "session://closed",
            ClosedEvent {
                session_id: sid,
                reason,
            },
        );
    });
    Ok(session_id)
}

fn desktop_size(width: u32, height: u32) -> Result<(u16, u16), String> {
    if !(200..=8192).contains(&width) || !(200..=8192).contains(&height) {
        return Err("Ungültige Größe".to_owned());
    }
    // RDP wants an even width; u16 conversion cannot fail after the range check.
    let width = u16::try_from(width & !1).map_err(|_| "Ungültige Größe".to_owned())?;
    let height = u16::try_from(height).map_err(|_| "Ungültige Größe".to_owned())?;
    Ok((width, height))
}

#[derive(Clone, Copy, Debug)]
struct Rect {
    x: usize,
    y: usize,
    w: usize,
    h: usize,
}

impl Rect {
    fn area(self) -> usize {
        self.w * self.h
    }

    fn union(self, o: Rect) -> Rect {
        let x = self.x.min(o.x);
        let y = self.y.min(o.y);
        let r = (self.x + self.w).max(o.x + o.w);
        let b = (self.y + self.h).max(o.y + o.h);
        Rect {
            x,
            y,
            w: r - x,
            h: b - y,
        }
    }
}

/// RGBA copy of the remote desktop plus the regions changed since the last flush.
struct Shadow {
    width: usize,
    height: usize,
    rgba: Vec<u8>,
    dirty: Vec<Rect>,
}

impl Shadow {
    fn new(width: usize, height: usize) -> Self {
        Self {
            width,
            height,
            rgba: vec![0; width * height * 4],
            dirty: Vec::new(),
        }
    }

    /// Copies packed 0x00RRGGBB pixels of `region` into the RGBA buffer.
    fn apply(&mut self, pixels: &[u32], region: Rect) {
        for row in 0..region.h {
            let src = &pixels[row * region.w..(row + 1) * region.w];
            let start = ((region.y + row) * self.width + region.x) * 4;
            let dst = &mut self.rgba[start..start + region.w * 4];
            for (d, p) in dst.chunks_exact_mut(4).zip(src) {
                let [_, r, g, b] = p.to_be_bytes();
                d.copy_from_slice(&[r, g, b, 255]);
            }
        }
        self.dirty.push(region);
    }

    /// Merges dirty regions: one bounding box if that wastes little or there are many pieces,
    /// otherwise the individual regions.
    fn take_rects(&mut self) -> Vec<Rect> {
        let dirty = std::mem::take(&mut self.dirty);
        let Some(first) = dirty.first().copied() else {
            return dirty;
        };
        let bbox = dirty.iter().skip(1).fold(first, |acc, r| acc.union(*r));
        let sum: usize = dirty.iter().map(|r| r.area()).sum();
        if dirty.len() > 16 || bbox.area() <= sum.saturating_mul(2) {
            vec![bbox]
        } else {
            dirty
        }
    }

    fn packet(&self, r: Rect) -> Vec<u8> {
        let mut out = Vec::with_capacity(HEADER_LEN + r.area() * 4);
        for v in [r.x, r.y, r.w, r.h] {
            // Values are bounded by the u16 desktop size.
            out.extend_from_slice(&u32::try_from(v).unwrap_or(0).to_le_bytes());
        }
        for row in r.y..r.y + r.h {
            let start = (row * self.width + r.x) * 4;
            out.extend_from_slice(&self.rgba[start..start + r.w * 4]);
        }
        out
    }
}

#[derive(Default)]
struct Stats {
    updates: u32,
    flushes: u32,
    packets: u32,
    bytes: u64,
    copy: Duration,
    send: Duration,
}

/// Consumes ironrdp-client output until the session ends; returns the close reason.
async fn forward_output(
    app: &AppHandle,
    session_id: &str,
    session: &RdpSession,
    mut rx: OutputEventReceiver,
    on_frame: Channel<InvokeResponseBody>,
) -> String {
    let started = Instant::now();
    let mut shadow: Option<Shadow> = None;
    let mut first_frame = true;
    let mut last_flush = Instant::now() - FLUSH_INTERVAL;
    let mut flush_at: Option<tokio::time::Instant> = None;
    let mut stats = Stats::default();
    let mut total_bytes: u64 = 0;
    let mut stats_tick = tokio::time::interval(Duration::from_secs(1));

    loop {
        tokio::select! {
            event = rx.recv() => {
                let Some(event) = event else {
                    return "Verbindung beendet".to_owned();
                };
                match event {
                    RdpOutputEvent::Connected => {
                        tracing::info!(session_id, elapsed_ms = started.elapsed().as_millis(), "rdp connected (activation done)");
                    }
                    RdpOutputEvent::DesktopUpdate(update) => {
                        let t = Instant::now();
                        let (pixels, w, h, region) = update.into_parts();
                        let (w, h) = (usize::from(w.get()), usize::from(h.get()));
                        if shadow.as_ref().is_none_or(|s| s.width != w || s.height != h) {
                            tracing::info!(session_id, width = w, height = h, "rdp framebuffer size");
                            shadow = Some(Shadow::new(w, h));
                            if let Ok(mut size) = session.size.lock() {
                                *size = (w.get_u16(), h.get_u16());
                            }
                            let _ = app.emit("rdp://size", SizeEvent {
                                session_id: session_id.to_owned(),
                                width: w.get_u16(),
                                height: h.get_u16(),
                            });
                        }
                        let rect = Rect {
                            x: usize::from(region.left),
                            y: usize::from(region.top),
                            w: usize::from(region.right - region.left) + 1,
                            h: usize::from(region.bottom - region.top) + 1,
                        };
                        if let Some(s) = shadow.as_mut() {
                            s.apply(&pixels, rect);
                        }
                        stats.updates += 1;
                        stats.copy += t.elapsed();
                        if first_frame {
                            first_frame = false;
                            let millis = started.elapsed().as_millis();
                            tracing::info!(session_id, elapsed_ms = millis, width = w, height = h, "first frame");
                            let _ = app.emit("rdp://connected", ConnectedEvent {
                                session_id: session_id.to_owned(),
                                millis,
                                width: w.get_u16(),
                                height: h.get_u16(),
                            });
                        }
                        if flush_at.is_none() {
                            let at = (last_flush + FLUSH_INTERVAL).max(Instant::now());
                            flush_at = Some(tokio::time::Instant::from_std(at));
                        }
                    }
                    RdpOutputEvent::Image { width, height, .. } => {
                        tracing::debug!(session_id, %width, %height, "unexpected full image event ignored");
                    }
                    RdpOutputEvent::ConnectionFailure(e) => {
                        return format!("Verbindung fehlgeschlagen: {e}");
                    }
                    RdpOutputEvent::Terminated(result) => {
                        return match result {
                            Ok(reason) => format!("Sitzung beendet: {reason}"),
                            Err(e) => format!("Sitzung abgebrochen: {e}"),
                        };
                    }
                    RdpOutputEvent::AutoReconnecting { response, .. } => {
                        let _ = response.send(ironrdp_client::rdp::AutoReconnectDecision::Stop);
                    }
                    other => tracing::debug!(session_id, event = ?std::mem::discriminant(&other), "rdp output event"),
                }
            }
            _ = async {
                match flush_at {
                    Some(at) => tokio::time::sleep_until(at).await,
                    None => std::future::pending().await,
                }
            } => {
                flush_at = None;
                last_flush = Instant::now();
                let Some(s) = shadow.as_mut() else { continue };
                let t = Instant::now();
                let rects = s.take_rects();
                let packets: Vec<Vec<u8>> = rects.iter().map(|r| s.packet(*r)).collect();
                stats.copy += t.elapsed();
                stats.flushes += 1;
                for p in packets {
                    stats.packets += 1;
                    stats.bytes += p.len() as u64;
                    total_bytes += p.len() as u64;
                    let t = Instant::now();
                    if on_frame.send(InvokeResponseBody::Raw(p)).is_err() {
                        return "Oberfläche nicht erreichbar".to_owned();
                    }
                    stats.send += t.elapsed();
                }
            }
            _ = stats_tick.tick() => {
                if stats.updates > 0 || stats.flushes > 0 {
                    let copy_ms = stats.copy.as_secs_f64() * 1000.0;
                    tracing::info!(
                        session_id,
                        updates = stats.updates,
                        fps = stats.flushes,
                        packets = stats.packets,
                        kib = stats.bytes / 1024,
                        total_kib = total_bytes / 1024,
                        copy_ms = format!("{copy_ms:.1}"),
                        send_ms = format!("{:.1}", stats.send.as_secs_f64() * 1000.0),
                        "rdp stats (1 s)"
                    );
                    let _ = app.emit("rdp://stats", StatsEvent {
                        session_id: session_id.to_owned(),
                        updates: stats.updates,
                        fps: stats.flushes,
                        packets: stats.packets,
                        bytes: stats.bytes,
                        copy_ms,
                    });
                }
                stats = Stats::default();
            }
        }
    }
}

trait GetU16 {
    fn get_u16(self) -> u16;
}

impl GetU16 for usize {
    /// Framebuffer sizes come from `NonZeroU16`, so this never saturates in practice.
    fn get_u16(self) -> u16 {
        u16::try_from(self).unwrap_or(u16::MAX)
    }
}

/// Input from the canvas. Coordinates are framebuffer pixels.
#[derive(Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum InputEvent {
    MouseMove {
        x: i32,
        y: i32,
    },
    MouseButton {
        button: u8,
        pressed: bool,
        x: i32,
        y: i32,
    },
    Wheel {
        delta_y: f64,
        x: i32,
        y: i32,
    },
    Key {
        code: String,
        pressed: bool,
    },
    ReleaseAll,
}

/// Synchronous on purpose: sync commands run in arrival order, so key and mouse
/// events keep their sequence.
#[tauri::command]
pub fn rdp_input(
    state: State<'_, RdpState>,
    session_id: String,
    event: InputEvent,
) -> Result<(), String> {
    let session = state.session(&session_id)?;
    let (w, h) = *session
        .size
        .lock()
        .map_err(|_| "Interner Fehler".to_owned())?;
    let pos = |x: i32, y: i32| MousePosition {
        x: u16::try_from(x.clamp(0, i32::from(w) - 1)).unwrap_or(0),
        y: u16::try_from(y.clamp(0, i32::from(h) - 1)).unwrap_or(0),
    };

    let mut db = session
        .db
        .lock()
        .map_err(|_| "Interner Fehler".to_owned())?;
    let events = match event {
        InputEvent::MouseMove { x, y } => db.apply([Operation::MouseMove(pos(x, y))]),
        InputEvent::MouseButton {
            button,
            pressed,
            x,
            y,
        } => {
            let Some(button) = MouseButton::from_web_button(button) else {
                return Ok(());
            };
            let op = if pressed {
                Operation::MouseButtonPressed(button)
            } else {
                Operation::MouseButtonReleased(button)
            };
            db.apply([Operation::MouseMove(pos(x, y)), op])
        }
        InputEvent::Wheel { delta_y, x, y } => {
            if delta_y == 0.0 {
                return Ok(());
            }
            // Browser: positive = scroll down; RDP: positive = away from the user (up).
            let rotation_units = if delta_y > 0.0 { -120 } else { 120 };
            db.apply([
                Operation::MouseMove(pos(x, y)),
                Operation::WheelRotations(WheelRotations {
                    is_vertical: true,
                    rotation_units,
                }),
            ])
        }
        InputEvent::Key { code, pressed } => {
            let Some(sc) = scancode(&code) else {
                tracing::debug!(%code, "unmapped key code");
                return Ok(());
            };
            let op = if pressed {
                Operation::KeyPressed(sc)
            } else {
                Operation::KeyReleased(sc)
            };
            db.apply([op])
        }
        InputEvent::ReleaseAll => db.release_all(),
    };
    drop(db);
    if events.is_empty() {
        return Ok(());
    }
    session
        .input
        .try_send(RdpInputEvent::FastPath(events))
        .map_err(|_| "Eingabe nicht zugestellt".to_owned())
}

#[tauri::command]
pub fn rdp_resize(
    state: State<'_, RdpState>,
    session_id: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let (width, height) = desktop_size(width, height)?;
    let session = state.session(&session_id)?;
    tracing::info!(session_id, width, height, "rdp resize requested");
    session
        .input
        .try_send(RdpInputEvent::Resize {
            width,
            height,
            scale_factor: 100,
            physical_size: None,
        })
        .map_err(|_| "Größenänderung nicht zugestellt".to_owned())
}

/// `KeyboardEvent.code` → PC/AT scancode set 1 (layout independent, like RDP expects).
fn scancode(code: &str) -> Option<Scancode> {
    let (ext, sc): (bool, u8) = match code {
        "Escape" => (false, 0x01),
        "Digit1" => (false, 0x02),
        "Digit2" => (false, 0x03),
        "Digit3" => (false, 0x04),
        "Digit4" => (false, 0x05),
        "Digit5" => (false, 0x06),
        "Digit6" => (false, 0x07),
        "Digit7" => (false, 0x08),
        "Digit8" => (false, 0x09),
        "Digit9" => (false, 0x0A),
        "Digit0" => (false, 0x0B),
        "Minus" => (false, 0x0C),
        "Equal" => (false, 0x0D),
        "Backspace" => (false, 0x0E),
        "Tab" => (false, 0x0F),
        "KeyQ" => (false, 0x10),
        "KeyW" => (false, 0x11),
        "KeyE" => (false, 0x12),
        "KeyR" => (false, 0x13),
        "KeyT" => (false, 0x14),
        "KeyY" => (false, 0x15),
        "KeyU" => (false, 0x16),
        "KeyI" => (false, 0x17),
        "KeyO" => (false, 0x18),
        "KeyP" => (false, 0x19),
        "BracketLeft" => (false, 0x1A),
        "BracketRight" => (false, 0x1B),
        "Enter" => (false, 0x1C),
        "ControlLeft" => (false, 0x1D),
        "KeyA" => (false, 0x1E),
        "KeyS" => (false, 0x1F),
        "KeyD" => (false, 0x20),
        "KeyF" => (false, 0x21),
        "KeyG" => (false, 0x22),
        "KeyH" => (false, 0x23),
        "KeyJ" => (false, 0x24),
        "KeyK" => (false, 0x25),
        "KeyL" => (false, 0x26),
        "Semicolon" => (false, 0x27),
        "Quote" => (false, 0x28),
        "Backquote" => (false, 0x29),
        "ShiftLeft" => (false, 0x2A),
        "Backslash" => (false, 0x2B),
        "KeyZ" => (false, 0x2C),
        "KeyX" => (false, 0x2D),
        "KeyC" => (false, 0x2E),
        "KeyV" => (false, 0x2F),
        "KeyB" => (false, 0x30),
        "KeyN" => (false, 0x31),
        "KeyM" => (false, 0x32),
        "Comma" => (false, 0x33),
        "Period" => (false, 0x34),
        "Slash" => (false, 0x35),
        "ShiftRight" => (false, 0x36),
        "NumpadMultiply" => (false, 0x37),
        "AltLeft" => (false, 0x38),
        "Space" => (false, 0x39),
        "CapsLock" => (false, 0x3A),
        "F1" => (false, 0x3B),
        "F2" => (false, 0x3C),
        "F3" => (false, 0x3D),
        "F4" => (false, 0x3E),
        "F5" => (false, 0x3F),
        "F6" => (false, 0x40),
        "F7" => (false, 0x41),
        "F8" => (false, 0x42),
        "F9" => (false, 0x43),
        "F10" => (false, 0x44),
        "NumLock" => (false, 0x45),
        "ScrollLock" => (false, 0x46),
        "Numpad7" => (false, 0x47),
        "Numpad8" => (false, 0x48),
        "Numpad9" => (false, 0x49),
        "NumpadSubtract" => (false, 0x4A),
        "Numpad4" => (false, 0x4B),
        "Numpad5" => (false, 0x4C),
        "Numpad6" => (false, 0x4D),
        "NumpadAdd" => (false, 0x4E),
        "Numpad1" => (false, 0x4F),
        "Numpad2" => (false, 0x50),
        "Numpad3" => (false, 0x51),
        "Numpad0" => (false, 0x52),
        "NumpadDecimal" => (false, 0x53),
        "IntlBackslash" => (false, 0x56),
        "F11" => (false, 0x57),
        "F12" => (false, 0x58),
        "NumpadEnter" => (true, 0x1C),
        "ControlRight" => (true, 0x1D),
        "NumpadDivide" => (true, 0x35),
        "PrintScreen" => (true, 0x37),
        "AltRight" => (true, 0x38),
        "Home" => (true, 0x47),
        "ArrowUp" => (true, 0x48),
        "PageUp" => (true, 0x49),
        "ArrowLeft" => (true, 0x4B),
        "ArrowRight" => (true, 0x4D),
        "End" => (true, 0x4F),
        "ArrowDown" => (true, 0x50),
        "PageDown" => (true, 0x51),
        "Insert" => (true, 0x52),
        "Delete" => (true, 0x53),
        "MetaLeft" => (true, 0x5B),
        "MetaRight" => (true, 0x5C),
        "ContextMenu" => (true, 0x5D),
        _ => return None,
    };
    Some(Scancode::from_u8(ext, sc))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shadow_packet_layout() {
        let mut s = Shadow::new(4, 3);
        s.apply(
            &[0x00112233, 0x00445566],
            Rect {
                x: 1,
                y: 2,
                w: 2,
                h: 1,
            },
        );
        let rects = s.take_rects();
        assert_eq!(rects.len(), 1);
        let p = s.packet(rects[0]);
        assert_eq!(&p[..16], &[1, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0]);
        assert_eq!(&p[16..], &[0x11, 0x22, 0x33, 255, 0x44, 0x55, 0x66, 255]);
    }

    #[test]
    fn distant_regions_stay_separate() {
        let mut s = Shadow::new(1000, 1000);
        s.dirty = vec![
            Rect {
                x: 0,
                y: 0,
                w: 10,
                h: 10,
            },
            Rect {
                x: 900,
                y: 900,
                w: 10,
                h: 10,
            },
        ];
        assert_eq!(s.take_rects().len(), 2);
        s.dirty = vec![
            Rect {
                x: 0,
                y: 0,
                w: 10,
                h: 10,
            },
            Rect {
                x: 5,
                y: 5,
                w: 10,
                h: 10,
            },
        ];
        assert_eq!(s.take_rects().len(), 1);
    }

    #[test]
    fn key_codes() {
        assert_eq!(scancode("KeyA").map(Scancode::as_u16), Some(0x1E));
        assert_eq!(scancode("ArrowUp").map(Scancode::as_u16), Some(0xE048));
        assert!(scancode("Unidentified").is_none());
    }
}
