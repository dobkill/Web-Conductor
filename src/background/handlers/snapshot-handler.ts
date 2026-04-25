import type { DomSnapshotPayload, RuntimeResponse } from "../../shared/types/message";

export async function requestSnapshot(tabId: number, includeSensitiveContext: boolean): Promise<DomSnapshotPayload | null> {
  const response = (await chrome.tabs.sendMessage(tabId, {
    type: "collectSnapshot",
    includeSensitiveContext
  })) as RuntimeResponse | undefined;

  if (!response?.ok || !response.snapshot) {
    return null;
  }

  return response.snapshot;
}
