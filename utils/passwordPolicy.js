const PASSWORD_MIN_LENGTH = 12;

const PASSWORD_REQUIREMENTS_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and include an uppercase letter, a lowercase letter, a number, and a special character`;

const isPasswordValid = (password) =>
  typeof password === "string" &&
  password.length >= PASSWORD_MIN_LENGTH &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

module.exports = { PASSWORD_MIN_LENGTH, PASSWORD_REQUIREMENTS_MESSAGE, isPasswordValid };
