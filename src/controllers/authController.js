const bcrypt = require('bcrypt');
const initDb = require('../db/database');

exports.getLogin = (req, res) => {
    res.render('login', {
        title: 'Σύνδεση - Πανεπιστήμιο Πειραιώς',
        layout: 'main', // Χρησιμοποιεί το layouts/main.hbs
        style: 'login.css' // Φορτώνει το παραπάνω CSS
    });
};

exports.getSignup = (req, res) => {
    res.render('signup', {
        title: 'Εγγραφή',
        style: 'signup.css'
    });
};

// Στο LOGIN
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;
    const db = await initDb();

    // ΑΛΛΑΓΗ: email αντί για username
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

    if (user) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = {
                id: user.id,
                email: user.email,
                role: user.role,
                fullName: user.fullName,
                am: user.am,
                avatar_path: user.avatar_path,
                phone : user.phone
            };
            return res.redirect('/');
        }
    }
    res.render('login', { style: 'login.css', error: 'Λάθος στοιχεία' });
};

exports.postSignup = async (req, res) => {
    const { email, password, confirmPassword } = req.body;
    const db = await initDb();

    try {
        // Έλεγχος και στο Backend (για ασφάλεια)
        if (password.length < 8) throw new Error('Too short');
        if (password !== confirmPassword) throw new Error('Mismatch');

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.run(
            `INSERT INTO users (email, password, fullName, role) VALUES (?, ?, ?, ?)`,
            [email, hashedPassword, 'Νέος Χρήστης', 'student']
        );

        console.log("✅ Χρήστης δημιουργήθηκε, ανακατεύθυνση...");
        res.redirect('/auth/login'); // Εδώ ανακατευθύνουμε στο login μετά την επιτυχή εγγραφή
    } catch (err) {
        console.error("Σφάλμα εγγραφής:", err.message);
        // Αν αποτύχει, ξαναδείχνει τη σελίδα εγγραφής με το μήνυμα λάθους
        res.render('signup', {
            style: 'signup.css',
            error: 'Η εγγραφή απέτυχε. Ίσως το email υπάρχει ήδη.'
        });
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log("Logout Error:", err);
        }
        res.clearCookie('connect.sid'); // Καθαρίζει το cookie του session
        res.redirect('/auth/login');    // Επιστροφή στο login
    });
};