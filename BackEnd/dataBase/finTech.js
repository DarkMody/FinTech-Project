const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const mongoose = require("mongoose");
const url = process.env.URL;

let connectDb = (cb) => {
  mongoose
    .connect(url)
    .then((client) => {
      return cb();
    })
    .catch((err) => {
      console.log(err);
      return err;
    });
};

module.exports = { connectDb };
