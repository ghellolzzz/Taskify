const categoriesModel = require("../models/categoriesModel");

module.exports.getAllCategories = (userId) => {
    return categoriesModel.getAllCategories(userId);
};

module.exports.createCategory = ({ name, userId }) => {
    if (!name || !userId) throw new Error("Category name required");
    return categoriesModel.createCategory({ name, userId });
};

module.exports.updateCategory = (req, res) => {
    const id = req.params.id;
    const { name } = req.body;

    if (!name) return res.status(400).json({ message: "Missing name" });

    categoriesModel.updateCategory({ id, name })
        .then(result => res.status(200).json(result))
        .catch(err => res.status(500).json({ message: err.message }));
};

module.exports.deleteCategory = (req, res) => {
    const id = req.params.id;

    categoriesModel.deleteCategory(id)
        .then(result => res.status(200).json({ message: "Deleted successfully" }))
        .catch(err => res.status(500).json({ message: err.message }));
};
