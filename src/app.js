// src/app.js
const express = require('express');
const createError = require('http-errors');

const path = require('path');

// Routers
const userRouter = require('./routers/User.router');
const taskRouter = require('./routers/taskRouter.js');
const dashboardRouter = require('./routers/dashboardRouter');
const categoryRouter = require('./routers/categoriesRoutes');
const profileRouter = require('./routers/Profile.router.js');
const commentsRouter = require('./routers/commentsRouter.js');
const reminderRouter = require("./routers/reminderRouter.js");
const calendarRouter = require('./routers/calendarRouter');
const goalRouter = require("./routers/goalRouter.js");
const habitRouter = require('./routers/Habit.router.js');
const feedbackRouter = require('./routers/feedbackRoutes.js');
const focusRoutes = require('./routers/focusRouter.js');
const teamRouter = require("./routers/teamRouter.js");
const passwordResetRouter = require('./routers/passwordResetRouter');
const timeEntryRouter = require('./routers/timeEntryRouter');
const communityRouter = require('./routers/communityRouter.js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (public HTML/JS/CSS)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tasks', taskRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/reminders", reminderRouter);
app.use('/api/calendar', calendarRouter);
app.use("/api/goals", goalRouter);
app.use('/api/habits', habitRouter);
app.use("/api/feedback", feedbackRouter);
app.use('/api/focus', focusRoutes);
app.use("/api/teams", teamRouter);
app.use('/api/password-reset', passwordResetRouter);
app.use('/api/time-entries', timeEntryRouter);
app.use('/api/community', communityRouter);

app.get('/.well-known/appspecific/*', (req, res) => {
  res.status(204).end();
});

// 404 handler
app.use((req, res, next) => {
  next(createError(404, `Unknown resource ${req.method} ${req.originalUrl}`));
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Error details:', error);
  console.error('Error stack:', error.stack);
  console.error('Error message:', error.message);
  console.error('Error name:', error.name);
  console.error('Error code:', error.code);
  
  res
    .status(error.status || 500)
    .json({ 
      error: error.message || 'Unknown Server Error!',
      details: error.toString(),
      name: error.name,
      code: error.code,
      stack: error.stack
    });
});

module.exports = app;
