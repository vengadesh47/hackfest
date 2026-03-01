import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Mic, Square, Download, FileText, Globe,
  RefreshCw, Copy, Check, Volume2, Trash2,
  Zap, Languages, Upload, FileAudio, X, Loader2,
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)', flag: 'US' },
  { code: 'en-IN', label: 'English (India)', flag: 'EN' },
  { code: 'hi-IN', label: 'Hindi', flag: 'HI' },
  { code: 'ta-IN', label: 'Tamil', flag: 'TA' },
  { code: 'te-IN', label: 'Telugu', flag: 'TE' },
  { code: 'bn-IN', label: 'Bengali', flag: 'BN' },
  { code: 'mr-IN', label: 'Marathi', flag: 'MR' },
  { code: 'kn-IN', label: 'Kannada', flag: 'KN' },
  { code: 'ml-IN', label: 'Malayalam', flag: 'ML' },
  { code: 'gu-IN', label: 'Gujarati', flag: 'GU' },
  { code: 'pa-IN', label: 'Punjabi', flag: 'PA' },
  { code: 'or-IN', label: 'Odia', flag: 'OR' },
  { code: 'ur-IN', label: 'Urdu', flag: 'UR' },
];

const TEMPLATES = [
  { key: 'general', label: 'General Medical Note', icon: '📋', sections: ['Patient History', 'Symptoms', 'Diagnosis', 'Treatment Plan', 'Prescription Notes', 'Follow-up'] },
  { key: 'discharge', label: 'Discharge Summary', icon: '🏥', sections: ['Admission Summary', 'Hospital Course', 'Procedures Performed', 'Discharge Diagnosis', 'Medications', 'Instructions'] },
  { key: 'preauth', label: 'Pre-Authorization Note', icon: '🔐', sections: ['Patient Details', 'Medical Necessity', 'Proposed Treatment', 'Cost Estimate', 'Supporting Evidence'] },
  { key: 'consultation', label: 'Consultation Note', icon: '🩺', sections: ['Chief Complaint', 'History of Present Illness', 'Examination Findings', 'Assessment', 'Plan'] },
];

const ACCEPTED_AUDIO_TYPES = '.mp3,.wav,.webm,.ogg,.flac,.m4a,.mp4,.aac,.amr,.3gp';

const VoiceDocument = () => {
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [selectedTemplate, setSelectedTemplate] = useState('general');
  const [editableText, setEditableText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Audio file upload state
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  // In-browser recording state
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

  // --- IN-BROWSER RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio visualizer
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

      // Setup MediaRecorder
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
        const file = new File([blob], `recording_${Date.now()}${ext}`, { type: mimeType });
        setAudioFile(file);
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        addToast(`Recording saved (${(blob.size / 1024).toFixed(0)}KB). Click "Transcribe Audio" to convert to text.`, 'success');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);

      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

    } catch (err) {
      console.error('Failed to start recording:', err);
      addToast('Microphone access denied. Please allow mic permissions in browser settings.', 'error');
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

  // --- TRANSCRIBE via HF Whisper API ---
  const handleTranscribe = async () => {
    if (!audioFile) {
      addToast('Please upload or record an audio file first.', 'error');
      return;
    }

    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('language', selectedLang);

      const response = await api.post('/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 min timeout for large files
      });

      const { text, language, wordCount } = response.data;

      if (text) {
        setEditableText(prev => prev ? prev + '\n\n' + text : text);
        addToast(`Transcription complete! ${wordCount} words in ${language}.`, 'success');
      } else {
        addToast('No speech detected in the audio. Please try a different file.', 'error');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transcription failed.';
      if (err.response?.status === 503) {
        addToast('Whisper model is loading on HuggingFace servers. Please wait 20-30 seconds and try again.', 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- GENERATE PDF ---
  const handleGenerateDocument = async () => {
    if (!editableText.trim()) {
      addToast('Please transcribe or type some text first.', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await api.post('/voice/generate-document', {
        text: editableText, language: selectedLang, template: selectedTemplate,
      }, { responseType: 'blob' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClaimPilot_Medical_Document_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      addToast('Document generated and downloaded!', 'success');
    } catch {
      addToast('Failed to generate document. Please try again.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- UTILS ---
  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied to clipboard!', 'success');
  };

  const handleClear = () => {
    setEditableText('');
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

  const currentTemplate = TEMPLATES.find(t => t.key === selectedTemplate);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-extrabold text-[#0F3D3E]">Voice to Document</h1>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F3D3E]/10 text-[#0F3D3E]">
            WHISPER V3 LARGE
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Upload or record audio, transcribe with OpenAI Whisper Large V3 via HuggingFace, and generate structured medical documents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Language */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Languages size={16} className="text-[#0F3D3E]" /> Language
            </h3>
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={isTranscribing}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all disabled:opacity-50"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-2">
              Whisper V3 Large supports 99+ languages with high accuracy.
            </p>
          </motion.div>

          {/* Template */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-[#0F3D3E]" /> Document Template
            </h3>
            <div className="space-y-2">
              {TEMPLATES.map(tmpl => (
                <button key={tmpl.key} onClick={() => setSelectedTemplate(tmpl.key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedTemplate === tmpl.key
                      ? 'border-[#0F3D3E] bg-[#0F3D3E]/5 shadow-sm'
                      : 'border-gray-100 hover:border-[#D9C27A]'
                  }`}>
                  <p className="text-sm font-bold text-gray-700">{tmpl.icon} {tmpl.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{tmpl.sections.join(' · ')}</p>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Audio Input: Record or Upload */}
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
                  disabled={isTranscribing}
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

            {/* File Upload Drop Zone */}
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
                  <p className="text-xs font-medium text-gray-600">Drop audio file here or click to browse</p>
                  <p className="text-[10px] text-gray-400">MP3, WAV, WebM, OGG, FLAC, M4A, AAC (max 100MB)</p>
                </div>
              )}
            </div>

            {/* Transcribe Button */}
            <button
              onClick={handleTranscribe}
              disabled={!audioFile || isTranscribing || isRecording}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#D9C27A] to-[#c4a94e] text-[#0F3D3E] rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#D9C27A]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isTranscribing ? (
                <><Loader2 size={16} className="animate-spin" /> Transcribing with Whisper...</>
              ) : (
                <><Zap size={16} /> Transcribe Audio</>
              )}
            </button>

            {isTranscribing && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-[11px] text-blue-600 font-medium">
                  Sending audio to OpenAI Whisper Large V3 via HuggingFace...
                </p>
                <p className="text-[10px] text-blue-400 mt-1">
                  This may take 10-60 seconds depending on audio length. Please wait.
                </p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transcription */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Volume2 size={16} className="text-[#0F3D3E]" /> Transcription
                {isTranscribing && (
                  <span className="flex items-center gap-1.5 ml-2">
                    <Loader2 size={14} className="animate-spin text-[#D9C27A]" />
                    <span className="text-xs text-[#D9C27A] font-medium">Processing...</span>
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={handleGenerateDocument} disabled={!editableText.trim() || isGenerating} title="Download Transcription PDF"
                  className="p-2 rounded-lg text-gray-400 hover:text-[#0F3D3E] hover:bg-[#0F3D3E]/5 transition-all disabled:opacity-30">
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                </button>
                <button onClick={handleCopy} disabled={!editableText} title="Copy"
                  className="p-2 rounded-lg text-gray-400 hover:text-[#0F3D3E] hover:bg-[#0F3D3E]/5 transition-all disabled:opacity-30">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
                <button onClick={handleClear} disabled={!editableText || isTranscribing} title="Clear"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                placeholder={'Upload an audio file or record with your microphone, then click "Transcribe Audio" to convert speech to text using Whisper V3 Large.\n\nYou can also type or paste text directly here.\n\nSupported: MP3, WAV, WebM, OGG, FLAC, M4A, AAC\nSupported languages: English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi, Odia, Urdu, and 90+ more.'}
                rows={14}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 resize-none focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all leading-relaxed"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  {editableText.split(/\s+/).filter(Boolean).length} words · {editableText.length} characters
                </p>
                <p className="text-xs text-gray-400">
                  Language: {LANGUAGES.find(l => l.code === selectedLang)?.label}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Template Preview */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-[#D9C27A]" /> Preview: {currentTemplate?.icon} {currentTemplate?.label}
            </h3>
            <p className="text-xs text-gray-400 mb-3">
              Your text will be structured into these sections in the generated PDF:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {currentTemplate?.sections.map((section, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 flex items-center gap-2">
                  <span className="w-5 h-5 bg-[#0F3D3E]/10 text-[#0F3D3E] rounded-full flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                  {section}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Generate Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <button onClick={handleGenerateDocument} disabled={isGenerating || !editableText.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#0F3D3E] to-[#1a5c5e] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-[#0F3D3E]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isGenerating ? (
                <><RefreshCw size={18} className="animate-spin" /> Generating PDF...</>
              ) : (
                <><Download size={18} /> Download Transcription PDF</>
              )}
            </button>
          </motion.div>

          {/* Info Banner */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-[#0F3D3E]/5 to-[#D9C27A]/10 border border-[#0F3D3E]/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Globe size={18} className="text-[#0F3D3E] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#0F3D3E]">Powered by OpenAI Whisper Large V3</p>
                <p className="text-xs text-gray-500 mt-1">
                  Uses the state-of-the-art Whisper Large V3 model via HuggingFace Inference API.
                  Upload audio files (MP3, WAV, WebM, FLAC, M4A) or record directly in the browser.
                  Supports 99+ languages including Hindi, Tamil, Telugu, Bengali, Marathi, and more.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Zap size={12} className="text-[#D9C27A]" />
                    <span>Whisper V3 Large</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Languages size={12} className="text-[#0F3D3E]" />
                    <span>99+ languages</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText size={12} className="text-[#0F3D3E]" />
                    <span>4 medical templates</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileAudio size={12} className="text-[#0F3D3E]" />
                    <span>MP3, WAV, WebM, FLAC, M4A</span>
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

export default VoiceDocument;
