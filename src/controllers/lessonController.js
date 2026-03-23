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

// Εμφάνιση Σελίδας Διαχείρισης Μαθήματος
exports.getManageLesson = async (req, res) => {
    const lessonId = req.params.id;
    const professorId = req.session.user.id;
    const db = await initDb();

    try {
        // 1. Φέρνουμε το μάθημα, ελέγχοντας αν ανήκει σε αυτόν τον καθηγητή
        const lesson = await db.get(
            `SELECT * FROM lessons WHERE id = ? AND professor_id = ?`,
            [lessonId, professorId]
        );

        if (!lesson) {
            return res.status(404).send('Το μάθημα δεν βρέθηκε ή δεν έχετε δικαίωμα πρόσβασης.');
        }

        // Φέρνουμε τα Κεφάλαια
        const chapters = await db.all(
            `SELECT * FROM chapters WHERE lesson_id = ? ORDER BY order_num ASC`,
            [lessonId]
        );

        // Για κάθε κεφάλαιο, φέρνουμε τις ερωτήσεις του
        for (let chapter of chapters) {
            const questions = await db.all(
                `SELECT * FROM questions WHERE chapter_id = ?`,
                [chapter.id]
            );

            // Κάνουμε parse το πεδίο options (από String σε Array) για να το δει το UI
            chapter.questions = questions.map(q => {
                try {
                    q.parsedOptions = JSON.parse(q.options);
                } catch (e) {
                    q.parsedOptions =[];
                }
                return q;
            });
        }

        // 3. Render τη σελίδα
        res.render('manageLesson', {
            layout: 'dashboardLayout',
            title: `Διαχείριση: ${lesson.title}`,
            style: 'manage-lesson.css', // Το CSS που θα φτιάξουμε
            user: req.session.user,
            lesson,
            chapters
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};

// Προσθήκη νέου Κεφαλαίου
exports.postAddChapter = async (req, res) => {
    const lessonId = req.params.id;
    const { title, content, order_num } = req.body;
    const db = await initDb();

    try {
        await db.run(
            `INSERT INTO chapters (lesson_id, title, content, order_num) 
             VALUES (?, ?, ?, ?)`,
            [lessonId, title, content, order_num || 1] // Default order 1 αν μείνει κενό
        );

        // Επιστρέφουμε στη σελίδα διαχείρισης για να δει το νέο κεφάλαιο
        res.redirect(`/lessons/manage/${lessonId}`);
    } catch (err) {
        console.error("Σφάλμα κατά την προσθήκη κεφαλαίου:", err);
        res.status(500).send('Δεν ήταν δυνατή η προσθήκη του κεφαλαίου.');
    }
};

// Εμφάνιση των μαθημάτων του Καθηγητή
exports.getMyLessons = async (req, res) => {
    const professorId = req.session.user.id;
    const db = await initDb();

    try {
        // Τραβάμε τα μαθήματα του καθηγητή ταξινομημένα από το νεότερο στο παλαιότερο
        const myLessons = await db.all(
            `SELECT * FROM lessons WHERE professor_id = ? ORDER BY id DESC`,[professorId]
        );

        res.render('myLessons', {
            layout: 'dashboardLayout',
            title: 'Τα Μαθήματά μου',
            style: 'my-lessons.css', // Νέο αρχείο CSS
            user: req.session.user,
            lessons: myLessons
        });
    } catch (err) {
        console.error("Σφάλμα κατά την ανάκτηση μαθημάτων:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};


exports.getEditChapter = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const db = await initDb();

    try {
        const chapter = await db.get(
            `SELECT * FROM chapters WHERE id = ? AND lesson_id = ?`,
            [chapterId, lessonId]
        );

        if (!chapter) {
            return res.status(404).send('Το κεφάλαιο δεν βρέθηκε.');
        }

        res.render('editChapter', {
            layout: 'dashboardLayout',
            title: 'Επεξεργασία Κεφαλαίου',
            style: 'manage-lesson.css', // Χρησιμοποιούμε το ίδιο CSS
            user: req.session.user,
            lessonId,
            chapter
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};


exports.postEditChapter = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const { title, content, order_num } = req.body;
    const db = await initDb();

    try {
        await db.run(
            `UPDATE chapters SET title = ?, content = ?, order_num = ? WHERE id = ? AND lesson_id = ?`,[title, content, order_num, chapterId, lessonId]
        );

        // Επιστροφή στη διαχείριση του μαθήματος
        res.redirect(`/lessons/manage/${lessonId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα κατά την ενημέρωση του κεφαλαίου.');
    }
};


exports.postDeleteChapter = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const db = await initDb();

    try {
        // Λόγω του ON DELETE CASCADE (αν το έχεις βάλει), θα διαγραφούν και οι ερωτήσεις του αυτόματα στο μέλλον!
        await db.run(
            `DELETE FROM chapters WHERE id = ? AND lesson_id = ?`,
            [chapterId, lessonId]
        );

        res.redirect(`/lessons/manage/${lessonId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα κατά τη διαγραφή του κεφαλαίου.');
    }
};


exports.postAddQuestion = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const { question_text, type, difficulty, correct_option_index } = req.body;
    const db = await initDb();

    try {
        let optionsArray =[];
        let correctAnswerText = "";

        if (type === 'multiple_choice') {
            // Παίρνουμε τις 4 επιλογές από τη φόρμα
            optionsArray =[req.body.opt1, req.body.opt2, req.body.opt3, req.body.opt4];
            // Βρίσκουμε ποιο κείμενο αντιστοιχεί στη σωστή επιλογή (1, 2, 3 ή 4)
            correctAnswerText = optionsArray[parseInt(correct_option_index) - 1];
        }
        else if (type === 'true_false') {
            optionsArray = ['Σωστό', 'Λάθος'];
            correctAnswerText = req.body.tf_correct_answer; // Θα έρθει 'Σωστό' ή 'Λάθος' από τη φόρμα
        }

        // Μετατρέπουμε το array σε String για να μπει στο TEXT πεδίο της βάσης
        const optionsStr = JSON.stringify(optionsArray);

        await db.run(
            `INSERT INTO questions (chapter_id, question_text, type, difficulty, correct_answer, options) 
             VALUES (?, ?, ?, ?, ?, ?)`,[chapterId, question_text, type, difficulty, correctAnswerText, optionsStr]
        );

        res.redirect(`/lessons/manage/${lessonId}`);
    } catch (err) {
        console.error("Σφάλμα προσθήκης ερώτησης:", err);
        res.status(500).send('Δεν ήταν δυνατή η προσθήκη της ερώτησης.');
    }
};

// Εμφάνιση Καταλόγου Μαθημάτων (Για Μαθητές)
exports.getLessonCatalog = async (req, res) => {
    const studentId = req.session.user.id;
    const db = await initDb();

    try {
        // Παίρνουμε ΟΛΑ τα μαθήματα
        const allLessons = await db.all(`SELECT * FROM lessons ORDER BY created_at DESC`);

        // Παίρνουμε τα ID των μαθημάτων στα οποία είναι ΗΔΗ γραμμένος ο μαθητής
        const myEnrollments = await db.all(
            `SELECT lesson_id FROM enrollments WHERE student_id = ?`, [studentId]
        );

        // Φτιάχνουμε ένα array μόνο με τα IDs για εύκολο έλεγχο
        const enrolledLessonIds = myEnrollments.map(e => e.lesson_id);

        // Σημαδεύουμε ποια μαθήματα είναι ήδη "enrolled"
        const lessonsWithStatus = allLessons.map(lesson => {
            return {
                ...lesson,
                isEnrolled: enrolledLessonIds.includes(lesson.id)
            };
        });

        res.render('lessonCatalog', {
            layout: 'dashboardLayout',
            title: 'Κατάλογος Μαθημάτων',
            style: 'my-lessons.css', // Μπορούμε να επαναχρησιμοποιήσουμε το ίδιο CSS
            user: req.session.user,
            lessons: lessonsWithStatus
        });
    } catch (err) {
        console.error("Σφάλμα στον κατάλογο:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};

// Εγγραφή Μαθητή σε Μάθημα
exports.postEnroll = async (req, res) => {
    const studentId = req.session.user.id;
    const lessonId = req.params.lessonId;
    const db = await initDb();

    try {
        // Εισαγωγή στον πίνακα enrollments (το UNIQUE constraint μας προστατεύει από διπλοεγγραφές)
        await db.run(
            `INSERT INTO enrollments (student_id, lesson_id) VALUES (?, ?)`,
            [studentId, lessonId]
        );

        // Μόλις γραφτεί, τον κάνουμε refresh στη σελίδα για να δει το κουμπί να αλλάζει
        res.redirect('/lessons/catalog');
    } catch (err) {
        // Αν χτυπήσει το UNIQUE constraint (είναι ήδη γραμμένος), απλά κάνουμε redirect
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.redirect('/lessons/catalog');
        }
        console.error("Σφάλμα εγγραφής:", err);
        res.status(500).send('Σφάλμα κατά την εγγραφή.');
    }
};
// Εμφάνιση των μαθημάτων που παρακολουθεί ο Μαθητής
exports.getMyEnrolledLessons = async (req, res) => {
    const studentId = req.session.user.id;
    const db = await initDb();

    try {
        // Παίρνουμε τα μαθήματα μέσω INNER JOIN με τον πίνακα enrollments
        const myCourses = await db.all(`
            SELECT lessons.* 
            FROM lessons
            INNER JOIN enrollments ON lessons.id = enrollments.lesson_id
            WHERE enrollments.student_id = ?
            ORDER BY enrollments.enrolled_at DESC
        `, [studentId]);

        res.render('myEnrolledLessons', {
            layout: 'dashboardLayout',
            title: 'Η Βιβλιοθήκη μου',
            style: 'my-lessons.css', // Ίδιο CSS με τα άλλα grids!
            user: req.session.user,
            lessons: myCourses
        });
    } catch (err) {
        console.error("Σφάλμα στην ανάκτηση των μαθημάτων του μαθητή:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};


exports.getLessonView = async (req, res) => {
    const lessonId = req.params.id;
    const studentId = req.session.user.id;
    const db = await initDb();

    try {
        const lesson = await db.get(`SELECT * FROM lessons WHERE id = ?`, [lessonId]);

        // Έλεγχος αν όντως έχει γραφτεί
        const isEnrolled = await db.get(`SELECT * FROM enrollments WHERE student_id = ? AND lesson_id = ?`,[studentId, lessonId]);
        if (!isEnrolled) {
            return res.redirect('/lessons/catalog'); // Αν δεν είναι γραμμένος, τον διώχνουμε
        }

        // Φέρνουμε τα κεφάλαια
        const chapters = await db.all(`SELECT * FROM chapters WHERE lesson_id = ? ORDER BY order_num ASC`, [lessonId]);

        // Για κάθε κεφάλαιο, ψάχνουμε αν έχει σκορ (παίρνουμε το καλύτερο/τελευταίο του σκορ)
        for (let chapter of chapters) {
            const result = await db.get(`
                SELECT * FROM test_results 
                WHERE student_id = ? AND chapter_id = ? 
                ORDER BY completed_at DESC LIMIT 1
            `, [studentId, chapter.id]);

            if (result) {
                chapter.hasAttempted = true;
                chapter.score = result.score;
                chapter.total_questions = result.total_questions;
                chapter.percentage = Math.round((result.score / result.total_questions) * 100);
                chapter.passed = result.passed;
            } else {
                chapter.hasAttempted = false;
            }
        }

        res.render('lessonView', {
            layout: 'dashboardLayout',
            title: lesson.title,
            style: 'manage-lesson.css', // Χρησιμοποιούμε το ίδιο style με τα κεφάλαια του καθηγητή!
            user: req.session.user,
            lesson,
            chapters
        });
    } catch (err) {
        console.error("Σφάλμα προβολής μαθήματος:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};


exports.getChapterTest = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const db = await initDb();

    try {
        const chapter = await db.get(`SELECT * FROM chapters WHERE id = ?`,[chapterId]);
        const questions = await db.all(`SELECT * FROM questions WHERE chapter_id = ?`,[chapterId]);

        // Parse τα options για να εμφανίσουμε τα radio buttons
        const parsedQuestions = questions.map(q => {
            q.parsedOptions = JSON.parse(q.options);
            return q;
        });

        res.render('chapterTest', {
            layout: 'dashboardLayout',
            title: `Τεστ: ${chapter.title}`,
            style: 'manage-lesson.css',
            user: req.session.user,
            lessonId,
            chapter,
            questions: parsedQuestions
        });
    } catch (err) {
        console.error("Σφάλμα φόρτωσης τεστ:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};


exports.postChapterTest = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const studentId = req.session.user.id;
    const submittedAnswers = req.body; // Έχει τη μορφή { q_1: 'Επιλογή 2', q_5: 'Σωστό' }
    const db = await initDb();

    try {
        const questions = await db.all(`SELECT * FROM questions WHERE chapter_id = ?`, [chapterId]);

        let correctCount = 0;
        const totalQuestions = questions.length;

        // Υπολογισμός Σκορ
        questions.forEach(q => {
            const studentAnswer = submittedAnswers[`q_${q.id}`];
            if (studentAnswer && studentAnswer === q.correct_answer) {
                correctCount++;
            }
        });

        // Περνάει αν έχει γράψει πάνω από 50% (Μπορείς να το αλλάξεις)
        const passed = (correctCount / totalQuestions) >= 0.5 ? 1 : 0;

        // Αποθήκευση στη Βάση
        await db.run(`
            INSERT INTO test_results (student_id, chapter_id, score, total_questions, passed)
            VALUES (?, ?, ?, ?, ?)
        `,[studentId, chapterId, correctCount, totalQuestions, passed]);

        // Επιστροφή στη σελίδα του μαθήματος για να δει το σκορ του
        res.redirect(`/lessons/${lessonId}/view`);
    } catch (err) {
        console.error("Σφάλμα βαθμολόγησης:", err);
        res.status(500).send('Σφάλμα κατά την υποβολή.');
    }
};


exports.getLessonStudents = async (req, res) => {
    const lessonId = req.params.id;
    const db = await initDb();

    try {
        const lesson = await db.get(`SELECT * FROM lessons WHERE id = ?`, [lessonId]);
        const chapters = await db.all(`SELECT * FROM chapters WHERE lesson_id = ? ORDER BY order_num ASC`,[lessonId]);

        // Παίρνουμε τους φοιτητές που είναι γραμμένοι στο μάθημα
        const students = await db.all(`
            SELECT u.id, u.fullName, u.am, e.enrolled_at
            FROM enrollments e
            JOIN users u ON e.student_id = u.id
            WHERE e.lesson_id = ?
            ORDER BY e.enrolled_at DESC
        `, [lessonId]);

        // Για κάθε φοιτητή, βρίσκουμε το σκορ του σε ΚΑΘΕ κεφάλαιο
        for (let student of students) {
            student.chapterResults =[];

            for (let chapter of chapters) {
                const result = await db.get(`
                    SELECT score, total_questions, passed 
                    FROM test_results 
                    WHERE student_id = ? AND chapter_id = ? 
                    ORDER BY completed_at DESC LIMIT 1
                `, [student.id, chapter.id]);

                student.chapterResults.push({
                    chapterTitle: chapter.title,
                    order_num: chapter.order_num,
                    hasAttempted: !!result,
                    passed: result ? result.passed : false,
                    score: result ? result.score : 0,
                    total: result ? result.total_questions : 0
                });
            }
        }

        res.render('lessonStudents', {
            layout: 'dashboardLayout',
            title: `Στατιστικά: ${lesson.title}`,
            style: 'manage-lesson.css', // Ίδιο CSS
            user: req.session.user,
            lesson,
            chapters,
            students
        });
    } catch (err) {
        console.error("Σφάλμα στα στατιστικά μαθητών:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};