// --- UTILITY FUNCTIONS (Copied from existing project structure) ---

// auth headers (assuming you might protect the feedback route later)
function getAuthHeaders(contentType = "application/json") {
 const token = localStorage.getItem("token");
 return {
 "Authorization": "Bearer " + token,
 "Content-Type": contentType
};
}

// get logged in user id (Required to fix the ReferenceError)
function getLoggedInUserId() {
 const userIdElement = document.getElementById("logged-in-user-id");
 // Assuming 'logged-in-user-id' is a hidden input element holding the user ID
 return userIdElement ? parseInt(userIdElement.value) : null;
}

// --- CORE FUNCTIONALITY ---

function submitFeedback(event) {
    event.preventDefault();

    const form = event.target;
    const feedbackMessage = document.getElementById('feedback-message');
    const submitBtn = document.getElementById('submitFeedbackBtn');
    
    // Gather data from the form fields
    const data = {
        type: form.type.value,
        description: form.description.value,
        userId: getLoggedInUserId() // Include this line if you track user IDs and uncomment the function above
    };

    // Disable button and clear previous message
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    feedbackMessage.style.display = 'none';

    // 💡 FIX: Define headers in a variable explicitly before the fetch call
    const headers = getAuthHeaders();

    fetch('/api/feedback', {
        method: 'POST',
        headers: headers, // Use the pre-defined headers variable
        body: JSON.stringify(data)
    })
    .then(res => {
        if (!res.ok) {
            // Attempt to read the error message from the response body
            return res.json().then(errorData => { 
                throw new Error(errorData.error || `Server error: ${res.status}`);
            });
        }
        return res.json();
    })
    .then(data => {
        feedbackMessage.textContent = '✅ Thank you for your feedback! It has been successfully submitted.';
        feedbackMessage.className = 'alert alert-success';
        feedbackMessage.style.display = 'block';
        form.reset(); // Clear the form on success
    })
    .catch(error => {
        console.error('Submission Error:', error);
        // Display the specific error message 
        feedbackMessage.textContent = '❌ Error submitting feedback: ' + (error.message || 'Please check the console.');
        feedbackMessage.className = 'alert alert-danger';
        feedbackMessage.style.display = 'block';
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
    });
}


// --- INITIALIZATION ---

function initializeFeedbackPage() {
    // Attach the submitFeedback function to the form's submit event
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', submitFeedback);
    }
}

document.addEventListener("DOMContentLoaded", initializeFeedbackPage);