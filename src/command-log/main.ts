import "../styles/command-log.css";
import type { CommandLogEntry } from "../shared/types/command-log";

interface Elements {
  rows: HTMLTableSectionElement;
  emptyText: HTMLElement;
  refreshButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
}

interface LogResponse {
  ok: boolean;
  logs?: CommandLogEntry[];
}

function getElements(): Elements {
  return {
    rows: document.querySelector("#logRows") as HTMLTableSectionElement,
    emptyText: document.querySelector("#emptyText") as HTMLElement,
    refreshButton: document.querySelector("#refreshButton") as HTMLButtonElement,
    clearButton: document.querySelector("#clearButton") as HTMLButtonElement
  };
}

function formatTime(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(value);
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function makeCell(text: string, className?: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.textContent = text;

  if (className) {
    cell.className = className;
  }

  return cell;
}

function makeResult(entry: CommandLogEntry): string {
  if (!entry.result) {
    return "执行中";
  }

  return entry.result.success ? "success" : entry.result.errorMessage || entry.result.errorCode || "failed";
}

function renderLogs(elements: Elements, logs: CommandLogEntry[]): void {
  elements.rows.replaceChildren();
  elements.emptyText.hidden = logs.length > 0;

  for (const entry of logs) {
    const row = document.createElement("tr");
    const resultClass = entry.result?.success ? "result-success" : entry.result ? "result-failed" : "result-pending";

    row.append(
      makeCell(formatTime(entry.receivedAt)),
      makeCell(entry.tabId === undefined ? "-" : String(entry.tabId)),
      makeCell(entry.command.commandId, "mono"),
      makeCell(entry.command.action),
      makeCell(stringify(entry.command.target), "json"),
      makeCell(stringify(entry.command.params), "json"),
      makeCell(makeResult(entry), resultClass)
    );

    elements.rows.append(row);
  }
}

async function loadLogs(elements: Elements): Promise<void> {
  const response = (await chrome.runtime.sendMessage({ type: "commandLog:get" })) as LogResponse;
  renderLogs(elements, response.logs ?? []);
}

async function clearLogs(elements: Elements): Promise<void> {
  const response = (await chrome.runtime.sendMessage({ type: "commandLog:clear" })) as LogResponse;
  renderLogs(elements, response.logs ?? []);
}

async function mount(): Promise<void> {
  const elements = getElements();

  elements.refreshButton.addEventListener("click", () => {
    void loadLogs(elements);
  });

  elements.clearButton.addEventListener("click", () => {
    void clearLogs(elements);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.commandLogs) {
      renderLogs(elements, (changes.commandLogs.newValue as CommandLogEntry[] | undefined) ?? []);
    }
  });

  await loadLogs(elements);
}

void mount();
