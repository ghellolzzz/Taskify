// auth
function getAuthHeaders(contentType = "application/json") {
  const token = localStorage.getItem("token");
  return {
    "Authorization": "Bearer " + token,
    "Content-Type": contentType
  };
}

// get logged in user id
function getLoggedInUserId() {
  const userIdElement = document.getElementById("logged-in-user-id");
  return userIdElement ? parseInt(userIdElement.value) : null;
}

// Logout functionality
document.querySelector('.sidebar-footer a')?.addEventListener("click", (e) => {
    e.preventDefault();
    // Clear all authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('accountNo');
    localStorage.removeItem('role');
    localStorage.removeItem('memberId');
    
    // Redirect to login page
    window.location.href = '../login.html';
});

// convert rgb() to hex
function rgbToHex(rgb) {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
    return result ? "#" +
        ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
        ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
        ("0" + parseInt(result[3], 10).toString(16)).slice(-2) : rgb;
}

// convert hex to rgb to display tasks color based on category
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// live preview of category w color
function updatePreview() {
  const preview = document.getElementById("category-preview");
  const nameInput = document.getElementById("new-category-name");
  const colorInput = document.getElementById("new-category-color");

  if (!preview || !nameInput || !colorInput) return;
  const color = colorInput.value || "#28a745";

  const name = nameInput.value.trim() || "New Category";

  preview.textContent = name;
  preview.style.backgroundColor = color;

  // Contrast Check (improve readability)
  const r = parseInt(color.substring(1, 3), 16);
  const g = parseInt(color.substring(3, 5), 16);
  const b = parseInt(color.substring(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  preview.style.color = luminance > 0.5 ? "#333" : "#fff";
}

// show categories
function loadCategoriesGrid() {
  const grid = document.querySelector(".categories-grid");
  fetch("/api/categories", {
    method: "GET",
    headers: getAuthHeaders()
  })
    .then(res => res.json())
    .then(data => {
      const categories = data.categories || data;
      if (grid) grid.innerHTML = "";

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
          <p>${cat._count?.tasks || 0} Task${cat._count?.tasks !== 1 ? "s" : ""}</p>
          <div class="category-actions">
            <button class="btn btn-sm btn-info update-category-btn" data-id="${cat.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-category-btn" data-id="${cat.id}">Delete</button>
          </div>
        `;

        if (cat.color) {
    card.style.border = `3px solid ${cat.color}`; // colored edge
    card.style.backgroundColor = "#fff";         // background
    card.style.color = "#000000ff";                   // text color
  }

  // clicking the card should load tasks table
  card.addEventListener("click", () => {
    loadTasksForCategory(cat.id, cat.name, cat.color);
  });

        if (grid) grid.appendChild(card);
      });

      attachCardActionListeners();
    })
    .catch(err => console.error("Error loading categories:", err));
}

function attachCardActionListeners() {
  document.querySelectorAll(".update-category-btn").forEach(btn => {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      const id = this.dataset.id;
      const card = this.closest(".category-card");
      const currentName = card.querySelector("h4").textContent;
      const currentColor = rgbToHex(card.style.borderColor || "#28a745");

      // Show edit container
      const container = document.getElementById("new-category-container");
      const nameInput = document.getElementById("new-category-name");
      const colorInput = document.getElementById("new-category-color");
      const preview = document.getElementById("category-preview");
      const submitBtn = document.getElementById("submit-category");
      submitBtn.textContent = "Update"; 
      container.style.display = "block";
      container.dataset.editingId = id;

      nameInput.value = currentName;
      colorInput.value = currentColor;
      container.style.borderColor = currentColor;

    
      container.style.border = `3px solid ${currentColor}`;
      nameInput.style.border = `3px solid ${currentColor}`;
      preview.style.backgroundColor = currentColor;

        submitBtn.textContent = "Update Category";
        submitBtn.dataset.mode = "edit";
        submitBtn.style.backgroundColor = currentColor;
      updatePreview();
    });
  });



  document.querySelectorAll(".delete-category-btn").forEach(btn => {
    btn.addEventListener("click", function (event) {
      event.stopPropagation();
      const id = this.dataset.id;
      if (!confirm("Are you sure you want to delete this category?")) return;

      fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      })
        .then(() => loadCategoriesGrid())
        .catch(err => console.error("Error deleting category:", err));
    });
  });
}

// add new category
function createNewCategory() {
  const nameInput = document.getElementById("new-category-name");
  const colorInput = document.getElementById("new-category-color");
  const container = document.getElementById("new-category-container");

  const name = nameInput.value.trim();
  const color = colorInput.value;
  const userId = getLoggedInUserId();

  if (!name) return alert("Category name is required");

  fetch("/api/categories", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, color, userId })
  })
    .then(res => res.json())
    .then(() => {
      container.style.display = "none";
      nameInput.value = "";
      colorInput.value = "#28a745";
      loadCategoriesGrid();
    })
    .catch(err => console.error("Error creating category:", err));
}

function updateCategory() {
  const id = document.getElementById("new-category-container").dataset.editingId;
  const nameInput = document.getElementById("new-category-name");
  const colorInput = document.getElementById("new-category-color");
 

  const name = nameInput.value.trim();
  const color = colorInput.value;

  if (!name) return alert("Category name is required");

  fetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, color })
  })
  .then(res => res.json())
  .then(() => {
    document.getElementById("new-category-container").style.display = "none";
    loadCategoriesGrid();
  })
  .catch(err => console.error("Error updating category:", err));
}


function initializeCategoryPage() {
  const addBtn = document.querySelector(".add-category-btn");
  const submitBtn = document.getElementById("submit-category");
  const nameInput = document.getElementById("new-category-name");
  const colorInput = document.getElementById("new-category-color");
  const swatches = document.getElementById("color-swatches");
  const container = document.getElementById("new-category-container");

  loadCategoriesGrid();

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      container.style.display = "block";
      
    nameInput.value = "";
    colorInput.value = "#28a745";
    container.style.border = `3px solid #28a745`;

    // Reset preview
    preview.textContent = "New Category";
    preview.style.backgroundColor = "#28a745";
    preview.style.color = "#fff";

    submitBtn.textContent = "Add Category";
    submitBtn.style.backgroundColor = "#28a745"
    submitBtn.dataset.mode = "add";

     // Remove editing state
    delete container.dataset.editingId;

    // Remove active swatch
    document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
    });
  }
  
  if (nameInput) nameInput.addEventListener("input", updatePreview);
  if (colorInput) colorInput.addEventListener("input", updatePreview);

if (swatches) {
  swatches.addEventListener("click", event => {
    const swatch = event.target.closest(".color-swatch");
    if (!swatch) return;

    const selectedColor = swatch.getAttribute("data-color");

    // Update the hidden input value
    colorInput.value = selectedColor;

    // Update the border colors of the container and input
    const newCatContainer = document.getElementById("new-category-container");
    const categoryNameInput = document.getElementById("new-category-name");
    if (newCatContainer) newCatContainer.style.border = `3px solid ${selectedColor}`;
    if (categoryNameInput) categoryNameInput.style.border = `3px solid ${selectedColor}`;

    // Update the live preview background color
    const categoryPreview = document.getElementById("category-preview");
    if (categoryPreview) categoryPreview.style.backgroundColor = selectedColor;

    // Update the Add button background color
    if (submitBtn) submitBtn.style.backgroundColor = selectedColor;

    // Highlight the active swatch
    document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
    swatch.classList.add("active");

    // Update the preview text contrast
    updatePreview();
  });
}

//submit button for add category and edit
  if (submitBtn) {
  submitBtn.addEventListener("click", () => {
    if (submitBtn.dataset.mode === "edit") {
      updateCategory();
    } else {
      createNewCategory();
    }
  });
}

//back btn for task table
const backBtn = document.getElementById("backToCategoriesBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    document.getElementById("category-tasks-section").style.display = "none";
    document.querySelector(".categories-grid").style.display = "grid";
  });
}

}

document.addEventListener("DOMContentLoaded", initializeCategoryPage);

// Fetch task for specific category
function loadTasksForCategory(categoryId, categoryName, categoryColor) {
  fetch(`/api/categories/${categoryId}/tasks`, {
    method: "GET",
    headers: getAuthHeaders()
  })
    .then(res => res.json())
    .then(data => {
      // Pass the color to the display function
      showTaskTable(data.tasks, categoryName, categoryColor); 
    })
    .catch(err => console.error("Error loading tasks:", err));
}

// Display task table
function showTaskTable(tasks, categoryName, categoryColor) {
  document.getElementById("selected-category-title").innerText =
    `Tasks in ${categoryName}`;

 const taskSection = document.getElementById("category-tasks-section");
 const hexColor = categoryColor || '#198754'; // Fallback color
 
 // Set the main CSS variable
 taskSection.style.setProperty('--category-color', hexColor);

 // Convert to RGB for transparent hover/border effects
 const rgb = hexToRgb(hexColor);
 if (rgb) {
 taskSection.style.setProperty('--category-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
 }

const tbody = document.getElementById("tasks-table-body"); 
 
 if (tbody) {
     tbody.innerHTML = "";
 }
  if (!tasks || tasks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No tasks found</td></tr>`;
  } else {
    tasks.forEach(t => {
      tbody.innerHTML += `
      <tr>
        <td>${t.title}</td>
        <td>${t.priority}</td>
        <td>${t.status}</td>
        <td>${t.description || "-"}</td>
        <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-"}</td>
        <td></td> </tr>`;
    });
  }

  document.querySelector(".categories-grid").style.display = "none";
  document.getElementById("category-tasks-section").style.display = "block";
}