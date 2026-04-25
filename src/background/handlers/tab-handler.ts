import type { CommandPayload, CommandResultPayload } from "../../shared/types/command";
import { ERROR_CODES } from "../../shared/constants/error-codes";

function success(commandId: string, result: Record<string, unknown> = {}): CommandResultPayload {
  return {
    commandId,
    success: true,
    errorCode: null,
    errorMessage: null,
    result
  };
}

function failure(commandId: string, errorCode: string, errorMessage: string): CommandResultPayload {
  return {
    commandId,
    success: false,
    errorCode,
    errorMessage,
    result: {}
  };
}

export async function handleTabCommand(command: CommandPayload, senderTabId?: number): Promise<CommandResultPayload> {
  try {
    switch (command.action) {
      case "createTab": {
        const url = typeof command.params.url === "string" ? command.params.url : "about:blank";
        const tab = await chrome.tabs.create({ url });
        return success(command.commandId, { tabId: tab.id });
      }
      case "closeTab": {
        const tabId = Number(command.params.tabId ?? senderTabId);
        if (!tabId) {
          return failure(command.commandId, ERROR_CODES.tabNotFound, "No tabId provided");
        }

        await chrome.tabs.remove(tabId);
        return success(command.commandId, { tabId });
      }
      case "switchTab": {
        const tabId = Number(command.params.tabId);
        if (!tabId) {
          return failure(command.commandId, ERROR_CODES.tabNotFound, "No tabId provided");
        }

        await chrome.tabs.update(tabId, { active: true });
        return success(command.commandId, { tabId });
      }
      default:
        return failure(command.commandId, ERROR_CODES.invalidCommand, `Unsupported tab action: ${command.action}`);
    }
  } catch (error) {
    return failure(
      command.commandId,
      ERROR_CODES.unknown,
      error instanceof Error ? error.message : "Unknown tab command error"
    );
  }
}
