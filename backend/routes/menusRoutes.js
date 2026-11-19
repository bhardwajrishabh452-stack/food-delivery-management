import express from "express";
import { addMenuItem } from "../controllers/menuController.js";
import { protect, requireRole } from "../middleware/authMiddleware.js";
import { transactionalAction } from "../middleware/transactionalAction.js";

const router = express.Router();

router.post(
  "/",
  protect,
  requireRole("restaurant", "admin"),
  transactionalAction("Menus"),
  addMenuItem
);

export default router;
