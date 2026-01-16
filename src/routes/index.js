const express = require('express');
const router = express.Router();

const homeRoutes = require('./homeRoutes');
const authRoutes = require('./authRoutes');

router.use('/', homeRoutes);      // Διαχειρίζεται το /
router.use('/auth', authRoutes);  // Διαχειρίζεται το /auth/login, /auth/signup

module.exports = router;