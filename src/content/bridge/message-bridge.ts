import type { RuntimeRequest, RuntimeResponse } from "../../shared/types/message";
import { buildSnapshot } from "../dom/snapshot";
import { executeAction } from "../executor/action-executor";

export function registerMessageBridge(): void {
  chrome.runtime.onMessage.addListener((message: RuntimeRequest, _sender, sendResponse) => {
    if (message.type === "collectSnapshot") {
      sendResponse({
        ok: true,
        snapshot: buildSnapshot(Boolean(message.includeSensitiveContext))
      } satisfies RuntimeResponse);
      return true;
    }

    if (message.type === "executeCommand") {
      void executeAction(message.command).then((result) => {
        sendResponse({
          ok: true,
          result
        } satisfies RuntimeResponse);
      });
      return true;
    }

    if (message.type === "getStatus") {
      sendResponse({
        ok: true,
        status: "ready"
      } satisfies RuntimeResponse);
      return true;
    }

    return false;
  });
}
