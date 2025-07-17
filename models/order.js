import mongoose from "mongoose";

const orderProductSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Products",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  email: { type: String, required: true },
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  phone: { type: String, required: true },
  ppTransactionId: {
  type: Number,
  required: false,
},
  shippingMethod: {
    type: String,
    enum: ["TCS", "Pakistan Post", "Leopards", "M&P"],
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cod", "card"],
    required: true,
  },
  bookingDate: { type: String, default: "" },
  consignmentStatusDate: { type: String, default: "" },
  products: [orderProductSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled","Booked","Return"],
    default: "Pending",
  },
}, { timestamps: true });

// ✅ Correct export
const Orders = mongoose.model("Orders", orderSchema);
export { Orders };
