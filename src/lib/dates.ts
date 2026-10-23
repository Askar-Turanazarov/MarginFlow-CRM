// Request due dates are stored as calendar days (@db.Date, midnight UTC).

/** "2026-10-23" → Date at midnight UTC; empty or invalid → null. */
export function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDayString(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function isOverdue(dueDate: Date | null, status: string): boolean {
  return !!dueDate && status !== "DONE" && toDayString(dueDate) < toDayString(new Date());
}
