import type { CommandPayload } from "../types/command";

export function isValidServerUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "ws:" || url.protocol === "wss:";
  } catch {
    return false;
  }
}

export function validateCommand(command: CommandPayload): string | null {
  if (!command.commandId || !command.action) {
    return "Missing commandId or action";
  }

  return null;
}
