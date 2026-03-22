const initDb = require('../db/database'); // Προσοχή: Βάλε το σωστό path για το database.js σου

exports.getHome = async (req, res) => {
    const user = req.session.user;
    const displayAvatar = user.avatar_path || '/img/default-avatar.png';
    const db = await initDb();

    try {
        let stats = {};

        // --- ΛΟΓΙΚΗ ΓΙΑ ΚΑΘΗΓΗΤΗ ---
        if (user.role === 'professor') {
            // 1. Δημιουργημένα Μαθήματα
            const lessonsCount = await db.get(`SELECT COUNT(*) as count FROM lessons WHERE professor_id = ?`, [user.id]);
            // 2. Εγγραφές Φοιτητών στα μαθήματά του
            const enrollmentsCount = await db.get(`
                SELECT COUNT(*) as count FROM enrollments e 
                JOIN lessons l ON e.lesson_id = l.id WHERE l.professor_id = ?
            `, [user.id]);
            // 3. Ερωτήσεις που έχει φτιάξει
            const questionsCount = await db.get(`
                SELECT COUNT(*) as count FROM questions q 
                JOIN chapters c ON q.chapter_id = c.id 
                JOIN lessons l ON c.lesson_id = l.id WHERE l.professor_id = ?
            `,[user.id]);
            // 4. Ολοκληρωμένα Τεστ από μαθητές του
            const testsCount = await db.get(`
                SELECT COUNT(*) as count FROM test_results t 
                JOIN chapters c ON t.chapter_id = c.id 
                JOIN lessons l ON c.lesson_id = l.id WHERE l.professor_id = ?
            `, [user.id]);

            // Γεμίζουμε τα 4 cards του UI
            stats = {
                card1: { label: 'Τα Μαθήματά μου', value: lessonsCount.count, percent: 'Διαχείριση' },
                card2: { label: 'Συνολικές Εγγραφές', value: enrollmentsCount.count, percent: 'Ενεργοί' },
                card3: { label: 'Τράπεζα Ερωτήσεων', value: questionsCount.count, percent: 'Ερωτήσεις' },
                card4: { label: 'Ολοκληρωμένα Τεστ', value: testsCount.count, percent: 'Υποβολές' }
            };
        }

        // --- ΛΟΓΙΚΗ ΓΙΑ ΜΑΘΗΤΗ ---
        else {
            // 1. Μαθήματα που παρακολουθεί
            const enrolledCount = await db.get(`SELECT COUNT(*) as count FROM enrollments WHERE student_id = ?`,[user.id]);
            // 2. Περασμένα Κεφάλαια (passed = 1)
            const completedTests = await db.get(`SELECT COUNT(*) as count FROM test_results WHERE student_id = ? AND passed = 1`, [user.id]);
            // 3. Σύνολο Προσπαθειών (όλα τα τεστ που έχει κάνει, ανεξαρτήτως αν τα πέρασε)
            const totalAttempts = await db.get(`SELECT COUNT(*) as count FROM test_results WHERE student_id = ?`, [user.id]);

            // 4. Υπολογισμός Μέσου Όρου (Συνολικό Σκορ)
            const avgGradeRow = await db.get(`
                SELECT AVG(CAST(score AS FLOAT) / total_questions) * 100 as avgGrade
                FROM test_results WHERE student_id = ?
            `, [user.id]);
            const avgGrade = avgGradeRow.avgGrade ? Math.round(avgGradeRow.avgGrade) : 0;

            // Γεμίζουμε τα 4 cards του UI
            stats = {
                card1: { label: 'Επιλεγμένα Μαθήματα', value: enrolledCount.count, percent: 'Ενεργά' },
                card2: { label: 'Περασμένα Κεφάλαια', value: completedTests.count, percent: 'Επιτυχίες' },
                card3: { label: 'Προσπάθειες Τεστ', value: totalAttempts.count, percent: 'Σύνολο' },
                card4: { label: 'Μέσος Όρος (M.O.)', value: `${avgGrade}%`, percent: avgGrade >= 50 ? 'Προβιβάσιμος ↗' : 'Χρειάζεται προσπάθεια' }
            };
        }

        res.render('home', {
            layout: 'dashboardLayout',
            title: 'Αρχική - Dashboard',
            user: user,
            avatar: displayAvatar,
            stats: stats // Περνάμε το αντικείμενο stats στο View
        });

    } catch (err) {
        console.error("Σφάλμα στη φόρτωση του Dashboard:", err);
        res.status(500).send("Σφάλμα συστήματος.");
    }
};