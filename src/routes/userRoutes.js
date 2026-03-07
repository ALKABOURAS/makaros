const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isLoggedIn } = require('../middleware/auth');
const upload = require('../config/multer');

router.get('/', isLoggedIn, userController.getProfile);
router.post('/update', isLoggedIn, upload.single('avatar'), userController.updateProfile);

module.exports = router;