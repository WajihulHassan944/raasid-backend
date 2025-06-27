import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.js";

const router = express.Router();

// Create a new category
router.post("/create", createCategory);

// Get all categories
router.get("/", getAllCategories);

// Get category by ID
router.get("/:id", getCategoryById);

// Update category by ID
router.put("/update/:id", updateCategory);

// Delete category by ID
router.delete("/:id", deleteCategory);

export default router;
