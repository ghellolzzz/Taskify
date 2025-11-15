console.log("categories.js loaded");

// Select DOM elements
const addCategoryBtn = document.querySelector(".add-category-btn");
const categoriesGrid = document.querySelector(".categories-grid");

// Handle Add Category
addCategoryBtn.addEventListener("click", () => {
    const categoryName = prompt("Enter category name:");

    // Validation
    if (!categoryName || categoryName.trim() === "") {
        alert("Category name cannot be empty!");
        return;
    }

    // Create a new category card element
    const newCard = document.createElement("div");
    newCard.classList.add("category-card");

    newCard.innerHTML = `
        <i class="bi bi-folder-fill"></i>
        <h4>${categoryName}</h4>
        <p>0 Tasks</p>
    `;

    // Append to grid
    categoriesGrid.appendChild(newCard);
});
