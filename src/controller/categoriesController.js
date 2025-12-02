const categoriesModel = require("../models/categoriesModel");

module.exports.getAllCategories = function (req, res) {
    const userId = res.locals.userId;
      return categoriesModel.getAllCategories(userId)
    .then(result => res.status(200).json(result))
    .catch(err => res.status(500).json({ message: err.message }));
};

module.exports.createCategory = function (req, res) {
    const userId = res.locals.userId;
    const { name, color } = req.body;
    
        if (!name) return res.status(400).json({ error: "Category Name required" });
    
        return categoriesModel.createCategory({ name, color, userId })
            .then(result => res.status(201).json(result))
            .catch(err => res.status(500).json({ message: err.message }));
};

module.exports.updateCategory = function (req, res) {
    const userId = res.locals.userId;
    const id = req.params.id;
    const { name, color } = req.body;

    if (!name) return res.status(400).json({ message: "Missing name" });

    categoriesModel.updateCategory({ id, name, color, userId })
        .then(result => res.status(200).json(result))
        .catch(err => res.status(500).json({ message: err.message }));
};

module.exports.deleteCategory = function (req, res) {
    const userId = res.locals.userId;
    const id = req.params.id;

    categoriesModel.deleteCategory(id, userId)
        .then(result => res.status(200).json({ message: "Deleted successfully" }))
        .catch(err => res.status(500).json({ message: err.message }));
};
