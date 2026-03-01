const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { translateAudio, translateTextOnly, getLanguages, generateTranslationPdf } = require('../controllers/translateController');

// Multer config for audio uploads — same as voiceRoutes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `translate_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac',
      'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
      'audio/amr', 'audio/3gpp', 'audio/3gpp2',
      'video/webm', 'video/mp4', 'video/ogg',
      'application/octet-stream',
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio/video files are accepted.'), false);
    }
  },
});

// Audio -> Whisper transcription -> Helsinki-NLP translation
router.post('/audio', protect, upload.single('audio'), translateAudio);

// Text-only translation
router.post('/text', protect, translateTextOnly);

// Generate translation PDF report
router.post('/generate-pdf', protect, generateTranslationPdf);

// Get supported languages
router.get('/languages', protect, getLanguages);

module.exports = router;
