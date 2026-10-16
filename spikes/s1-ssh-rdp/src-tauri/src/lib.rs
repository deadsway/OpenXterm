use serde::Serialize;

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

#[tauri::command]
fn spike_config() -> SpikeConfig {
    let auto = std::env::var("OX_SPIKE_AUTO")
        .ok()
        .map(|v| v.trim().to_ascii_lowercase())
        .filter(|v| v == "ssh" || v == "rdp");
    SpikeConfig {
        ssh_addr: env_or("OX_SSH_ADDR", DEFAULT_SSH_ADDR),
        rdp_addr: env_or("OX_RDP_ADDR", DEFAULT_RDP_ADDR),
        auto,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![spike_config])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
