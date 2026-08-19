// Trips are quoted per traveller: an adult and a child on the same safari are
// different amounts. A trip carries a list of traveller types ("Adult $10,000",
// "Child $7,000") and every booking freezes the amount that applied to each
// guest at the moment it was made.
//
// That frozen figure is the declared trip cost each traveller's insurance is
// written against, so it is never recomputed from the trip's current price
// list — editing a trip must not move the insured value on bookings already
// made, or the amount an agreed installment plan was built from.

const MAX_PRICING_TIERS = 10;
const LEGACY_TIER_CODE = "standard";
const LEGACY_TIER_LABEL = "Standard";

const round2 = (value) => Math.round(value * 100) / 100;

const slugify = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseAgeBound = (value, field) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 120) {
    throw new Error(`${field} must be a whole number between 0 and 120`);
  }
  return parsed;
};

// Turns whatever the trip form submitted into a clean traveller type list, or
// throws with a message written for the admin.
function normalizePricingTiers(input) {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) {
    throw new Error("Pricing must be a list of traveller types");
  }

  // Blank rows are how an empty row in the form arrives — drop them rather than
  // making the admin tidy up before saving.
  const rows = input.filter(
    (row) => row && (String(row.label ?? "").trim() || String(row.amount ?? "").trim())
  );
  if (rows.length === 0) return [];
  if (rows.length > MAX_PRICING_TIERS) {
    throw new Error(`A trip can have at most ${MAX_PRICING_TIERS} traveller types`);
  }

  const tiers = [];
  const seenCodes = new Set();

  for (const row of rows) {
    const label = String(row.label ?? "").trim();
    if (!label) {
      throw new Error("Every traveller type needs a name");
    }

    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`"${label}" needs an amount greater than 0`);
    }

    const code = slugify(row.code || label);
    if (!code) {
      throw new Error(`"${label}" is not a usable traveller type name`);
    }
    if (seenCodes.has(code)) {
      throw new Error(`There is more than one "${label}" traveller type`);
    }
    seenCodes.add(code);

    const ageMin = parseAgeBound(row.ageMin, `Minimum age for "${label}"`);
    const ageMax = parseAgeBound(row.ageMax, `Maximum age for "${label}"`);
    if (ageMin !== undefined && ageMax !== undefined && ageMin > ageMax) {
      throw new Error(`"${label}" has a minimum age above its maximum age`);
    }

    tiers.push({ code, label, amount: round2(amount), ageMin, ageMax });
  }

  return tiers;
}

// The catalogue still shows one headline figure per trip, and it is the
// cheapest traveller type — a "from" price.
function derivePriceFromTiers(tiers, fallback = 0) {
  if (!tiers || tiers.length === 0) return fallback;
  return tiers.reduce((lowest, tier) => Math.min(lowest, tier.amount), Infinity);
}

// Trips created before per-traveller pricing carry a single flat price. Reading
// that back as a one-entry list keeps every caller below on one code path.
function resolveTiers(trip) {
  if (trip?.pricing?.length) {
    return trip.pricing.map((tier) => ({
      code: tier.code,
      label: tier.label,
      amount: Number(tier.amount) || 0,
      ageMin: tier.ageMin,
      ageMax: tier.ageMax,
    }));
  }
  return [
    {
      code: LEGACY_TIER_CODE,
      label: LEGACY_TIER_LABEL,
      amount: Number(trip?.price) || 0,
    },
  ];
}

// Only traveller types that declare an age range take part in matching, so an
// unbounded type like "Single supplement" is never auto-assigned to anybody.
function findTierForAge(tiers, age) {
  const parsed = Number(age);
  if (!Number.isFinite(parsed)) return null;

  return (
    tiers.find((tier) => {
      const hasMin = tier.ageMin !== undefined && tier.ageMin !== null;
      const hasMax = tier.ageMax !== undefined && tier.ageMax !== null;
      if (!hasMin && !hasMax) return false;
      if (hasMin && parsed < tier.ageMin) return false;
      if (hasMax && parsed > tier.ageMax) return false;
      return true;
    }) || null
  );
}

// An explicit choice always wins; age is only a fallback. When neither resolves
// on a trip that offers a real choice we refuse rather than guess — an amount
// picked by accident here becomes a wrong insurance declaration later.
function resolveTierForGuest(tiers, guest) {
  const who = guest?.name ? `"${guest.name}"` : "a traveller";

  if (guest?.tierCode) {
    const chosen = tiers.find((tier) => tier.code === guest.tierCode);
    if (!chosen) {
      throw new Error(`${who} was given a traveller type this trip does not offer`);
    }
    return chosen;
  }

  if (tiers.length === 1) return tiers[0];

  const matched = findTierForAge(tiers, guest?.age);
  if (matched) return matched;

  throw new Error(
    `Choose a traveller type for ${who} — their age does not fall into any of this trip's traveller types`
  );
}

// Freezes what each traveller is being charged onto the booking.
// `guests` is [{ guestId, name, age, tierCode }].
function buildGuestPricing(trip, guests) {
  const tiers = resolveTiers(trip);

  const guestPricing = guests.map((guest) => {
    const tier = resolveTierForGuest(tiers, guest);
    return {
      guestId: guest.guestId,
      tierCode: tier.code,
      label: tier.label,
      tripCost: round2(tier.amount),
    };
  });

  return { guestPricing, tripTotal: sumGuestPricing(guestPricing) };
}

function sumGuestPricing(guestPricing) {
  return round2(
    (guestPricing || []).reduce((sum, row) => sum + (Number(row.tripCost) || 0), 0)
  );
}

// The one place that answers "what is this booking's trip cost". Bookings made
// before per-traveller pricing have no snapshot, so they fall back to the trip's
// flat price times head count — the figure they have always been shown.
function bookingTripTotal(booking) {
  if (booking?.guestPricing?.length) {
    return sumGuestPricing(booking.guestPricing);
  }
  const price = Number(booking?.tripId?.price) || 0;
  return round2(price * (booking?.guestIds?.length || 0));
}

module.exports = {
  MAX_PRICING_TIERS,
  LEGACY_TIER_CODE,
  LEGACY_TIER_LABEL,
  normalizePricingTiers,
  derivePriceFromTiers,
  resolveTiers,
  findTierForAge,
  resolveTierForGuest,
  buildGuestPricing,
  sumGuestPricing,
  bookingTripTotal,
};
