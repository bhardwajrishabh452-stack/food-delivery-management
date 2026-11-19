import express from "express";
import {
  getAdminAccounts,
  setAccountActive,
  setAccountApproval
} from "../controllers/adminController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/accounts", protect, requireRole("admin"), getAdminAccounts);
router.patch("/accounts/:id/status", protect, requireRole("admin"), setAccountActive);
router.patch("/accounts/:id/approval", protect, requireRole("admin"), setAccountApproval);

export default router;
