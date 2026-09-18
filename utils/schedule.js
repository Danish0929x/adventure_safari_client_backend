// A trip is over once its end date has passed, and is retired the day after —
// never on the final day itself, so a safari finishing today is not pulled out
// from under the people currently on it.
//
// A trip with no end date is evergreen and never retires on its own; it is
// deactivated by hand, the way every trip always could be.

// Midnight at the start of today, in UTC.
//
// UTC rather than the server's own timezone because that is how trip dates are
// stored. Comparing a UTC-midnight end date against local midnight treated a
// trip as finished on its final day on any server west of Greenwich, which is
// exactly what the note at the top says must not happen — and here it would
// have turned away a customer booking on the last day the trip was on sale.
function startOfToday(now = new Date()) {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
}

// True once the trip's end date falls on an earlier day than today.
function hasTripEnded(trip, now = new Date()) {
  if (!trip?.endDate) return false;
  return new Date(trip.endDate) < startOfToday(now);
}

// Normalises a date coming off the trip form. Blank clears the date.
//
// A trip date is a calendar date, not a moment: "3 June" is 3 June to everyone
// looking at it, wherever they are. It is pinned to midnight UTC and read back
// the same way.
function parseTripDate(value, field) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new Error(`${field} is not a valid date`);
    }
    return parsed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} is not a valid date`);
  }
  return new Date(Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate()
  ));
}

// How long after a trip ends before it is archived.
const ARCHIVE_AFTER_MONTHS = 1;

// Calendar-correct month arithmetic. Plain setMonth() rolls 31 January forward
// to 3 March; clamping to the last day of the target month gives 28 February,
// which is what "a month later" means to a person.
function addMonths(date, months) {
  // Worked in UTC throughout, for the same reason as startOfToday above.
  const source = new Date(date);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const dayOfMonth = source.getUTCDate();
  const lastDayOfTarget = new Date(Date.UTC(year, month + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month + months, Math.min(dayOfMonth, lastDayOfTarget)));
}

// The date a trip drops into the archive: one month after it ends.
function archiveOn(trip) {
  if (!trip?.endDate) return null;
  // addMonths already returns UTC midnight, so there is nothing to flatten.
  return addMonths(new Date(trip.endDate), ARCHIVE_AFTER_MONTHS);
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
