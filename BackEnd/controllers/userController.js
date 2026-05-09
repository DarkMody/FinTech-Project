let User = require("../models/userSchema");
let Cycle = require("../models/cycleSchema");
let Transaction = require("../models/transactionSchema");
let Spending = require("../models/spendingSchema");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");
const asyncWrapper = require("../middlewares/asyncWrapper");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");

const getUser = asyncWrapper(async (req, res, next) => {
  res.json({ status: httpStatusText.SUCCESS, data: req.currentUser });
});

const register = asyncWrapper(async (req, res, next) => {
  const { userName, email, password, pin } = req.body;
  const check = await User.findOne({ email });
  if (password.length < 5) {
    const error = appError.create(
      "Password must be atleast 5 chars",
      400,
      httpStatusText.FAIL,
    );
    return next(error);
  }
  if (!check) {
    const hashed = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);
    const user = new User({
      userName,
      email,
      password: hashed,
      pin: hashedPin,
    });
    const token = await generateToken({
      userName: user.userName,
      email: user.email,
      id: user._id,
    });
    await user.save();
    res.json({ status: httpStatusText.SUCCESS, data: token });
  } else {
    const error = appError.create(
      "Email Already Exists",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
});

const login = asyncWrapper(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    const pass = await bcrypt.compare(password, user.password);
    if (pass) {
      const token = await generateToken({
        userName: user.userName,
        email: user.email,
        id: user._id,
      });
      res.json({ status: httpStatusText.SUCCESS, data: token });
    } else if (user) {
      const error = appError.create(
        "Email Or Password is wrong",
        401,
        httpStatusText.FAIL,
      );
      return next(error);
    }
  } else {
    const error = appError.create("Email Not Here", 401, httpStatusText.FAIL);
    return next(error);
  }
});

const checkPin = asyncWrapper(async (req, res, next) => {
  const { pin } = req.body;
  const user = await User.findById(req.currentUser.id);
  const pass = await bcrypt.compare(pin, user.pin);
  if (pass) {
    res.json({ status: httpStatusText.SUCCESS, message: "Valid PIN" });
  } else {
    const error = appError.create("PIN is wrong", 401, httpStatusText.FAIL);
    return next(error);
  }
});

const fastLogin = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.currentUser.id);
  if (user) {
    const token = await generateToken({
      userName: user.userName,
      email: user.email,
      id: user._id,
    });
    res.json({ status: httpStatusText.SUCCESS, data: token });
  } else {
    const error = appError.create("User Was Deleted", 400, httpStatusText.FAIL);
    return next(error);
  }
});

const deleteUser = asyncWrapper(async (req, res, next) => {
  const user = await User.findById(req.currentUser.id);
  if (user) {
    const cycle = await Cycle.findOne({ userId: user._id }); // Fixed user_id reference here
    await User.deleteOne({ _id: user._id });
    if (cycle) {
      await Cycle.findByIdAndDelete(cycle._id);
      await Transaction.deleteMany({ cycleId: cycle._id });
      await Spending.deleteMany({ cycleId: cycle._id });
    }
    res.json({ status: httpStatusText.SUCCESS, message: "Deleted" });
  } else {
    const error = appError.create("User Not Here", 401, httpStatusText.FAIL);
    return next(error);
  }
});

const editUser = asyncWrapper(async (req, res, next) => {
  let user = await User.findById(req.currentUser.id);
  if (user) {
    Object.assign(user, req.body);
    const token = await generateToken({
      userName: user.userName,
      email: user.email,
      id: user._id,
    });
    await user.save();
    res.json({ status: httpStatusText.SUCCESS, data: token });
  } else {
    const error = appError.create("User Not Here", 401, httpStatusText.FAIL);
    return next(error);
  }
});

module.exports = {
  getUser,
  register,
  login,
  deleteUser,
  editUser,
  fastLogin,
  checkPin,
};
