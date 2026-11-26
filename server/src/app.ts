import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes";
import internRoutes from "./routes/internRoutes";
import cohortRoutes from "./routes/cohortRoutes";
import taskRoutes from "./routes/taskRoutes";
import myTaskRoutes from "./routes/myTaskRoutes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/interns", internRoutes);
app.use("/api/cohorts", cohortRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/my-tasks", myTaskRoutes);

// just to check the server is working
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

export default app;
