import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createIntern,
  listInterns,
  getIntern,
  updateIntern,
  deleteIntern,
} from "../controllers/internController";

const router = Router();

// every route in this file is admin only
router.use(requireAuth, requireRole("admin"));

router.post("/", createIntern);
router.get("/", listInterns);
router.get("/:id", getIntern);
router.patch("/:id", updateIntern);
router.delete("/:id", deleteIntern);

export default router;
