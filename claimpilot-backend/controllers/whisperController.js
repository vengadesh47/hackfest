const { pipeline } = require('@huggingface/transformers');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { WaveFile } = require('wavefile');

// Cache the pipeline so the model only loads once
let transcriber = null;
let modelLoading = false;
let modelLoadPromise = null;

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
  'or-IN': 'hindi',   // Odia not directly supported by Whisper — fallback to Hindi
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
 * Load the Whisper model (lazy, singleton).
 * Uses whisper-small for better multilingual accuracy.
 */
async function getTranscriber() {
  if (transcriber) return transcriber;

  if (modelLoading && modelLoadPromise) {
    return modelLoadPromise;
  }

  modelLoading = true;
  console.log('[Whisper] Loading model: Xenova/whisper-small ... (first time may take 1-2 min to download ~460MB)');

  modelLoadPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
    dtype: 'q8',  // quantized for faster inference
  }).then((pipe) => {
    transcriber = pipe;
    modelLoading = false;
    console.log('[Whisper] Model loaded successfully.');
    return transcriber;
  }).catch((err) => {
    modelLoading = false;
    modelLoadPromise = null;
    console.error('[Whisper] Model load failed:', err);
    throw err;
  });

  return modelLoadPromise;
}

/**
 * Convert any audio file to 16kHz mono WAV using ffmpeg,
 * then read it as Float32Array for Whisper.
 */
function audioFileToFloat32(inputPath) {
  // Output path: same location but .wav extension
  const wavPath = inputPath.replace(/\.[^.]+$/, '') + '_converted.wav';

  // Use ffmpeg to convert to 16kHz mono 16-bit PCM WAV
  execFileSync('ffmpeg', [
    '-y',              // overwrite output
    '-i', inputPath,   // input file (webm, mp3, ogg, etc.)
    '-ar', '16000',    // 16kHz sample rate (Whisper expects this)
    '-ac', '1',        // mono
    '-c:a', 'pcm_s16le', // 16-bit signed little-endian PCM
    '-f', 'wav',       // WAV format
    wavPath,
  ], { stdio: 'pipe', timeout: 60000 });

  // Read the WAV file and extract Float32Array samples
  const wavBuffer = fs.readFileSync(wavPath);
  const wav = new WaveFile(wavBuffer);

  // Convert to 32-bit float samples normalized to [-1, 1]
  const samples = wav.getSamples(false, Float32Array);

  // Clean up the converted WAV file
  try { fs.unlinkSync(wavPath); } catch {}

  console.log(`[Whisper] Audio converted: ${samples.length} samples (${(samples.length / 16000).toFixed(1)}s at 16kHz)`);

  return samples;
}

/**
 * POST /api/voice/transcribe
 * Accepts: multipart/form-data with 'audio' file + 'language' field
 * Returns: { text, language, wordCount, charCount }
 */
exports.transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded.' });
    }

    const language = req.body.language || 'en-IN';
    const whisperLang = LANGUAGE_MAP[language] || 'english';
    const langLabel = LANGUAGE_LABELS[language] || language;

    console.log(`[Whisper] Transcribing audio: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB) | Language: ${langLabel}`);

    // Get or load the model
    const pipe = await getTranscriber();

    // Convert uploaded audio (webm/mp3/ogg/etc) to Float32Array via ffmpeg + wavefile
    const audioPath = req.file.path;
    const float32Audio = audioFileToFloat32(audioPath);

    // Clean up original uploaded file
    try { fs.unlinkSync(audioPath); } catch {}

    // Run Whisper transcription with Float32Array input
    const result = await pipe(float32Audio, {
      language: whisperLang,
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: false,
    });

    const transcribedText = result.text?.trim() || '';

    console.log(`[Whisper] Transcription complete: ${transcribedText.length} chars, ${transcribedText.split(/\s+/).filter(Boolean).length} words`);

    res.json({
      text: transcribedText,
      language: langLabel,
      languageCode: language,
      wordCount: transcribedText.split(/\s+/).filter(Boolean).length,
      charCount: transcribedText.length,
    });
  } catch (error) {
    console.error('[Whisper] Transcription error:', error);

    // Clean up file on error
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.status(500).json({
      message: 'Transcription failed. ' + (error.message || 'Unknown error.'),
    });
  }
};

/**
 * GET /api/voice/model-status
 * Returns whether the Whisper model is loaded, loading, or not loaded
 */
exports.getModelStatus = async (req, res) => {
  res.json({
    loaded: !!transcriber,
    loading: modelLoading,
    model: 'Xenova/whisper-small',
    supportedLanguages: Object.entries(LANGUAGE_LABELS).map(([code, label]) => ({
      code,
      label,
      whisperLang: LANGUAGE_MAP[code],
    })),
  });
};

/**
 * POST /api/voice/preload-model
 * Triggers model download/load in the background
 */
exports.preloadModel = async (req, res) => {
  try {
    if (transcriber) {
      return res.json({ message: 'Model already loaded.', loaded: true });
    }
    if (modelLoading) {
      return res.json({ message: 'Model is currently loading...', loading: true });
    }

    // Start loading in background
    getTranscriber().catch(() => {});

    res.json({ message: 'Model loading started. This may take 1-2 minutes on first run.', loading: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start model loading.' });
  }
};
