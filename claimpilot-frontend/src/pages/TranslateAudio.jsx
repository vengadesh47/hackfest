import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Mic, Square, Download, FileText, Globe,
  RefreshCw, Copy, Check, Volume2, Trash2,
  Zap, Languages, Upload, FileAudio, X, Loader2,
  ArrowRight, Type,
} from 'lucide-react';

const WHISPER_LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'or-IN', label: 'Odia' },
  { code: 'ur-IN', label: 'Urdu' },
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

const TARGET_LANGUAGES = [
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

const ACCEPTED_AUDIO_TYPES = '.mp3,.wav,.webm,.ogg,.flac,.m4a,.mp4,.aac,.amr,.3gp';

const TranslateAudio = () => {
  // Mode: 'audio' or 'text'
  const [mode, setMode] = useState('audio');

  // Language selections
  const [sourceLang, setSourceLang] = useState('en-US');
  const [targetLang, setTargetLang] = useState('fr');

  // Text state
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [textInput, setTextInput] = useState('');

  // Loading states
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Copy states
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);

  // Audio file upload state
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const { addToast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  // --- FILE UPLOAD ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      addToast('File too large. Maximum size is 100MB.', 'error');
      return;
    }
    setAudioFile(file);
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(file));
    addToast(`Audio file loaded: ${file.name}`, 'success');
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      if (file.size > 100 * 1024 * 1024) {
        addToast('File too large. Maximum size is 100MB.', 'error');
        return;
      }
      setAudioFile(file);
      if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(URL.createObjectURL(file));
      addToast(`Audio file loaded: ${file.name}`, 'success');
    } else {
      addToast('Please drop an audio file (MP3, WAV, WebM, etc.)', 'error');
    }
  };

  const clearAudioFile = () => {
    setAudioFile(null);
    if (audioPreviewUrl) { URL.revokeObjectURL(audioPreviewUrl); setAudioPreviewUrl(null); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateLevel = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setAudioLevel(avg / 128);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch {}

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes('webm') ? '.webm' : '.mp4';
        const file = new File([blob], `translate_recording_${Date.now()}${ext}`, { type: mimeType });
        setAudioFile(file);
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        addToast(`Recording saved (${(blob.size / 1024).toFixed(0)}KB).`, 'success');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      addToast('Microphone access denied. Please allow mic permissions.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
    stopRecordingCleanup();
  };

  // --- TRANSLATE AUDIO ---
  const handleTranslateAudio = async () => {
    if (!audioFile) {
      addToast('Please upload or record an audio file first.', 'error');
      return;
    }

    setIsTranslating(true);
    setOriginalText('');
    setTranslatedText('');

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('sourceLang', sourceLang);
      formData.append('targetLang', targetLang);

      const response = await api.post('/translate/audio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000, // 10 min — transcription + translation
      });

      const { originalText: orig, translatedText: trans, sourceLang: src, targetLang: tgt } = response.data;
      setOriginalText(orig);
      setTranslatedText(trans);
      addToast(`Translation complete! ${src} -> ${tgt}`, 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Translation failed.';
      if (err.response?.status === 503) {
        addToast('Model is loading on HuggingFace. Please wait 20-30 seconds and try again.', 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // --- TRANSLATE TEXT ---
  const handleTranslateText = async () => {
    if (!textInput.trim()) {
      addToast('Please enter some text to translate.', 'error');
      return;
    }

    setIsTranslating(true);
    setOriginalText('');
    setTranslatedText('');

    try {
      const response = await api.post('/translate/text', {
        text: textInput,
        sourceLang: sourceLang,
        targetLang: targetLang,
      }, { timeout: 300000 });

      const { originalText: orig, translatedText: trans } = response.data;
      setOriginalText(orig);
      setTranslatedText(trans);
      addToast('Translation complete!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Translation failed.';
      if (err.response?.status === 503) {
        addToast('Model is loading on HuggingFace. Please wait 20-30 seconds and try again.', 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  // --- GENERATE PDF (merged: transcription + translation) ---
  const handleGeneratePdf = async () => {
    if (!translatedText) {
      addToast('No translated text to generate PDF from.', 'error');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const sourceISO = sourceLang.includes('-') ? sourceLang.split('-')[0] : sourceLang;

      const response = await api.post('/translate/generate-pdf', {
        translatedText: translatedText,
        sourceLang: sourceISO,
        targetLang: targetLang,
      }, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClaimPilot_Translation_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('PDF downloaded!', 'success');
    } catch {
      addToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // --- UTILS ---
  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(originalText);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2000);
    addToast('Original text copied!', 'success');
  };

  const handleCopyTranslated = () => {
    navigator.clipboard.writeText(translatedText);
    setCopiedTranslated(true);
    setTimeout(() => setCopiedTranslated(false), 2000);
    addToast('Translated text copied!', 'success');
  };

  const handleClearAll = () => {
    setOriginalText('');
    setTranslatedText('');
    setTextInput('');
    clearAudioFile();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getSourceLangLabel = () => WHISPER_LANGUAGES.find(l => l.code === sourceLang)?.label || sourceLang;
  const getTargetLangLabel = () => TARGET_LANGUAGES.find(l => l.code === targetLang)?.label || targetLang;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-extrabold text-[#0F3D3E]">Audio Translation</h1>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F3D3E]/10 text-[#0F3D3E]">
            HELSINKI-NLP OPUS-MT
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Upload or record audio, transcribe with Whisper V3, and translate to 26+ languages using Helsinki-NLP models
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Controls */}
        <div className="space-y-6">
          {/* Mode Toggle */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-[#0F3D3E]" /> Input Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('audio')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'audio'
                    ? 'bg-[#0F3D3E] text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Mic size={16} /> Audio
              </button>
              <button
                onClick={() => setMode('text')}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'text'
                    ? 'bg-[#0F3D3E] text-white shadow-md'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Type size={16} /> Text
              </button>
            </div>
          </motion.div>

          {/* Language Selection */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Languages size={16} className="text-[#0F3D3E]" /> Languages
            </h3>

            {/* Source Language */}
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">
              {mode === 'audio' ? 'Audio Language (Whisper)' : 'Source Language'}
            </label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              disabled={isTranslating}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all disabled:opacity-50 mb-3"
            >
              {(mode === 'audio' ? WHISPER_LANGUAGES : TARGET_LANGUAGES).map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>

            {/* Arrow */}
            <div className="flex justify-center my-1">
              <ArrowRight size={18} className="text-[#D9C27A] rotate-90" />
            </div>

            {/* Target Language */}
            <label className="text-xs font-medium text-gray-500 mb-1.5 block mt-1">Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={isTranslating}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all disabled:opacity-50"
            >
              {TARGET_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>

            <p className="text-[11px] text-gray-400 mt-2">
              Non-English pairs use English as a pivot language automatically.
            </p>
          </motion.div>

          {/* Audio Input (only in audio mode) */}
          {mode === 'audio' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <Mic size={16} className="text-[#0F3D3E]" /> Audio Input
                {isRecording && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-red-500">RECORDING</span>
                  </span>
                )}
              </h3>

              {/* Record Button */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative mb-3">
                  {isRecording && (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1 + audioLevel * 0.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="absolute inset-0 bg-red-500/20 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1 + audioLevel * 0.3, 1], opacity: [0.2, 0, 0.2] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                        className="absolute inset-0 bg-red-500/10 rounded-full"
                      />
                    </>
                  )}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranslating}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-30 ${
                      isRecording
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-[#0F3D3E] text-white shadow-lg shadow-[#0F3D3E]/30 hover:bg-[#1a5c5e]'
                    }`}
                  >
                    {isRecording ? <Square size={24} /> : <Mic size={24} />}
                  </button>
                </div>
                <p className="text-xs font-medium text-gray-600">
                  {isRecording ? 'Recording... Click to Stop' : 'Click to Record'}
                </p>
                {isRecording && (
                  <>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-base font-mono font-bold text-red-500 mt-1">
                      {formatTime(recordingTime)}
                    </motion.p>
                    <div className="w-full mt-2 flex items-center gap-2">
                      <Volume2 size={12} className="text-gray-400" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#0F3D3E] to-[#D9C27A] rounded-full"
                          animate={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                          transition={{ duration: 0.1 }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* File Upload */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => !isRecording && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  audioFile
                    ? 'border-[#0F3D3E]/30 bg-[#0F3D3E]/5'
                    : 'border-gray-200 hover:border-[#D9C27A] hover:bg-gray-50'
                } ${isRecording ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_AUDIO_TYPES}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {audioFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <FileAudio size={18} className="text-[#0F3D3E]" />
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">{audioFile.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearAudioFile(); }}
                        className="p-1 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">{formatFileSize(audioFile.size)}</p>
                    {audioPreviewUrl && (
                      <audio controls src={audioPreviewUrl} className="w-full mt-2 h-8"
                        onClick={(e) => e.stopPropagation()} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Upload size={20} className="mx-auto text-gray-400" />
                    <p className="text-xs font-medium text-gray-600">Drop audio file or click to browse</p>
                    <p className="text-[10px] text-gray-400">MP3, WAV, WebM, OGG, FLAC, M4A (max 100MB)</p>
                  </div>
                )}
              </div>

              {/* Translate Audio Button */}
              <button
                onClick={handleTranslateAudio}
                disabled={!audioFile || isTranslating || isRecording}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#D9C27A] to-[#c4a94e] text-[#0F3D3E] rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#D9C27A]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTranslating ? (
                  <><Loader2 size={16} className="animate-spin" /> Transcribing & Translating...</>
                ) : (
                  <><Languages size={16} /> Translate Audio</>
                )}
              </button>

              {isTranslating && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[11px] text-blue-600 font-medium">
                    Step 1: Transcribing with Whisper V3 Large...
                  </p>
                  <p className="text-[11px] text-blue-600 font-medium mt-1">
                    Step 2: Translating with Helsinki-NLP Opus-MT...
                  </p>
                  <p className="text-[10px] text-blue-400 mt-1">
                    This may take 30-90 seconds. First call may take longer while models warm up.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* Text Input (only in text mode) */}
          {mode === 'text' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Type size={16} className="text-[#0F3D3E]" /> Text Input
              </h3>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or paste text here to translate..."
                rows={8}
                disabled={isTranslating}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-sm text-gray-700 resize-none focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all leading-relaxed disabled:opacity-50"
              />
              <p className="text-xs text-gray-400 mt-2">
                {textInput.split(/\s+/).filter(Boolean).length} words
              </p>

              <button
                onClick={handleTranslateText}
                disabled={!textInput.trim() || isTranslating}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#D9C27A] to-[#c4a94e] text-[#0F3D3E] rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#D9C27A]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isTranslating ? (
                  <><Loader2 size={16} className="animate-spin" /> Translating...</>
                ) : (
                  <><Languages size={16} /> Translate Text</>
                )}
              </button>

              {isTranslating && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-[11px] text-blue-600 font-medium">
                    Translating with Helsinki-NLP Opus-MT...
                  </p>
                  <p className="text-[10px] text-blue-400 mt-1">
                    First call may take 20-30 seconds while model warms up.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Column — Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Side by Side Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Original Text */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <FileText size={16} className="text-[#0F3D3E]" /> Original
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {getSourceLangLabel()}
                  </span>
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={handleCopyOriginal} disabled={!originalText} title="Copy"
                    className="p-2 rounded-lg text-gray-400 hover:text-[#0F3D3E] hover:bg-[#0F3D3E]/5 transition-all disabled:opacity-30">
                    {copiedOriginal ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className={`min-h-[200px] bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm leading-relaxed ${
                  originalText ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {originalText || (isTranslating ? 'Transcribing...' : 'Original text will appear here after translation.')}
                </div>
                {originalText && (
                  <p className="text-xs text-gray-400 mt-2">
                    {originalText.split(/\s+/).filter(Boolean).length} words
                  </p>
                )}
              </div>
            </motion.div>

            {/* Translated Text */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Globe size={16} className="text-[#D9C27A]" /> Translated
                  <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    {getTargetLangLabel()}
                  </span>
                </h3>
                <div className="flex items-center gap-1">
                  <button onClick={handleCopyTranslated} disabled={!translatedText} title="Copy"
                    className="p-2 rounded-lg text-gray-400 hover:text-[#0F3D3E] hover:bg-[#0F3D3E]/5 transition-all disabled:opacity-30">
                    {copiedTranslated ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className={`min-h-[200px] bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm leading-relaxed ${
                  translatedText ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {translatedText || (isTranslating ? 'Translating...' : 'Translated text will appear here.')}
                </div>
                {translatedText && (
                  <p className="text-xs text-gray-400 mt-2">
                    {translatedText.split(/\s+/).filter(Boolean).length} words
                  </p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="flex flex-wrap gap-3">
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf || !translatedText}
              className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#0F3D3E] to-[#1a5c5e] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#0F3D3E]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? (
                <><RefreshCw size={18} className="animate-spin" /> Generating PDF...</>
              ) : (
                <><Download size={18} /> Download PDF</>
              )}
            </button>
            <button
              onClick={handleClearAll}
              disabled={isTranslating}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <Trash2 size={18} /> Clear All
            </button>
          </motion.div>

          {/* Info Banner */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-[#0F3D3E]/5 to-[#D9C27A]/10 border border-[#0F3D3E]/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Globe size={18} className="text-[#0F3D3E] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#0F3D3E]">Powered by Whisper V3 + Helsinki-NLP Opus-MT</p>
                <p className="text-xs text-gray-500 mt-1">
                  Audio is transcribed using OpenAI Whisper Large V3, then translated using Helsinki-NLP Opus-MT models
                  via HuggingFace Inference API. Supports 26 translation languages. Non-English pairs use English as a pivot.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Zap size={12} className="text-[#D9C27A]" />
                    <span>Whisper V3 Large</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Languages size={12} className="text-[#0F3D3E]" />
                    <span>26 languages</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileAudio size={12} className="text-[#0F3D3E]" />
                    <span>Audio + Text modes</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText size={12} className="text-[#0F3D3E]" />
                    <span>PDF export</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TranslateAudio;
