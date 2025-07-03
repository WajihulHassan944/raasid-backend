import { Orders } from "../models/order.js";
import CourierTransaction from "../models/courier.js";
import ErrorHandler from "../middlewares/error.js";
import { transporter } from "../utils/mailer.js";
import dotenv from "dotenv";
import { createTcsBooking } from "./tcsController.js";
import { User } from "../models/user.js";
import bcrypt from 'bcryptjs';
import { Products } from "../models/products.js";
import { Category } from "../models/category.js";
import { Inquiry } from "../models/inquiry.js";

dotenv.config({ path: "./data/config.env" });

const {
  PAK_POST_PROD_URL,
  PAK_POST_ID,
  PAK_POST_SECRET,
  ADMIN_EMAIL,
} = process.env;

const getToken = async () => {
  console.log("🔐 Fetching token with:");
  console.log("ClientId:", PAK_POST_ID);
  console.log("ClientSecretKey:", PAK_POST_SECRET);
  console.log("URL:", `${PAK_POST_PROD_URL}/Token`);

  const response = await fetch(`${PAK_POST_PROD_URL}/Token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ClientId: PAK_POST_ID,
      ClientSecretKey: PAK_POST_SECRET,
    }),
  });

  const rawText = await response.text();
  console.log("🔐 Token Response:", rawText);

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (err) {
    console.error("❌ Failed to parse token response");
    throw new Error("Invalid JSON from token API");
  }

  if (!response.ok || !data.Content?.Token?.AccessToken) {
    throw new Error(data.ExceptionMessage || data.Message || "Token fetch failed");
  }

  return data.Content.Token.AccessToken;
};

const doTransaction = async (payload) => {
  const token = await getToken();
  console.log("🚚 Final Pakistan Post Transaction Payload:", payload);

  const response = await fetch(`${PAK_POST_PROD_URL}/Transaction`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  // 🔍 FULL LOGGING
  console.log("📦 FULL Transaction Response:");
  console.dir(result, { depth: null }); // shows nested objects clearly

  if (!response.ok || result.status !== 200) {
    throw new Error(result.message || "Failed to create transaction");
  }

  // Just in case articleTrackingNo is nested or inconsistent
  return {
    orderId: result.orderId || null,
    articleTrackingNo: result.articleTrackingNo || result.ArticleTrackingNo || result.trackingNumber || null,
    raw: result // optional: return full payload for inspection
  };
};




export const createOrder = async (req, res, next) => {
  try {
    const {
      email,
      fullName,
      address,
      city,
      phone,
      shippingMethod,
      paymentMethod,
      products,
      totalAmount,
      weight,
      shippingFee,
     originCity } = req.body;

    if (
      !email || !fullName || !address || !city || !phone ||
      !shippingMethod || !paymentMethod || !Array.isArray(products) || products.length === 0
    ) {
      return next(new ErrorHandler("All fields are required", 400));
    }

    if (!weight || isNaN(weight)) {
      return next(new ErrorHandler("Total weight is required and must be numeric", 400));
    }

    // ✂️ Split fullName into first & last
    const [firstName, ...lastParts] = fullName.split(" ");
    const lastName = lastParts.join(" ") || "";

    // 🔍 Check if user exists or create one
    let userDoc = await User.findOne({ email });

    let isNewUser = false;
    let tempPassword = "";

    if (!userDoc) {
      isNewUser = true;
      tempPassword = Math.random().toString(36).slice(-8); // e.g. "ax9u1kzq"
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      userDoc = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: ["user"],
      });

      // 📧 Send welcome email
      const welcomeHtml = `
        <h3>Welcome to Raasid!</h3>
        <p>Your account has been created while placing an order.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${tempPassword}</p>
        <p>We recommend logging in and updating your password.</p>
        <a href="http://www.raasid.com/login" style="color: blue;">Login Here</a>
      `;

      await transporter.sendMail({
        from: `"Raasid Store" <${ADMIN_EMAIL}>`,
        to: email,
        subject: "Welcome to Raasid - Your Account Details",
        html: welcomeHtml,
      });
    }

    const user = userDoc._id;
    const numericTransactionId = Math.floor(100000 + Math.random() * 900000);
    let courierData;

    // 📦 Courier logic
    try {
      if (shippingMethod === "TCS") {
        const { consignmentNo, traceId } = await createTcsBooking({
          fullName,
          address,
          city,
          originCity,
          phone,
          email,
          weight,
          totalAmount,
        });

        courierData = {
          charges: shippingFee || 0,
          ppOrderId: consignmentNo,
          articleTrackingNo: traceId,
        };
      } else {
        const transactionPayload = {
          Name: fullName,
          Address: address,
          City: city,
          Contact: phone,
          TransactionID: numericTransactionId,
          TransactionDate: new Date().toISOString().split("T")[0],
          CourierService: "Pakistan Post",
          DeliveryService: "VPP",
        };

        const { orderId: ppOrderId, articleTrackingNo } = await doTransaction(transactionPayload);

        courierData = {
          charges: shippingFee || 0,
          ppOrderId,
          articleTrackingNo,
        };
      }
    } catch (err) {
      console.error("❌ Courier booking failed:", err.message);
      return next(new ErrorHandler("Courier booking failed. Order was not placed.", 500));
    }

    // 🧾 Create order
    const newOrder = await Orders.create({
      user,
      email,
      fullName,
      address,
      city,
      phone,
      shippingMethod,
      paymentMethod,
      products,
      totalAmount,
      status: "Pending",
      ppTransactionId: numericTransactionId,
    });

    await newOrder.populate("products.productId");

    // 📬 Save courier transaction
    await CourierTransaction.create({
      name: fullName,
      charges: courierData.charges,
      weight: Number(weight),
      saleId: numericTransactionId,
      ppOrderId: courierData.ppOrderId,
      articleTrackingNo: courierData.articleTrackingNo,
      order: newOrder._id,
    });

    const productSummary = newOrder.products.map(
      (p) => `• ${p.productId?.name || "Unnamed Product"} — Quantity: ${p.quantity}`
    ).join("<br>");

    const trackingDetails = `
      <p><strong> ${
        shippingMethod === "TCS"
          ? "Consignment Number: "
          : "Pakistan Post OrderId: "
      }:</strong> ${
        shippingMethod === "TCS"
          ? courierData.ppOrderId
          : courierData.ppOrderId
      }</p>
    `;

    const emailHtml = `
      <h3>Thank you for your order at <strong>Raasid</strong>!</h3>
      <p><strong>Order Summary:</strong></p>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Address:</strong> ${address}, ${city}</p>
      <p><strong>Shipping Method:</strong> ${shippingMethod}</p>
      <p><strong>Payment Method:</strong> ${paymentMethod}</p>
      <p><strong>Products:</strong><br>${productSummary}</p>
      <p><strong>Total Amount:</strong> ${totalAmount} PKR</p>
      ${trackingDetails}
    `;

    // 📧 Order confirmation
    await transporter.sendMail({
      from: `"Raasid Store" <${ADMIN_EMAIL}>`,
      to: email,
      subject: "Your Raasid Order Confirmation",
      html: emailHtml,
    });

    await transporter.sendMail({
      from: `"Raasid Store" <${ADMIN_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: "New Order Received - Raasid",
      html: `<h3>New order placed by ${fullName}</h3>${emailHtml}`,
    });

    // ✅ Response
    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: newOrder,
      courier: courierData,
      newUserCreated: isNewUser,
    });
  } catch (error) {
    console.error("❌ Error in createOrder:", error);
    next(new ErrorHandler(error.message || "An error has occurred.", 500));
  }
};


// Get All Orders
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Orders.find().populate("products.productId");
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};


export const getOrderById = async (req, res, next) => {
  try {
    const order = await Orders.findById(req.params.id)
      .populate("products.productId");

    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    // Use ppTransactionId to find matching courier record
    const courier = await CourierTransaction.findOne({
      saleId: order.ppTransactionId,
    });

    res.status(200).json({
      success: true,
      order,
      courier, // includes courier matched by saleId
    });
  } catch (error) {
    next(error);
  }
};





// Get Orders by User ID
export const getOrdersByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const orders = await Orders.find({ user: userId })
      .populate("products.productId");

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    next(error);
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Orders.findById(req.params.id);
    if (!order) return next(new ErrorHandler("Order not found", 404));

    order.status = status || order.status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated",
      order
    });
  } catch (error) {
    next(error);
  }
};

// Delete Order
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Orders.findById(req.params.id);
    if (!order) return next(new ErrorHandler("Order not found", 404));

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: "Order deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};






export const getDashboardAnalytics = async (req, res, next) => {
  try {
    // 🧾 Order counts by status
    const [
      cancelledOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      totalOrders
    ] = await Promise.all([
      Orders.countDocuments({ status: "Cancelled" }),
      Orders.countDocuments({ status: "Pending" }),
      Orders.countDocuments({ status: "Processing" }),
      Orders.countDocuments({ status: "Shipped" }),
      Orders.countDocuments({ status: "Delivered" }),
      Orders.countDocuments()
    ]);

    // 🛒 Total products
    const totalProducts = await Products.countDocuments();

    // 🗂️ Total categories
    const totalCategories = await Category.countDocuments();

    // 📊 Products count by category
    const productsByCategory = await Products.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          _id: 0
        }
      }
    ]);

    // 📥 Total inquiries
    const totalInquiries = await Inquiry.countDocuments();

    // ✅ Response
    res.status(200).json({
      success: true,
      stats: {
        cancelledOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        totalOrders,
        totalProducts,
        totalCategories,
        totalInquiries,
        productsByCategory,
      }
    });
  } catch (error) {
    next(error);
  }
};
