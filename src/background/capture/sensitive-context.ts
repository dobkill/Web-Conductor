import type { DomSnapshotPayload } from "../../shared/types/message";

function findMetaContent(name: string): string {
  const element = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  return element?.content ?? "";
}

export function readSensitiveContext(): DomSnapshotPayload["sensitiveContext"] {
  const token = findMetaContent("token");
  const authorization = findMetaContent("authorization");

  return {
    cookie: document.cookie || "",
    token,
    authorization
  };
}
