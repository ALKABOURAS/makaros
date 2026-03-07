const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { isLoggedIn, isStaff } = require('../middleware/auth');
const upload = require('../config/multerLessons');

// Προστατευμένα routes: Μόνο για συνδεδεμένους Καθηγητές/Admins
router.get('/create', isLoggedIn, isStaff, lessonController.getCreatePage);
router.post('/create', isLoggedIn, isStaff, upload.single('banner'), lessonController.postCreateLesson);

module.exports = router;