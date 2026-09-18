// A trip can run more than once. The admin app gives a trip a list of named
// departures ("Batch 1", 3–14 June), and the customer books one of them.
//
// Nothing here writes departures — that is the admin app's job. This side only
// reads them, to work out which dates a booking is actually for.

// Trips created before departures existed carry a single pair of dates on the
// trip itself. Reading those back as a one-entry list keeps every caller — the
// booking form above all — on one code path.
function resolveDepartures(trip) {
  if (trip?.departures?.length) {
    return trip.departures.map((departure) => ({
      _id: departure._id,
      name: departure.name,
      startDate: departure.startDate,
      endDate: departure.endDate,
    }));
  }
  if (trip?.startDate && trip?.endDate) {
    return [
      {
        _id: null,
        name: "Batch 1",
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
    ];
  }
  return [];
}

// Which departure a booking is for.
//
// A trip that runs once has nothing to choose between, so the booking form does
// not ask and the single departure is taken as given. A trip that runs several
// times must be told, because guessing here would sell someone the wrong dates
// — which is the whole reason departures exist.
//
// A trip with no dates at all is evergreen; it returns null and the caller
// falls back to the date the customer supplied, the way booking worked before.
function resolveDepartureForBooking(trip, departureId) {
  const departures = resolveDepartures(trip);
  if (departures.length === 0) return null;

  if (departureId) {
    const chosen = departures.find(
      (departure) => String(departure._id) === String(departureId)
    );
    if (!chosen) {
      throw new Error("That set of dates is not offered on this trip");
    }
    return chosen;
  }

  if (departures.length === 1) return departures[0];

  throw new Error("Choose which dates you are travelling on");
}

// What gets frozen onto the booking. The trip's departures can be renamed,
// moved or removed afterwards, and none of that may change the dates someone
// was already sold — so the booking keeps its own copy, the same way it keeps
// its own copy of what each traveller was charged.
function snapshotDeparture(departure) {
  if (!departure) return null;
  return {
    departureId: departure._id || null,
    name: departure.name,
    startDate: departure.startDate,
    endDate: departure.endDate,
  };
}

module.exports = {
  resolveDepartures,
  resolveDepartureForBooking,
  snapshotDeparture,
};
