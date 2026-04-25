import type { CommandPayload, CommandResultPayload } from "./command";

export interface CommandLogEntry {
  id: string;
  receivedAt: number;
  tabId?: number;
  command: CommandPayload;
  result?: CommandResultPayload;
  completedAt?: number;
}
