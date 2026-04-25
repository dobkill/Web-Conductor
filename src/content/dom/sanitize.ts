export function sanitizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function sanitizeAttributes(element: Element): Record<string, string> {
  const allowedAttributes = ["type", "name", "role", "placeholder", "href", "aria-label"];
  const attributes: Record<string, string> = {};

  for (const key of allowedAttributes) {
    const value = element.getAttribute(key);
    if (value) {
      attributes[key] = value.slice(0, 120);
    }
  }

  return attributes;
}
