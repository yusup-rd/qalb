/**
 * Returns a new Date with the specified number of days added.
 *
 * The original Date is not mutated.
 */
export function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);

  return result;
}

/**
 * Returns a new Date representing the start of the week.
 *
 * The week starts on Monday.
 */
export function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  // JavaScript:
  // Sunday = 0
  // Monday = 1
  // ...
  //
  // Convert this to a Monday-based week.
  const mondayOffset = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + mondayOffset);

  return result;
}

/**
 * Checks whether two Date objects represent the same
 * calendar day in the device's local timezone.
 */
export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Returns the first day of the month for a given date.
 */
function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Returns the last day of the month for a given date.
 */
function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Returns a new Date representing the first day of the
 * previous month.
 */
export function previousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

/**
 * Returns a new Date representing the first day of the
 * next month.
 */
export function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/**
 * Generates all calendar cells required to render a month.
 *
 * Monday is the first column.
 *
 * Empty cells before/after the month are represented by null.
 */
export function getMonthDays(date: Date) {
  const firstDay = startOfMonth(date);
  const lastDay = endOfMonth(date);

  const weekday = firstDay.getDay();

  // Convert Sunday=0 to Monday-based indexing:
  // Monday=0 ... Sunday=6
  const leadingEmptyDays = weekday === 0 ? 6 : weekday - 1;

  const daysInMonth = lastDay.getDate();

  const totalCells = Math.ceil((leadingEmptyDays + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return null;
    }

    return new Date(firstDay.getFullYear(), firstDay.getMonth(), dayNumber);
  });
}

/**
 * Returns a YYYY-MM-DD key from a Date using the device's
 * local calendar date.
 *
 * Intended for date-based identifiers and storage keys.
 */
export function getLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
