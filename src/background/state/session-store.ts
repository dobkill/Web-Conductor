export interface SessionState {
  clientId: string;
  connectionStatus: "idle" | "connecting" | "connected" | "disconnected";
  enabled: boolean;
}

const sessionState: SessionState = {
  clientId: crypto.randomUUID(),
  connectionStatus: "idle",
  enabled: false
};

export function getSessionState(): SessionState {
  return { ...sessionState };
}

export function updateSessionState(partial: Partial<SessionState>): SessionState {
  Object.assign(sessionState, partial);
  return getSessionState();
}
