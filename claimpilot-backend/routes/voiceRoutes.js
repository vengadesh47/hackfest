const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/authMiddleware');
const { generateDocument } = require('../controllers/voiceController');
const { transcribeAudio, getModelStatus, preloadModel } = require('../controllers/whisperController');

// Multer config for audio uploads — store in uploads/ as temp files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for audio
  fileFilter: (req, file, cb) => {
    // Accept common audio formats
    // Be lenient — accept anything starting with audio/ or video/webm
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are accepted.'), false);
    }
  },
});

// Generate structured medical PDF from transcribed text
router.post('/generate-document', protect, generateDocument);

// Whisper transcription endpoints
router.post('/transcribe', protect, upload.single('audio'), transcribeAudio);
router.get('/model-status', protect, getModelStatus);
router.post('/preload-model', protect, preloadModel);

module.exports = router;
