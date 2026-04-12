// Get Monday of the week containing the given date
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

// Get Sunday of the week containing the given date
export function getWeekEnd(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString().split('T')[0];
}

// Check if a weekStart string matches the current week
export function isCurrentWeek(weekStart: string): boolean {
  return weekStart === getWeekStart();
}

// Check if a date string falls within a given week range
export function isDateInWeek(dateStr: string, weekStart: string, weekEnd: string): boolean {
  return dateStr >= weekStart && dateStr <= weekEnd;
}
