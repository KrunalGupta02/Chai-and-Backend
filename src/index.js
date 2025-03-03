// require("dotenv").config({ path: "./env" }); //? one way
import dotenv from "dotenv";

import connectDB from "./db/index.js"; //? second way

//* Second way to connect the DB
dotenv.config({
  path: "./env",
});

connectDB();

//* One way to connect the DB
/*
import express from "express";
const app = express()(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

    app.on("error", (error) => {
      console.log("error", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  } catch (err) {
    console.error("Error", err);
    throw err;
  }
})();
*/
