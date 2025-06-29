import CourierTransaction from "../models/courier.js";
import { Orders } from "../models/order.js";
import ErrorHandler from "../middlewares/error.js";
import dotenv from "dotenv";

dotenv.config({ path: "./data/config.env" });
const {
  PAK_POST_PROD_URL,
  PAK_POST_ID,
  PAK_POST_SECRET,
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

export const getTariff = async (req, res, next) => {
  const { weight } = req.query;

  if (!weight) {
    return res.status(400).json({ message: "Missing weight in grams" });
  }

  try {
    const token = await getToken();
    console.log("📦 Getting tariff for weight (grams):", weight);

    const response = await fetch(`${PAK_POST_PROD_URL}/GetTariff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ weightingrams: weight }),
    });

    const data = await response.json();
    console.log("📦 Tariff API response:", data);

    if (!response.ok || data.status !== 200) {
      return res.status(500).json({ message: data.message || "Failed to get tariff" });
    }

    return res.status(200).json({ totalCharges: data.totalCharges });
  } catch (err) {
    console.error("❌ Tariff Error:", err.message);
    return res.status(500).json({ message: err.message || "Server Error" });
  }
};

export const getTariffWithAllData = async (req, res) => {
  const { weight } = req.query;

  if (!weight) {
    return res.status(400).json({ message: "Missing weight in grams" });
  }

  try {
    const token = await getToken(); // assume you have this function defined
    console.log("📦 Getting tariff for weight (grams):", weight);

    const response = await fetch(`${PAK_POST_PROD_URL}/GetTariff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ weightingrams: weight }),
    });

    const data = await response.json();
    console.log("📦 Tariff API response:", data);

    if (!response.ok || data.status !== 200) {
      return res.status(500).json({ 
        message: data.message || "Failed to get tariff", 
        raw: data 
      });
    }

    return res.status(200).json({
      totalCharges: data.totalCharges,
      raw: data // include full API response
    });
  } catch (err) {
    console.error("❌ Tariff Error:", err.message);
    return res.status(500).json({ message: err.message || "Server Error" });
  }
};



export const getCourierStatusByArticle = (req, res, next) => {
  const { articleTrackingNo } = req.params;
  getToken()
    .then(token => {
      return fetch(`${PAK_POST_PROD_URL}/GetTracking/${articleTrackingNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    })
    .then(response => response.json().then(data => ({ status: response.status, data })))
    .then(({ status, data }) => {
      if (status !== 200 || data.status !== 200) {
        throw new Error(data.message || 'Tracking failed');
      }
      res.status(200).json({ success: true, tracking: data });
    })
    .catch(error => {
      next(new ErrorHandler(error.message || 'Tracking error', 500));
    });
};

export const getCourierStatusByOrder = (req, res, next) => {
  const { transactionId, articleTrackingNo } = req.params;

  Orders.findOne({ ppTransactionId: transactionId })
    .then(order => {
      if (!order) throw new ErrorHandler("Order not found", 404);
      return getToken().then(token => ({ order, token }));
    })
    .then(({ order, token }) => {
      return fetch(`${PAK_POST_PROD_URL}/GetTracking/${articleTrackingNo}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(response => response.json().then(data => ({ status: response.status, data, order })));
    })
    .then(({ status, data, order }) => {
      if (status !== 200 || data.status !== 200) {
        throw new Error(data.message || 'Tracking failed');
      }
      res.status(200).json({ success: true, tracking: data, order });
    })
    .catch(error => {
      next(new ErrorHandler(error.message || 'Tracking error', 500));
    });
};


export const getAllCouriers = async (req, res, next) => {
  try {
    const couriers = await CourierTransaction.find()
      .sort({ createdAt: -1 })
      .populate("order"); // ✅ Populate order

    res.status(200).json({ success: true, couriers });
  } catch (error) {
    next(new ErrorHandler("Failed to fetch couriers", 500));
  }
};

export const updateCourier = (req, res, next) => {
  CourierTransaction.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then(courier => {
      if (!courier) {
        return next(new ErrorHandler("Courier not found", 404));
      }
      res.status(200).json({ success: true, message: "Courier updated", courier });
    })
    .catch(error => {
      next(new ErrorHandler("Update failed", 500));
    });
};


export const deleteCourier = (req, res, next) => {
  CourierTransaction.findByIdAndDelete(req.params.id)
    .then(courier => {
      if (!courier) {
        return next(new ErrorHandler("Courier not found", 404));
      }
      res.status(200).json({ success: true, message: "Courier deleted" });
    })
    .catch(error => {
      next(new ErrorHandler("Deletion failed", 500));
    });
};
