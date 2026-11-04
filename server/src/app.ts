import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

// just to check the server is working
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;