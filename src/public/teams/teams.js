document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "../login.html"
    }


    const teamsContainer = document.getElementById("teams-container")


    const teamViewContainer = document.getElementById("active-team-task-container")

    if (teamsContainer) {
        loadPendingInvites();
        loadMyTeams();
        setupCreateTeam();
    }

    if (teamViewContainer) {
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('id');

        if (!teamId) {
            alert("No team selected!");
            window.location.href = "teams.html";
        } else {
            loadTeamDetails(teamId);
            loadTeamStats(teamId);
            loadActivityFeed(teamId);

            document.getElementById('activity-filter').addEventListener('change', (e) => {
                loadActivityFeed(teamId, e.target.value);
            });

            setupAddMember(teamId);
            const addMemberModalEl = document.getElementById('addMemberModal');
if (addMemberModalEl) {
  addMemberModalEl.addEventListener('shown.bs.modal', () => {
    loadFriendsIntoInviteDropdown();
  });
}
setupInviteFriend(teamId);


setupInviteFriend(teamId);

setupAddTeamTask(teamId);
setupEditTaskForm();
setupEditTeamForm();


        }
    }


    document.querySelector('.sidebar-footer a')?.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '../login.html'
    });
})

//getting the team id from the url
function getTeamIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get('id');
    return teamId;
}

//setting up the edit team form
function setupEditTeamForm() {
    const form = document.getElementById('edit-team-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const teamId = getTeamIdFromUrl();

        const nameInput = document.getElementById('edit-team-name');
        const descInput = document.getElementById('edit-team-desc');

        const body = {
            name: nameInput.value,
            description: descInput.value
        };

        fetch(`/api/teams/${teamId}`, {
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify(body)
        })
            .then(res => {
                if (!res.ok) return res.json().then(e => { throw new Error(e.error) })
                return res.json()
            })
            .then(() => {



                document.getElementById('team-title-header').textContent = body.name
                document.getElementById('team-desc-header').textContent = body.description

                //closing the model
                const modalEl = document.getElementById('editTeamModal')
                const modal = bootstrap.Modal.getInstance(modalEl)
                if (modal) {
                    modal.hide()
                }


                showToast("Team updated successfully!", "success");


            })
            .catch(err => showToast(err.message, "error"))
    });
}
//loading pending invites
function loadPendingInvites() {
    const container = document.getElementById('invitations-container')

    fetch('/api/teams/invites/pending', {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(invites => {
            if (!invites || invites.length === 0) {
                container.innerHTML = "";
                return;
            }


            container.innerHTML = `<h4 class="mb-3">Pending Invitations</h4>`
            //rendering the invitations
            invites.forEach(invite => {
                const card = document.createElement('div')
                card.id = `invite-card-${invite.teamId}`
                card.className = "card bg-light border-primary shadow-sm mb-3";
                card.innerHTML = `
                <div class="card-body d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="card-title mb-0">You've been invited to join <strong>${invite.team.name}</strong></h6>
                        <small class="text-muted">${invite.team.description || ""}</small>
                    </div>
                    <div>
                        <button class="btn btn-success me-2" onclick="respondToInvite(${invite.teamId}, 'ACCEPTED')">Accept</button>
                        <button class="btn btn-outline-danger" onclick="respondToInvite(${invite.teamId}, 'REJECTED')">Decline</button>
                    </div>
                </div>
            `;
                container.appendChild(card)
            });
        });
}


//responding to invites
function respondToInvite(teamId, status) {
    const card = document.getElementById(`invite-card-${teamId}`)
    if (card) {
        card.style.opacity = '0.5';
        card.querySelectorAll('button').forEach(btn => btn.disabled = true)
    }

    fetch(`/api/teams/invites/${teamId}/respond`, {
        method: 'PUT',
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ status: status })
    })
        .then(res => {
            if (!res.ok) {

                return res.json().then(errData => {
                    throw new Error(errData.error || "Response failed");
                }).catch(() => {
                    throw new Error(`Server error: ${res.status}`);
                });
            }
            return res.json();
        })
        .then(() => {
            // Show toast
            if (status === 'ACCEPTED') {
                showToast('Welcome to the team!', 'success');
            } else {
                showToast('Invite declined.', 'success');
            }

            //animation
            if (card) {
                card.style.transition = 'all 0.4s ease';
                card.style.transform = 'scale(0.95)';
                card.style.opacity = '0';

                setTimeout(() => {
                    //reloading both invitations and teams
                    loadPendingInvites();
                    if (status === 'ACCEPTED') {
                        loadMyTeams();
                    }
                }, 450);
            }
        })
        .catch(err => {
            console.error('Error responding to invite:', err)
            if (card) {
                card.style.opacity = '1';
                card.querySelectorAll('button').forEach(btn => btn.disabled = false)
            }
            showToast(err.message || "Could not respond to invite.", "error")
        });
}

function loadMyTeams() {
    const container = document.getElementById("teams-container");
    if (!container) return;

    fetch("/api/teams", {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(teams => {
            //if the user have no teams
            if (!teams || teams.length === 0) {
                container.innerHTML = `
                <div class="col-12 text-center text-muted mt-5">
                    <i class="bi bi-people display-1 opacity-25"></i>
                    <p class="mt-2">You haven't joined any teams yet.</p>
                </div>`;
                return;
            }

            //rendering the teams
            container.innerHTML = teams.map(team => `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm border-0 team-card" onclick="window.location.href='team-view.html?id=${team.id}'">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title fw-bold text-success mb-0">${team.name}</h5>
                            <span class="badge bg-light text-dark border">
                                <i class="bi bi-person"></i> ${team._count?.members || 0}
                            </span>
                        </div>
                        <p class="card-text text-muted small">${team.description || "No description provided."}</p>
                        
                        <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                            <small class="text-muted"><i class="bi bi-list-task"></i> ${team._count?.tasks || 0} Tasks</small>
                            <button class="btn btn-sm btn-outline-success rounded-pill">View <i class="bi bi-arrow-right"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        })
        .catch(err => console.error("Failed to load teams:", err));
}

//setting up the create team
function setupCreateTeam() {
    document.getElementById("create-team-form").addEventListener("submit", (e) => {
        e.preventDefault()
        const name = document.getElementById("team-name").value
        const description = document.getElementById("team-desc").value


        fetch("/api/teams", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ name, description })
        })
            .then(res => res.json())
            .then(() => {
                location.reload()
            })
            .catch(err => alert("Error creating team"))
    })
}

//displaying the workload for each member
function loadWorkloadAnalytics(teamId) {
    fetch(`/api/teams/${teamId}/workload`, {
        headers: { 
            "Authorization": "Bearer " + localStorage.getItem("token") 
        }
    })
    .then(res => res.json())
    .then(data => {
        const memberList = document.getElementById("member-list");
       //looping through the calculated workload data
        data.forEach(member => {
           
            const listItems = memberList.querySelectorAll('li');
            
            listItems.forEach(li => {
              //match by the nmame
                if (li.querySelector('.fw-bold').textContent === member.name) {
                    
                  //displaying the badge color based ono member workload
                    let badgeColor = "";
                    if (member.loadStatus === 'Overloaded') badgeColor = 'text-danger';
                    else if (member.loadStatus === 'Optimal') badgeColor = 'text-success';
                    else badgeColor = 'text-muted';

                 
                    const infoDiv = li.querySelector('.flex-grow-1')
                    
                   
                    const oldInfo = infoDiv.querySelector('.workload-tag')
                    if (oldInfo) {
                        oldInfo.remove()
                    }

                    infoDiv.innerHTML += `
                        <div class="workload-tag mt-1" style="font-size: 0.6rem; letter-spacing: 0.5px;">
                            <span class="${badgeColor} fw-bold text-uppercase">${member.loadStatus}</span> 
                            <span class="text-muted">• ${member.workloadScore} pts</span>
                        </div>
                    `;
                }
            });
        });
    })
    .catch(err => console.error("Workload Analytics failed:", err));
}

//loading the team details
function loadTeamDetails(teamId) {
    fetch(`/api/teams/${teamId}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => {
            if (!res.ok) throw new Error("Failed to load team details");
            return res.json();
        })
        .then(team => {

            document.getElementById("team-title-header").textContent = team.name;
            document.getElementById("team-desc-header").textContent = team.description || ""
            const editNameInput = document.getElementById('edit-team-name')
            const editDescInput = document.getElementById('edit-team-desc')
            if (editNameInput) editNameInput.value = team.name
            if (editDescInput) editDescInput.value = team.description || ""


            const checkboxList = document.getElementById("assignee-checkbox-list");
            if (checkboxList) {
                checkboxList.innerHTML = "";
                team.members.forEach(m => {
                    const div = document.createElement("div");
                    div.className = "form-check";
                    div.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${m.user.id}" id="assign-${m.user.id}">
                    <label class="form-check-label" for="assign-${m.user.id}">${m.user.name}</label>`
                    checkboxList.appendChild(div);
                });
            }


            const memberListContainer = document.getElementById("member-list");
            const currentUserId = parseInt(localStorage.getItem('userId'));
            const isOwner = team.members.some(m => m.user.id === currentUserId && m.role === 'OWNER')

            // Safety check
            if (!team.members || team.members.length === 0) {
                memberListContainer.innerHTML = `<li class="list-group-item text-muted small">No members found.</li>`;
            } else {
                memberListContainer.innerHTML = team.members.map(m => {
                    // Conditionally render the Kick button
                    const kickButtonHtml = (isOwner && m.role !== 'OWNER')
                        ? `<button class="btn btn-sm btn-link text-danger ms-auto" 
                                 onclick="removeMember(${m.user.id}, '${m.user.name}', event)" title="Remove ${m.user.name}">
                           <i class="bi bi-x-circle"></i>
                       </button>`
                        : '';

                    return `
                <li class="list-group-item d-flex align-items-center px-3 py-2">
                    <img src="https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(m.user.name)}&backgroundColor=00897b,43a047,8e24aa"
                         class="rounded-circle me-3" style="width:32px; height:32px;" alt="${m.user.name}">

                    <div class="flex-grow-1">
                        <div class="small fw-bold">${m.user.name}</div>
                        <div class="text-muted" style="font-size:0.7rem;">${m.role}</div>
                    </div>
                    ${kickButtonHtml}
                </li>`;
                }).join("");
            }

            //role based buttons
            const leaveBtn = document.getElementById('leave-team-btn');
            const deleteBtn = document.getElementById('delete-team-btn');
            const editBtn = document.getElementById('edit-team-btn');

            if (isOwner) {
                if (deleteBtn) deleteBtn.classList.remove('d-none');
                if (editBtn) editBtn.classList.remove('d-none');
            } else {
                if (leaveBtn) leaveBtn.classList.remove('d-none');
            }

            document.getElementById('edit-team-name').value = team.name;
            document.getElementById('edit-team-desc').value = team.description || ""




            const activeContainer = document.getElementById("active-team-task-container")
            const completedContainer = document.getElementById("completed-team-task-container")

            // Reset
            activeContainer.innerHTML = ""
            completedContainer.innerHTML = ""

            // Filter
            const activeTasks = team.tasks.filter(t => t.status !== "Completed")
            const completedTasks = team.tasks.filter(t => t.status === "Completed")

            document.getElementById("teamCompletedCount").textContent = `(${completedTasks.length})`

            const createCardHTML = (task) => {

                let avatarsHtml = ''
                const assignees = task.assignees || []
                if (assignees.length > 0) {
                    avatarsHtml = '<div class="d-flex align-items-center">'
                    assignees.forEach((user, index) => {
                        const marginClass = index > 0 ? "ms-n2" : ""
                        avatarsHtml += `
                        <div class="rounded-circle bg-dark text-white d-flex justify-content-center align-items-center border border-2 border-white ${marginClass}" 
                             title="${user.name}" style="width:24px; height:24px; font-size: 0.65rem; z-index:${10 - index}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>`;
                    });
                    avatarsHtml += '</div>';
                } else {
                    avatarsHtml = '<span class="text-muted" style="font-size: 1.2rem;"><i class="bi bi-person-plus"></i></span>';
                }

                let priorityTagClass = "tag-gray"
                let cardBorderClass = "";
                //border colours from the priority
                if (task.priority === "High") {
                    priorityTagClass = "tag-red"
                    cardBorderClass = "border-high"
                } else if (task.priority === "Medium") {
                    priorityTagClass = "tag-yellow"
                    cardBorderClass = "border-medium"
                } else if (task.priority === "Low") {
                    priorityTagClass = "tag-blue"
                    cardBorderClass = "border-low"
                }

                let statusClass = task.status === "In Progress" ? "status-inprogress" : task.status === "Completed" ? "status-completed" : "status-pending"
                const dateDisplay = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''

                //rendering the html
                return `
            <div id="task-card-${task.id}" class="card mb-3 team-task-card ${cardBorderClass} ${task.status === 'Completed' ? 'task-completed' : ''} style="cursor: pointer;" onclick="openTaskDetailModal(${task.id})">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="task-title mb-0 ${task.status === 'Completed' ? 'text-decoration-line-through text-muted' : ''}">
                            ${task.title}
                        </h6>
                        <select onchange="updateTaskStatus(${task.id}, this.value)" class="status-select ${statusClass}" title="Change Status"  onclick="event.stopPropagation()">
                            <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>To Do</option>
                            <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                            <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Done</option>
                        </select>
                    </div>
                    ${task.description ? `<p class="text-muted small mb-3 text-truncate" style="max-width: 90%;">${task.description}</p>` : ''}
                    
                    <div class="d-flex flex-wrap gap-2 mb-3">
                        <!-- Use the correct priorityTagClass here -->
                        <span class="notion-tag ${priorityTagClass}">${task.priority}</span>
                        
                        ${dateDisplay ? `<span class="notion-tag tag-gray"><i class="bi bi-calendar4-week" style="font-size: 0.7rem;"></i> ${dateDisplay}</span>` : ''}
                    </div>

                    <div class="d-flex justify-content-between align-items-end mt-2 pt-2 border-top border-light">
                        <div class="d-flex align-items-center gap-2">${avatarsHtml}</div>
                       <div class="card-actions d-flex gap-1">
                            <button class="btn btn-link action-btn text-decoration-none" onclick="toggleComments(${task.id}, event)"><i class="bi bi-chat"></i></button>
                            <button class="btn btn-link action-btn" onclick="openEditTeamTaskModal(${task.id}, event)"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-link action-btn text-danger" onclick="deleteTeamTask(${task.id}, event)"><i class="bi bi-trash"></i></button>
                 
                        </div>
                </div>
                <!-- Comment Section -->
                <div id="comments-section-${task.id}" class="comment-section p-3 d-none bg-light border-top"  onlcick="event.stopPropagation()">
                    <div id="comments-list-${task.id}" class="mb-3 small"></div>
                    <div class="input-group input-group-sm">
                        <input type="text" id="comment-input-${task.id}" class="form-control" placeholder="Type a comment..."  onclick="event.stopPropagation()">
                        <button class="btn btn-dark" onclick="postTeamComment(${task.id},event)">Send</button>
                    </div>
                </div>
            </div>`;
            };


            if (activeTasks.length === 0) activeContainer.innerHTML = `<div class="text-center py-5 text-muted col-12"><p class="small">No active tasks.</p></div>`
            else activeTasks.forEach(task => activeContainer.innerHTML += createCardHTML(task))

            completedTasks.forEach(task => completedContainer.innerHTML += createCardHTML(task))
            loadWorkloadAnalytics(teamId);
        })
        .catch(err => {
            if (err.message.includes("Access Denied")) window.location.href = "teams.html"
        });
}

//loading team statistics
function loadTeamStats(teamId) {
    fetch(`/api/teams/${teamId}/stats`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(stats => {
            document.getElementById("stat-pending").textContent = stats["Pending"] || 0
            document.getElementById("stat-progress").textContent = stats["In Progress"] || 0
            document.getElementById("stat-completed").textContent = stats["Completed"] || 0
        })
        .catch(console.error)
}


//setting up the a team task
function setupAddTeamTask(teamId) {
    document.getElementById("add-team-task-form").addEventListener("submit", (e) => {
        e.preventDefault();


        const checkboxes = document.querySelectorAll('#assignee-checkbox-list input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);

        const body = {
            title: document.getElementById("task-title").value,
            description: document.getElementById("task-desc").value,
            priority: document.getElementById("task-priority").value,
            dueDate: document.getElementById("task-due-date").value,
            teamId: teamId,
            assigneeIds: selectedIds
        };

        fetch("/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify(body)
        })
            .then(() => location.reload())
    });
}
function loadFriendsIntoInviteDropdown() {
  const select = document.getElementById('friend-select');
  if (!select) return;

  fetch('/api/friends', {
    headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
  })
    .then(res => res.json())
    .then(data => {
      const friends = data.friends || [];
      if (!friends.length) {
        select.innerHTML = `<option value="">No friends yet</option>`;
        return;
      }

      select.innerHTML =
        `<option value="">Select a friend...</option>` +
        friends.map(f => {
          const u = f.otherUser || {};
          const label = `${u.name || 'Unknown'} (${u.email || ''})`;
          return `<option value="${u.email}">${label}</option>`;
        }).join('');
    })
    .catch(() => {
      select.innerHTML = `<option value="">Failed to load friends</option>`;
    });
}

function setupInviteFriend(teamId) {
  const btn = document.getElementById('btn-invite-friend');
  const select = document.getElementById('friend-select');
  const modalEl = document.getElementById('addMemberModal');
  if (!btn || !select || !modalEl) return;

  btn.addEventListener('click', () => {
    const email = (select.value || '').trim();
    if (!email) return showToast("Select a friend first.", "error");

    btn.disabled = true;

    fetch(`/api/teams/${teamId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("token")
      },
      body: JSON.stringify({ email })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(e => { throw new Error(e.error || "Invite failed"); });
        }
        return res.json();
      })
      .then(() => {
        // close modal
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        select.value = "";
        showToast("Invitation sent successfully!", "success");
        setTimeout(() => location.reload(), 1200);
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => { btn.disabled = false; });
  });
}


//adding members
function setupAddMember(teamId) {
    document.getElementById("add-member-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const emailInput = document.getElementById("new-member-email")
        const email = emailInput.value;
        const modalEl = document.getElementById('addMemberModal')
        const modal = bootstrap.Modal.getInstance(modalEl)

        fetch(`/api/teams/${teamId}/members`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify({ email })
        })
            .then(res => {

                if (!res.ok) {
                    return res.json().then(errData => {

                        throw new Error(errData.error)
                    });
                }
                return res.json()
            })
            //invitation was success
            .then(() => {

                modal.hide();
                emailInput.value = ""
                showToast("Invitation sent successfully!", "success")


                setTimeout(() => location.reload(), 1500)
            })
            .catch(err => {

                showToast(err.message, "error")
            });
    });
}


//toast notification
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast')
    const toastBody = document.getElementById('toast-message')


    if (!toastEl || !toastBody) {
        console.error('Toast elements not found in DOM');
        alert(message);
        return;
    }

    toastBody.textContent = message;
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-primary')
    //color of the toast message
    if (type === 'success') {
        toastEl.classList.add('bg-success')
    } else if (type === 'error') {
        toastEl.classList.add('bg-danger')
    } else {
        toastEl.classList.add('bg-primary')
    }

    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

//tpggling the comment
function toggleComments(taskId, event) {
    event.stopPropagation();
    const section = document.getElementById(`comments-section-${taskId}`)
    const isHidden = section.classList.contains('d-none')


    section.classList.toggle('d-none')


    if (isHidden) {
        loadTeamComments(taskId)
    }
}
//loading team comments
function loadTeamComments(taskId, event) {
    const listContainer = document.getElementById(`comments-list-${taskId}`)

    fetch(`/api/comments/${taskId}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => {
            const comments = data.comments || []

            if (comments.length === 0) {
                listContainer.innerHTML = `<small class="text-muted fst-italic ms-1">No comments yet. Start the discussion!</small>`
                return;
            }

            listContainer.innerHTML = comments.map(c => `
            <div class="d-flex mb-2">
                <div class="me-2 mt-1">
                    <div class="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center" 
                         style="width:24px; height:24px; font-size: 10px;">
                        ${c.user.name.charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="comment-bubble flex-grow-1">
                    <div class="d-flex justify-content-between">
                        <span class="fw-bold" style="font-size: 0.8rem;">${c.user.name}</span>
                        <small class="text-muted" style="font-size: 0.7rem;">
                            ${new Date(c.createdAt).toLocaleDateString()}
                        </small>
                    </div>
                    <p class="mb-0 text-dark">${c.content}</p>
                </div>
            </div>
        `).join("");
        })
        .catch(err => {
            listContainer.innerHTML = `<small class="text-danger">Error loading comments.</small>`
        });
}
//posting team comments
function postTeamComment(taskId, event) {
    event.stopPropagation()
    const input = document.getElementById(`comment-input-${taskId}`)
    const content = input.value.trim()
    const teamId = getTeamIdFromUrl();


    if (!content) return

    fetch(`/api/comments/${taskId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({ content })
    })
        .then(res => res.json())
        .then(() => {
            input.value = ""
            loadTeamComments(taskId)
            loadActivityFeed(teamId)
        })
        .catch(err => alert("Failed to post comment"))
}

//updating task status
function updateTaskStatus(taskId, newStatus) {

    if (newStatus === "Completed") {
        const card = document.getElementById(`task-card-${taskId}`)
        if (card) {
            card.classList.add("task-complete-anim")
        }
    }

    const updateData = {
        status: newStatus,
        completedAt: newStatus === 'Completed' ? new Date().toISOString() : null
    };

    fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify(updateData)
    })
        .then(res => {
            if (!res.ok) throw new Error("Failed to update status")
            return res.json();
        })
        .then(() => {

            setTimeout(() => location.reload(), 500)
        })
        .catch(err => alert(err.message))
}

//deleting the tam task
function deleteTeamTask(taskId, event) {
    event.stopPropagation()

    if (!confirm("Are you sure you want to delete this task? This cannot be undone.")) return

    fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => {
            if (!res.ok) throw new Error("Failed to delete task")
            return res.json();
        })
        .then(() => {
            showToast("Task deleted successfully", "success")
            setTimeout(() => location.reload(), 1000)
        })
        .catch(err => alert(err.message));
}


//edit team task model
function openEditTeamTaskModal(taskId, event) {
    event.stopPropagation()
    const addList = document.getElementById("assignee-checkbox-list");
    const editList = document.getElementById("edit-assignee-checkbox-list");


    if (addList && editList) {

        editList.innerHTML = addList.innerHTML.replaceAll('assign-', 'edit-assign-');
    }


    fetch(`/api/tasks/${taskId}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => {
            const task = data.task;


            document.getElementById("edit-task-id").value = task.id;
            document.getElementById("edit-task-title").value = task.title;
            document.getElementById("edit-task-desc").value = task.description || "";
            document.getElementById("edit-task-priority").value = task.priority;
            document.getElementById("edit-task-due-date").value = task.dueDate ? task.dueDate.split('T')[0] : "";


            const assignedIds = task.assignees ? task.assignees.map(u => u.id) : [];

            const checkboxes = editList.querySelectorAll("input[type='checkbox']")
            checkboxes.forEach(cb => {

                if (assignedIds.includes(parseInt(cb.value))) {
                    cb.checked = true;
                } else {
                    cb.checked = false;
                }
            });

            const modal = new bootstrap.Modal(document.getElementById("editTeamTaskModal"))
            modal.show();
        })
        .catch(err => console.error(err));
}

//updating the task form
function setupEditTaskForm() {
    document.getElementById("edit-team-task-form").addEventListener("submit", (e) => {
        e.preventDefault();

        const taskId = document.getElementById("edit-task-id").value


        const checkboxes = document.querySelectorAll('#edit-assignee-checkbox-list input[type="checkbox"]:checked')
        const selectedIds = Array.from(checkboxes).map(cb => cb.value)

        const body = {
            title: document.getElementById("edit-task-title").value,
            description: document.getElementById("edit-task-desc").value,
            priority: document.getElementById("edit-task-priority").value,
            dueDate: document.getElementById("edit-task-due-date").value,


            assigneeIds: selectedIds
        };

        fetch(`/api/tasks/${taskId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("token")
            },
            body: JSON.stringify(body)
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to update task")
                return res.json();
            })
            .then(() => {
                alert("Task Updated!")
                location.reload()
            })
            .catch(err => alert(err.message))
    });
}


function toggleTeamCompleted() {
    const container = document.getElementById("completed-team-task-container")
    const arrow = document.getElementById("teamCompletedArrow")

    container.classList.toggle("collapsed");

    if (container.classList.contains("collapsed")) {
        arrow.classList.replace("bi-chevron-up", "bi-chevron-down")
    } else {
        arrow.classList.replace("bi-chevron-down", "bi-chevron-up")
    }
}




//expanding the task card
function openTaskDetailModal(taskId) {
    const modalEl = document.getElementById('taskDetailModal')
    const modal = new bootstrap.Modal(modalEl)


    fetch(`/api/tasks/${taskId}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => {
            const task = data.task;

            document.getElementById('detail-title').textContent = task.title;
            document.getElementById('detail-description').textContent = task.description || "No description provided.";


            const assigneesContainer = document.getElementById('detail-assignees');
            assigneesContainer.innerHTML = (task.assignees || []).map(user => `
            <div class="rounded-circle bg-dark text-white d-flex justify-content-center align-items-center border border-2 border-white ms-n2" 
                 title="${user.name}" style="width:32px; height:32px; font-size: 0.8rem;">
                ${user.name.charAt(0).toUpperCase()}
            </div>
        `).join('');


            let priorityClass = task.priority === "High" ? "tag-red" : task.priority === "Medium" ? "tag-yellow" : "tag-blue";
            document.getElementById('detail-priority').innerHTML = `<span class="notion-tag ${priorityClass}">${task.priority}</span>`;


            let statusClass = task.status === "In Progress" ? "status-inprogress" : task.status === "Completed" ? "status-completed" : "status-pending";
            document.getElementById('detail-status').innerHTML = `<span class="status-select ${statusClass} readonly">${task.status}</span>`;


            loadDetailComments(taskId);

            modal.show();
        });
}

//loading the comments 
function loadDetailComments(taskId) {
    const listContainer = document.getElementById('detail-comments-list');
    listContainer.innerHTML = `<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>`;

    fetch(`/api/comments/${taskId}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(data => {
            const comments = data.comments || [];
            if (comments.length === 0) {
                listContainer.innerHTML = `<p class="text-muted small fst-italic">No comments yet.</p>`;
                return;
            }

            listContainer.innerHTML = comments.map(c => `
            <div class="d-flex mb-3">
                <div class="me-2 mt-1">
                    <img src="https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(c.user.name)}" class="rounded-circle" style="width:28px;">
                </div>
                <div class="flex-grow-1">
                    <span class="fw-bold" style="font-size: 0.9rem;">${c.user.name}</span>
                    <p class="mb-0 bg-light p-2 rounded-3" style="font-size: 0.9rem;">${c.content}</p>
                </div>
            </div>
        `).join("")
        });
}

//removing the members
function removeMember(userIdToRemove, userName, event) {
    event.stopPropagation()
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) {
        return;
    }

    const teamId = getTeamIdFromUrl();

    fetch(`/api/teams/${teamId}/members/${userIdToRemove}`, {
        method: 'DELETE',
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token"),
            "X-Removed-User-Name": userName
        }
    })
        .then(res => {
            if (!res.ok) return res.json().then(e => { throw new Error(e.error) })
            return res.json()
        })
        .then(() => {
            showToast(`${userName} has been removed.`, "success")
            setTimeout(() => location.reload(), 1000)
        })
        .catch(err => showToast(err.message, "error"))
}

//deleting the teams
function deleteTeam() {
    const teamId = getTeamIdFromUrl();
    if (!confirm("DANGER: Are you sure you want to delete this team? This action is permanent and will remove all associated tasks.")) {
        return;
    }

    fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => {
            if (!res.ok) return res.json().then(e => { throw new Error(e.error) });
            return res.json();
        })
        .then(() => {
            alert("Team deleted successfully.");
            window.location.href = 'teams.html';
        })
        .catch(err => showToast(err.message, "error"));
}

//leave team button
function leaveTeam() {

    const teamId = getTeamIdFromUrl();
    if (!teamId) {
        showToast("Could not identify the team.", "error");
        return;
    }


    if (!confirm("Are you sure you want to leave this team? You will lose access to its tasks and members.")) {
        return;
    }


    fetch(`/api/teams/${teamId}/leave`, {
        method: 'DELETE',
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    })
        .then(res => {

            if (!res.ok) {
                return res.json().then(errData => { throw new Error(errData.error) })
            }
            return res.json();
        })
        .then(() => {

            alert("You have successfully left the team.");
            window.location.href = 'teams.html'; // Redirect to the main teams hub
        })
        .catch(err => {

            showToast(err.message, "error")
        });
}


//gets the activity logs
function loadActivityFeed(teamId,filterType="") {
    const container = document.getElementById('activity-feed-container')
    if (!container) return;


    container.innerHTML = `<div class="text-center mt-3"><div class="spinner-border spinner-border-sm text-secondary"></div></div>`


    let url = `/api/teams/${teamId}/activity`;
    //getting the filter type
    if (filterType) {
        url += `?type=${filterType}`;
    }

    fetch(url, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
        .then(res => res.json())
        .then(logs => {
        
            if (!logs || logs.length === 0) {
                container.innerHTML = `<p class="text-muted small fst-italic text-center mt-2">No activity found for this filter.</p>`;
                return;
            }


            container.innerHTML = logs.map(log => {
                let iconClass = 'bi-info-circle text-secondary'
                let actionText = '';

                //log the user name
                const userName = log.user?.name || 'A user'


                switch (log.actionType) {
                    case 'CREATE_TASK':
                        iconClass = 'bi-plus-circle-fill text-success';
                        actionText = `created task: <strong>"${log.details}"</strong>`
                        break;
                    case 'UPDATE_STATUS':
                        iconClass = 'bi-check-circle-fill text-primary'
                        actionText = `updated ${log.details}`
                        break;
                    case 'ADD_MEMBER':
                        iconClass = 'bi-person-plus-fill text-info'
                        actionText = ` <strong>${log.details}</strong> to the team`
                        break;
                    case 'REMOVE_MEMBER':
                        iconClass = 'bi-person-dash-fill text-danger'
                        actionText = `removed ${log.details} from the team`
                        break;
                    case 'LEAVE_TEAM':
                        iconClass = 'bi-box-arrow-left text-warning'
                        actionText = `left the team`
                        break;
                    case 'POST_COMMENT':
                        iconClass = 'bi-chat-left-text-fill text-secondary'
                        actionText = `commented ${log.details}`
                        break;
                    default:
                        actionText = `performed an unclassified action`
                }



                const timeDisplay = getRelativeTime(log.createdAt);

                return `
            <div class="d-flex mb-3">
                <div class="me-2 mt-1" style="min-width: 24px;"><i class="bi ${iconClass}"></i></div>
                <div class="flex-grow-1 lh-sm">
                    <p class="mb-0 small">
                        <span class="fw-bold">${userName}</span> ${actionText}
                    </p>
                    <small class="text-muted" style="font-size: 0.7rem;">${timeDisplay}</small>
                </div>
            </div>`;
            }).join('')
        })
        .catch(err => {
            container.innerHTML = `<p class="text-danger small mt-3">Could not load activity.</p>`
            console.error(err)
        });
}

//calculating the relative timestamp
function getRelativeTime(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInMs = now - past;

    const seconds = Math.floor(diffInMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return 'just now'
    }
    if (minutes < 60) {
        return `${minutes}m ago`
    }
    if (hours < 24) {
        return `${hours}h ago`
    }
    if (days === 1) {
        return 'yesterday'
    }
    if (days < 7) {
        return `${days}d ago`
    }

    //return past date if its older than a week
    return past.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}