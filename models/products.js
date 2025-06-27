import mongoose from "mongoose";

// Define sub-schema for each nutrition item
const nutritionItemSchema = new mongoose.Schema({
  UOM: {
    type: String,
    required: true
  },
  Results: {
    type: String,
    required: true
  }
}, { _id: false });

// Main product schema
const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  ingredients: {
    type: [String], 
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  packaging: {
    type: String,
    required: true,
  },
  serving: {
    type: String,
    required: true,
  },
  nutritions: {
    type: Map,
    of: nutritionItemSchema,
    required: false,
  }
}, {
  timestamps: true,
});

export const Products = mongoose.model("Products", schema);
