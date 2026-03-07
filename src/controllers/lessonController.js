const initDb = require('../db/database');

// Εμφάνιση της φόρμας δημιουργίας
exports.getCreatePage = (req, res) => {
    res.render('createLesson', {
        layout: 'dashboardLayout',
        title: 'Δημιουργία Νέου Μαθήματος',
        style: 'lessons.css' // Θα φτιάξουμε νέο CSS αρχείο
    });
};

// Επεξεργασία της φόρμας (POST)
exports.postCreateLesson = async (req, res) => {
    const { title, description } = req.body;
    const professorId = req.session.user.id;
    const db = await initDb();

    // Default banner αν δεν ανέβηκε τίποbackτα
    let bannerPath = '/img/default-lesson-banner.png';
    if (req.file) {
        bannerPath = '/uploads/lessons/' + req.file.filename;
    }

    try {
        const result = await db.run(
            `INSERT INTO lessons (title, description, banner_path, professor_id) 
             VALUES (?, ?, ?, ?)`,
            [title, description, bannerPath, professorId]
        );

        const newLessonId = result.lastID;
        // Ανακατεύθυνση στη σελίδα διαχείρισης του συγκεκριμένου μαθήματος
        res.redirect(`/lessons/manage/${newLessonId}`);
    } catch (err) {
        console.error(err);
        res.render('createLesson', {
            layout: 'dashboardLayout',
            error: 'Κάτι πήγε στραβά στη δημιουργία.'
        });
    }
};