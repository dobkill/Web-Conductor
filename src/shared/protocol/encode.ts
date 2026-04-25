import type { WireMessage } from "../types/message";

export function encodeMessage(message: WireMessage): string {
  return JSON.stringify(message);
}
