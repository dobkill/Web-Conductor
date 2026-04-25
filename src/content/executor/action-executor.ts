import type { CommandPayload, CommandResultPayload } from "../../shared/types/command";
import { executeClick } from "./click";
import { executeInput } from "./input";
import { appendElement, removeElement, setAttribute } from "./mutate-dom";
import { observeEvent } from "./observe-event";
import { executeScroll } from "./scroll";

const ERROR_CODES = {
  invalidCommand: "INVALID_COMMAND",
  targetNotFound: "TARGET_NOT_FOUND",
  unknown: "UNKNOWN_ERROR"
} as const;

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

function locateTarget(command: CommandPayload): Element | null {
  if (!command.target) {
    return null;
  }

  if (command.target.xpath) {
    const result = document.evaluate(
      command.target.xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    return result instanceof Element ? result : null;
  }

  if (command.target.selector) {
    return document.querySelector(command.target.selector);
  }

  return null;
}

export async function executeAction(command: CommandPayload): Promise<CommandResultPayload> {
  try {
    if (command.action === "scroll") {
      executeScroll(command.params);
      return success(command.commandId);
    }

    const target = locateTarget(command);
    if (!target) {
      return failure(command.commandId, ERROR_CODES.targetNotFound, "Target element not found");
    }

    switch (command.action) {
      case "click":
        executeClick(target);
        return success(command.commandId);
      case "input":
        executeInput(target, String(command.params.value ?? ""));
        return success(command.commandId);
      case "removeElement":
        removeElement(target);
        return success(command.commandId);
      case "setAttribute":
        setAttribute(target, String(command.params.name ?? ""), String(command.params.value ?? ""));
        return success(command.commandId);
      case "appendElement":
        appendElement(target, String(command.params.tagName ?? "div"), String(command.params.text ?? ""));
        return success(command.commandId);
      case "observeEvent": {
        const eventName = await observeEvent(target, String(command.params.eventName ?? "click"));
        return success(command.commandId, { eventName });
      }
      default:
        return failure(command.commandId, ERROR_CODES.invalidCommand, `Unsupported page action: ${command.action}`);
    }
  } catch (error) {
    return failure(
      command.commandId,
      ERROR_CODES.unknown,
      error instanceof Error ? error.message : "Unknown page command error"
    );
  }
}
