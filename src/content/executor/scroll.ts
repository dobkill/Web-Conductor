export function executeScroll(params: Record<string, unknown>): void {
  window.scrollTo({
    top: Number(params.top ?? 0),
    left: Number(params.left ?? 0),
    behavior: (params.behavior as ScrollBehavior | undefined) ?? "smooth"
  });
}
