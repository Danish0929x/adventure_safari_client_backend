// E.164 caps international numbers at 15 digits; 7 is the shortest real number once a country code is included.
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;
const ADULT_AGE = 18;

function phoneError(label, value = "") {
  const text = String(value);
  const digits = (text.match(/\d/g) || []).length;
  const letters = (text.match(/\p{L}/gu) || []).length;
  if (digits <= letters) return `${label} must be mostly digits`;
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS) {
    return `${label} must have ${PHONE_MIN_DIGITS} to ${PHONE_MAX_DIGITS} digits, including the country code`;
  }
  return null;
}

function normalizeName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function signatureError(label, signature, allowedNames) {
  const signed = normalizeName(signature);
  const allowed = allowedNames.filter(Boolean);
  if (allowed.some((name) => normalizeName(name) === signed)) return null;
  return `${label} must match ${allowed.map((name) => `"${String(name).trim()}"`).join(" or ")}`;
}

module.exports = { ADULT_AGE, phoneError, normalizeName, signatureError };
