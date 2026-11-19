import express from "express";
import {
  getTrackingData,
  stepSimulation
} from "../controllers/trackingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:orderId", protect, getTrackingData);
router.post("/:orderId/simulate-step", protect, stepSimulation);

export default router;
