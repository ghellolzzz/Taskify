const express = require("express");
const router = express.Router();
const categoriesController = require("../controller/categoriesController");
const { verifyToken } = require("../middleware/jwtMiddleware");
router.use(verifyToken)

// get/display categories
router.get("/", categoriesController.getAllCategories);

// add category
router.post("/", categoriesController.createCategory);

// Update category
router.put("/:id", categoriesController.updateCategory);

// Delete category
router.delete("/:id", categoriesController.deleteCategory);

// get tasks by category
router.get("/:id/tasks", categoriesController.getTasksByCategory);

module.exports = router;