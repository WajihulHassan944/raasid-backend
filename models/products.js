import mongoose from "mongoose";

// Define sub-schema for each nutrition item
const nutritionItemSchema = new mongoose.Schema({
  UOM: { type: String, required: true },
  Results: { type: String, required: true }
}, { _id: false });

// Generate random 4-letter uppercase code
const generatePosId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Main product schema
const schema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  ingredients: { type: [String], required: true },
  image: { type: String, required: true },
  packaging: { type: String, required: true },
  serving: { type: String, required: true },
  nutritions: {
    type: Map,
    of: nutritionItemSchema,
    required: false,
  },
  posId: {
    type: String,
    unique: true,
    sparse: true, // allow initially missing
  }
}, {
  timestamps: true,
});

// Auto-generate posId before saving
schema.pre("save", async function (next) {
  if (!this.posId) {
    let unique = false;
    while (!unique) {
      const code = generatePosId();
      const existing = await mongoose.models.Products.findOne({ posId: code });
      if (!existing) {
        this.posId = code;
        unique = true;
      }
    }
  }
  next();
});

export const Products = mongoose.model("Products", schema);
