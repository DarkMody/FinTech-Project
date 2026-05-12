let Alert = require("../models/alertSchema");
let User = require("../models/userSchema");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");
const asyncWrapper = require("../middlewares/asyncWrapper");

const getAlert = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.currentUser.id);
  if (user) {
    const alert = await Alert.findOne({ userId: req.currentUser.id });
    res.json({ status: httpStatusText.SUCCESS, data: alert.alert });
  } else {
    const error = appError.create("User Not Here", 401, httpStatusText.FAIL);
    return next(error);
  }
});

const changeAlert = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.currentUser.id);
  if (user) {
    const alert = await Alert.findOne({ userId: req.currentUser.id });
    alert.alert = req.body.alert;
    await alert.save();
    res.json({
      status: httpStatusText.SUCCESS,
      message: "Alert threshold changed",
    });
  } else {
    const error = appError.create("User Not Here", 401, httpStatusText.FAIL);
    return next(error);
  }
});

module.exports = {
  getAlert,
  changeAlert,
};
