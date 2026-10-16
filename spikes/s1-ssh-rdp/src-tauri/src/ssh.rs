//! SSH tab of the spike: russh client, raw bytes to xterm.js over a Tauri channel,
//! host-key prompt answered by the UI via a oneshot.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::{Context, anyhow, bail};
use russh::keys::{HashAlg, PublicKeyOrCertificate};
use russh::{ChannelMsg, client};
use serde::Serialize;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::{mpsc, oneshot};

/// Spike only: credentials of the throwaway test server.
const SSH_USER: &str = "tester";
const SSH_PASSWORD: &str = "tester";
const PROMPT_TIMEOUT: Duration = Duration::from_secs(120);

pub enum Cmd {
    Write(Vec<u8>),
    Resize(u32, u32),
    Close,
}

#[derive(Default)]
pub struct SshState {
    next_id: AtomicU64,
    sessions: Mutex<HashMap<String, mpsc::Sender<Cmd>>>,
    prompts: Mutex<HashMap<String, oneshot::Sender<bool>>>,
}

impl SshState {
    fn next_id(&self, prefix: &str) -> String {
        format!(
            "{prefix}-{}",
            self.next_id.fetch_add(1, Ordering::Relaxed) + 1
        )
    }

    fn sender(&self, session_id: &str) -> Result<mpsc::Sender<Cmd>, String> {
        self.sessions
            .lock()
            .map_err(|_| "Interner Fehler".to_owned())?
            .get(session_id)
            .cloned()
            .ok_or_else(|| "Sitzung nicht gefunden".to_owned())
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct HostKeyEvent {
    request_id: Option<String>,
    session_id: String,
    host: String,
    algorithm: String,
    fingerprint: String,
    status: &'static str,
    auto_accepted: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ClosedEvent {
    session_id: String,
    reason: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectedEvent {
    session_id: String,
    millis: u128,
}

struct Handler {
    app: AppHandle,
    session_id: String,
    host: String,
    auto: bool,
}

impl client::Handler for Handler {
    type Error = anyhow::Error;

    async fn check_server_key(&mut self, key: &PublicKeyOrCertificate) -> anyhow::Result<bool> {
        let (algorithm, fingerprint) = match key {
            PublicKeyOrCertificate::PublicKey { key, .. } => (
                key.algorithm().to_string(),
                key.fingerprint(HashAlg::Sha256).to_string(),
            ),
            PublicKeyOrCertificate::Certificate(cert) => (
                cert.algorithm().to_string(),
                cert.public_key().fingerprint(HashAlg::Sha256).to_string(),
            ),
        };
        tracing::info!(session_id = %self.session_id, host = %self.host, %algorithm, %fingerprint, "server host key");

        let mut event = HostKeyEvent {
            request_id: None,
            session_id: self.session_id.clone(),
            host: self.host.clone(),
            algorithm,
            fingerprint,
            status: "unknown",
            auto_accepted: self.auto,
        };

        if self.auto {
            // Spike only: auto mode trusts the key, but the UI still shows the fingerprint.
            tracing::warn!(session_id = %self.session_id, "auto mode: host key accepted without prompt");
            self.app.emit("ssh://host-key", event)?;
            return Ok(true);
        }

        let state = self.app.state::<SshState>();
        let request_id = state.next_id("prompt");
        let (tx, rx) = oneshot::channel();
        state
            .prompts
            .lock()
            .map_err(|_| anyhow!("prompt map poisoned"))?
            .insert(request_id.clone(), tx);
        event.request_id = Some(request_id.clone());
        self.app.emit("ssh://host-key", event)?;

        let answer = tokio::time::timeout(PROMPT_TIMEOUT, rx).await;
        if let Ok(mut prompts) = state.prompts.lock() {
            prompts.remove(&request_id);
        }
        let trusted = matches!(answer, Ok(Ok(true)));
        tracing::info!(session_id = %self.session_id, trusted, "host key prompt answered");
        Ok(trusted)
    }
}

#[tauri::command]
pub fn ssh_connect(
    app: AppHandle,
    state: State<'_, SshState>,
    addr: String,
    cols: u32,
    rows: u32,
    on_data: Channel<InvokeResponseBody>,
) -> Result<String, String> {
    if addr.trim().is_empty() || addr.len() > 255 {
        return Err("Ungültige Adresse".to_owned());
    }
    let session_id = state.next_id("ssh");
    let (tx, rx) = mpsc::channel::<Cmd>(256);
    state
        .sessions
        .lock()
        .map_err(|_| "Interner Fehler".to_owned())?
        .insert(session_id.clone(), tx);

    let auto = crate::auto_mode().as_deref() == Some("ssh");
    let sid = session_id.clone();
    tauri::async_runtime::spawn(async move {
        let reason = match run_session(&app, &sid, &addr, cols, rows, auto, on_data, rx).await {
            Ok(reason) => reason,
            Err(e) => {
                tracing::warn!(session_id = %sid, error = %format!("{e:#}"), "ssh session failed");
                format!("{e:#}")
            }
        };
        if let Ok(mut sessions) = app.state::<SshState>().sessions.lock() {
            sessions.remove(&sid);
        }
        tracing::info!(session_id = %sid, %reason, "ssh session closed");
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

#[allow(clippy::too_many_arguments)]
async fn run_session(
    app: &AppHandle,
    session_id: &str,
    addr: &str,
    cols: u32,
    rows: u32,
    auto: bool,
    on_data: Channel<InvokeResponseBody>,
    mut cmds: mpsc::Receiver<Cmd>,
) -> anyhow::Result<String> {
    let started = Instant::now();
    let config = Arc::new(client::Config {
        keepalive_interval: Some(Duration::from_secs(15)),
        ..Default::default()
    });
    let handler = Handler {
        app: app.clone(),
        session_id: session_id.to_owned(),
        host: addr.to_owned(),
        auto,
    };
    let mut handle = tokio::time::timeout(
        Duration::from_secs(150),
        client::connect(config, addr, handler),
    )
    .await
    .context("Zeitüberschreitung beim Verbinden")?
    .context("Verbindung fehlgeschlagen (oder Host-Key abgelehnt)")?;

    let auth = handle
        .authenticate_password(SSH_USER, SSH_PASSWORD)
        .await
        .context("Anmeldung fehlgeschlagen")?;
    if !auth.success() {
        bail!("Anmeldung abgelehnt");
    }

    let mut channel = handle
        .channel_open_session()
        .await
        .context("Kanal konnte nicht geöffnet werden")?;
    channel
        .request_pty(false, "xterm-256color", cols.max(1), rows.max(1), 0, 0, &[])
        .await
        .context("PTY-Anforderung fehlgeschlagen")?;
    channel
        .request_shell(false)
        .await
        .context("Shell-Anforderung fehlgeschlagen")?;
    tracing::info!(
        session_id,
        elapsed_ms = started.elapsed().as_millis(),
        "shell requested"
    );

    let mut first_data = true;
    let mut exit_status: Option<u32> = None;
    loop {
        tokio::select! {
            msg = channel.wait() => match msg {
                Some(ChannelMsg::Data { data }) | Some(ChannelMsg::ExtendedData { data, .. }) => {
                    if first_data {
                        first_data = false;
                        let millis = started.elapsed().as_millis();
                        tracing::info!(session_id, elapsed_ms = millis, "first data");
                        let _ = app.emit("ssh://connected", ConnectedEvent { session_id: session_id.to_owned(), millis });
                    }
                    on_data
                        .send(InvokeResponseBody::Raw(data.to_vec()))
                        .context("Oberfläche nicht erreichbar")?;
                }
                Some(ChannelMsg::ExitStatus { exit_status: code }) => exit_status = Some(code),
                Some(ChannelMsg::Eof) | Some(ChannelMsg::Close) | None => break,
                Some(_) => {}
            },
            cmd = cmds.recv() => match cmd {
                Some(Cmd::Write(bytes)) => channel.data(&bytes[..]).await.context("Senden fehlgeschlagen")?,
                Some(Cmd::Resize(c, r)) => channel
                    .window_change(c.max(1), r.max(1), 0, 0)
                    .await
                    .context("Größenänderung fehlgeschlagen")?,
                Some(Cmd::Close) | None => {
                    let _ = channel.close().await;
                    let _ = handle.disconnect(russh::Disconnect::ByApplication, "", "de").await;
                    return Ok("vom Benutzer beendet".to_owned());
                }
            },
        }
    }
    Ok(match exit_status {
        Some(code) => format!("Shell beendet (Exit-Code {code})"),
        None => "vom Server getrennt".to_owned(),
    })
}

#[tauri::command]
pub async fn ssh_write(
    state: State<'_, SshState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    let tx = state.sender(&session_id)?;
    tx.send(Cmd::Write(data.into_bytes()))
        .await
        .map_err(|_| "Sitzung beendet".to_owned())
}

#[tauri::command]
pub async fn ssh_resize(
    state: State<'_, SshState>,
    session_id: String,
    cols: u32,
    rows: u32,
) -> Result<(), String> {
    if cols == 0 || rows == 0 || cols > 1000 || rows > 1000 {
        return Err("Ungültige Größe".to_owned());
    }
    let tx = state.sender(&session_id)?;
    tx.send(Cmd::Resize(cols, rows))
        .await
        .map_err(|_| "Sitzung beendet".to_owned())
}

/// Closes an SSH session; called by the shared `session_close` command.
pub async fn close(state: &SshState, session_id: &str) -> Result<(), String> {
    let tx = state.sender(session_id)?;
    tx.send(Cmd::Close)
        .await
        .map_err(|_| "Sitzung beendet".to_owned())
}

#[tauri::command]
pub fn prompt_answer(
    state: State<'_, SshState>,
    request_id: String,
    accept: bool,
) -> Result<(), String> {
    let tx = state
        .prompts
        .lock()
        .map_err(|_| "Interner Fehler".to_owned())?
        .remove(&request_id)
        .ok_or_else(|| "Rückfrage nicht mehr offen".to_owned())?;
    tx.send(accept)
        .map_err(|_| "Rückfrage nicht mehr offen".to_owned())
}
