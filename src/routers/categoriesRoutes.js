const express = require("express");
const router = express.Router();
const categoriesController = require("../controller/categoriesController");

// get/display categories
router.get("/:userId", (req, res) => {
    categoriesController.getAllCategories(req.params.userId)
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({ message: err.message }));
});

// add category
router.post("/create", (req, res) => {
    const { name, color, userId } = req.body;

    if (!name || !userId) return res.status(400).json({ error: "Name and userId required" });

    categoriesController.createCategory({ name, color, userId })
        .then(result => res.status(201).json(result))
        .catch(err => res.status(500).json({ message: err.message }));
});

// Update category
router.put("/update/:id", (req, res) => {
    categoriesController.updateCategory(req, res); // pass req/res directly
});


// Delete category
router.delete("/delete/:id", (req, res) => {
    categoriesController.deleteCategory(req, res);
});

module.exports = router;