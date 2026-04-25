import { encodeMessage } from "../../shared/protocol/encode";
import { decodeMessage } from "../../shared/protocol/decode";
import type {
  CommandResultMessage,
  ConnectMessage,
  DomSnapshotMessage,
  HeartbeatMessage,
  ServerCommandMessage,
  WireMessage
} from "../../shared/types/message";
import { log } from "../../shared/utils/logger";
import { now } from "../../shared/utils/time";
import { backoffReconnect } from "./reconnect";

interface WsClientOptions {
  url: string;
  clientId: string;
  onCommand: (message: ServerCommandMessage) => Promise<void>;
  onStatusChange: (status: "connecting" | "connected" | "disconnected") => void;
}

export class WsClient {
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private manuallyClosed = false;

  constructor(private readonly options: WsClientOptions) {}

  connect(): void {
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) {
      return;
    }

    this.manuallyClosed = false;
    this.options.onStatusChange("connecting");
    this.socket = new WebSocket(this.options.url);

    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.options.onStatusChange("connected");
      this.startHeartbeat();
      this.send({
        id: crypto.randomUUID(),
        type: "connect",
        timestamp: now(),
        clientId: this.options.clientId,
        payload: {
          pluginVersion: chrome.runtime.getManifest().version,
          browser: "chrome",
          manifestVersion: 3
        }
      } satisfies ConnectMessage);
    });

    this.socket.addEventListener("message", async (event) => {
      const message = decodeMessage(String(event.data));
      if (!message || message.type !== "command") {
        return;
      }

      await this.options.onCommand(message);
    });

    this.socket.addEventListener("close", async () => {
      this.options.onStatusChange("disconnected");
      this.stopHeartbeat();

      if (this.manuallyClosed) {
        return;
      }

      this.reconnectAttempt += 1;
      await backoffReconnect(this.reconnectAttempt);
      this.connect();
    });

    this.socket.addEventListener("error", () => {
      log("warn", "WebSocket error");
    });
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    this.socket?.close();
    this.socket = null;
    this.options.onStatusChange("disconnected");
  }

  send(message: WireMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return;
    }

    this.socket.send(encodeMessage(message));
  }

  sendSnapshot(tabId: number, payload: DomSnapshotMessage["payload"]): void {
    this.send({
      id: crypto.randomUUID(),
      type: "domSnapshot",
      timestamp: now(),
      clientId: this.options.clientId,
      tabId,
      frameId: 0,
      payload
    });
  }

  sendCommandResult(tabId: number | undefined, payload: CommandResultMessage["payload"]): void {
    this.send({
      id: crypto.randomUUID(),
      type: "commandResult",
      timestamp: now(),
      clientId: this.options.clientId,
      tabId,
      frameId: 0,
      payload
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({
        id: crypto.randomUUID(),
        type: "heartbeat",
        timestamp: now(),
        clientId: this.options.clientId,
        payload: {
          status: "alive"
        }
      } satisfies HeartbeatMessage);
    }, 15_000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
