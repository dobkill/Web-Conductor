export function observeEvent(target: Element, eventName: string): Promise<string> {
  return new Promise((resolve) => {
    const listener = () => {
      target.removeEventListener(eventName, listener);
      resolve(eventName);
    };

    target.addEventListener(eventName, listener, { once: true });
  });
}
