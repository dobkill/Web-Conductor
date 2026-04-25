import type { WireMessage } from "../types/message";

export function decodeMessage(raw: string): WireMessage | null {
  try {
    return JSON.parse(raw) as WireMessage;
  } catch {
    return null;
  }
}
