const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const PDFDocument = require('pdfkit');

const HF_TOKEN = process.env.HF_TOKEN;

// ---- Font paths for multi-script PDF rendering ----
const FONTS_DIR = path.join(__dirname, '..', 'fonts');

// Map language codes to their Noto Sans font files
const LANG_FONT_MAP = {
  ta: path.join(FONTS_DIR, 'NotoSansTamil-Regular.ttf'),
  hi: path.join(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf'),
  mr: path.join(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf'),
  te: path.join(FONTS_DIR, 'NotoSansTelugu-Regular.ttf'),
  kn: path.join(FONTS_DIR, 'NotoSansKannada-Regular.ttf'),
  ml: path.join(FONTS_DIR, 'NotoSansMalayalam-Regular.ttf'),
  bn: path.join(FONTS_DIR, 'NotoSansBengali-Regular.ttf'),
  gu: path.join(FONTS_DIR, 'NotoSansGujarati-Regular.ttf'),
  pa: path.join(FONTS_DIR, 'NotoSansGurmukhi-Regular.ttf'),
  or: path.join(FONTS_DIR, 'NotoSansDevanagari-Regular.ttf'),
  ur: path.join(FONTS_DIR, 'NotoSansArabic-Regular.ttf'),
  ar: path.join(FONTS_DIR, 'NotoSansArabic-Regular.ttf'),
};

// Default Latin font (covers English, French, German, Spanish, etc.)
const LATIN_FONT = path.join(FONTS_DIR, 'NotoSans-Regular.ttf');
const LATIN_FONT_BOLD = path.join(FONTS_DIR, 'NotoSans-Bold.ttf');

/**
 * Get the correct font path for a language code.
 * Falls back to Latin Noto Sans if no specific font is found.
 */
function getFontForLang(langCode) {
  return LANG_FONT_MAP[langCode] || LATIN_FONT;
}

// Helsinki-NLP Opus-MT model mapping
// Format: source-target -> model name
// Using the HF Inference API router
// API pattern: POST https://router.huggingface.co/hf-inference/models/{modelName}
//   headers: { Authorization: Bearer <HF_TOKEN>, Content-Type: application/json }
//   body: { inputs: "text to translate" }
//   response: [{ translation_text: "translated text" }]
const TRANSLATION_MODELS = {
  // English -> European languages
  'en-fr': 'Helsinki-NLP/opus-mt-en-fr',
  'en-de': 'Helsinki-NLP/opus-mt-en-de',
  'en-es': 'Helsinki-NLP/opus-mt-en-es',
  'en-it': 'Helsinki-NLP/opus-mt-en-it',
  'en-pt': 'Helsinki-NLP/opus-mt-en-pt',
  'en-nl': 'Helsinki-NLP/opus-mt-en-nl',
  'en-ru': 'Helsinki-NLP/opus-mt-en-ru',
  'en-zh': 'Helsinki-NLP/opus-mt-en-zh',
  'en-ja': 'Helsinki-NLP/opus-mt-en-jap',
  'en-ar': 'Helsinki-NLP/opus-mt-en-ar',
  'en-hi': 'Helsinki-NLP/opus-mt-en-hi',
  'en-tr': 'Helsinki-NLP/opus-mt-tc-big-en-tr',
  'en-ko': 'Helsinki-NLP/opus-mt-tc-big-en-ko',
  'en-vi': 'Helsinki-NLP/opus-mt-en-vi',
  'en-sv': 'Helsinki-NLP/opus-mt-en-sv',
  'en-pl': 'Helsinki-NLP/opus-mt-en-pl',
  'en-fi': 'Helsinki-NLP/opus-mt-en-fi',
  'en-da': 'Helsinki-NLP/opus-mt-en-da',
  'en-ro': 'Helsinki-NLP/opus-mt-en-ro',
  'en-uk': 'Helsinki-NLP/opus-mt-en-uk',
  'en-cs': 'Helsinki-NLP/opus-mt-en-cs',
  'en-el': 'Helsinki-NLP/opus-mt-en-el',
  'en-he': 'Helsinki-NLP/opus-mt-en-he',
  'en-bg': 'Helsinki-NLP/opus-mt-en-bg',
  'en-hu': 'Helsinki-NLP/opus-mt-en-hu',
  // English -> Dravidian languages (Tamil, Kannada, Malayalam, Telugu)
  'en-ta': 'Helsinki-NLP/opus-mt-en-dra',
  'en-kn': 'Helsinki-NLP/opus-mt-en-dra',
  'en-ml': 'Helsinki-NLP/opus-mt-en-dra',
  'en-te': 'Helsinki-NLP/opus-mt-en-dra',
  // English -> Urdu (direct model, tested working)
  'en-ur': 'Helsinki-NLP/opus-mt-en-ur',
  // NOTE: en-bn, en-or, en-gu, en-mr, en-pa all return 404 on HF Inference API
  // en-inc also returns 404. No working model for English -> these Indic languages.
  // These languages are still supported as SOURCE (any -> English via mul-en).
  // Reverse: European languages -> English
  'fr-en': 'Helsinki-NLP/opus-mt-fr-en',
  'de-en': 'Helsinki-NLP/opus-mt-de-en',
  'es-en': 'Helsinki-NLP/opus-mt-es-en',
  'it-en': 'Helsinki-NLP/opus-mt-it-en',
  'pt-en': 'Helsinki-NLP/opus-mt-pt-en',
  'nl-en': 'Helsinki-NLP/opus-mt-nl-en',
  'ru-en': 'Helsinki-NLP/opus-mt-ru-en',
  'zh-en': 'Helsinki-NLP/opus-mt-zh-en',
  'ja-en': 'Helsinki-NLP/opus-mt-jap-en',
  'ar-en': 'Helsinki-NLP/opus-mt-ar-en',
  'hi-en': 'Helsinki-NLP/opus-mt-hi-en',
  'tr-en': 'Helsinki-NLP/opus-mt-tr-en',
  'ko-en': 'Helsinki-NLP/opus-mt-ko-en',
  'vi-en': 'Helsinki-NLP/opus-mt-vi-en',
  'sv-en': 'Helsinki-NLP/opus-mt-sv-en',
  'pl-en': 'Helsinki-NLP/opus-mt-pl-en',
  'fi-en': 'Helsinki-NLP/opus-mt-fi-en',
  'da-en': 'Helsinki-NLP/opus-mt-da-en',
  'ro-en': 'Helsinki-NLP/opus-mt-ro-en',
  'uk-en': 'Helsinki-NLP/opus-mt-uk-en',
  'cs-en': 'Helsinki-NLP/opus-mt-cs-en',
  'el-en': 'Helsinki-NLP/opus-mt-el-en',
  'he-en': 'Helsinki-NLP/opus-mt-he-en',
  'bg-en': 'Helsinki-NLP/opus-mt-bg-en',
  'hu-en': 'Helsinki-NLP/opus-mt-hu-en',
  // Reverse: Dravidian languages -> English (Tamil, Kannada, Malayalam, Telugu)
  // NOTE: opus-mt-dra-en returns 404 on HF Inference API, so we use mul-en (tested working)
  'ta-en': 'Helsinki-NLP/opus-mt-mul-en',
  'kn-en': 'Helsinki-NLP/opus-mt-mul-en',
  'ml-en': 'Helsinki-NLP/opus-mt-mul-en',
  'te-en': 'Helsinki-NLP/opus-mt-mul-en',
  // Reverse: Indic languages -> English (Bengali, Odia, Gujarati, Marathi, Urdu, Punjabi)
  // NOTE: opus-mt-inc-en returns 404 on HF Inference API, so we use mul-en (tested working)
  'bn-en': 'Helsinki-NLP/opus-mt-mul-en',
  'or-en': 'Helsinki-NLP/opus-mt-mul-en',
  'gu-en': 'Helsinki-NLP/opus-mt-mul-en',
  'mr-en': 'Helsinki-NLP/opus-mt-mul-en',
  'ur-en': 'Helsinki-NLP/opus-mt-mul-en',
  'pa-en': 'Helsinki-NLP/opus-mt-mul-en',
  // Multi-language to English (fallback)
  'mul-en': 'Helsinki-NLP/opus-mt-mul-en',
};

// Whisper language code to ISO 639-1 mapping for translation
const WHISPER_LANG_TO_ISO = {
  'en-US': 'en', 'en-IN': 'en',
  'hi-IN': 'hi', 'ta-IN': 'ta', 'te-IN': 'te',
  'bn-IN': 'bn', 'mr-IN': 'mr', 'kn-IN': 'kn',
  'ml-IN': 'ml', 'gu-IN': 'gu', 'pa-IN': 'pa',
  'or-IN': 'or', 'ur-IN': 'ur',
  'fr': 'fr', 'de': 'de', 'es': 'es', 'it': 'it',
  'pt': 'pt', 'nl': 'nl', 'ru': 'ru', 'zh': 'zh',
  'ja': 'ja', 'ar': 'ar', 'ko': 'ko', 'tr': 'tr',
  'vi': 'vi', 'th': 'th', 'sv': 'sv', 'pl': 'pl',
  'fi': 'fi', 'da': 'da', 'ro': 'ro', 'uk': 'uk',
  'cs': 'cs', 'el': 'el', 'he': 'he', 'bg': 'bg',
  'hu': 'hu',
};

const WHISPER_API_URL = 'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3';

/**
 * Convert audio to FLAC via ffmpeg
 */
function convertToFlac(inputPath) {
  const flacPath = inputPath.replace(/\.[^.]+$/, '') + '_converted.flac';
  try {
    execFileSync('ffmpeg', [
      '-y', '-i', inputPath,
      '-ar', '16000', '-ac', '1', '-c:a', 'flac',
      flacPath,
    ], { stdio: 'pipe', timeout: 120000 });
    return flacPath;
  } catch (err) {
    console.error('[Translate] ffmpeg conversion failed:', err.message);
    return null;
  }
}

/**
 * Call HF Inference API for translation using Helsinki-NLP Opus-MT
 */
async function translateText(text, sourceLang, targetLang) {
  const pair = `${sourceLang}-${targetLang}`;
  let modelName = TRANSLATION_MODELS[pair];

  // Fallback: if no direct pair, try via English as pivot
  // e.g., hi -> fr  =  hi -> en, then en -> fr
  if (!modelName && sourceLang !== 'en' && targetLang !== 'en') {
    console.log(`[Translate] No direct model for ${pair}, using English pivot`);
    // First translate source -> English
    const toEnModel = TRANSLATION_MODELS[`${sourceLang}-en`] || TRANSLATION_MODELS['mul-en'];
    if (!toEnModel) throw new Error(`No translation model available for ${sourceLang} -> en`);

    const englishText = await callTranslationAPI(text, toEnModel);

    // Then translate English -> target
    const fromEnModel = TRANSLATION_MODELS[`en-${targetLang}`];
    if (!fromEnModel) throw new Error(`No translation model available for en -> ${targetLang}`);

    return await callTranslationAPI(englishText, fromEnModel);
  }

  // Fallback to mul-en for unknown source -> English
  if (!modelName && targetLang === 'en') {
    modelName = TRANSLATION_MODELS['mul-en'];
  }

  if (!modelName) {
    throw new Error(`No translation model available for ${sourceLang} -> ${targetLang}. Try translating to/from English.`);
  }

  return await callTranslationAPI(text, modelName);
}

/**
 * Call a specific Helsinki-NLP model via HF Inference API
 */
async function callTranslationAPI(text, modelName) {
  const apiUrl = `https://router.huggingface.co/hf-inference/models/${modelName}`;

  console.log(`[Translate] Calling ${modelName} with ${text.length} chars...`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Translate] HF API error (${response.status}):`, errorBody);

    if (response.status === 503) {
      throw new Error('Translation model is loading on HuggingFace servers. Please try again in 20-30 seconds.');
    }
    throw new Error(`Translation API returned ${response.status}: ${errorBody}`);
  }

  const result = await response.json();

  // HF translation returns [{translation_text: "..."}]
  if (Array.isArray(result) && result[0]?.translation_text) {
    return result[0].translation_text;
  }
  // Sometimes returns {translation_text: "..."}
  if (result.translation_text) {
    return result.translation_text;
  }

  console.error('[Translate] Unexpected response format:', result);
  throw new Error('Unexpected response from translation API');
}

/**
 * POST /api/translate/audio
 * Full pipeline: Audio -> Whisper transcription -> Helsinki-NLP translation
 * Accepts: multipart/form-data with 'audio' file + 'sourceLang' + 'targetLang'
 */
exports.translateAudio = async (req, res) => {
  let flacPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded.' });
    }
    if (!HF_TOKEN) {
      return res.status(500).json({ message: 'HF_TOKEN not configured on server.' });
    }

    const sourceLangCode = req.body.sourceLang || 'en-US';
    const targetLangCode = req.body.targetLang || 'fr';

    // Map to ISO codes for translation
    const sourceISO = WHISPER_LANG_TO_ISO[sourceLangCode] || sourceLangCode.split('-')[0];
    const targetISO = WHISPER_LANG_TO_ISO[targetLangCode] || targetLangCode.split('-')[0];

    console.log(`[Translate] Pipeline: Audio (${sourceLangCode}) -> Whisper -> ${sourceISO} text -> ${targetISO} text`);

    // Step 1: Convert audio to FLAC
    const audioPath = req.file.path;
    flacPath = convertToFlac(audioPath);
    const fileToSend = flacPath || audioPath;
    const audioBuffer = fs.readFileSync(fileToSend);

    console.log(`[Translate] Step 1: Sending ${(audioBuffer.length / 1024).toFixed(1)}KB to Whisper...`);

    // Step 2: Transcribe with Whisper
    const whisperResponse = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`,
        'Content-Type': 'audio/flac',
      },
      body: audioBuffer,
    });

    if (!whisperResponse.ok) {
      const errBody = await whisperResponse.text();
      if (whisperResponse.status === 503) {
        return res.status(503).json({
          message: 'Whisper model is loading. Please try again in 20-30 seconds.',
          loading: true,
        });
      }
      throw new Error(`Whisper API error (${whisperResponse.status}): ${errBody}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcribedText = (whisperResult.text || '').trim();

    if (!transcribedText) {
      // Cleanup
      try { fs.unlinkSync(audioPath); } catch {}
      if (flacPath) { try { fs.unlinkSync(flacPath); } catch {} }
      return res.status(400).json({ message: 'No speech detected in the audio.' });
    }

    console.log(`[Translate] Step 2: Transcribed ${transcribedText.length} chars. Now translating ${sourceISO} -> ${targetISO}...`);

    // Step 3: Translate text
    let translatedText;
    if (sourceISO === targetISO) {
      // Same language, no translation needed
      translatedText = transcribedText;
    } else {
      translatedText = await translateText(transcribedText, sourceISO, targetISO);
    }

    console.log(`[Translate] Step 3: Translation complete. ${translatedText.length} chars.`);

    // Cleanup files
    try { fs.unlinkSync(audioPath); } catch {}
    if (flacPath) { try { fs.unlinkSync(flacPath); } catch {} }

    res.json({
      originalText: transcribedText,
      translatedText: translatedText,
      sourceLang: sourceISO,
      targetLang: targetISO,
      originalWordCount: transcribedText.split(/\s+/).filter(Boolean).length,
      translatedWordCount: translatedText.split(/\s+/).filter(Boolean).length,
    });

  } catch (error) {
    console.error('[Translate] Pipeline error:', error);

    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch {} }
    if (flacPath) { try { fs.unlinkSync(flacPath); } catch {} }

    const status = error.message?.includes('loading') ? 503 : 500;
    res.status(status).json({
      message: error.message || 'Translation pipeline failed.',
    });
  }
};

/**
 * POST /api/translate/text
 * Text-only translation (no audio): Helsinki-NLP Opus-MT
 * Accepts JSON: { text, sourceLang, targetLang }
 */
exports.translateTextOnly = async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text is required.' });
    }
    if (!HF_TOKEN) {
      return res.status(500).json({ message: 'HF_TOKEN not configured on server.' });
    }

    const sourceISO = WHISPER_LANG_TO_ISO[sourceLang] || (sourceLang || 'en').split('-')[0];
    const targetISO = WHISPER_LANG_TO_ISO[targetLang] || (targetLang || 'fr').split('-')[0];

    console.log(`[Translate] Text-only: ${sourceISO} -> ${targetISO}, ${text.length} chars`);

    let translatedText;
    if (sourceISO === targetISO) {
      translatedText = text;
    } else {
      translatedText = await translateText(text, sourceISO, targetISO);
    }

    res.json({
      originalText: text,
      translatedText: translatedText,
      sourceLang: sourceISO,
      targetLang: targetISO,
      translatedWordCount: translatedText.split(/\s+/).filter(Boolean).length,
    });

  } catch (error) {
    console.error('[Translate] Text translation error:', error);
    const status = error.message?.includes('loading') ? 503 : 500;
    res.status(status).json({
      message: error.message || 'Translation failed.',
    });
  }
};

/**
 * GET /api/translate/languages
 * Returns available translation language pairs
 */
exports.getLanguages = async (req, res) => {
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'es', label: 'Spanish' },
    { code: 'it', label: 'Italian' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'nl', label: 'Dutch' },
    { code: 'ru', label: 'Russian' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ar', label: 'Arabic' },
    { code: 'hi', label: 'Hindi' },
    { code: 'ta', label: 'Tamil' },
    { code: 'te', label: 'Telugu' },
    { code: 'kn', label: 'Kannada' },
    { code: 'ml', label: 'Malayalam' },
    { code: 'ur', label: 'Urdu' },
    { code: 'ko', label: 'Korean' },
    { code: 'tr', label: 'Turkish' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'sv', label: 'Swedish' },
    { code: 'pl', label: 'Polish' },
    { code: 'fi', label: 'Finnish' },
    { code: 'da', label: 'Danish' },
    { code: 'ro', label: 'Romanian' },
    { code: 'uk', label: 'Ukrainian' },
    { code: 'cs', label: 'Czech' },
    { code: 'el', label: 'Greek' },
    { code: 'he', label: 'Hebrew' },
    { code: 'bg', label: 'Bulgarian' },
    { code: 'hu', label: 'Hungarian' },
  ];

  res.json({
    languages,
    model: 'Helsinki-NLP/opus-mt',
    provider: 'HuggingFace Inference API',
    note: 'Translation between non-English pairs uses English as a pivot language.',
  });
};

// Language code -> label mapping for PDF
const LANG_LABELS = {
  en: 'English', fr: 'French', de: 'German', es: 'Spanish', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', ru: 'Russian', zh: 'Chinese', ja: 'Japanese',
  ar: 'Arabic', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada',
  ml: 'Malayalam', ur: 'Urdu', ko: 'Korean', tr: 'Turkish', vi: 'Vietnamese',
  sv: 'Swedish', pl: 'Polish', fi: 'Finnish', da: 'Danish', ro: 'Romanian',
  uk: 'Ukrainian', cs: 'Czech', el: 'Greek', he: 'Hebrew', bg: 'Bulgarian',
  hu: 'Hungarian', bn: 'Bengali', mr: 'Marathi', gu: 'Gujarati', pa: 'Punjabi',
  or: 'Odia',
};

/**
 * Draw the branded ClaimPilot header on the current page.
 * Uses embedded Noto Sans fonts for proper rendering.
 */
function drawHeader(doc, dateStr, timeStr, subtitle) {
  doc.rect(0, 0, 595, 100).fill('#0F3D3E');
  doc.rect(0, 90, 595, 10).fill('#D9C27A');

  doc.font('NotoSansBold').fontSize(24).fillColor('#FFFFFF')
    .text('ClaimPilot', 60, 25);
  doc.font('NotoSans').fontSize(9).fillColor('#D9C27A')
    .text('Enterprise TPA Platform', 60, 52);

  doc.font('NotoSans').fontSize(8).fillColor('#FFFFFF')
    .text(`Generated: ${dateStr}`, 350, 28, { align: 'right', width: 185 });
  doc.text(`Time: ${timeStr}`, 350, 40, { align: 'right', width: 185 });
  if (subtitle) {
    doc.text(subtitle, 350, 52, { align: 'right', width: 185 });
  }
}

/**
 * POST /api/translate/generate-pdf
 * Generate a branded PDF containing ONLY the translated text.
 * Uses language-specific Noto Sans fonts for proper rendering of Tamil, Hindi, etc.
 */
exports.generateTranslationPdf = async (req, res) => {
  try {
    const { translatedText, sourceLang, targetLang } = req.body;

    if (!translatedText || !translatedText.trim()) {
      return res.status(400).json({ message: 'No translated text provided for PDF generation.' });
    }

    const srcLabel = LANG_LABELS[sourceLang] || sourceLang || 'Source';
    const tgtLabel = LANG_LABELS[targetLang] || targetLang || 'Target';
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const tgtFontPath = getFontForLang(targetLang);

    console.log(`[PDF] Translation only: ${srcLabel} -> ${tgtLabel}, font: ${path.basename(tgtFontPath)}`);

    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 60, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `ClaimPilot - Translation (${srcLabel} to ${tgtLabel})`,
        Author: 'ClaimPilot Enterprise',
        Subject: 'Translation Document',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ClaimPilot_Translation_${Date.now()}.pdf`);
    doc.pipe(res);

    doc.registerFont('NotoSans', LATIN_FONT);
    doc.registerFont('NotoSansBold', LATIN_FONT_BOLD);
    doc.registerFont('TgtFont', tgtFontPath);

    drawHeader(doc, dateStr, timeStr, `${srcLabel} → ${tgtLabel}`);

    let y = 120;
    doc.font('NotoSansBold').fontSize(18).fillColor('#0F3D3E')
      .text('Translation', 60, y);
    y += 28;

    doc.font('NotoSans').fontSize(10).fillColor('#94A3B8')
      .text(`(${tgtLabel})`, 60, y);
    y += 20;

    doc.moveTo(60, y).lineTo(535, y).lineWidth(1).strokeColor('#E2E8F0').stroke();
    y += 15;

    doc.font('TgtFont').fontSize(11).fillColor('#334155')
      .text(translatedText, 60, y, { width: 475, lineGap: 5 });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.moveTo(60, 780).lineTo(535, 780).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
      doc.font('NotoSans').fontSize(7).fillColor('#94A3B8')
        .text('ClaimPilot Enterprise TPA Platform | Confidential Document', 60, 788, { width: 375 });
      doc.text(`Page ${i + 1} of ${pages.count}`, 400, 788, { align: 'right', width: 135 });
    }

    doc.end();
  } catch (error) {
    console.error('[Translate] PDF generation error:', error);
    res.status(500).json({ message: 'Failed to generate translation PDF.' });
  }
};
