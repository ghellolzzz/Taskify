const token = localStorage.getItem("token");
let currentEditId = null; // Track if editing or creating

// Load everything on page load
document.addEventListener("DOMContentLoaded", () => {
    loadNotes();
    
    // Unified event listener for the form submission
    const noteForm = document.getElementById("noteForm");
    if (noteForm) {
        noteForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (currentEditId) {
                saveNoteEdit(currentEditId);
            } else {
                createNote();
            }
        });
    }

    // Live Color Preview Logic
    const colorOptions = document.querySelectorAll('input[name="color"]');
    const noteArea = document.getElementById("noteContent");
    const previewColors = { yellow: '#fff9c4', pink: '#fce4ec', blue: '#e3f2fd', green: '#e8f5e9' };

    colorOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            noteArea.style.backgroundColor = previewColors[e.target.value];
        });
    });
});

// LOAD ALL NOTES
function loadNotes() {
    fetch("/api/community", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    })
    .then(res => res.json())
    .then(data => {
        renderNotes(data.notes);
    })
    .catch(err => console.error("Failed to load community notes:", err));
}

// RENDER NOTES TO THE BOARD
function renderNotes(notes) {
    const container = document.getElementById("notesContainer");
    const currentUserId = parseInt(localStorage.getItem("userId")); 
    container.innerHTML = "";

    notes.forEach((n) => {
        const noteDiv = document.createElement("div");
        noteDiv.className = `sticky-note note-${n.color}`;
        
        const randomRotate = (Math.random() * 6 - 3).toFixed(2);
        noteDiv.style.transform = `rotate(${randomRotate}deg)`;

        // 1. Heart Logic: White if 0 or not liked by me, Red if liked by me
        const hasLiked = n.reactions?.some(r => r.userId === currentUserId);
        const totalReactions = n._count?.reactions || 0;

        // 2. Owner Logic: Show buttons only if I created the note
        const isOwner = n.userId === currentUserId;

        noteDiv.innerHTML = `
            <div class="note-body">
                <p class="mb-0 text-dark">${n.content}</p>
            </div>
            <div class="note-footer d-flex justify-content-between align-items-center mt-3">
                <small class="fw-bold text-muted">— ${n.user ? n.user.name : 'User'}</small>
                <div class="d-flex align-items-center gap-2">
                    
                    ${isOwner ? `
                        <button class="btn btn-sm p-0 text-primary" 
                                data-bs-toggle="modal" 
                                data-bs-target="#addNoteModal" 
                                onclick="openEditNote(${n.id}, '${n.content.replace(/'/g, "\\'")}', '${n.color}')">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm p-0 text-danger" onclick="deleteNote(${n.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}

                    <button class="btn btn-sm p-0 border-0 d-flex align-items-center gap-1" 
                            onclick="reactToNote(event, ${n.id})">
                        <span class="fs-5 heart-icon ${hasLiked ? 'text-danger animate-pop' : 'text-muted'}">
                            ${hasLiked ? '❤️' : '🤍'}
                        </span>
                        <span id="count-${n.id}" class="badge text-dark p-0">${totalReactions}</span>
                    </button>

                </div>
            </div>
        `;
        container.appendChild(noteDiv);
    });
}
// RESET MODAL FOR NEW NOTE
function prepareCreateMode() {
    currentEditId = null;
    document.getElementById("noteForm").reset();
    document.getElementById("modalTitle").innerText = "New Encouragement";
    document.getElementById("submitBtn").innerText = "Post to Board";
    document.getElementById("noteContent").style.backgroundColor = "#fff9c4"; // Reset to default yellow
}

// CREATE NEW NOTE
function createNote() {
    const content = document.getElementById("noteContent").value;
    const color = document.querySelector('input[name="color"]:checked').value;

    fetch("/api/community", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ content, color })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) alert("Error: " + data.error);
        else {
            closeModal();
            loadNotes();
        }
    });
}

// OPEN EDIT MODAL
function openEditNote(id, content, color) {
    currentEditId = id;
    
    document.getElementById("noteContent").value = content;
    document.querySelector(`input[name="color"][value="${color}"]`).checked = true;
    
    // Set preview color
    const previewColors = { yellow: '#fff9c4', pink: '#fce4ec', blue: '#e3f2fd', green: '#e8f5e9' };
    document.getElementById("noteContent").style.backgroundColor = previewColors[color];
    
    document.getElementById("modalTitle").innerText = "Edit Encouragement";
    document.getElementById("submitBtn").innerText = "Save Changes";
}

// SAVE EDITED NOTE
function saveNoteEdit(id) {
    const body = {
        content: document.getElementById("noteContent").value,
        color: document.querySelector('input[name="color"]:checked').value
    };

    fetch(`/api/community/${id}`, {
        method: "PUT",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) alert("Error: " + data.error);
        else {
            closeModal();
            loadNotes();
        }
    })
    .catch(err => console.error("Error updating note:", err));
}

// HELPER: CLOSE MODAL
function closeModal() {
    const modalElement = document.getElementById('addNoteModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
    document.getElementById("noteForm").reset();
}

// DELETE NOTE
function deleteNote(id) {
    if (!confirm("Are you sure you want to delete this word of encouragement?")) return;

    fetch(`/api/community/${id}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
    })
    .then(() => loadNotes())
    .catch(err => console.error("Error deleting:", err));
}

// REACT TO NOTE (Toggle Like)
function reactToNote(event, id) {
    if (event) event.preventDefault();

    const button = event.currentTarget;
    const heart = button.querySelector('.heart-icon');
    const countSpan = document.getElementById(`count-${id}`);
    
    const isLiked = heart.innerText === '❤️';
    let currentCount = parseInt(countSpan.innerText);

    if (isLiked) {
        heart.innerText = '🤍';
        countSpan.innerText = Math.max(0, currentCount - 1);
    } else {
        heart.innerText = '❤️';
        heart.classList.remove('animate-pop');
        void heart.offsetWidth; 
        heart.classList.add('animate-pop');
        countSpan.innerText = currentCount + 1;
    }

    fetch(`/api/community/${id}/react`, {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ type: "HEART" })
    })
    .catch(err => {
        loadNotes(); 
        console.error("Error toggling reaction:", err);
    });
}

// Logout functionality
const logoutBtn = document.querySelector('.sidebar-footer a');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '../login.html';
    });
}

