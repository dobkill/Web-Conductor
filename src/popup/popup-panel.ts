import { getConfig, setConfig } from "../shared/storage/config-storage";
import { isValidServerUrl } from "../shared/utils/validators";

interface Elements {
  serverUrl: HTMLInputElement;
  enabled: HTMLInputElement;
  testButton: HTMLButtonElement;
  statusText: HTMLElement;
  versionText: HTMLElement;
  docsButton: HTMLButtonElement;
  logButton: HTMLButtonElement;
}

function getElements(): Elements {
  return {
    serverUrl: document.querySelector("#serverUrl") as HTMLInputElement,
    enabled: document.querySelector("#enabled") as HTMLInputElement,
    testButton: document.querySelector("#testButton") as HTMLButtonElement,
    statusText: document.querySelector("#statusText") as HTMLElement,
    versionText: document.querySelector("#versionText") as HTMLElement,
    docsButton: document.querySelector("#docsButton") as HTMLButtonElement,
    logButton: document.querySelector("#logButton") as HTMLButtonElement
  };
}

function renderStatus(elements: Elements, text: string): void {
  elements.statusText.textContent = `状态：${text}`;
  elements.statusText.dataset.status = text;
}

async function saveConfigFromForm(elements: Elements): Promise<void> {
  const serverUrl = elements.serverUrl.value.trim();

  if (serverUrl && !isValidServerUrl(serverUrl)) {
    renderStatus(elements, "服务器地址格式无效");
    return;
  }

  await setConfig({
    serverUrl,
    enabled: elements.enabled.checked
  });

  renderStatus(elements, "配置已自动保存");
}

async function testConnection(elements: Elements): Promise<void> {
  const serverUrl = elements.serverUrl.value.trim();

  if (!serverUrl) {
    renderStatus(elements, "未配置服务端");
    return;
  }

  if (!isValidServerUrl(serverUrl)) {
    renderStatus(elements, "服务器地址格式无效");
    return;
  }

  renderStatus(elements, "testing");
  const response = await chrome.runtime.sendMessage({ type: "popup:testConnection", serverUrl });
  renderStatus(elements, response.status || (response.ok ? "connected" : "disconnected"));
}

function openDocs(elements: Elements): void {
  const serverUrl = elements.serverUrl.value.trim();
  if (!serverUrl) {
    renderStatus(elements, "请先填写服务器地址");
    return;
  }

  try {
    const url = new URL(serverUrl);
    url.pathname = "/docs";
    chrome.tabs.create({ url: url.toString().replace(/^ws/, "http") });
  } catch {
    renderStatus(elements, "无法生成文档地址");
  }
}

function openCommandLog(): void {
  chrome.tabs.create({ url: chrome.runtime.getURL("command-log.html") });
}

export async function mountPopup(): Promise<void> {
  const elements = getElements();
  const config = await getConfig();
  let saveTimer: number | undefined;

  elements.serverUrl.value = config.serverUrl;
  elements.enabled.checked = config.enabled;
  elements.versionText.textContent = `版本 ${chrome.runtime.getManifest().version}`;

  const statusResponse = await chrome.runtime.sendMessage({ type: "popup:getStatus" });
  renderStatus(elements, statusResponse.status || "idle");

  elements.serverUrl.addEventListener("input", () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void saveConfigFromForm(elements);
    }, 400);
  });

  elements.serverUrl.addEventListener("change", () => {
    void saveConfigFromForm(elements);
  });

  elements.enabled.addEventListener("change", () => {
    void saveConfigFromForm(elements);
  });

  elements.testButton.addEventListener("click", () => {
    void testConnection(elements);
  });

  elements.docsButton.addEventListener("click", () => {
    openDocs(elements);
  });

  elements.logButton.addEventListener("click", () => {
    openCommandLog();
  });
}
