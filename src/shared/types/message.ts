import type { CommandPayload, CommandResultPayload } from "./command";

export interface SnapshotNode {
  tag: string;
  xpath: string;
  selector?: string;
  text?: string;
  attributes?: Record<string, string>;
  children?: SnapshotNode[];
}

export interface DomSnapshotPayload {
  url: string;
  title: string;
  viewport: {
    width: number;
    height: number;
    scrollX: number;
    scrollY: number;
  };
  snapshot: SnapshotNode[];
  sensitiveContext?: {
    cookie?: string;
    token?: string;
    authorization?: string;
  };
}

export interface ConnectPayload {
  pluginVersion: string;
  browser: string;
  manifestVersion: number;
}

export interface HeartbeatPayload {
  status: "alive";
}

export type ServerCommandMessage = BaseMessage<"command", CommandPayload>;
export type ConnectMessage = BaseMessage<"connect", ConnectPayload>;
export type HeartbeatMessage = BaseMessage<"heartbeat", HeartbeatPayload>;
export type DomSnapshotMessage = BaseMessage<"domSnapshot", DomSnapshotPayload>;
export type CommandResultMessage = BaseMessage<"commandResult", CommandResultPayload>;

export interface BaseMessage<TType extends string, TPayload> {
  id: string;
  type: TType;
  timestamp: number;
  clientId: string;
  tabId?: number;
  frameId?: number;
  payload: TPayload;
}

export type WireMessage =
  | ConnectMessage
  | HeartbeatMessage
  | DomSnapshotMessage
  | CommandResultMessage
  | ServerCommandMessage;

export type RuntimeRequest =
  | { type: "collectSnapshot"; includeSensitiveContext?: boolean }
  | { type: "executeCommand"; command: CommandPayload }
  | { type: "getStatus" };

export type RuntimeResponse =
  | { ok: true; snapshot?: DomSnapshotPayload; result?: CommandResultPayload; status?: string }
  | { ok: false; error: string };
