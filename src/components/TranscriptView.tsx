import React, { useRef, useEffect } from 'react';
import { User, Sparkles, Copy, Check, Trash2 } from 'lucide-react';

export interface TranscriptItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isInterim?: boolean;
}

interface TranscriptViewProps {
  transcripts: TranscriptItem[];
  currentInterimUserText?: string;
  currentAiStreamText?: string;
  onClear: () => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  transcripts,
  currentInterimUserText,
  currentAiStreamText,
  onClear,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcripts, currentInterimUserText, currentAiStreamText]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const hasContent = transcripts.length > 0 || currentInterimUserText || currentAiStreamText;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 flex flex-col h-[340px] md:h-[400px]">
      {/* Transcript Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Live Speech Transcript
          </span>
          <span className="text-[11px] text-slate-500">
            ({transcripts.length} pesan terekam)
          </span>
        </div>

        {transcripts.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-800"
            title="Bersihkan Transkrip"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        )}
      </div>

      {/* Transcript Log Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm scroll-smooth"
      >
        {!hasContent && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-400">Belum Ada Percakapan</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Klik tombol mikrofon di bawah untuk mulai berbicara. Kata-kata yang kamu dan Gemini ucapkan akan muncul di sini secara real-time.
            </p>
          </div>
        )}

        {transcripts.map((t) => (
          <div
            key={t.id}
            className={`group relative flex gap-3 p-3 rounded-2xl border transition-all ${
              t.sender === 'user'
                ? 'bg-emerald-950/20 border-emerald-800/30 ml-4'
                : 'bg-indigo-950/20 border-indigo-800/30 mr-4'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                t.sender === 'user'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {t.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[11px] font-bold ${
                    t.sender === 'user' ? 'text-emerald-400' : 'text-indigo-400'
                  }`}
                >
                  {t.sender === 'user' ? 'Kamu (Suara)' : 'Gemini Live'}
                </span>
                <span className="text-[10px] text-slate-500">{t.timestamp}</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                {t.text}
              </p>
            </div>

            <button
              onClick={() => handleCopy(t.id, t.text)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-opacity self-start"
              title="Salin teks"
            >
              {copiedId === t.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ))}

        {/* Interim user speech bubble */}
        {currentInterimUserText && (
          <div className="flex gap-3 p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 ml-4 animate-pulse">
            <div className="w-7 h-7 rounded-xl bg-emerald-600/40 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-emerald-400 mb-1">Mendengarkan...</div>
              <p className="text-xs text-emerald-200 italic leading-relaxed">
                {currentInterimUserText}
              </p>
            </div>
          </div>
        )}

        {/* Interim AI stream bubble */}
        {currentAiStreamText && (
          <div className="flex gap-3 p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 mr-4">
            <div className="w-7 h-7 rounded-xl bg-indigo-600/40 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 animate-bounce">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-indigo-400 mb-1">Gemini Berbicara...</div>
              <p className="text-xs text-slate-100 leading-relaxed">
                {currentAiStreamText}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
