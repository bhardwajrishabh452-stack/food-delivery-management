import express from "express";
import {
  getSettlementOverview,
  processSettlement
} from "../controllers/settlementController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/overview", protect, requireRole("admin"), getSettlementOverview);
router.post("/process", protect, requireRole("admin"), processSettlement);

export default router;
