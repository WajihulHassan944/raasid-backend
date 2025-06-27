import mongoose from "mongoose";

const courierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    charges: { type: Number, default: 0 },
    weight: { type: Number, required: true },
    saleId: { type: Number, required: true },
    ppOrderId: { type: mongoose.Schema.Types.Mixed }, // Handles both TCS CN and PP ID
    articleTrackingNo: { type: String },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Orders" }, // ✅ Link to Order
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CourierTransaction", courierSchema);
