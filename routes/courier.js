import express from "express";
import {
  getAllCouriers,
  updateCourier,
  deleteCourier,
  getCourierStatusByArticle,
  getCourierStatusByOrder,
  getTariff,
} from "../controllers/courier.js";
import { getTcsShippingFee, testTcsTokenTestTwo, trackTcsShipment } from "../controllers/tcsController.js";

const router = express.Router();

router.get("/test-token", testTcsTokenTestTwo);
router.get("/transaction", getAllCouriers);
router.put("/transaction/:id", updateCourier);
router.delete("/transaction/:id", deleteCourier);
router.get("/tariff", getTariff);
router.get("/tcs/track/:cnNumber", trackTcsShipment);
router.post("/tcs/fee", getTcsShippingFee);
router.get("/status/:articleTrackingNo", getCourierStatusByArticle);
router.get("/orderTracking/:transactionId/:articleTrackingNo", getCourierStatusByOrder);

export default router;
