import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrdersByUserId,
} from "../controllers/order.js";

const router = express.Router();

router.post("/create", createOrder);
router.get("/", getAllOrders);
router.get("/:id", getOrderById);
router.put("/:id/status", updateOrderStatus);
router.delete("/:id", deleteOrder);
router.get("/user/:userId", getOrdersByUserId); // <-- new route

export default router;
