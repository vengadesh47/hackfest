import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  Mic, Square, Download, FileText, Globe,
  RefreshCw, Copy, Check, Volume2, Trash2,
  AlertCircle, Zap, Languages,
} from 'lucide-react';

const LANGUAGES = [
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
  { code: 'en-US', label: 'English (US)', flag: 'US' },
];

const TEMPLATES = [
  { key: 'general', label: 'General Medical Note', icon: '📋', sections: ['Patient History', 'Symptoms', 'Diagnosis', 'Treatment Plan', 'Prescription Notes', 'Follow-up'] },
  { key: 'discharge', label: 'Discharge Summary', icon: '🏥', sections: ['Admission Summary', 'Hospital Course', 'Procedures Performed', 'Discharge Diagnosis', 'Medications', 'Instructions'] },
  { key: 'preauth', label: 'Pre-Authorization Note', icon: '🔐', sections: ['Patient Details', 'Medical Necessity', 'Proposed Treatment', 'Cost Estimate', 'Supporting Evidence'] },
  { key: 'consultation', label: 'Consultation Note', icon: '🩺', sections: ['Chief Complaint', 'History of Present Illness', 'Examination Findings', 'Assessment', 'Plan'] },
];

const VoiceDocument = () => {
  const [selectedLang, setSelectedLang] = useState('en-IN');
  const [selectedTemplate, setSelectedTemplate] = useState('general');
  const [isRecording, setIsRecording] = useState(false);
  const [editableText, setEditableText] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false);
  const retryCountRef = useRef(0);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setBrowserSupported(false);

    return () => {
      cleanupAll();
    };
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    analyserRef.current = null;
    setAudioLevel(0);
  };

  const cleanupAll = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (retryTimeoutRef.current) { clearTimeout(retryTimeoutRef.current); retryTimeoutRef.current = null; }
    stopAudioVisualizer();
  };

  const createAndStartRecognition = useCallback((lang) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Abort any existing instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // Reset retry count on successful start
      retryCountRef.current = 0;
      setRetryCount(0);
      setStatusMessage('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t + ' ';
        } else {
          interim += t;
        }
      }
      if (finalText) {
        setEditableText(prev => prev + finalText);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.log('[SpeechRecognition] Error:', event.error);

      // Non-fatal: no-speech just means silence, aborted means we stopped it
      if (event.error === 'no-speech' || event.error === 'aborted') return;

      if (event.error === 'not-allowed') {
        addToast('Microphone access denied. Please allow microphone permissions in browser settings.', 'error');
        stopRecording();
        return;
      }

      // Network error — retry with backoff
      if (event.error === 'network') {
        const maxRetries = 5;
        if (retryCountRef.current < maxRetries && isRecordingRef.current) {
          retryCountRef.current += 1;
          setRetryCount(retryCountRef.current);
          const delay = Math.min(1000 * retryCountRef.current, 5000);
          setStatusMessage(`Connection issue. Retrying (${retryCountRef.current}/${maxRetries})...`);
          console.log(`[SpeechRecognition] Network error, retry ${retryCountRef.current}/${maxRetries} in ${delay}ms`);
          retryTimeoutRef.current = setTimeout(() => {
            if (isRecordingRef.current) {
              createAndStartRecognition(lang);
            }
          }, delay);
          return;
        } else {
          addToast('Speech recognition network error. Please check your internet connection and try again.', 'error');
          stopRecording();
          return;
        }
      }

      // Other errors — retry once
      if (retryCountRef.current < 2 && isRecordingRef.current) {
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        setStatusMessage('Reconnecting...');
        retryTimeoutRef.current = setTimeout(() => {
          if (isRecordingRef.current) {
            createAndStartRecognition(lang);
          }
        }, 1000);
        return;
      }

      addToast(`Speech recognition error: ${event.error}`, 'error');
      stopRecording();
    };

    // Auto-restart on end (browser pauses recognition periodically)
    recognition.onend = () => {
      if (isRecordingRef.current) {
        retryTimeoutRef.current = setTimeout(() => {
          if (isRecordingRef.current) {
            createAndStartRecognition(lang);
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error('[SpeechRecognition] Start failed:', err);
      // Retry on start failure
      if (retryCountRef.current < 3 && isRecordingRef.current) {
        retryCountRef.current += 1;
        setRetryCount(retryCountRef.current);
        setStatusMessage('Starting recognition...');
        retryTimeoutRef.current = setTimeout(() => {
          if (isRecordingRef.current) {
            createAndStartRecognition(lang);
          }
        }, 1500);
      } else {
        addToast('Failed to start speech recognition. Try refreshing the page.', 'error');
        stopRecording();
      }
    }
  }, []);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addToast('Speech recognition not supported. Please use Google Chrome or Microsoft Edge.', 'error');
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingTime(0);
    setInterimTranscript('');
    retryCountRef.current = 0;
    setRetryCount(0);
    setStatusMessage('Connecting...');

    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);

    startAudioVisualizer();
    createAndStartRecognition(selectedLang);
  }, [selectedLang, createAndStartRecognition]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimTranscript('');
    setStatusMessage('');
    setRetryCount(0);
    retryCountRef.current = 0;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    stopAudioVisualizer();
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Copied to clipboard!', 'success');
  };

  const handleClear = () => {
    setEditableText('');
    setInterimTranscript('');
  };

  const handleGenerateDocument = async () => {
    if (!editableText.trim()) {
      addToast('Please record or type some text first.', 'error');
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

  const currentTemplate = TEMPLATES.find(t => t.key === selectedTemplate);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-extrabold text-[#0F3D3E]">Voice to Document</h1>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#0F3D3E]/10 text-[#0F3D3E]">
            SPEECH RECOGNITION
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Speak in any of 12+ Indian languages and generate structured medical documents instantly
        </p>
      </div>

      {/* Browser Support Warning */}
      {!browserSupported && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-700">Browser Not Supported</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Speech recognition requires Google Chrome or Microsoft Edge. Please switch browsers to use voice input.
              You can still type or paste text below and generate documents.
            </p>
          </div>
        </div>
      )}

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
              onChange={(e) => { if (!isRecording) setSelectedLang(e.target.value); }}
              disabled={isRecording}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all disabled:opacity-50"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.flag} {lang.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-2">
              Select the language you will speak in. Requires internet — Chrome sends audio to Google for processing.
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

          {/* Voice Recorder */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Mic size={16} className="text-[#0F3D3E]" /> Voice Recorder
              {isRecording && (
                <span className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-red-500">LIVE</span>
                </span>
              )}
            </h3>
            <div className="flex flex-col items-center">
              {/* Recording Button */}
              <div className="relative mb-4">
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
                  disabled={!browserSupported}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all disabled:opacity-30 ${
                    isRecording
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'bg-[#0F3D3E] text-white shadow-lg shadow-[#0F3D3E]/30 hover:bg-[#1a5c5e]'
                  }`}
                >
                  {isRecording ? <Square size={28} /> : <Mic size={28} />}
                </button>
              </div>

              <p className="text-sm font-bold text-gray-700">
                {isRecording ? 'Listening... Click to Stop' : 'Click to Start Recording'}
              </p>

              {/* Status message (retries, connecting, etc.) */}
              {statusMessage && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs text-amber-600 font-medium mt-1">
                  {statusMessage}
                </motion.p>
              )}

              {isRecording && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-lg font-mono font-bold text-red-500 mt-1">
                  {formatTime(recordingTime)}
                </motion.p>
              )}

              {!isRecording && editableText && (
                <p className="text-xs text-gray-400 mt-1">Last session: {formatTime(recordingTime)}</p>
              )}

              {/* Audio level visualizer */}
              {isRecording && (
                <div className="w-full mt-3 flex items-center gap-2">
                  <Volume2 size={12} className="text-gray-400" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#0F3D3E] to-[#D9C27A] rounded-full"
                      animate={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              )}

              {/* Tips */}
              {!isRecording && !editableText && (
                <div className="mt-4 w-full space-y-1.5">
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#0F3D3E]" /> Requires internet connection (uses Google Speech)
                  </p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#0F3D3E]" /> Speak clearly near the microphone
                  </p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#0F3D3E]" /> Text appears in real-time as you speak
                  </p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#0F3D3E]" /> You can edit the text after recording
                  </p>
                </div>
              )}
            </div>
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
                {isRecording && (
                  <span className="flex items-center gap-1.5 ml-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-red-500 font-medium">Live</span>
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} disabled={!editableText} title="Copy"
                  className="p-2 rounded-lg text-gray-400 hover:text-[#0F3D3E] hover:bg-[#0F3D3E]/5 transition-all disabled:opacity-30">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
                <button onClick={handleClear} disabled={!editableText || isRecording} title="Clear"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <textarea
                value={editableText + (interimTranscript ? interimTranscript : '')}
                onChange={(e) => { setEditableText(e.target.value); setInterimTranscript(''); }}
                placeholder={'Click the microphone button to start recording.\nText will appear here in real-time as you speak.\n\nYou can also type or paste text directly.\n\nSupports 12+ Indian languages — select from the language dropdown.'}
                rows={12}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 resize-none focus:border-[#0F3D3E] focus:ring-1 focus:ring-[#0F3D3E]/20 outline-none transition-all leading-relaxed"
              />
              {interimTranscript && (
                <p className="text-xs text-gray-400 mt-2 italic">Hearing: &ldquo;{interimTranscript}&rdquo;</p>
              )}
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
                <><RefreshCw size={18} className="animate-spin" /> Generating Document...</>
              ) : (
                <><Download size={18} /> Generate Medical Document (PDF)</>
              )}
            </button>
          </motion.div>

          {/* Info Banner */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-[#0F3D3E]/5 to-[#D9C27A]/10 border border-[#0F3D3E]/10 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Globe size={18} className="text-[#0F3D3E] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#0F3D3E]">Multilingual Healthcare Speech Recognition</p>
                <p className="text-xs text-gray-500 mt-1">
                  ClaimPilot uses your browser's built-in speech recognition to convert voice to text in real-time.
                  Supports 12+ Indian languages including Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam,
                  Gujarati, Punjabi, Odia, and Urdu. Works best in Google Chrome or Microsoft Edge.
                  Requires an active internet connection.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Zap size={12} className="text-[#D9C27A]" />
                    <span>Real-time transcription</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Languages size={12} className="text-[#0F3D3E]" />
                    <span>12+ Indian languages</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText size={12} className="text-[#0F3D3E]" />
                    <span>4 medical document templates</span>
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
