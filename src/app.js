// src/app.js
const express = require('express');
const createError = require('http-errors');

const somethingRouter = require('./routers/Something.router');
const personRouter = require('./routers/Person.router');
const profileRouter = require('./routers/Profile.router.js'); 

const path = require('path');

const app = express();
app.use(express.json());

// Static files (public HTML/JS/CSS)
app.use(express.static(path.join(__dirname, 'public')));

// Existing demo routers
app.use('/somethings', somethingRouter);
app.use('/persons', personRouter);

// New profile API
app.use('/api/profile', profileRouter);

// 404 and error handler
app.use((req, res, next) => {
  next(createError(404, `Unknown resource ${req.method} ${req.originalUrl}`));
});

// eslint-disable-next-line no-unused-vars
app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ error: error.message || 'Unknown Server Error!' });
});

module.exports = app;
