require('dotenv').config({ path: '.env.development' });

const prisma = require('../src/models/prismaClient');
const bcrypt = require('bcrypt');

async function main() {
  console.log("Seeding Taskify data...");

  // ==========================================
  // 1. USERS (with hashed passwords)
  // ==========================================
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash("password123", saltRounds);

  await prisma.user.createMany({
    data: [
      { name: "Alice",  email: "alice@example.com",   password: hashedPassword },
      { name: "Bob",    email: "bob@example.com",     password: hashedPassword },
      { name: "Charlie",email: "charlie@example.com", password: hashedPassword },
       { name: "E2E Test User", email: "MGF_21@ICLOUD.COM", password: hashedPassword, points: 5000, preferredTheme: 'theme-classic' },
       { name: "Siraj", email: "siraj@example.com", password: hashedPassword },
      { name: "Joel", email: "joel@example.com", password: hashedPassword }
    ],
    skipDuplicates: true
  });
await prisma.user.update({
      where: { email: "MGF_21@ICLOUD.COM" },
      data: { points: 5000, preferredTheme: 'theme-classic' } 
  });
  const allUsers = await prisma.user.findMany();
  console.log("✓ Users seeded");
  console.log("✓ Points updated");

  // ==========================================
  // 2. CATEGORIES (for every user)
  // ==========================================
  for (const user of allUsers) {
    await prisma.category.createMany({
      data: [
        { name: "Work",     color: "#1E90FF", userId: user.id },
        { name: "Personal", color: "#32CD32", userId: user.id },
      ],
      skipDuplicates: true
    });
  }
  console.log("✓ Categories seeded");

  // Alice for sample tasks
  const alice = await prisma.user.findFirst({
    where: { email: "alice@example.com" },
  });

  const aliceWorkCategory = await prisma.category.findFirst({
    where: { name: "Work", userId: alice.id },
  });

  // ==========================================
  // 3. TASKS
  // ==========================================
  await prisma.task.createMany({
    data: [
      {
        title: "Finish CA1 Project",
        description: "Complete backend and frontend",
        status: "In Progress",
        priority: "High",
        userId: alice.id,
        categoryId: aliceWorkCategory.id,
      },
      {
        title: "Buy Groceries",
        priority: "Low",
        status: "Pending",
        userId: alice.id,
        categoryId: aliceWorkCategory.id,
      },
    ],
    skipDuplicates: true  
  });

  console.log("✓ Tasks seeded");

  // ==========================================
  // 4. COMMENTS
  // ==========================================
  const task = await prisma.task.findFirst({
    where: { title: "Finish CA1 Project" },
  });

  await prisma.comment.create({
    data: {
      content: "Don't forget to push your code!",
      taskId: task.id,
      userId: alice.id,
    },
  }).catch(() => {}); 

  console.log("✓ Comments seeded");

  // ==========================================
  // 5. GOALS
  // ==========================================
  await prisma.goal.createMany({
    data: [
      { title: "Become productive", userId: alice.id },
      { title: "Finish tasks daily", userId: alice.id },
    ],
    skipDuplicates: true
  });

  console.log("✓ Goals seeded");

  // ==========================================
  // 6. BADGES
  // ==========================================
  await prisma.badge.createMany({
    data: [
      { code: "ROOKIE",           name: "Rookie",           description: "Created your first task", icon: "⭐" },
      { code: "STREAK_3",         name: "3-Day Streak",     description: "Completed tasks for 3 days" },

      { code: 'HABIT_STARTER',    name: 'Habit Starter',    description: 'Created your first habit.',      icon: '🌱' },
      { code: 'HABIT_ACTIVE_3',   name: 'Habit Builder',    description: 'Maintain 3 active habits.',      icon: '🧱' },
      { code: 'HABIT_STREAK_3',   name: 'Habit Streaker',   description: 'Logged a habit 3 days in a row.', icon: '🔥' }
    ],
    skipDuplicates: true 
  });

  const rookieBadge = await prisma.badge.findFirst({ where: { code: "ROOKIE" } });

  await prisma.userBadge.create({
    data: { userId: alice.id, badgeId: rookieBadge.id },
  }).catch(() => {}); 

  console.log("✓ Badges seeded");

  // ==========================================
  // 7. CALENDAR TASKS
  // ==========================================
  await prisma.calendarTask.create({
    data: {
      date: new Date(),
      content: "Finish UI for Dashboard",
      userId: alice.id,
    },
  }).catch(() => {});

  console.log("✓ Calendar tasks seeded");
  console.log("🎉 Seed completed!");

    // ==========================================
  // 8. HABITS + HABIT LOGS (demo data)
  // ==========================================
  const makeUtcDate = (offsetDays) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - offsetDays);
    return d;
  };

  let demoHabit = await prisma.habit.findFirst({
    where: { userId: alice.id, title: "Drink water" },
  });

  if (!demoHabit) {
    demoHabit = await prisma.habit.create({
      data: {
        userId: alice.id,
        title: "Drink water",
        description: "Drink 8 cups of water daily",
        color: "#0d6efd",
        targetPerWeek: 5,
      },
    });
  }

  await prisma.habitLog.createMany({
    data: [
      { habitId: demoHabit.id, date: makeUtcDate(0), completed: true },
      { habitId: demoHabit.id, date: makeUtcDate(1), completed: true },
      { habitId: demoHabit.id, date: makeUtcDate(2), completed: true },
      { habitId: demoHabit.id, date: makeUtcDate(4), completed: true },
    ],
    skipDuplicates: true,
  });

  console.log("✓ Habits & habit logs seeded");

  // ==========================================
  // 8. SHOP THEMES
  // ==========================================
  console.log("... adding Shop Themes");
  await prisma.theme.deleteMany({});
  await prisma.theme.createMany({
      data: [
          { 
              name: "Classic Coffee", 
              cost: 0, 
              cssClass: "theme-coffee", 
              description: "The original reliable choice." 
          },
          { 
              name: "Matcha", 
              cost: 100, 
              cssClass: "theme-matcha", 
              description: "Green, calm, and focused." 
          },
          { 
              name: "Cyberpunk City", 
              cost: 500, 
              cssClass: "theme-cyberpunk", 
              description: "Neon lights and deep focus." 
          },
          { 
              name: "Midnight Blue", 
              cost: 300, 
              cssClass: "theme-midnight", 
              description: "Deep colors for late night grinders." 
          }
      ],
      skipDuplicates: true, 
  });
  console.log("Shop Themes added");
  
  console.log("🎉 Seed completed!");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
