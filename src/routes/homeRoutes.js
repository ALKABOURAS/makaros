const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const { isLoggedIn, isStaff } = require('../middleware/auth');

router.get('/', isLoggedIn, homeController.getHome);


module.exports = router;