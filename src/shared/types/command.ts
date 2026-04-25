export type CommandAction =
  | "click"
  | "input"
  | "scroll"
  | "createTab"
  | "closeTab"
  | "switchTab"
  | "removeElement"
  | "setAttribute"
  | "appendElement"
  | "observeEvent";

export interface CommandTarget {
  selector?: string;
  xpath?: string;
  text?: string;
  index?: number;
  frameId?: number;
}

export interface CommandPayload {
  commandId: string;
  action: CommandAction;
  timeout?: number;
  target: CommandTarget | null;
  params: Record<string, unknown>;
}

export interface CommandResultPayload {
  commandId: string;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  result: Record<string, unknown>;
}
