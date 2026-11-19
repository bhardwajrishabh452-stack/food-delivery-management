import express from "express";
import {
  getActiveCoupons,
  validateCoupon,
  createCoupon
} from "../controllers/couponController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getActiveCoupons);
router.post("/validate", validateCoupon);
router.post("/", protect, requireRole("admin"), createCoupon);

export default router;
