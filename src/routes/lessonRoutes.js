const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { isLoggedIn, isStaff } = require('../middleware/auth');
const upload = require('../config/multerLessons');

// Προστατευμένα routes: Μόνο για συνδεδεμένους Καθηγητές/Admins
router.get('/create', isLoggedIn, isStaff, lessonController.getCreatePage);
router.post('/create', isLoggedIn, isStaff, upload.single('banner'), lessonController.postCreateLesson);
// Σελίδα "Τα Μαθήματά μου"
router.get('/my-lessons', isLoggedIn, isStaff, lessonController.getMyLessons);
// Προβολή σελίδας Διαχείρισης συγκεκριμένου μαθήματος
router.get('/manage/:id', isLoggedIn, isStaff, lessonController.getManageLesson);

// Προσθήκη νέου Κεφαλαίου (Chapter) στο μάθημα
router.post('/manage/:id/chapters', isLoggedIn, isStaff, lessonController.postAddChapter);

// Εμφάνιση φόρμας επεξεργασίας κεφαλαίου
router.get('/manage/:lessonId/chapters/:chapterId/edit', isLoggedIn, isStaff, lessonController.getEditChapter);

// Αποθήκευση αλλαγών κεφαλαίου (POST)
router.post('/manage/:lessonId/chapters/:chapterId/edit', isLoggedIn, isStaff, lessonController.postEditChapter);

// Διαγραφή κεφαλαίου (POST)
router.post('/manage/:lessonId/chapters/:chapterId/delete', isLoggedIn, isStaff, lessonController.postDeleteChapter);

// Προσθήκη Ερώτησης σε Κεφάλαιο
router.post('/manage/:lessonId/chapters/:chapterId/questions', isLoggedIn, isStaff, lessonController.postAddQuestion);

// Για Μαθητές: Προβολή όλων των διαθέσιμων μαθημάτων
router.get('/catalog', isLoggedIn, lessonController.getLessonCatalog);

// Για Μαθητές: Εγγραφή σε μάθημα
router.post('/enroll/:lessonId', isLoggedIn, lessonController.postEnroll);

// Για Μαθητές: Τα μαθήματα στα οποία είμαι εγγεγραμμένος
router.get('/my-courses', isLoggedIn, lessonController.getMyEnrolledLessons);

// Προβολή των κεφαλαίων ενός μαθήματος
router.get('/:id/view', isLoggedIn, lessonController.getLessonView);

// Εμφάνιση του Τεστ για ένα συγκεκριμένο κεφάλαιο
router.get('/:lessonId/chapters/:chapterId/test', isLoggedIn, lessonController.getChapterTest);

// Υποβολή του Τεστ (Βαθμολόγηση)
router.post('/:lessonId/chapters/:chapterId/test', isLoggedIn, lessonController.postChapterTest);

// Προβολή των φοιτητών και βαθμολογιών για ένα μάθημα
router.get('/manage/:id/students', isLoggedIn, isStaff, lessonController.getLessonStudents);

module.exports = router;