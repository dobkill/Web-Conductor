import { ERROR_CODES } from "../../shared/constants/error-codes";
import type { CommandPayload, CommandResultPayload } from "../../shared/types/command";
import type { RuntimeResponse } from "../../shared/types/message";
import { validateCommand } from "../../shared/utils/validators";
import { handleTabCommand } from "./tab-handler";

const TAB_ACTIONS = new Set(["createTab", "closeTab", "switchTab"]);

function isReceivingEndMissing(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Receiving end does not exist");
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

export function isControllableTab(tab: chrome.tabs.Tab | undefined): boolean {
  if (!tab?.id || !tab.url) {
    return false;
  }

  return tab.url.startsWith("http://") || tab.url.startsWith("https://");
}

export async function getActiveTabId(): Promise<number | undefined> {
  const [currentWindowTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isControllableTab(currentWindowTab)) {
    return currentWindowTab.id;
  }

  const [lastFocusedTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return isControllableTab(lastFocusedTab) ? lastFocusedTab.id : undefined;
}

export async function resolveCommandTabId(
  command: CommandPayload,
  senderTabId?: number,
  fallbackTabId?: number
): Promise<number | undefined> {
  const requestedTabId = Number(command.params.tabId ?? senderTabId);
  return requestedTabId || fallbackTabId || getActiveTabId();
}

async function sendCommandToTab(tabId: number, command: CommandPayload): Promise<RuntimeResponse | undefined> {
  try {
    return (await chrome.tabs.sendMessage(tabId, {
      type: "executeCommand",
      command
    })) as RuntimeResponse | undefined;
  } catch (error) {
    if (!isReceivingEndMissing(error)) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });

    return (await chrome.tabs.sendMessage(tabId, {
      type: "executeCommand",
      command
    })) as RuntimeResponse | undefined;
  }
}

export async function routeCommand(
  command: CommandPayload,
  senderTabId?: number,
  fallbackTabId?: number
): Promise<CommandResultPayload> {
  const validationError = validateCommand(command);
  if (validationError) {
    return failure(command.commandId, ERROR_CODES.invalidCommand, validationError);
  }

  if (TAB_ACTIONS.has(command.action)) {
    return handleTabCommand(command, senderTabId);
  }

  const tabId = await resolveCommandTabId(command, senderTabId, fallbackTabId);
  if (!tabId) {
    return failure(command.commandId, ERROR_CODES.tabNotFound, "No target tab available");
  }

  try {
    const response = await sendCommandToTab(tabId, command);

    if (!response) {
      return failure(command.commandId, ERROR_CODES.unknown, "No command result");
    }

    if (!response.ok) {
      return failure(command.commandId, ERROR_CODES.unknown, response.error);
    }

    if (!response.result) {
      return failure(command.commandId, ERROR_CODES.unknown, "No command result");
    }

    return response.result;
  } catch (error) {
    return failure(
      command.commandId,
      ERROR_CODES.unknown,
      error instanceof Error ? error.message : "Command routing failed"
    );
  }
}
