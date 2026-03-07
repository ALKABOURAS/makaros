const express = require('express');
const router = express.Router();

const homeRoutes = require('./homeRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const lessonRoutes = require('./lessonRoutes');

router.use('/', homeRoutes);      // Διαχειρίζεται το /
router.use('/auth', authRoutes);  // Διαχειρίζεται το /auth/login, /auth/signup

router.use('/profile', userRoutes); // Διαχειρίζεται το /profile και τα υπο-μονοπάτια του, π.χ. /profile/update

router.use('/lessons', lessonRoutes); // Διαχειρίζεται το /lessons και τα υπο-μονοπάτια του, π.χ. /lessons/create

module.exports = router;