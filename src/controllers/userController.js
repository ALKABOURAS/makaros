const fs = require('fs');
const path = require('path');
const initDb = require('../db/database');

// Εμφάνιση Προφίλ
exports.getProfile = (req, res) => {
    res.render('profile', {
        layout: 'dashboardLayout',
        title: 'Ρυθμίσεις Προφίλ',
        style: 'profile.css',
        user: req.session.user // Παίρνουμε τα τρέχοντα στοιχεία από το session
    });
};

// Ενημέρωση Προφίλ
exports.updateProfile = async (req, res) => {
    const { fullName, phone, am } = req.body;
    const userId = req.session.user.id;
    const db = await initDb();

    // DEBUG: Δες στο τερματικό αν έρχονται οι τιμές
    console.log("Λήψη δεδομένων:", { fullName, phone, am });

    let newAvatarPath = req.session.user.avatar_path;

    if (req.file) {
        // Σημαντικό: χρησιμοποιούμε το filename που έδωσε ο multer
        newAvatarPath = '/uploads/avatars/' + req.file.filename;
        console.log("Νέο Avatar αρχείο:", req.file.filename);
    }

    try {
        await db.run(
            `UPDATE users SET fullName = ?, phone = ?, am = ?, avatar_path = ? WHERE id = ?`,
            [fullName, phone, am, newAvatarPath, userId]
        );

        // Ενημέρωση του αντικειμένου στο session
        req.session.user.fullName = fullName;
        req.session.user.phone = phone;
        req.session.user.am = am;
        req.session.user.avatar_path = newAvatarPath;

        // ΚΡΙΣΙΜΟ: Χειροκίνητη αποθήκευση του session πριν το redirect
        req.session.save((err) => {
            if (err) console.error("Session Save Error:", err);
            res.redirect('/profile?success=1');
        });

    } catch (err) {
        console.error("Database Update Error:", err);
        res.render('profile', { layout: 'dashboardLayout', style: 'profile.css', error: 'Σφάλμα βάσης' });
    }
};