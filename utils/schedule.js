// A trip is over once its end date has passed, and is retired the day after —
// never on the final day itself, so a safari finishing today is not pulled out
// from under the people currently on it.
//
// A trip with no end date is evergreen and never retires on its own; it is
// deactivated by hand, the way every trip always could be.

// Midnight at the start of today, in the server's own timezone.
function startOfToday(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

// True once the trip's end date falls on an earlier day than today.
function hasTripEnded(trip, now = new Date()) {
  if (!trip?.endDate) return false;
  return new Date(trip.endDate) < startOfToday(now);
}

// Normalises a date coming off the trip form. Blank clears the date.
function parseTripDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} is not a valid date`);
  }
  return parsed;
}

// How long after a trip ends before it is archived.
const ARCHIVE_AFTER_MONTHS = 1;

// Calendar-correct month arithmetic. Plain setMonth() rolls 31 January forward
// to 3 March; clamping to the last day of the target month gives 28 February,
// which is what "a month later" means to a person.
function addMonths(date, months) {
  const result = new Date(date);
  const dayOfMonth = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDayOfTarget = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(dayOfMonth, lastDayOfTarget));
  return result;
}

// The date a trip drops into the archive: one month after it ends.
function archiveOn(trip) {
  if (!trip?.endDate) return null;
  const on = addMonths(new Date(trip.endDate), ARCHIVE_AFTER_MONTHS);
  on.setHours(0, 0, 0, 0);
  return on;
}

// True once that date has arrived. A trip with no end date never archives on
// its own, the same as it never deactivates on its own.
function shouldArchive(trip, now = new Date()) {
  const on = archiveOn(trip);
  return on ? startOfToday(now) >= on : false;
}

// Trips ending on or before this date are due to be archived today.
function archiveCutoff(now = new Date()) {
  return addMonths(startOfToday(now), -ARCHIVE_AFTER_MONTHS);
}

module.exports = {
  startOfToday, hasTripEnded, parseTripDate,
  ARCHIVE_AFTER_MONTHS, addMonths, archiveOn, shouldArchive, archiveCutoff,
};
