let Cycle = require("../models/cycleSchema");
let Transaction = require("../models/transactionSchema");
let Spending = require("../models/spendingSchema");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");
const asyncWrapper = require("../middlewares/asyncWrapper");

const getCycle = asyncWrapper(async (req, res, next) => {
  const cycle = await Cycle.findOne({ userId: req.currentUser.id });
  if (cycle) {
    return res.json({ status: httpStatusText.SUCCESS, data: cycle });
  } else {
    const error = appError.create(
      "No Active cycle found",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
});

const initCycle = asyncWrapper(async (req, res, next) => {
  const { totalAmount, cycleName, startDate, endDate } = req.body;
  let start = new Date(startDate);
  let end = new Date(endDate);
  let diffMs = end - start;
  let diffDays = diffMs / (1000 * 60 * 60 * 24);
  const safeLimit = totalAmount / diffDays;
  const cycle = new Cycle({
    totalAmount,
    cycleName,
    startDate,
    endDate,
    safeLimit,
    userId: req.currentUser.id,
  });
  await cycle.save();
  const spending = new Spending({
    cycleId: cycle._id,
    remaining: totalAmount,
  });
  await spending.save();
  res.json({ status: httpStatusText.SUCCESS, data: cycle });
});

const deleteCycle = asyncWrapper(async (req, res, next) => {
  await Cycle.deleteOne({ _id: req.params.cycleId });
  await Transaction.deleteMany({ cycleId: req.params.cycleId });
  await Spending.deleteMany({ cycleId: req.params.cycleId });
  res.json({ status: httpStatusText.SUCCESS, message: "Deleted" });
});

module.exports = {
  getCycle,
  initCycle,
  deleteCycle,
};
