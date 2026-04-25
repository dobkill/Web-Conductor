import { WsClient } from "./connection/ws-client";
import { isControllableTab, resolveCommandTabId, routeCommand } from "./handlers/command-router";
import { requestSnapshot } from "./handlers/snapshot-handler";
import { getSessionState, updateSessionState } from "./state/session-store";
import { addCommandLog, clearCommandLogs, completeCommandLog, getCommandLogs } from "../shared/storage/command-log-storage";
import { getConfig } from "../shared/storage/config-storage";
import { log } from "../shared/utils/logger";

let client: WsClient | null = null;
let connectedServerUrl = "";
let lastControllableTabId: number | undefined;

function makeActionIcon(enabled: boolean, size: number): ImageData {
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create action icon context");
  }

  const scale = size / 128;
  const fill = enabled ? "#b54d2e" : "#8f96a3";
  const shadow = enabled ? "rgba(145, 56, 29, 0.25)" : "rgba(31, 36, 48, 0.18)";

  context.clearRect(0, 0, size, size);
  context.fillStyle = shadow;
  context.beginPath();
  context.roundRect(18 * scale, 20 * scale, 92 * scale, 92 * scale, 24 * scale);
  context.fill();

  context.fillStyle = fill;
  context.beginPath();
  context.roundRect(14 * scale, 14 * scale, 92 * scale, 92 * scale, 24 * scale);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = `700 ${62 * scale}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("A", 60 * scale, 64 * scale);

  if (!enabled) {
    context.strokeStyle = "#ffffff";
    context.lineWidth = 10 * scale;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(32 * scale, 96 * scale);
    context.lineTo(96 * scale, 32 * scale);
    context.stroke();
  }

  return context.getImageData(0, 0, size, size);
}

async function updateActionIcon(enabled: boolean): Promise<void> {
  try {
    await chrome.action.setIcon({
      imageData: {
        16: makeActionIcon(enabled, 16),
        32: makeActionIcon(enabled, 32),
        48: makeActionIcon(enabled, 48),
        128: makeActionIcon(enabled, 128)
      }
    });
  } catch (error) {
    log("warn", "Unable to update action icon", error);
  }
}

async function testWebSocketConnection(serverUrl: string, timeoutMs = 3_000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let socket: WebSocket | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (ok: boolean): void => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }

      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        socket.close();
      }

      resolve(ok);
    };

    timeout = setTimeout(() => {
      finish(false);
    }, timeoutMs);

    try {
      socket = new WebSocket(serverUrl);
    } catch {
      clearTimeout(timeout);
      resolve(false);
      return;
    }

    socket.addEventListener("open", () => {
      finish(true);
    });

    socket.addEventListener("error", () => {
      finish(false);
    });

    socket.addEventListener("close", () => {
      finish(false);
    });
  });
}

async function ensureConnection(): Promise<void> {
  const config = await getConfig();
  updateSessionState({ enabled: config.enabled });
  await updateActionIcon(config.enabled);

  if (!config.enabled || !config.serverUrl) {
    client?.disconnect();
    client = null;
    connectedServerUrl = "";
    return;
  }

  if (client && connectedServerUrl !== config.serverUrl) {
    client.disconnect();
    client = null;
  }

  if (!client) {
    const { clientId } = getSessionState();
    connectedServerUrl = config.serverUrl;
    client = new WsClient({
      url: config.serverUrl,
      clientId,
      onCommand: async (message) => {
        const targetTabId =
          message.payload.action === "createTab"
            ? message.tabId
            : await resolveCommandTabId(message.payload, message.tabId, lastControllableTabId);
        const logId = await addCommandLog(message.payload, targetTabId);
        const result = await routeCommand(message.payload, targetTabId, lastControllableTabId);
        await completeCommandLog(logId, result);
        client?.sendCommandResult(targetTabId ?? message.tabId, result);
      },
      onStatusChange: (status) => {
        updateSessionState({ connectionStatus: status });
      }
    });
  }

  client.connect();
}

async function uploadSnapshotForTab(tabId: number): Promise<void> {
  if (!client) {
    return;
  }

  const tab = await chrome.tabs.get(tabId).catch(() => undefined);
  if (!isControllableTab(tab)) {
    return;
  }

  lastControllableTabId = tabId;

  const payload = await requestSnapshot(tabId, true);
  if (!payload) {
    return;
  }

  client.sendSnapshot(tabId, payload);
}

chrome.runtime.onInstalled.addListener(() => {
  void ensureConnection();
});

chrome.runtime.onStartup.addListener(() => {
  void ensureConnection();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes.extensionConfig) {
    return;
  }

  void ensureConnection();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void uploadSnapshotForTab(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") {
    void uploadSnapshotForTab(tabId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "popup:testConnection") {
    void (async () => {
      const config = await getConfig();
      const serverUrl = typeof message.serverUrl === "string" ? message.serverUrl.trim() : config.serverUrl;
      const ok = serverUrl ? await testWebSocketConnection(serverUrl) : false;

      sendResponse({
        ok,
        status: ok ? "connected" : "disconnected"
      });
    })();

    return true;
  }

  if (message.type === "popup:getStatus") {
    sendResponse({
      ok: true,
      status: getSessionState().connectionStatus,
      enabled: getSessionState().enabled
    });
  }

  if (message.type === "commandLog:get") {
    void (async () => {
      sendResponse({
        ok: true,
        logs: await getCommandLogs()
      });
    })();

    return true;
  }

  if (message.type === "commandLog:clear") {
    void (async () => {
      await clearCommandLogs();
      sendResponse({
        ok: true,
        logs: []
      });
    })();

    return true;
  }

  return false;
});

void ensureConnection().catch((error) => {
  log("error", "Background bootstrap failed", error);
});
