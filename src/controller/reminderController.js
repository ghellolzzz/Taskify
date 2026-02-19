// src/controller/reminderController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function startOfToday(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfTomorrow(d = new Date()) {
  const x = startOfToday(d);
  x.setDate(x.getDate() + 1);
  return x;
}

exports.getReminders = async (req, res, next) => {
  try {
    const userId = res.locals.userId;

    const reminders = await prisma.reminder.findMany({
      where: { userId },
      include: { task: true, habit: true },
      orderBy: { remindAt: "asc" },
    });

    res.json({ reminders });
  } catch (err) {
    next(err);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const userId = res.locals.userId;
    const now = new Date();
    const todayStart = startOfToday(now);
    const tomorrowStart = startOfTomorrow(now);

    const [today, upcoming, overdue, done] = await Promise.all([
  prisma.reminder.count({
    where: { userId, isDone: false, remindAt: { gte: todayStart, lt: tomorrowStart } },
  }),
  prisma.reminder.count({
    where: { userId, isDone: false, remindAt: { gte: tomorrowStart } },
  }),
  prisma.reminder.count({
    where: { userId, isDone: false, remindAt: { lt: todayStart } },
  }),
  prisma.reminder.count({ where: { userId, isDone: true } }),
]);

    res.json({ today, upcoming, overdue, done });
  } catch (err) {
    next(err);
  }
};

exports.createReminder = async (req, res, next) => {
  try {
    const userId = res.locals.userId;
    const { title, notes, taskId, remindAt, repeatType } = req.body;

    if (!title || !remindAt) {
      return res.status(400).json({ error: "title and remindAt are required" });
    }

    // if taskId is provided, ensure it belongs to user
    if (taskId) {
      const t = await prisma.task.findFirst({
        where: { id: Number(taskId), userId },
        select: { id: true },
      });
      if (!t) return res.status(400).json({ error: "Invalid taskId" });
    }

    const created = await prisma.reminder.create({
  data: {
    userId,
    title: String(title).trim(),
    notes: notes ? String(notes).trim() : null,
    taskId: taskId ? Number(taskId) : null,
    remindAt: new Date(remindAt), 
    repeatType: repeatType || "none",
  },
  include: { task: true, habit: true },
});


    res.status(201).json({ reminder: created });
  } catch (err) {
    next(err);
  }
};

exports.getReminderById = async (req, res, next) => {
  try {
    const userId = res.locals.userId;
    const id = Number(req.params.id);

    const reminder = await prisma.reminder.findFirst({
      where: { id, userId },
      include: { task: true, habit: true },
    });

    if (!reminder) return res.status(404).json({ error: "Reminder not found" });
    res.json({ reminder });
  } catch (err) {
    next(err);
  }
};

exports.updateReminder = async (req, res, next) => {
  try {
    const userId = res.locals.userId;
    const id = Number(req.params.id);
    const { title, notes, taskId, remindAt, repeatType } = req.body;

    // ensure reminder belongs to user
    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Reminder not found" });

    // validate taskId if provided
    if (taskId) {
      const t = await prisma.task.findFirst({
        where: { id: Number(taskId), userId },
        select: { id: true },
      });
      if (!t) return res.status(400).json({ error: "Invalid taskId" });
    }

    const updated = await prisma.reminder.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : undefined,
        taskId: taskId !== undefined ? (taskId ? Number(taskId) : null) : undefined,
        remindAt: remindAt !== undefined ? new Date(remindAt) : undefined,
        repeatType: repeatType !== undefined ? repeatType : undefined,
      },
      include: { task: true, habit: true }
    });

    res.json({ reminder: updated });
  } catch (err) {
    next(err);
  }
};

exports.completeReminder = async (req, res, next) => {
  try {
    const userId = res.locals.userId;
    const id = Number(req.params.id);

    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Reminder not found" });

    const updated = await prisma.reminder.update({
      where: { id },
      data: { isDone: true },
    });

    res.json({ reminder: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteReminder = async (req, res, next) => {
  try {
    const userId = res.locals.userId;
    const id = Number(req.params.id);

    const existing = await prisma.reminder.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Reminder not found" });

    await prisma.reminder.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
