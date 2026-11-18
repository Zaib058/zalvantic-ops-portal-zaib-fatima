import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createCohort,
  listCohorts,
  getCohort,
  updateCohort,
  deleteCohort,
} from "../controllers/cohortController";

const router = Router();

// admin only, like the intern routes
router.use(requireAuth, requireRole("admin"));

router.post("/", createCohort);
router.get("/", listCohorts);
router.get("/:id", getCohort);
router.patch("/:id", updateCohort);
router.delete("/:id", deleteCohort);

export default router;
