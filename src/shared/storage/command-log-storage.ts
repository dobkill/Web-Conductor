import type { CommandPayload, CommandResultPayload } from "../types/command";
import type { CommandLogEntry } from "../types/command-log";

const COMMAND_LOG_KEY = "commandLogs";
const MAX_COMMAND_LOGS = 200;

export async function getCommandLogs(): Promise<CommandLogEntry[]> {
  const stored = await chrome.storage.local.get(COMMAND_LOG_KEY);
  return (stored[COMMAND_LOG_KEY] as CommandLogEntry[] | undefined) ?? [];
}

export async function addCommandLog(command: CommandPayload, tabId?: number): Promise<string> {
  const logs = await getCommandLogs();
  const id = crypto.randomUUID();
  const next: CommandLogEntry[] = [
    {
      id,
      receivedAt: Date.now(),
      tabId,
      command
    },
    ...logs
  ].slice(0, MAX_COMMAND_LOGS);

  await chrome.storage.local.set({ [COMMAND_LOG_KEY]: next });
  return id;
}

export async function completeCommandLog(id: string, result: CommandResultPayload): Promise<void> {
  const logs = await getCommandLogs();
  const next = logs.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          result,
          completedAt: Date.now()
        }
      : entry
  );

  await chrome.storage.local.set({ [COMMAND_LOG_KEY]: next });
}

export async function clearCommandLogs(): Promise<void> {
  await chrome.storage.local.set({ [COMMAND_LOG_KEY]: [] });
}
