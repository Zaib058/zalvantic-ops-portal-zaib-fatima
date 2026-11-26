import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createTask,
  listTasks,
  getTask,
  listSubmissions,
  updateTask,
  deleteTask,
} from "../controllers/taskController";

const router = Router();

// admin only, like the cohort and intern routes
router.use(requireAuth, requireRole("admin"));

router.post("/", createTask);
router.get("/", listTasks);
router.get("/:id", getTask);
router.get("/:id/submissions", listSubmissions);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;
