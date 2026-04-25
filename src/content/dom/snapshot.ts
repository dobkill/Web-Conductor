import type { DomSnapshotPayload, SnapshotNode } from "../../shared/types/message";
import { sanitizeAttributes, sanitizeText } from "./sanitize";
import { buildSelector, buildXPath } from "./selector";

function toNode(element: Element, depth: number): SnapshotNode | null {
  if (depth > 3) {
    return null;
  }

  const text = sanitizeText(element.textContent ?? "");
  const node: SnapshotNode = {
    tag: element.tagName.toLowerCase(),
    xpath: buildXPath(element),
    selector: buildSelector(element),
    text: text || undefined,
    attributes: sanitizeAttributes(element)
  };

  const children = Array.from(element.children)
    .slice(0, 8)
    .map((child) => toNode(child, depth + 1))
    .filter(Boolean) as SnapshotNode[];

  if (children.length) {
    node.children = children;
  }

  return node;
}

export function buildSnapshot(includeSensitiveContext: boolean): DomSnapshotPayload {
  const roots = Array.from(document.body?.children ?? [])
    .slice(0, 12)
    .map((element) => toNode(element, 0))
    .filter(Boolean) as SnapshotNode[];

  return {
    url: window.location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    },
    snapshot: roots,
    sensitiveContext: includeSensitiveContext
      ? {
          cookie: document.cookie || "",
          token: (document.querySelector('meta[name="token"]') as HTMLMetaElement | null)?.content || "",
          authorization:
            (document.querySelector('meta[name="authorization"]') as HTMLMetaElement | null)?.content || ""
        }
      : undefined
  };
}
