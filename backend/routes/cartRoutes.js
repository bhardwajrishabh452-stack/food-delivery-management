import express from "express";
import { recordCartTransaction } from "../controllers/cartController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { transactionalAction } from "../middleware/transactionalAction.js";

const router = express.Router();

router.post("/", protect, requireRole("customer"), transactionalAction("Cart"), recordCartTransaction);
router.post("/transactions", protect, requireRole("customer"), recordCartTransaction);

export default router;
