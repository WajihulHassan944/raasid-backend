import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config({ path: "./data/config.env" });

const {
  TCS_USERNAME,
  TCS_PASSWORD,
  TCS_ACCOUNT_NO,
  TCS_DEV_BOOKING_URL,
  TCS_TRACKING_URL,
  TCS_ECOM_TOKEN 
} = process.env;
export const cancelTcsBooking = async (req, res) => {
  const { consignmentNumber } = req.body;

  if (!consignmentNumber) {
    return res.status(400).json({ success: false, message: "❌ Consignment number is required." });
  }

  try {
    const { bearerToken, accessToken } = await getTcsTokenTest();

    const payload = {
      consignmentNumber,
      accesstoken: accessToken,
    };

    const response = await fetch("https://connect.tcscourier.com/ecom/api/booking/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("🚫 TCS Cancel Booking Response:", data);

    if (!response.ok || data.message?.toLowerCase() !== "success") {
      return res.status(500).json({
        success: false,
        message: data?.message || "❌ Failed to cancel booking.",
      });
    }

    return res.status(200).json({
      success: true,
      message: data.message,
      traceId: data.traceid,
    });

  } catch (err) {
    const safeMessage = err?.message || String(err) || "❌ Unknown error during TCS booking cancellation.";
    console.error("❌ TCS Booking Cancellation Failed:", safeMessage);

    return res.status(500).json({
      success: false,
      message: safeMessage,
    });
  }
};


export const createTcsBooking = async ({ fullName, address, city, phone, email, weight, totalAmount, originCity , products  }) => {
  const cityCode = city;
  // const isRawalpindi = originCity?.toLowerCase() === "rawalpindi";
  const isRawalpindi = false;
const shipperinfo = isRawalpindi
  ? {
      tcsaccount: TCS_ACCOUNT_NO,
      shippername: "Raasid Store",
      address1: "Executive office Ground Floor G-04, Rawat Technology Park",
      address2: "Rawalpindi",
      address3: "Punjab, Pakistan",
      zip: "46000",
      countrycode: "PK",
      countryname: "Pakistan",
      cityname: "RAWALPINDI",
      mobile: "03349333101"
    }
  : {
      tcsaccount: TCS_ACCOUNT_NO,
      shippername: "Raasid Store",
      address1: "mre project, care of headquarter ASC center",
      address2: "Nowshera",
      address3: "KPK",
      zip: "24110",
      countrycode: "PK",
      countryname: "Pakistan",
      cityname: "NOWSHERA",
      mobile: "03349333101"
    };

const vendorinfo = isRawalpindi
  ? {
      name: "Raasid Vendor",
      address1: "Executive office Ground Floor G-04, Rawat Technology Park",
      address2: "Rawalpindi",
      address3: "Punjab, Pakistan",
      cityname: "RAWALPINDI",
      mobile: "03349333101"
    }
  : {
      name: "Raasid Vendor",
      address1: "mre project, ASC center",
      address2: "Nowshera",
      address3: "KPK",
      cityname: "NOWSHERA",
      mobile: "03349333101"
    };
  if (!cityCode) {
    throw new Error(`❌ Unsupported city: ${city}`);
  }

  const { bearerToken, accessToken } = await getTcsTokenTest();

  const now = new Date();
  const shipmentDate = now.toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    hour12: false,
  }).replace(",", "");

  const payload = {
    accesstoken: accessToken,
      shipperinfo,
      vendorinfo,
      consigneeinfo: {
      firstname: fullName,
      middlename: fullName,
      lastname: "",
      address1: address,
      countrycode: "PK",
      countryname: "Pakistan",
      cityname: city,
      mobile: phone,
      email: email
    },
    shipmentinfo: {
  costcentercode: isRawalpindi ? "04" : "01",
  referenceno: Math.floor(100000000 + Math.random() * 900000000).toString(),
  contentdesc: "Online order from Raasid Store",
  servicecode: "O",
  parametertype: "Weight",
  shipmentdate: shipmentDate,
  currency: "PKR",
  codamount: totalAmount,
  declaredvalue: totalAmount || 1000,      // ✅ MUST be ≥ 10
  insuredvalue: totalAmount || 1000,       // ✅ MUST be ≥ 10
  weightinkg: (Number(weight) / 1000).toFixed(2),
  pieces: 1,
  fragile: false,
  remarks: "Booking created via API",
 skus: products.map((p) => ({
  description: p.productId?.name || "Unnamed Product",
  quantity: p.quantity,
  weight: (Number(weight) / 1000).toFixed(2), // or use p.productId.weight if individual product weights exist
  uom: "KG",
  unitprice: p.productId?.price || 0,
  declaredvalue: p.productId?.price || 1000,
  insuredvalue: p.productId?.price || 1000,
  hscode: "GEN123"
})),

  piecedetail: [
    {
      length: 10,
      width: 10,
      height: 10
    }
  ]
}

  };

  const response = await fetch(TCS_DEV_BOOKING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${bearerToken}`
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  console.log("📦 TCS Booking Response:", raw);

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error("❌ Could not parse TCS booking response");
  }

  if (!response.ok || data.message?.toLowerCase() !== "success") {
    console.error("❌ TCS Booking Failed:", data);
    throw new Error(data.message || "TCS booking failed");
  }

  return {
    consignmentNo: data.consignmentNo,
    traceId: data.traceid,
    raw
  };
};













export const trackTcsShipment = async (req, res, next) => {
  const { cnNumber } = req.params;

  if (!cnNumber) {
    return res.status(400).json({ message: "Consignment number is required" });
  }

  try {
    const response = await fetch(
      `https://connect.tcscourier.com/tracking/api/Tracking/GetDynamicTrackDetail?consignee=${cnNumber}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${process.env.TCS_ECOM_TOKEN}`, // ✅ Use your bearer token
        },
      }
    );

    const raw = await response.text();
    console.log("📦 Raw TCS Tracking Response:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Invalid JSON from TCS tracking API");
      return res.status(502).json({ message: "TCS did not return valid JSON", raw });
    }

    if (!response.ok || data.message?.toUpperCase() !== "SUCCESS") {
      console.error("❌ TCS tracking failed:", data);
      return res.status(500).json({
        success: false,
        message: "Tracking failed or CN not found",
        raw: data,
      });
    }

    return res.status(200).json({
      success: true,
      consignmentNo: cnNumber,
      shipmentInfo: data.shipmentinfo || null,
      deliveryInfo: data.deliveryinfo || null,
      checkpoints: data.checkpoints || null,
      status: data.shipmentsummary || "No summary available",
    });
  } catch (error) {
    console.error("❌ Error tracking TCS shipment:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const getTcsTokenTest = async () => {
  try {
    if (!TCS_ECOM_TOKEN) {
      throw new Error("Bearer token (TCS_ECOM_TOKEN) is missing");
    }

    const accessTokenRes = await fetch(
      `https://connect.tcscourier.com/ecom/api/authentication/token?username=${encodeURIComponent(TCS_USERNAME)}&password=${encodeURIComponent(TCS_PASSWORD)}`,
      {
        method: "GET",
        headers: {
          Accept: "*/*",
          Authorization: `Bearer ${TCS_ECOM_TOKEN}`,
        },
      }
    );

    const raw = await accessTokenRes.text();

    if (!raw) {
      throw new Error("Access token response body is empty");
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Failed to parse access token response:", raw);
      throw new Error("Invalid JSON from access token API");
    }

    if (!accessTokenRes.ok || !data?.accesstoken) {
      console.error("❌ Access token API failed:", data);
      throw new Error("Access token fetch failed");
    }

    return {
      bearerToken: TCS_ECOM_TOKEN,  // for request header
      accessToken: data.accesstoken // for request body
    };

  } catch (err) {
    console.error("❌ Error in getTcsToken:", err.message);
    throw new Error("TCS token acquisition failed");
  }
};



export const getTcsShippingFee = async (req, res, next) => {
  const { city, weight } = req.body;
  
  const tcsCityCodes = {
  Karachi: "KHI",
  Lahore: "LHE",
  Islamabad: "ISB",
  Multan: "MUX",
  Faisalabad: "FSD",
  Peshawar: "PEW",
  Rawalpindi: "RWP",
  Hyderabad: "HYD",
  Quetta: "UET",
 
};

const cityCode = tcsCityCodes[city];
if (!cityCode) {
  return res.status(400).json({ message: "Unsupported destination city" });
}

  if (!city || !weight || isNaN(weight)) {
    return res.status(400).json({ message: "City and numeric weight are required" });
  }

  try {
   const { bearerToken, accessToken } = await getTcsTokenTest();
   


    const now = new Date();
    const shipmentDate = now.toLocaleString("en-GB", {
      timeZone: "Asia/Karachi",
      hour12: false,
    }).replace(",", "");

    const payload = {
      accesstoken: accessToken,
     shipperinfo: {
  tcsaccount: TCS_ACCOUNT_NO,
  shippername: "Raasid Store",
  address1: "mre project, care of headquarter ASC center",
  address2: "Nowshera",
  address3: "KPK",
  zip: "24110", // Use actual postal code if known
  countrycode: "PK",
  countryname: "Pakistan",
  cityname: "NOWSHERA",
  mobile: "03349333101"
},
vendorinfo: {
  name: "Raasid Vendor",
  address1: "mre project, ASC center",
  address2: "Nowshera",
  address3: "KPK",
  cityname: "NOWSHERA",
  mobile: "03349333101"
}
,
      consigneeinfo: {
        firstname: "Test",
        middlename: "User",
        lastname: "Demo",
        address1: "Test Address",
        countrycode: "PK",
        countryname: "Pakistan",
      cityname: city,
        mobile: "03000000000",
        email: "test@example.com",
        areacode: "KHI00001",
        areaname: "Gulshan",
        blockname: "Block 6 PECHS",
        lat: "24.920733",
        lng: "67.088162",
        landmark: "Baloch Hospital"
      },
   
 shipmentinfo: {
  costcentercode: "01",
  referenceno: "123456789",
  contentdesc: "Test Product",
  servicecode: "O",
  parametertype: "Weight",
  shipmentdate: shipmentDate,
  currency: "PKR",
  codamount: 0,
  declaredvalue: 1000,    // ✅ MUST be ≥ 10
  insuredvalue: 1000,     // ✅ Also required!
  weightinkg: (Number(weight) / 1000).toFixed(2),
  pieces: 1,
  fragile: false,
  remarks: "Shipping fee simulation",
  skus: [
    {
      description: "Sample SKU",
      quantity: 1,
      weight: (Number(weight) / 1000).toFixed(2),
      uom: "KG",
      unitprice: 1000,
      declaredvalue: 1000,
      insuredvalue: 1000,
      hscode: "Test123"
    }
  ]
}


    };

    const response = await fetch("https://connect.tcscourier.com/ecom/api/booking/create", {
      method: "POST",
     headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${bearerToken}` // ✅ in header
  },
      body: JSON.stringify(payload)
    });

    const raw = await response.text();
    console.log("📦 Raw TCS response:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Invalid JSON from TCS response");
      return res.status(502).json({ message: "TCS did not return valid JSON" });
    }

    if (!response.ok || data.message?.toLowerCase() !== "success") {
      console.error("❌ TCS simulation failed:", data);
      return res.status(500).json({ message: "Failed to simulate shipping fee", data });
    }

    const fee = data.deliveryinfo?.[0]?.chargeamount || data.shipmentinfo?.totalcharges || null;

    return res.status(200).json({
      success: true,
      shippingFee: fee,
      raw: data
    });
  } catch (err) {
    console.error("❌ Error fetching TCS fee:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

 

export const testTcsTokenTestTwo = async (req, res, next) => {
  try {
    console.log("Sending request...");
    const token = await getTcsTokenTest();
    console.log("Final token:", token);

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    console.error("Error while testing token:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


