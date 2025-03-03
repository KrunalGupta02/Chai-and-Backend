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

// This code is used to get the data from form etc
app.use(express.json({ limit: "16kb" }));

// This code is used to get data from url means params
app.use(express.urlencoded({ extended: true, limit: "16Kb" }));

// This is used to store the static files such as img , files , favicon etc
app.use(express.static("public"));

app.use(cookieParser());

export { app };
