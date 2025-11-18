document.addEventListener("DOMContentLoaded", () => {
    const categoriesGrid = document.querySelector(".categories-grid");
    const addBtn = document.querySelector(".add-category-btn");
    const newCatContainer = document.getElementById("new-category-container");
    const submitBtn = document.getElementById("submit-category");

    const userId = 1; // hardcoded userid (change this to get the logged in user - matt)

    // Function to fetch and render categories
    function loadCategories() {
        fetch(`/api/categories/${userId}`)
            .then(res => res.json())
            .then(categories => {
                categoriesGrid.innerHTML = "";
                const iconMap = {
                    Work: "bi-briefcase-fill",
                    School: "bi-book-fill",
                    Health: "bi-heart-pulse-fill",
                    Personal: "bi-house-fill"
                };

                categories.forEach(cat => {
                    const card = document.createElement("div");
                    card.classList.add("category-card");
                    const iconClass = iconMap[cat.name] || "bi-folder-fill";

                    card.innerHTML = `
                        <i class="bi ${iconClass}"></i>
                        <h4>${cat.name}</h4>
                        <p>${cat._count.tasks} Task${cat._count.tasks !== 1 ? "s" : ""}</p>
                        <div class="category-actions">
                            <button class="update-category-btn" data-id="${cat.id}">Edit</button>
                            <button class="delete-category-btn" data-id="${cat.id}">Delete</button>
                        </div>
                    `;

                    // green for all categories
                    card.style.backgroundColor = "#17a84f";

                    categoriesGrid.appendChild(card);
                });

               
                // Edit button
                document.querySelectorAll(".update-category-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const catId = btn.dataset.id;
                        const newName = prompt("Enter new category name:");
                        if (!newName) return;
                        fetch(`/api/categories/update/${catId}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: newName })
                        })
                        .then(res => res.json())
                        .then(() => loadCategories())
                        .catch(err => console.error("Error updating category:", err));
                    });
                });

                // Delete button
                document.querySelectorAll(".delete-category-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const catId = btn.dataset.id;
                        if (!confirm("Are you sure you want to delete this category?")) return;
                        fetch(`/api/categories/delete/${catId}`, { method: "DELETE" })
                            .then(res => res.json())
                            .then(() => loadCategories())
                            .catch(err => console.error("Error deleting category:", err));
                    });
                });
            })
            .catch(err => {
                console.error("Error fetching categories:", err);
                categoriesGrid.innerHTML = "<p>Failed to load categories.</p>";
            });
    }

    loadCategories(); 

    addBtn.addEventListener("click", () => {
        newCatContainer.style.display = "block";
    });

    // Add new category
    submitBtn.addEventListener("click", () => {
        const name = document.getElementById("new-category-name").value.trim();

        if (!name) return alert("Category name is required");

        fetch("/api/categories/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, userId })
        })
        .then(res => res.json())
        .then(data => {
            newCatContainer.style.display = "none";
            document.getElementById("new-category-name").value = "";
            loadCategories(); // Refresh grid
        })
        .catch(err => console.error("Error adding category:", err));
    });  
});
