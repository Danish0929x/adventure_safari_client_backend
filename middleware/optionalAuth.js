const jwt = require("jsonwebtoken")

// Same as auth, but never rejects the request. Used by routes that are public
// yet return extra data when the caller happens to be signed in — the trip
// list, which also carries any custom trips assigned to that customer.
const optionalAuth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "")

  if (!token) {
    return next()
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    req.user = { email: decoded.email }
  } catch (error) {
    // An invalid token just means we treat the caller as a guest
  }

  next()
}

module.exports = optionalAuth
