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
    const {
        question_text, type, difficulty,
        correct_option_index, tf_correct_answer, opt1, opt2, opt3, opt4,
        regex_answer, fb_options, fb_correct_1, fb_correct_2, fb_correct_3
    } = req.body;

    const db = await initDb();

    try {
        let optionsArray =[];
        let correctAnswerText = "";

        if (type === 'multiple_choice') {
            optionsArray =[opt1, opt2, opt3, opt4];
            correctAnswerText = optionsArray[parseInt(correct_option_index) - 1];
        }
        else if (type === 'true_false') {
            optionsArray = ['true', 'false'];
            correctAnswerText = tf_correct_answer || 'true';
        }
        else if (type === 'open_ended') {
            // Δεν υπάρχουν επιλογές, η απάντηση είναι το Regex pattern
            optionsArray =[];
            correctAnswerText = regex_answer.trim();
        }
        else if (type === 'fill_blanks') {
            // Χωρίζουμε τις λέξεις με κόμμα και φτιάχνουμε array
            optionsArray = fb_options.split(',').map(s => s.trim());
            // Αποθηκεύουμε ως JSON ποιες λέξεις αντιστοιχούν σε ποια κενά [1], [2], [3]
            const correctObj = {};
            if(fb_correct_1) correctObj["1"] = fb_correct_1.trim();
            if(fb_correct_2) correctObj["2"] = fb_correct_2.trim();
            if(fb_correct_3) correctObj["3"] = fb_correct_3.trim();
            correctAnswerText = JSON.stringify(correctObj);
        }

        const optionsStr = JSON.stringify(optionsArray);

        await db.run(
            `INSERT INTO questions (chapter_id, question_text, type, difficulty, correct_answer, options)
             VALUES (?, ?, ?, ?, ?, ?)`,[chapterId, question_text, type, difficulty || 3, correctAnswerText, optionsStr]
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

// --- GET: Σελίδα Εξέτασης (Smart Algorithm - 1 Ερώτηση τη φορά) ---
exports.getChapterTest = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const db = await initDb();

    try {
        // 1. Έλεγχος / Αρχικοποίηση Session Τεστ
        // Αν το URL έχει ?start=true, ή αν δεν υπάρχει ενεργό τεστ, ξεκινάμε νέο!
        if (req.query.start === 'true' || !req.session.currentTest || req.session.currentTest.chapterId !== chapterId) {
            req.session.currentTest = {
                lessonId: lessonId,
                chapterId: chapterId,
                currentDifficulty: 3, // Ξεκινάμε πάντα με Μέτρια δυσκολία!
                askedQuestionIds:[], // Ποιες ερωτήσεις του έπεσαν ήδη
                correctAnswers: 0,
                totalTarget: 5, // Το τεστ θα έχει μάξιμουμ 5 ερωτήσεις
                currentQuestion: null // Η ερώτηση που βλέπει αυτή τη στιγμή
            };
        }

        const testState = req.session.currentTest;

        // 2. Αν έπιασε τον στόχο των ερωτήσεων, τερματίζει!
        if (testState.askedQuestionIds.length >= testState.totalTarget) {
            return await finishTestAndSave(req, res, db, testState);
        }

        const chapter = await db.get(`SELECT * FROM chapters WHERE id = ?`, [chapterId]);

        // 3. Επιλογή επόμενης ερώτησης (Αν δεν έχει ήδη φορτωθεί λόγω refresh)
        if (!testState.currentQuestion) {
            // Βρίσκουμε ερωτήσεις που ΔΕΝ έχουν ρωτηθεί ακόμα
            const placeholders = testState.askedQuestionIds.map(() => '?').join(',');
            const queryExtra = testState.askedQuestionIds.length > 0 ? `AND id NOT IN (${placeholders})` : '';

            const availableQuestions = await db.all(
                `SELECT * FROM questions WHERE chapter_id = ? ${queryExtra}`,
                [chapterId, ...testState.askedQuestionIds]
            );

            if (availableQuestions.length === 0) {
                // Αν δεν υπάρχουν άλλες ερωτήσεις (το κεφάλαιο είχε λιγότερες από 5), τερματίζουμε
                if (testState.askedQuestionIds.length === 0) {
                    return res.send("Ο καθηγητής δεν έχει προσθέσει ερωτήσεις σε αυτό το κεφάλαιο.");
                }
                return await finishTestAndSave(req, res, db, testState);
            }

            // --- SMART LOGIC SELECTION ---
            // Ψάχνουμε ερώτηση με την *τρέχουσα* δυσκολία που θέλει ο αλγόριθμος
            let nextQuestion = availableQuestions.find(q => q.difficulty === testState.currentDifficulty);

            // Fallback: Αν δεν υπάρχει ερώτηση με αυτή ακριβώς τη δυσκολία, του δίνουμε την πιο κοντινή!
            if (!nextQuestion) {
                availableQuestions.sort((a, b) => Math.abs(a.difficulty - testState.currentDifficulty) - Math.abs(b.difficulty - testState.currentDifficulty));
                nextQuestion = availableQuestions[0];
            }

            testState.currentQuestion = nextQuestion;
        }

        // Parse τα options για να εμφανιστούν
        const displayQuestion = { ...testState.currentQuestion };
        displayQuestion.parsedOptions = JSON.parse(displayQuestion.options);
        // Αν είναι Fill in the Blanks, μετατρέπουμε τα [1] σε HTML Select Dropdowns
        if (displayQuestion.type === 'fill_blanks') {
            let htmlText = displayQuestion.question_text;
            let optionsHtml = '<option value="">-- Επιλέξτε --</option>';
            displayQuestion.parsedOptions.forEach(opt => {
                optionsHtml += `<option value="${opt}">${opt}</option>`;
            });
            // Αντικαθιστά τα [1], [2] με <select name="answer_1"> κλπ
            htmlText = htmlText.replace(/\[(\d+)\]/g, (match, p1) => {
                return `<select name="answer_${p1}" required style="padding: 5px; border-radius: 4px; background: #333; color: white; border: 1px solid #64ffda; margin: 0 5px;">${optionsHtml}</select>`;
            });
            displayQuestion.html_text = htmlText;
        }

        res.render('chapterTest', {
            layout: 'dashboardLayout',
            title: `Τεστ: ${chapter.title}`,
            style: 'manage-lesson.css',
            user: req.session.user,
            lessonId,
            chapter,
            question: displayQuestion,
            progressNum: testState.askedQuestionIds.length + 1,
            targetNum: testState.totalTarget,
            currentDifficulty: testState.currentDifficulty
        });

    } catch (err) {
        console.error("Σφάλμα φόρτωσης τεστ:", err);
        res.status(500).send('Σφάλμα διακομιστή.');
    }
};

// --- POST: Υποβολή ΜΙΑΣ απάντησης ---
exports.postChapterTest = async (req, res) => {
    const { lessonId, chapterId } = req.params;
    const studentAnswer = req.body.answer; // Τώρα παίρνουμε μία μόνο απάντηση

    const testState = req.session.currentTest;
    if (!testState || !testState.currentQuestion) {
        return res.redirect(`/lessons/${lessonId}/chapters/${chapterId}/test?start=true`);
    }

    const currentQuestion = testState.currentQuestion;

// --- Έλεγχος Απάντησης βάσει Τύπου ---
    let isCorrect = false;
    let studentAnswerText = ""; // Για να σωθεί στο Ιστορικό Λαθών

    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
        studentAnswerText = req.body.answer;
        isCorrect = (studentAnswerText === currentQuestion.correct_answer);
    }
    else if (currentQuestion.type === 'open_ended') {
        studentAnswerText = req.body.answer || '';
        try {
            // Ελέγχει την απάντηση με το Regex του καθηγητή (αγνοώντας κεφαλαία/μικρά με το 'i')
            const regex = new RegExp(`^${currentQuestion.correct_answer}$`, 'i');
            isCorrect = regex.test(studentAnswerText.trim());
        } catch(e) {
            // Fallback σε απλό text match αν το regex είναι σπασμένο
            isCorrect = (studentAnswerText.trim().toLowerCase() === currentQuestion.correct_answer.toLowerCase());
        }
    }
    else if (currentQuestion.type === 'fill_blanks') {
        const correctObj = JSON.parse(currentQuestion.correct_answer);
        let studentObj = {};
        isCorrect = true; // Υποθέτουμε ότι είναι σωστό, και αν βρούμε λάθος το κάνουμε false

        for (let key in correctObj) {
            const submitted = req.body[`answer_${key}`];
            studentObj[key] = submitted;
            if (submitted !== correctObj[key]) {
                isCorrect = false;
            }
        }
        studentAnswerText = JSON.stringify(studentObj); // Αποθήκευση ιστορικού
    }

    // --- Αποθήκευση Λεπτομερειών της απάντησης στο Ιστορικό του Session ---

    if (!testState.history) testState.history =[];
    testState.history.push({
        question_text: currentQuestion.question_text,
        student_answer: studentAnswer || 'Δεν απάντησε',
        correct_answer: currentQuestion.correct_answer,
        isCorrect: isCorrect,
        difficulty: currentQuestion.difficulty
    });


    if (isCorrect) {
        testState.correctAnswers += 1;
        // Ανέβασμα δυσκολίας (Μέγιστο 5)
        testState.currentDifficulty = Math.min(5, testState.currentDifficulty + 1);
    } else {
        // Κατέβασμα δυσκολίας (Ελάχιστο 1)
        testState.currentDifficulty = Math.max(1, testState.currentDifficulty - 1);
    }

    // Καταγραφή ότι η ερώτηση απαντήθηκε και καθαρισμός για την επόμενη
    testState.askedQuestionIds.push(currentQuestion.id);
    testState.currentQuestion = null;

    // Αποθήκευση στο Session και reload τη σελίδα (η GET θα βρει την επόμενη)
    req.session.save(() => {
        res.redirect(`/lessons/${lessonId}/chapters/${chapterId}/test`);
    });
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
                // ΝΕΟ SELECT: Φέρνουμε ΚΑΙ το πεδίο details
                const result = await db.get(`
                    SELECT id, score, total_questions, passed, details
                    FROM test_results
                    WHERE student_id = ? AND chapter_id = ?
                    ORDER BY completed_at DESC LIMIT 1
                `, [student.id, chapter.id]);

                // --- Λογική δημιουργίας κειμένου για το Hover (Tooltip) ---
                let hoverText = "";
                if (result && result.details) {
                    try {
                        const parsedDetails = JSON.parse(result.details);
                        // Φτιάχνουμε ένα string για κάθε ερώτηση του τεστ
                        hoverText = parsedDetails.map((d, index) => {
                            const status = d.isCorrect ? 'Σωστό' : 'Λάθος';
                            return `Ερ. ${index + 1}: ${d.question_text}\nΑπάντηση: ${d.student_answer}\nΣωστή: ${d.correct_answer}\n[${status} - Δυσκολία: ${d.difficulty}]`;
                        }).join('\n\n'); // Αφήνουμε μια κενή γραμμή ανάμεσα στις ερωτήσεις
                    } catch (e) {
                        hoverText = "Οι λεπτομέρειες δεν είναι διαθέσιμες.";
                    }
                } else if (result) {
                    hoverText = "Δεν καταγράφηκε ιστορικό για αυτό το τεστ.";
                }

                student.chapterResults.push({
                    chapterTitle: chapter.title,
                    order_num: chapter.order_num,
                    hasAttempted: !!result,
                    passed: result ? result.passed : false,
                    score: result ? result.score : 0,
                    total: result ? result.total_questions : 0,
                    detailsText: hoverText // Το περνάμε στο HBS για να μπει στο title!
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

// --- POST: Διαγραφή Ερώτησης ---
exports.postDeleteQuestion = async (req, res) => {
    const { lessonId, questionId } = req.params;
    const db = await initDb();
    try {
        await db.run(`DELETE FROM questions WHERE id = ?`, [questionId]);
        res.redirect(`/lessons/manage/${lessonId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Σφάλμα κατά τη διαγραφή της ερώτησης.');
    }
};

// --- GET: Φόρμα Επεξεργασίας Ερώτησης ---
exports.getEditQuestion = async (req, res) => {
    const { lessonId, chapterId, questionId } = req.params;
    const db = await initDb();
    try {
        const question = await db.get(`SELECT * FROM questions WHERE id = ?`, [questionId]);
        if (!question) return res.status(404).send('Not found');

        question.parsedOptions = JSON.parse(question.options);

        res.render('editQuestion', {
            layout: 'dashboardLayout',
            title: 'Επεξεργασία Ερώτησης',
            style: 'manage-lesson.css',
            user: req.session.user,
            lessonId, chapterId, question
        });
    } catch (err) {
        res.status(500).send('Σφάλμα διακομιστή');
    }
};

// --- POST: Αποθήκευση Επεξεργασίας Ερώτησης ---
exports.postEditQuestion = async (req, res) => {
    const { lessonId, questionId } = req.params;
    const { question_text, difficulty } = req.body;
    const db = await initDb();
    try {
        // Προς το παρόν ενημερώνουμε μόνο Κείμενο και Δυσκολία για αποφυγή πολυπλοκότητας (Μπορείς να το επεκτείνεις!)
        await db.run(`UPDATE questions SET question_text = ?, difficulty = ? WHERE id = ?`,[question_text, difficulty, questionId]);
        res.redirect(`/lessons/manage/${lessonId}`);
    } catch (err) {
        res.status(500).send('Σφάλμα');
    }
};

// --- ΒΟΗΘΗΤΙΚΗ ΣΥΝΑΡΤΗΣΗ: Τερματισμός Τεστ και Αποθήκευση ---
async function finishTestAndSave(req, res, db, testState) {
    const studentId = req.session.user.id;
    const totalAsked = testState.askedQuestionIds.length;
    const passed = (testState.correctAnswers / totalAsked) >= 0.5 ? 1 : 0;

    // Μετατρέπουμε το ιστορικό σε String
    const detailsJson = JSON.stringify(testState.history ||[]);

    try {
        await db.run(`
            INSERT INTO test_results (student_id, chapter_id, score, total_questions, passed, details)
            VALUES (?, ?, ?, ?, ?, ?)
        `,[studentId, testState.chapterId, testState.correctAnswers, totalAsked, passed, detailsJson]);

        req.session.currentTest = null;
        req.session.save(() => {
            res.redirect(`/lessons/${testState.lessonId}/view`);
        });
    } catch (error) {
        console.error("Σφάλμα αποθήκευσης αποτελεσμάτων:", error);
        res.status(500).send("Σφάλμα αποθήκευσης.");
    }
}