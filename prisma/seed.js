const prisma = require('../src/models/prismaClient');
const bcrypt = require('bcrypt');

async function main() {
  console.log(" Seeding Taskify data...");

  // ==========================================
  // 1. USERS (with hashed passwords)
  // ==========================================
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash("password123", saltRounds);
  
  const users = await prisma.user.createMany({
    data: [
      { name: "Alice", email: "alice@example.com", password: hashedPassword },
      { name: "Bob", email: "bob@example.com", password: hashedPassword },
      { name: "Charlie", email: "charlie@example.com", password: hashedPassword },
    ],
  });

  const allUsers = await prisma.user.findMany();
  console.log("Users seeded");

  // ==========================================
  // 2. CATEGORIES (for every user)
  // ==========================================
  for (const user of allUsers) {
    await prisma.category.createMany({
      data: [
        { name: "Work", color: "#1E90FF", userId: user.id },
        { name: "Personal", color: "#32CD32", userId: user.id },
      ],
    });
  }
  console.log(" Categories seeded");

  // Get Alice for sample tasks
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
  });

  console.log(" Tasks seeded");

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
  });

  console.log(" Comments seeded");

  // ==========================================
  // 5. GOALS
  // ==========================================
  await prisma.goal.createMany({
    data: [
      { title: "Become productive", userId: alice.id },
      { title: "Finish tasks daily", userId: alice.id },
    ],
  });

  console.log(" Goals seeded");

  // ==========================================
  // 6. BADGES
  // ==========================================
  await prisma.badge.createMany({
    data: [
      { code: "ROOKIE", name: "Rookie", description: "Created your first task", icon: "⭐" },
      { code: "STREAK_3", name: "3-Day Streak", description: "Completed tasks for 3 days" },
    ],
  });

  const rookieBadge = await prisma.badge.findFirst({ where: { code: "ROOKIE" } });

  await prisma.userBadge.create({
    data: { userId: alice.id, badgeId: rookieBadge.id },
  });

  console.log("Badges seeded");

  // ==========================================
  // 7. CALENDAR TASKS
  // ==========================================
  await prisma.calendarTask.create({
    data: {
      date: new Date(),
      content: "Finish UI for Dashboard",
      userId: alice.id,
    },
  });

  console.log("Calendar tasks seeded");

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
