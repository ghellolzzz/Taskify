const prisma = require('../src/models/prismaClient');

async function main() {
  console.log('Seeding data...');

  // 1️ Create Users
  const usersData = [
    { name: 'Alice', email: 'alice@example.com', password: 'password123' },
    { name: 'Bob', email: 'bob@example.com', password: 'password123' },
    { name: 'Charlie', email: 'charlie@example.com', password: 'password123' },
  ];

  await prisma.user.createMany({ data: usersData });
  console.log(' Users inserted');

  // 2️ Fetch all users
  const users = await prisma.user.findMany();

  // 3️ Create Categories for each user
  for (const user of users) {
    await prisma.category.createMany({
      data: [
        { name: 'Work', color: '#1E90FF', userId: user.id },
        { name: 'Personal', color: '#32CD32', userId: user.id },
      ],
    });
  }
  console.log('Categories inserted');

  // 4 Create Tasks for Alice
  const alice = await prisma.user.findFirst({ where: { email: 'alice@example.com' } });
  const workCategory = await prisma.category.findFirst({ where: { userId: alice.id, name: 'Work' } });

  await prisma.task.createMany({
    data: [
      {
        title: 'Finish CA1 Project',
        description: 'Complete backend and frontend integration',
        status: 'In Progress',
        priority: 'High',
        userId: alice.id,
        categoryId: workCategory.id,
      },
      {
        title: 'Buy groceries',
        description: 'Milk, bread, eggs, butter',
        status: 'Pending',
        priority: 'Low',
        userId: alice.id,
      },
    ],
  });
  console.log('Tasks inserted');

  // 5️ Create Comments for a Task
  const task = await prisma.task.findFirst({ where: { title: 'Finish CA1 Project' } });
  await prisma.comment.create({
    data: {
      content: 'Remember to commit and push the final code!',
      taskId: task.id,
      userId: alice.id,
    },
  });
  console.log(' Comments inserted');

  console.log(' Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
