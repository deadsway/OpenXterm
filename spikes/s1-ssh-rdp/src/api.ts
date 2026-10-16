import { invoke } from "@tauri-apps/api/core";

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
