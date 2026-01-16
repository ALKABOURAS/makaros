const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const mainRouter = require('./src/routes/index');

const app = express();

// Handlebars Setup
app.engine('hbs', engine({ extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', 'hbs');

// db connection middleware

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Κεντρικό Routing
app.use('/', mainRouter);

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));