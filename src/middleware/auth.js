// Έλεγχος αν είναι απλά συνδεδεμένος
exports.isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next(); // Προχώρα στον controller
    } else {
        res.redirect('/auth/login'); // Πήγαινε να συνδεθείς
    }
};

// Έλεγχος αν είναι Καθηγητής ή Admin
exports.isStaff = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'professor' || req.session.user.role === 'admin')) {
        next();
    } else {
        res.status(403).send('Δεν έχετε δικαίωμα πρόσβασης (Μόνο Καθηγητές/Admin)');
    }
};

// Έλεγχος αν είναι Admin
exports.isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('Απαιτούνται δικαιώματα διαχειριστή');
    }
};