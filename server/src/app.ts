import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// just to check the server is working
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;