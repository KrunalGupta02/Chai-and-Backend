// require("dotenv").config({ path: "./env" }); //? one way
import dotenv from "dotenv";

import connectDB from "./db/index.js"; //? second way
import { app } from "./app.js";

//* Second way to connect the DB
dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });

    app.on("error", (error) => {
      console.log("Error", error);
    });
  })
  .catch((e) => {
    console.error("MongoDB connnection failed !!!", e);
  });

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
