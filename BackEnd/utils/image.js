const multer = require("multer");
const appError = require("./appError");
const httpStatusText = require("./httpStatusText");

const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    const type = file.mimetype.split("/")[1];
    const fileName = `user-${Date.now()}.${type}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const imgType = file.mimetype.split("/")[0];
  if (imgType === "image") return cb(null, true);
  return cb(
    appError.create("File must be image", 401, httpStatusText.FAIL),
    false,
  );
};

module.exports = {
  diskStorage,
  fileFilter,
};
