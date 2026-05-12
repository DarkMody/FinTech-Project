require("dotenv").config();
const BaseUrl = "http://localhost:3000";
const express = require("express");
const multer = require("multer");
const app = express();
const port = process.env.PORT || 3000;
const { connectDb } = require("./dataBase/finTech");
const cors = require("cors");
const verifyToken = require("./middlewares/verifyToken");
const userController = require("./controllers/userController");
const cycleController = require("./controllers/cycleController");
const transactionController = require("./controllers/transactionController");
const alertController = require("./controllers/alertController");
const { verify } = require("jsonwebtoken");
const path = require("path");
const { diskStorage, fileFilter } = require("./utils/image");
const upload = multer({ storage: diskStorage, fileFilter });

app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.json()); // Middleware for body handling

connectDb((err) => {
  if (!err) {
    console.log(`Data Base Connected`);
    app.listen(port, (err) => {
      if (err) {
        console.error(err);
      }
      console.log(`Server ${port} working`);
    });
  }
});

// User APIs
app.get("/api/users", verifyToken, userController.getUser);
app.post("/api/users/register", userController.register);
app.post("/api/users/login", userController.login);
app.post("/api/users/fastLogin", verifyToken, userController.fastLogin);
app.delete("/api/users", verifyToken, userController.deleteUser);
app.patch(
  "/api/users",
  verifyToken,
  upload.single("avatar"),
  userController.editUser,
);
app.post("/api/users/pin", verifyToken, userController.checkPin);
app.patch("/api/users/password", verifyToken, userController.changePassword);

// Cycle APIs
app.get("/api/cycle", verifyToken, cycleController.getCycle);
app.post("/api/cycle", verifyToken, cycleController.initCycle);
app.delete("/api/cycle/:cycleId", verifyToken, cycleController.deleteCycle);

// Transaction APIs
app.get("/api/transaction", verifyToken, transactionController.getTransactions);
app.post("/api/transaction", verifyToken, transactionController.addTransaction);
app.delete(
  "/api/transaction/:transId",
  verifyToken,
  transactionController.deleteTransaction,
);
app.patch(
  "/api/transaction/:transId",
  verifyToken,
  transactionController.editTransaction,
);

// Alert APIS
app.get("/api/alert", verifyToken, alertController.getAlert);
app.patch("/api/alert", verifyToken, alertController.changeAlert);

// Error Handeling
app.use((req, res) => {
  res.status(404).send("Route Not Found");
});

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({
    status: error.statusText || "Error",
    message: error.message || error.msg,
  });
});
