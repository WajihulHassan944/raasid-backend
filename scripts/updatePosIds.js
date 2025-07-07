import mongoose from "mongoose";
import dotenv from "dotenv";
import { Products } from "../models/products.js"; // Adjust path as needed

dotenv.config({ path: "./data/config.env" }); // Adjust if your path is different

const generatePosId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const assignPosIds = async () => {
  await mongoose.connect('mongodb+srv://muhammadfurqanch517:jJepNM4A7fEgPciM@cluster0.sfp9fbc.mongodb.net/');
  console.log("Connected to DB");

  const products = await Products.find({ posId: { $exists: false } });

  for (let product of products) {
    let unique = false;
    let posId;

    while (!unique) {
      posId = generatePosId();
      const exists = await Products.findOne({ posId });
      if (!exists) unique = true;
    }

    product.posId = posId;
    await product.save();
    console.log(`Assigned posId ${posId} to product: ${product.name}`);
  }

  console.log("All missing posIds assigned.");
  process.exit();
};

assignPosIds().catch(err => {
  console.error(err);
  process.exit(1);
});
