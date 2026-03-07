const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/lessons/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadLesson = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Τα banners μπορεί να είναι μεγαλύτερα (5MB)
});

module.exports = uploadLesson;