import { defaultConfig, type ExtensionConfig } from "../types/config";

const CONFIG_KEY = "extensionConfig";

export async function getConfig(): Promise<ExtensionConfig> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return { ...defaultConfig, ...(stored[CONFIG_KEY] as Partial<ExtensionConfig> | undefined) };
}

export async function setConfig(config: ExtensionConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

export async function patchConfig(partial: Partial<ExtensionConfig>): Promise<ExtensionConfig> {
  const next = { ...(await getConfig()), ...partial };
  await setConfig(next);
  return next;
}
