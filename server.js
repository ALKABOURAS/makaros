const express = require('express');
const { engine } = require('express-handlebars');
const path = require('path');
const mainRouter = require('./src/routes/index');
const initDb = require('./src/db/database');

const app = express();

const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const PORT = 3000;

app.use(session({
    store: new SQLiteStore({ db: 'sessions.db', dir: './' }), // Αποθήκευση sessions σε αρχείο
    secret: 'smart-algo-unipi-secret', // Κλειδί ασφαλείας
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 μέρα
        httpOnly: true
    }
}));

// Middleware για να έχουμε πρόσβαση στον user σε όλα τα Handlebars αρχεία αυτόματα
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Handlebars Setup
app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    // Εδώ προσθέτουμε τους helpers
    helpers: {
        eq: function (v1, v2) {
            return v1 === v2;
        },
        ne: function (v1, v2) {
            return v1 !== v2;
        },
        or: function () {
            // Αυτό επιτρέπει πολλαπλά ορίσματα για το OR
            return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
        }
    }
}));
app.set('view engine', 'hbs');

// db connection middleware

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Κεντρικό Routing
app.use('/', mainRouter);

// Καλούμε τη συνάρτηση
initDb().then(() => {
    console.log('✅ Η βάση δεδομένων είναι έτοιμη.');
    const server = app.listen(PORT, () => {
        console.log(`🚀 Ο server τρέχει στο http://localhost:${PORT}`);
    });

    // Αυτό θα μας πει αν ο server κλείνει λόγω κάποιου σφάλματος
    server.on('error', (err) => {
        console.error('SERVER ERROR:', err);
    });
}).catch(err => {
    console.error('Σφάλμα:', err);
});

// Δες αν η Node κλείνει για "μυστήριο" λόγο
process.on('exit', (code) => {
    console.log(`Η Node κλείνει με κωδικό: ${code}`);
});