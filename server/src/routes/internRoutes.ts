import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import {
  createIntern,
  listInterns,
  getIntern,
  updateIntern,
  deleteIntern,
} from "../controllers/internController";
import { importInterns } from "../controllers/importController";

const router = Router();

// the uploaded file stays in memory, max 1 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
});

// every route in this file is admin only
router.use(requireAuth, requireRole("admin"));

router.post(
  "/import",
  (req, res, next) => {
    // turn upload problems (like a file that is too big) into a normal 400
    upload.single("file")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  importInterns,
);
router.post("/", createIntern);
router.get("/", listInterns);
router.get("/:id", getIntern);
router.patch("/:id", updateIntern);
router.delete("/:id", deleteIntern);

export default router;
