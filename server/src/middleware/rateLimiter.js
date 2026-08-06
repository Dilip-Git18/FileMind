// Pass-through middleware during local testing to remove rate limiting
const apiLimiter = (req, res, next) => next();
const authLimiter = (req, res, next) => next();

module.exports = { apiLimiter, authLimiter };
