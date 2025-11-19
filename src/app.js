// src/app.js
const express = require('express');
const createError = require('http-errors');





const path = require('path');
const taskRouter=require("./routers/taskRouter.js")
const dashboardRouter = require('./routers/dashboardRouter')
const categoryRouter = require('./routers/categoriesRoutes')
const profileRouter = require('./routers/Profile.router.js'); 

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (public HTML/JS/CSS)
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/categories',categoryRouter);
app.use('/api/tasks',taskRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/profile', profileRouter);



app.get('/.well-known/appspecific/*', (req, res) => {
  res.status(204).end();
});




// 404 and error handler
app.use((req, res, next) => {
  next(createError(404, `Unknown resource ${req.method} ${req.originalUrl}`));
});


app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ error: error.message || 'Unknown Server Error!' });
});

module.exports = app;
