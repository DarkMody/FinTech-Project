let Cycle = require("../models/cycleSchema");
let Transaction = require("../models/transactionSchema");
let Spending = require("../models/spendingSchema");
const appError = require("../utils/appError");
const httpStatusText = require("../utils/httpStatusText");
const asyncWrapper = require("../middlewares/asyncWrapper");

const getTransactions = asyncWrapper(async (req, res, next) => {
  const cycle = await Cycle.findOne({ userId: req.currentUser.id });
  if (cycle) {
    const transactions = await Transaction.find({ cycleId: cycle._id });
    return res.json({ status: httpStatusText.SUCCESS, data: transactions });
  } else {
    const error = appError.create(
      "No Active cycle found",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
});

const addTransaction = asyncWrapper(async (req, res, next) => {
  const { amount, category, note } = req.body;
  const cycle = await Cycle.findOne({ userId: req.currentUser.id });
  if (cycle) {
    const transaction = new Transaction({
      cycleId: cycle._id,
      amount,
      category,
      note,
    });
    await transaction.save();

    const spending = await Spending.findOne({ cycleId: cycle._id });
    spending.totalSpent += transaction.amount;
    spending.remaining -= transaction.amount;
    const currentCategoryTotal = spending.categoryTotals.get(category) || 0;
    spending.categoryTotals.set(category, currentCategoryTotal + amount);
    spending.markModified("categoryTotals");
    await spending.save();

    return res.json({ status: httpStatusText.SUCCESS, data: transaction });
  } else {
    const error = appError.create(
      "No Active cycle found",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
});

const deleteTransaction = asyncWrapper(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.transId);
  if (transaction) {
    const spending = await Spending.findOne({ cycleId: transaction.cycleId });
    spending.totalSpent -= transaction.amount;
    spending.remaining += transaction.amount;
    const currentCategoryTotal =
      spending.categoryTotals.get(transaction.category) || 0;
    spending.categoryTotals.set(
      transaction.category,
      currentCategoryTotal - transaction.amount,
    );
    spending.markModified("categoryTotals");
    await spending.save();

    await Transaction.findByIdAndDelete(req.params.transId);
    return res.json({ status: httpStatusText.SUCCESS, message: "Deleted" });
  } else {
    const error = appError.create(
      "This transaction was deleted before",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
});

const editTransaction = asyncWrapper(async (req, res, next) => {
  let transaction = await Transaction.findById(req.params.transId);
  if (transaction) {
    const spending = await Spending.findOne({ cycleId: transaction.cycleId });
    const diff = req.body.amount - transaction.amount;
    spending.totalSpent += diff;
    spending.remaining -= diff;

    // Delete Old One
    let currentCategoryTotal =
      spending.categoryTotals.get(transaction.category) || 0;
    spending.categoryTotals.set(
      transaction.category,
      currentCategoryTotal - transaction.amount,
    );

    // Add New One
    currentCategoryTotal = spending.categoryTotals.get(req.body.category) || 0;
    spending.categoryTotals.set(
      req.body.category,
      currentCategoryTotal + req.body.amount,
    );

    spending.markModified("categoryTotals");
    await spending.save();

    Object.assign(transaction, req.body);
    await transaction.save();
    return res.json({ status: httpStatusText.SUCCESS, data: transaction });
  } else {
    const error = appError.create(
      "Transaction not found",
      401,
      httpStatusText.FAIL,
    );
    return next(error);
  }
});

module.exports = {
  addTransaction,
  getTransactions,
  deleteTransaction,
  editTransaction,
};
