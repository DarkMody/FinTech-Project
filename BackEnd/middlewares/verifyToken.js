const jwt = require("jsonwebtoken");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");
const asyncWrapper = require("./asyncWrapper");

module.exports = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    const error = appError.create(
      "Token Is required",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
  const token = authHeader.split(" ")[1];
  const currentUser = jwt.verify(token, process.env.JWT_SECRET);
  req.currentUser = currentUser;
  next();
});
