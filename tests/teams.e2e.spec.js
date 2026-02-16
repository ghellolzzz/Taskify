const { test, expect } = require('@playwright/test');

//happens in every test
test.describe('Team Collaboration UI (E2E)', () => {

    // Login via UI before every test
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3001/login.html');
        await page.fill('#email', 'MGF_21@ICLOUD.COM'); 
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:3001/dashboard/dashboard.html');
    });

    test('should create a team, enter workspace, and create a task', async ({ page }) => {
        
        //navigating to the team hub
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');
        
        //checks if the header is visible
        await expect(page.locator('h2')).toContainText('Collaboration Hub');

        //creating a new team
        await page.click('button:has-text("Create New Team")');
        await expect(page.locator('#createTeamModal')).toBeVisible();

        const teamName = `E2E Team ${Date.now()}`;
        await page.fill('#team-name', teamName);
        await page.fill('#team-desc', 'Testing UI flow');
        await page.click('#create-team-form button[type="submit"]');

        await page.waitForLoadState('networkidle');
        
       //checks if the team card is visible
        await expect(page.locator(`.team-card h5:has-text("${teamName}")`)).toBeVisible({ timeout: 10000 });

        //enters the team workspace
        await page.click(`.team-card h5:has-text("${teamName}")`);
        await page.waitForURL('http://localhost:3001/teams/team-view.html?id=*');
        
        await page.waitForLoadState('networkidle');
        
        //checks if the team's header name is found
        await expect(page.locator('#team-title-header')).toHaveText(teamName);

       //creating a new task with the assignee
        await page.click('button:has-text("New Team Task")');
        await expect(page.locator('#addTaskModal')).toBeVisible();

        const taskTitle = 'Design Database Schema';
        await page.fill('#task-title', taskTitle);
        await page.selectOption('#task-priority', 'High');
        
        await page.waitForSelector('#assignee-checkbox-list input[type="checkbox"]', { timeout: 5000 });
        

        //checks if the assignee is in the checkbox
        await page.locator('#assignee-checkbox-list input[type="checkbox"]').first().check();

        await page.click('#add-team-task-form button[type="submit"]');

        await page.waitForLoadState('networkidle');

        //verifies the task ccard
        const taskCard = page.locator(`.team-task-card:has-text("${taskTitle}")`);
        await expect(taskCard).toBeVisible({ timeout: 10000 });
        
        // check if "High" priority red tag is visible
        await expect(taskCard.locator('.tag-red')).toBeVisible();
    });

    test('should allow updating task status', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');
        
       
        const teamCards = page.locator('.team-card');
        const teamCount = await teamCards.count();
        
        if (teamCount === 0) {
            //creating the team first
            await page.click('button:has-text("Create New Team")');
            await page.fill('#team-name', 'Test Team for Status Update');
            await page.fill('#team-desc', 'Test team');
            await page.click('#create-team-form button[type="submit"]');
            await page.waitForLoadState('networkidle');
        }
        
        // click on the first team
        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        // Find a task card
        const statusSelect = page.locator('.status-select').first();
        
        if (await statusSelect.count() === 0) {
            console.log('No tasks found, skipping status update test');
            test.skip();
            return;
        }
        
        await expect(statusSelect).toBeVisible();

        //changes status to completed
        await statusSelect.selectOption('Completed');

        //verifies that the animation effect is taking place
        const card = page.locator('.team-task-card').first();
        await expect(card).toHaveClass(/task-complete-anim/);
    });

  

    test('should edit a team successfully', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

        //creating the team first again
        await page.click('button:has-text("Create New Team")');
        const originalName = `Original Team ${Date.now()}`;
        await page.fill('#team-name', originalName);
        await page.fill('#team-desc', 'Original description');
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        //enters the team
        await page.click(`.team-card h5:has-text("${originalName}")`);
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        //clicking the edit team button
        await page.click('#edit-team-btn');
        await expect(page.locator('#editTeamModal')).toBeVisible();

       //updating the team details
        const newName = `Updated Team ${Date.now()}`;
        const newDesc = 'Updated description';
        await page.fill('#edit-team-name', newName);
        await page.fill('#edit-team-desc', newDesc);
        await page.click('#edit-team-form button[type="submit"]');

        // verify the changes
        await expect(page.locator('#team-title-header')).toHaveText(newName);
        await expect(page.locator('#team-desc-header')).toHaveText(newDesc);
    });

    test('should edit a task successfully', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

       
        await page.click('button:has-text("Create New Team")');
        await page.fill('#team-name', `Edit Task Team ${Date.now()}`);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        
        await page.click('button:has-text("New Team Task")');
        await page.fill('#task-title', 'Original Task Title');
        await page.selectOption('#task-priority', 'Low');
        await page.click('#add-team-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // edit the task
        await page.locator('.team-task-card').first().locator('button:has(i.bi-pencil)').click();
        await expect(page.locator('#editTeamTaskModal')).toBeVisible();

        const newTitle = 'Updated Task Title';
        await page.fill('#edit-task-title', newTitle);
        await page.selectOption('#edit-task-priority', 'High');
        await page.click('#edit-team-task-form button[type="submit"]');

        await page.waitForLoadState('networkidle');

        // verify changes
        await expect(page.locator(`.team-task-card:has-text("${newTitle}")`)).toBeVisible();
        await expect(page.locator(`.team-task-card:has-text("${newTitle}") .tag-red`)).toBeVisible();
    });

    test('should delete a task successfully', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

       
        await page.click('button:has-text("Create New Team")');
        await page.fill('#team-name', `Delete Task Team ${Date.now()}`);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        
        const taskTitle = `Task to Delete ${Date.now()}`;
        await page.click('button:has-text("New Team Task")');
        await page.fill('#task-title', taskTitle);
        await page.click('#add-team-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // verify task exists
        await expect(page.locator(`.team-task-card:has-text("${taskTitle}")`)).toBeVisible();

        // delete the task
        page.on('dialog', dialog => dialog.accept()); // Accept confirmation dialog
        await page.locator(`.team-task-card:has-text("${taskTitle}") button:has(i.bi-trash)`).click();
        
        await page.waitForLoadState('networkidle');

        // verify task is deleted
        await expect(page.locator(`.team-task-card:has-text("${taskTitle}")`)).not.toBeVisible();
    });

    test('should add and display comments on a task', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

       
        await page.click('button:has-text("Create New Team")');
        await page.fill('#team-name', `Comment Test Team ${Date.now()}`);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

      
        await page.click('button:has-text("New Team Task")');
        await page.fill('#task-title', 'Task for Comments');
        await page.click('#add-team-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // toggling the comments section
        await page.locator('.team-task-card').first().locator('button:has(i.bi-chat)').click();
        
        //waiting for the comment section to appear
        const commentSection = page.locator('.comment-section').first();
        await expect(commentSection).toBeVisible();

        //adding a comment
        const commentText = 'This is a test comment!';
        await page.locator('.comment-section').first().locator('input').fill(commentText);
        await page.locator('.comment-section').first().locator('button:has-text("Send")').click();

       //waiting for the comment to appear
        await page.waitForTimeout(1000); 

        // verify comment appears
        await expect(page.locator(`.comment-section:has-text("${commentText}")`)).toBeVisible();
    });

    test('should display team statistics correctly', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

      
        await page.click('button:has-text("Create New Team")');
        await page.fill('#team-name', `Stats Team ${Date.now()}`);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        //  all stats should be 0
        await expect(page.locator('#stat-pending')).toHaveText('0');
        await expect(page.locator('#stat-progress')).toHaveText('0');
        await expect(page.locator('#stat-completed')).toHaveText('0');

        //create a pending task
        await page.click('button:has-text("New Team Task")');
        await page.fill('#task-title', 'Pending Task');
        await page.click('#add-team-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // verify pending stat increased
        await expect(page.locator('#stat-pending')).toHaveText('1');

        // change task to In Progress
        await page.locator('.status-select').first().selectOption('In Progress');
        await page.waitForLoadState('networkidle');

        // verify stats updated
        await expect(page.locator('#stat-progress')).toHaveText('1');
    });

    test('should show appropriate buttons based on user role (owner vs member)', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

        // Create a team (user becomes owner)
        await page.click('button:has-text("Create New Team")');
        await page.fill('#team-name', `Role Test Team ${Date.now()}`);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        // as owner, should see the:
        //  edit Team button 
        //  delete Team button 
        //  leave Team button
        await expect(page.locator('#edit-team-btn')).toBeVisible();
        await expect(page.locator('#delete-team-btn')).toBeVisible();
        await expect(page.locator('#leave-team-btn')).toHaveClass(/d-none/);
    });

    test('should expand task detail modal with full information', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

       
        await page.click('button:has-text("Create New Team")');
        await page.fill('#team-name', `Detail Modal Team ${Date.now()}`);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        await page.locator('.team-card').first().click();
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

        await page.click('button:has-text("New Team Task")');
        const taskTitle = 'Detailed Task';
        const taskDesc = 'This is a detailed description';
        await page.fill('#task-title', taskTitle);
        await page.fill('#task-desc', taskDesc);
        await page.selectOption('#task-priority', 'Medium');
        await page.click('#add-team-task-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

        // click on task card to open detail modal
        await page.locator('.team-task-card').first().click();
        
        // verify that the modal opens and all the detailed information can be seen
        await expect(page.locator('#taskDetailModal')).toBeVisible();
        await expect(page.locator('#detail-title')).toHaveText(taskTitle);
        await expect(page.locator('#detail-description')).toHaveText(taskDesc);
        await expect(page.locator('#detail-priority')).toContainText('Medium');
    });

    test('should calculate and display workload score correctly (Data Transformation)', async ({ page }) => {
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

        //creating a team
        await page.click('button:has-text("Create New Team")');
        const teamName = `Workload Test ${Date.now()}`;
        await page.fill('#team-name', teamName);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');
        
        await page.click(`.team-card h5:has-text("${teamName}")`);
        await page.waitForURL('**/team-view.html?id=*');
        await page.waitForLoadState('networkidle');

       
        //creating 3 high priority task cards
        for (let i = 1; i <= 3; i++) {
            await page.click('button:has-text("New Team Task")');
            await page.fill('#task-title', `Heavy Task ${i}`);
            await page.selectOption('#task-priority', 'High');
            
            //assigning to self
            await page.locator('#assignee-checkbox-list input[type="checkbox"]').first().check();
            
            await page.click('#add-team-task-form button[type="submit"]');
            await page.waitForLoadState('networkidle');
           
            await page.waitForTimeout(500); 
        }

    
       //finding the member from the member list
        const memberCard = page.locator('#member-list li').first();

        await expect(memberCard).toContainText('9 pts');

       //status should be overloaded
        await expect(memberCard).toContainText('Overloaded');
        
       
        await expect(memberCard.locator('.text-danger')).toBeVisible();
    });

    test('should invite a member and allow them to accept the invitation', async ({ page }) => {
      
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

    
        await page.click('button:has-text("Create New Team")');
        const inviteTeamName = `Invite Test Team ${Date.now()}`;
        await page.fill('#team-name', inviteTeamName);
        await page.click('#create-team-form button[type="submit"]');
        await page.waitForLoadState('networkidle');

      
        await page.click(`.team-card h5:has-text("${inviteTeamName}")`);
        await page.waitForURL('**/team-view.html?id=*');

       
        await page.click('button:has-text("Invite")');
        await expect(page.locator('#addMemberModal')).toBeVisible();

        // send Invite
        const memberEmail = 'siraj@example.com'; 
        await page.fill('#new-member-email', memberEmail);
        await page.click('#add-member-form button[type="submit"]');

        await expect(page.locator('.toast')).toContainText('Invitation sent successfully!');
      
        await page.click('a:has-text("Logout")');
        await page.waitForURL('**/login.html');


       
        await page.fill('#email', memberEmail);
        await page.fill('#password', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard.html');

     
        await page.goto('http://localhost:3001/teams/teams.html');
        await page.waitForLoadState('networkidle');

        // verify pending invitation card exists
        const inviteCard = page.locator(`.card:has-text("You've been invited to join ${inviteTeamName}")`);
        await expect(inviteCard).toBeVisible();

        // click accept
        await inviteCard.locator('button:has-text("Accept")').click();

        //verify card disappears
        await expect(inviteCard).not.toBeVisible();

        //verify new team exists
        const newTeamCard = page.locator(`.team-card h5:has-text("${inviteTeamName}")`);
        await expect(newTeamCard).toBeVisible();
    });
});