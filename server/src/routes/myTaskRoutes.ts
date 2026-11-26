import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { listMyTasks, submitToTask } from "../controllers/submissionController";

const router = Router();

// any logged in user can call these, the controller checks that the user is an intern
router.use(requireAuth);

router.get("/", listMyTasks);
router.post("/:taskId/submission", submitToTask);

export default router;
