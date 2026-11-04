import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app";

// .env is in the repo root, so go up two folders from src
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const port = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.log("missing MONGO_URI or JWT_SECRET in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("mongodb connected");

    app.listen(port, () => {
      console.log("server running on port " + port);
    });
  } catch (err) {
    console.log("could not connect to mongodb", err);
    process.exit(1);
  }
}

start();