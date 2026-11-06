import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Sparkles,
  HelpCircle,
  Volume2,
  Settings,
  Send,
  AlertCircle,
  Clock,
  Radio,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { VoiceSelector } from './components/VoiceSelector';
import { TranscriptView, TranscriptItem } from './components/TranscriptView';
import { ExplanationModal } from './components/ExplanationModal';
import { PromptSuggestions } from './components/PromptSuggestions';
import { pcmToBase64, AudioQueuePlayer } from './utils/audio';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [systemPersona, setSystemPersona] = useState<string>(
    'Percakapan santai, natural, ramah, dan solutif. Paham Bahasa Indonesia dan English secara fasih. Respon singkat, enak didengar dan to-the-point.'
  );

  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentAiStreamText, setCurrentAiStreamText] = useState<string>('');
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);

  // Audio nodes and players
  const wsRef = useRef<WebSocket | null>(null);
  const audioPlayerRef = useRef<AudioQueuePlayer | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;

  const statusRef = useRef<ConnectionStatus>(status);
  statusRef.current = status;

  // Call duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (status === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initAudioPlayer = useCallback(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new AudioQueuePlayer((isPlaying) => {
        setIsAiSpeaking(isPlaying);
      });
    }
    return audioPlayerRef.current;
  }, []);

  const connectSession = async () => {
    try {
      setErrorMessage(null);
      setStatus('connecting');

      // 1. Initialize speaker playback player
      const player = initAudioPlayer();
      player.init();

      // 2. Request mic access (16kHz)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      micStreamRef.current = stream;
      setMicPermissionGranted(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      const sourceNode = inputCtx.createMediaStreamSource(stream);
      const analyser = inputCtx.createAnalyser();
      analyser.fftSize = 256;
      micAnalyserRef.current = analyser;

      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = processor;

      sourceNode.connect(analyser);
      analyser.connect(processor);
      // Connect to a silent dummy node to keep the processor running
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const base64Audio = pcmToBase64(inputData);

        wsRef.current.send(
          JSON.stringify({
            type: 'audio',
            audio: base64Audio,
          })
        );
      };

      // 3. Connect to server WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[App] WebSocket connected to server');
        // Send initial configuration
        ws.send(
          JSON.stringify({
            type: 'config',
            voice: selectedVoice,
            systemInstruction: `You are a real-time voice assistant with persona: ${systemPersona}. Speak naturally, warmly, concisely, and empathetically. Answer in fluent Bahasa Indonesia or English as prompted. Avoid long monologues.`,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_ready') {
            setStatus('connected');
          } else if (msg.type === 'audio' && msg.audio) {
            player.playChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            player.stopAll();
            setIsAiSpeaking(false);
          } else if (msg.type === 'user_transcript' && msg.text) {
            setTranscripts((prev) => [
              ...prev,
              {
                id: Date.now().toString() + Math.random(),
                sender: 'user',
                text: msg.text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
            ]);
          } else if (msg.type === 'ai_transcript' && msg.text) {
            setTranscripts((prev) => [
              ...prev,
              {
                id: Date.now().toString() + Math.random(),
                sender: 'ai',
                text: msg.text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
            ]);
            setCurrentAiStreamText('');
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message || 'Error from Gemini Live');
            setStatus('error');
          }
        } catch (err) {
          console.error('[App] Error processing WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[App] WebSocket error:', err);
        setErrorMessage('Gagal terhubung ke WebSocket Live Server.');
        setStatus('error');
      };

      ws.onclose = () => {
        console.log('[App] WebSocket closed');
        if (statusRef.current === 'connected' || statusRef.current === 'connecting') {
          setStatus('disconnected');
        }
      };
    } catch (err: any) {
      console.error('[App] Failed to start live session:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Izin mikrofon ditolak. Mohon izinkan mikrofon di browser untuk berbicara.'
          : err.message || 'Gagal memulai koneksi audio.'
      );
      setMicPermissionGranted(false);
      setStatus('error');
      disconnectSession();
    }
  };

  const disconnectSession = () => {
    // Stop mic stream
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Stop mic processor
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }

    // Close mic AudioContext
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }

    // Stop playback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stopAll();
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
    setIsAiSpeaking(false);
    setCurrentAiStreamText('');
  };

  const toggleSession = () => {
    if (status === 'connected' || status === 'connecting') {
      disconnectSession();
    } else {
      connectSession();
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'config',
          voice: voiceId,
          systemInstruction: `You are a real-time voice assistant with persona: ${systemPersona}. Speak naturally, warmly, concisely, and empathetically. Answer in fluent Bahasa Indonesia or English as prompted. Avoid long monologues.`,
        })
      );
    }
  };

  const handleSendText = (text: string) => {
    if (!text.trim()) return;

    if (status === 'connected' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: text.trim(),
        })
      );
      setTranscripts((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'user',
          text: text.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ]);
      setTextInput('');
    } else {
      // Connect first and send
      connectSession().then(() => {
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'text',
                text: text.trim(),
              })
            );
            setTranscripts((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                sender: 'user',
                text: text.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              },
            ]);
            setTextInput('');
          }
        }, 800);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Gemini Live Voice Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  gemini-3.8-live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Percakapan suara dua arah secara real-time & interaktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Indicator Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                status === 'connected'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : status === 'connecting'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 animate-pulse'
                  : status === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-slate-850 border-slate-700/80 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-400 animate-ping'
                    : status === 'connecting'
                    ? 'bg-amber-400'
                    : status === 'error'
                    ? 'bg-rose-400'
                    : 'bg-slate-500'
                }`}
              />
              <span className="capitalize">
                {status === 'connected'
                  ? `Live (${formatDuration(callDuration)})`
                  : status === 'connecting'
                  ? 'Menghubungkan...'
                  : status === 'error'
                  ? 'Error'
                  : 'Standby'}
              </span>
            </div>

            {/* "Maksudnya Gimana?" Explainer Button */}
            <button
              onClick={() => setIsExplanationOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Maksudnya Gimana?</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizer & Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Audio Visualizer Card */}
          <div className="relative bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between overflow-hidden">
            {/* Status pill in visualizer */}
            <div className="w-full flex items-center justify-between z-10 mb-2">
              <div className="flex items-center gap-2 text-xs">
                <Radio className={`w-3.5 h-3.5 ${status === 'connected' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="text-slate-400 font-medium">
                  {status === 'connected'
                    ? isAiSpeaking
                      ? '🔊 Gemini Sedang Berbicara (24kHz)'
                      : isMuted
                      ? '🔇 Mikrofon Dimatikan'
                      : '🎙️ Mendengarkan Suaramu (16kHz)...'
                    : status === 'connecting'
                    ? 'Sedang Membuka Sesi Live...'
                    : 'Siap Memulai Percakapan'}
                </span>
              </div>

              {status === 'connected' && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>{formatDuration(callDuration)}</span>
                </div>
              )}
            </div>

            {/* Dynamic Visualizer Canvas */}
            <AudioVisualizer
              micAnalyser={micAnalyserRef.current}
              speakerAnalyser={audioPlayerRef.current?.getAnalyser() || null}
              isListening={status === 'connected' && !isMuted && !isAiSpeaking}
              isAiSpeaking={isAiSpeaking}
              isConnected={status === 'connected'}
            />

            {/* Quick Helper Subtext under Orb */}
            <p className="text-xs text-slate-400 text-center mt-2 max-w-md z-10">
              {status === 'connected' ? (
                <span>
                  Bicara langsung seperti berbicara dengan teman. Kamu bisa menyela (interupsi) Gemini kapan saja.
                </span>
              ) : (
                <span>
                  Tekan tombol hijau di bawah untuk memulai obrolan suara langsung via <strong>gemini-3.8-live</strong>.
                </span>
              )}
            </p>

            {/* Big Main Call & Control Bar */}
            <div className="w-full flex items-center justify-center gap-4 mt-6 z-10">
              {/* Mute Mic Toggle (when connected) */}
              {status === 'connected' && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750'
                  }`}
                  title={isMuted ? 'Nyalakan Mikrofon' : 'Bisukan Mikrofon'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* Central Connect / Disconnect Action Button */}
              <button
                onClick={toggleSession}
                disabled={status === 'connecting'}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-xl cursor-pointer ${
                  status === 'connected'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 hover:scale-[1.02]'
                    : status === 'connecting'
                    ? 'bg-amber-600 text-white opacity-80 cursor-wait'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-[1.02]'
                }`}
              >
                {status === 'connected' ? (
                  <>
                    <PhoneOff className="w-5 h-5" />
                    <span>Akhiri Panggilan</span>
                  </>
                ) : status === 'connecting' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-5 h-5 animate-bounce" />
                    <span>Mulai Percakapan Suara</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Voice Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <VoiceSelector
              selectedVoice={selectedVoice}
              onSelectVoice={handleVoiceChange}
              disabled={status === 'connecting'}
            />
          </div>

          {/* Prompt Suggestions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg">
            <PromptSuggestions
              onSelectPrompt={(text) => handleSendText(text)}
              disabled={status === 'connecting'}
            />
          </div>
        </div>

        {/* Right Column: Live Transcripts & Assistant Settings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold mb-0.5 text-rose-200">Koneksi Terkendala</p>
                <p className="leading-relaxed">{errorMessage}</p>
                {(errorMessage.includes('Settings > Secrets') || errorMessage.includes('API key')) && (
                  <p className="mt-1.5 text-slate-300 bg-rose-900/40 p-2 rounded-xl border border-rose-700/40">
                    💡 <strong>Tips:</strong> Buka menu <strong>Settings &gt; Secrets</strong> di AI Studio dan pastikan <code>GEMINI_API_KEY</code> aktif.
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      connectSession();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Hubungkan Lagi</span>
                  </button>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors text-[11px]"
                  >
                    Tutup Pesan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Transcript View */}
          <TranscriptView
            transcripts={transcripts}
            currentAiStreamText={currentAiStreamText}
            onClear={() => setTranscripts([])}
          />

          {/* Quick Text Input fallback */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendText(textInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ketik pesan atau pertanyaan untuk Gemini..."
                className="flex-1 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || status === 'connecting'}
                className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                title="Kirim pesan"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Persona / Instruction Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                Instruksi & Gaya Bicara AI
              </span>
              <span className="text-[11px] text-slate-500">System Instruction</span>
            </div>
            <textarea
              rows={2}
              value={systemPersona}
              onChange={(e) => setSystemPersona(e.target.value)}
              placeholder="Atur instruksi atau gaya bicara Gemini di sini..."
              className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 rounded-2xl p-3 text-xs text-slate-300 placeholder:text-slate-600 outline-none resize-none transition-colors"
            />
            <p className="text-[10px] text-slate-500">
              *Instruksi diterapkan otomatis saat sesi live baru dimulai.
            </p>
          </div>
        </div>
      </main>

      {/* Explanation Modal ("Maksudnya Gimana?") */}
      <ExplanationModal
        isOpen={isExplanationOpen}
        onClose={() => setIsExplanationOpen(false)}
      />
    </div>
  );
}
