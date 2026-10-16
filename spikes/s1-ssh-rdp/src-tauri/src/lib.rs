use serde::Serialize;

mod rdp;
mod ssh;

const DEFAULT_SSH_ADDR: &str = "127.0.0.1:2222";
const DEFAULT_RDP_ADDR: &str = "127.0.0.1:3389";

/// Runtime configuration of the spike, read from environment variables.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SpikeConfig {
    ssh_addr: String,
    rdp_addr: String,
    /// `OX_SPIKE_AUTO`: "ssh" or "rdp" opens that tab right away.
    auto: Option<String>,
}

fn env_or(name: &str, default: &str) -> String {
    std::env::var(name)
        .ok()
        .map(|v| v.trim().to_owned())
        .filter(|v| !v.is_empty())
        .unwrap_or_else(|| default.to_owned())
}

/// `OX_SPIKE_AUTO`, normalised to "ssh" or "rdp".
fn auto_mode() -> Option<String> {
    std::env::var("OX_SPIKE_AUTO")
        .ok()
        .map(|v| v.trim().to_ascii_lowercase())
        .filter(|v| v == "ssh" || v == "rdp")
}

#[tauri::command]
fn spike_config() -> SpikeConfig {
    let auto = auto_mode();
    SpikeConfig {
        ssh_addr: env_or("OX_SSH_ADDR", DEFAULT_SSH_ADDR),
        rdp_addr: env_or("OX_RDP_ADDR", DEFAULT_RDP_ADDR),
        auto,
    }
}

/// Closes an SSH or RDP session.
#[tauri::command]
async fn session_close(
    ssh_state: tauri::State<'_, ssh::SshState>,
    rdp_state: tauri::State<'_, rdp::RdpState>,
    session_id: String,
) -> Result<(), String> {
    if rdp_state.close(&session_id)? {
        return Ok(());
    }
    ssh::close(&ssh_state, &session_id).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                tracing_subscriber::EnvFilter::new("info,russh=warn,ironrdp=info")
            }),
        )
        .init();

    tauri::Builder::default()
        .manage(ssh::SshState::default())
        .manage(rdp::RdpState::default())
        .invoke_handler(tauri::generate_handler![
            spike_config,
            ssh::ssh_connect,
            ssh::ssh_write,
            ssh::ssh_resize,
            ssh::prompt_answer,
            session_close,
            rdp::rdp_connect,
            rdp::rdp_input,
            rdp::rdp_resize
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
