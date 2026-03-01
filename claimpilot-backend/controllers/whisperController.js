const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// HuggingFace Inference API for Whisper Large V3
const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3';
const HF_TOKEN = process.env.HF_TOKEN;

const LANGUAGE_MAP = {
  'en-IN': 'english',
  'en-US': 'english',
  'hi-IN': 'hindi',
  'ta-IN': 'tamil',
  'te-IN': 'telugu',
  'bn-IN': 'bengali',
  'mr-IN': 'marathi',
  'kn-IN': 'kannada',
  'ml-IN': 'malayalam',
  'gu-IN': 'gujarati',
  'pa-IN': 'punjabi',
  'or-IN': 'hindi',   // Odia — fallback to Hindi
  'ur-IN': 'urdu',
};

const LANGUAGE_LABELS = {
  'en-IN': 'English (India)',
  'en-US': 'English (US)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'bn-IN': 'Bengali',
  'mr-IN': 'Marathi',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'gu-IN': 'Gujarati',
  'pa-IN': 'Punjabi',
  'or-IN': 'Odia',
  'ur-IN': 'Urdu',
};

/**
 * Convert any audio file to FLAC using ffmpeg for optimal HF API compatibility.
 * FLAC is lossless and well-supported by Whisper.
 * Returns the path to the converted file.
 */
function convertToFlac(inputPath) {
  const flacPath = inputPath.replace(/\.[^.]+$/, '') + '_converted.flac';

  try {
    execFileSync('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-ar', '16000',      // 16kHz sample rate (Whisper optimal)
      '-ac', '1',           // mono
      '-c:a', 'flac',       // FLAC codec
      flacPath,
    ], { stdio: 'pipe', timeout: 120000 });

    console.log(`[Whisper] Audio converted to FLAC: ${flacPath}`);
    return flacPath;
  } catch (err) {
    console.error('[Whisper] ffmpeg conversion failed:', err.message);
    // If conversion fails, try sending the original file
    return null;
  }
}

/**
 * POST /api/voice/transcribe
 * Accepts: multipart/form-data with 'audio' file + 'language' field
 * Returns: { text, language, wordCount, charCount }
 * 
 * Sends audio to HuggingFace Inference API (Whisper Large V3)
 */
exports.transcribeAudio = async (req, res) => {
  let flacPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded.' });
    }

    if (!HF_TOKEN) {
      return res.status(500).json({ message: 'HF_TOKEN not configured on server.' });
    }

    const language = req.body.language || 'en-US';
    const langLabel = LANGUAGE_LABELS[language] || language;

    console.log(`[Whisper] Transcribing audio via HF API: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB) | Language: ${langLabel}`);

    const audioPath = req.file.path;

    // Convert to FLAC for best compatibility
    flacPath = convertToFlac(audioPath);
    const fileToSend = flacPath || audioPath;
    const audioBuffer = fs.readFileSync(fileToSend);

    console.log(`[Whisper] Sending ${(audioBuffer.length / 1024).toFixed(1)}KB to HF Inference API...`);

    // Send raw audio bytes to HF Inference API
    // The HF Inference API for ASR accepts raw audio binary with Content-Type
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'audio/flac',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Whisper] HF API error (${response.status}):`, errorBody);

      // Handle model loading (503)
      if (response.status === 503) {
        return res.status(503).json({
          message: 'Whisper model is loading on HuggingFace servers. Please try again in 20-30 seconds.',
          loading: true,
        });
      }

      throw new Error(`HF API returned ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    const transcribedText = (result.text || '').trim();

    console.log(`[Whisper] Transcription complete: ${transcribedText.length} chars, ${transcribedText.split(/\s+/).filter(Boolean).length} words`);

    // Clean up files
    try { fs.unlinkSync(audioPath); } catch {}
    if (flacPath) { try { fs.unlinkSync(flacPath); } catch {} }

    res.json({
      text: transcribedText,
      language: langLabel,
      languageCode: language,
      wordCount: transcribedText.split(/\s+/).filter(Boolean).length,
      charCount: transcribedText.length,
    });
  } catch (error) {
    console.error('[Whisper] Transcription error:', error);

    // Clean up files on error
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    if (flacPath) { try { fs.unlinkSync(flacPath); } catch {} }

    res.status(500).json({
      message: 'Transcription failed. ' + (error.message || 'Unknown error.'),
    });
  }
};

/**
 * GET /api/voice/model-status
 * Returns status info for the HF Inference API model
 */
exports.getModelStatus = async (req, res) => {
  res.json({
    loaded: true,
    loading: false,
    model: 'openai/whisper-large-v3',
    provider: 'HuggingFace Inference API',
    supportedLanguages: Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({
      code,
      label,
      whisperLang: LANGUAGE_MAP[code],
    })),
  });
};

/**
 * POST /api/voice/preload-model
 * Not needed for HF Inference API — model runs on HF servers
 */
exports.preloadModel = async (req, res) => {
  res.json({
    message: 'Using HuggingFace Inference API — no local model to preload. Whisper Large V3 runs on HF servers.',
    loaded: true,
  });
};
