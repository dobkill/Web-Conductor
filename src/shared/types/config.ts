export interface ExtensionConfig {
  serverUrl: string;
  enabled: boolean;
}

export const defaultConfig: ExtensionConfig = {
  serverUrl: "",
  enabled: false
};
