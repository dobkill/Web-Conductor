type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, message: string, context?: unknown): void {
  const prefix = `[browser-agent][${level}]`;
  if (context === undefined) {
    console[level](`${prefix} ${message}`);
    return;
  }

  console[level](`${prefix} ${message}`, context);
}
