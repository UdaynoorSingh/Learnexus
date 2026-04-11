const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const requireVerified = require('../middleware/verified');
const { uploadNote, getNote, unlockNote } = require('../controllers/noteController');

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'learnexus_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'webp']
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and PDFs are allowed.'));
  }
});

router.post('/upload', auth, requireVerified, upload.single('file'), uploadNote);
router.get('/:noteId', auth, requireVerified, getNote);
router.post('/:noteId/unlock', auth, requireVerified, unlockNote);

module.exports = router;
