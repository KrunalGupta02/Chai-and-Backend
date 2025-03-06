import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// This code is used to get the data from 'forms' etc
app.use(express.json({ limit: "16kb" }));

// This code is used to get data from url means params
app.use(express.urlencoded({ extended: true, limit: "16Kb" }));

// This is used to store the static files such as img , files , favicon etc
app.use(express.static("public"));

app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";

// routes declaration
//? Here we are using the middleware 'use' bcz we have separated the whole router and controller that's why we use the middleware not like app.get('/')

// Route will be like that `https://localhost:8000/api/v1/users/login`

app.use("/api/v1/users", userRouter);

export { app };
