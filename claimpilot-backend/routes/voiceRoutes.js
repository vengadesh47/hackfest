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
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max for audio
  fileFilter: (req, file, cb) => {
    // Accept common audio/video formats that ffmpeg can handle
    const allowedMimes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
      'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-flac',
      'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
      'audio/amr', 'audio/3gpp', 'audio/3gpp2',
      'video/webm', 'video/mp4', 'video/ogg',
      'application/octet-stream', // fallback for unknown mime
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio/video files are accepted. Supported: MP3, WAV, WebM, OGG, FLAC, M4A, MP4, AAC'), false);
    }
  },
});

// Generate structured medical PDF from transcribed text
router.post('/generate-document', protect, generateDocument);

// Whisper transcription via HuggingFace Inference API (Whisper Large V3)
router.post('/transcribe', protect, upload.single('audio'), transcribeAudio);
router.get('/model-status', protect, getModelStatus);
router.post('/preload-model', protect, preloadModel);

module.exports = router;
