export function removeElement(target: Element): void {
  target.remove();
}

export function setAttribute(target: Element, name: string, value: string): void {
  target.setAttribute(name, value);
}

export function appendElement(target: Element, tagName: string, text?: string): void {
  const child = document.createElement(tagName);
  if (text) {
    child.textContent = text;
  }

  target.appendChild(child);
}
