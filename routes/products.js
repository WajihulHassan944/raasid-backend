import express from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,

} from "../controllers/products.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

// Create product (with image upload)
router.post(
  "/create",
  upload.single("image"),
  createProduct
);

// Get all products
router.get("/all", getAllProducts);

// Get single product by ID
router.get("/:id", getProductById);

// Update product by ID
router.put("/update/:id", upload.single("image"),  updateProduct);

// Delete product by ID
router.delete("/:id", deleteProduct);

export default router;
