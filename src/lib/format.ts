import { format, isBefore, isToday, parseISO, startOfDay } from "date-fns";

export const PRIORITIES = ["urgent", "high", "medium", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function priorityClass(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-destructive/10 text-destructive border-destructive/30";
    case "high":
      return "bg-warning/10 text-warning border-warning/30";
    case "medium":
      return "bg-primary/10 text-primary border-primary/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function fmtDate(value?: string | null) {
  if (!value) return "Not specified";
  try {
    return format(parseISO(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

export function isOverdue(due?: string | null, status?: string) {
  if (!due || status === "done") return false;
  try {
    const d = parseISO(due);
    return isBefore(startOfDay(d), startOfDay(new Date())) && !isToday(d);
  } catch {
    return false;
  }
}

export const todayISO = () => format(new Date(), "yyyy-MM-dd");
