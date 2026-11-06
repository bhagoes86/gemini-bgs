import React from 'react';
import { Sparkles, Mic, Zap, Volume2, ShieldCheck, HelpCircle, X, ArrowRight, MessageSquareCode } from 'lucide-react';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExplanationModal: React.FC<ExplanationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Maksudnya Gimana? (Penjelasan Fitur)
              </h2>
              <p className="text-xs text-slate-400">
                Panduan lengkap fitur Gemini 3.8 Live & Voice Conversations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Quick Summary Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 text-slate-200 leading-relaxed">
            <p className="font-semibold text-indigo-300 mb-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Singkatnya: Ngobrol Langsung Pakai Suara Seperti Telepon!
            </p>
            <p className="text-xs text-slate-300">
              Kamu tidak perlu mengetik teks dan menunggu balasan lama. Cukup aktifkan mic, langsung bicara, dan AI Gemini akan menjawabmu dengan suara asli secara real-time (tanpa jeda, bahkan bisa kamu potong/interupsi di tengah jalan).
            </p>
          </div>

          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Mic className="w-4 h-4" />
                <span>1. Native Speech Input (16kHz)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suara kamu dari mikrofon langsung diolah dalam format raw PCM 16kHz ke model AI tanpa melalui speech-to-text konvensional yang lambat.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Volume2 className="w-4 h-4" />
                <span>2. Suara AI Super Jernih (24kHz)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini menjawab dengan audio berkualitas 24kHz. Tersedia 5 pilihan karakter suara (Zephyr, Puck, Charon, Kore, Fenrir) dengan intonasi alami.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                <Zap className="w-4 h-4" />
                <span>3. Live Interruption (Bisa Disela)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jika Gemini sedang bicara dan kamu berbicara atau menyela, AI akan langsung berhenti bicara dan langsung merespon apa yang baru kamu katakan!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <MessageSquareCode className="w-4 h-4" />
                <span>4. Bahasa Indonesia & Bilingual</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paham Bahasa Indonesia santai, formal, campuran (slang/Indoglish), serta bahasa internasional lainnya secara fasih.
              </p>
            </div>
          </div>

          {/* How to use */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Cara Menggunakan (3 Langkah Cepat):
            </h3>
            <ol className="space-y-2">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/40 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </span>
                <div>
                  <p className="font-medium text-slate-200 text-xs">Pilih Suara & Persona</p>
                  <p className="text-xs text-slate-400">Pilih suara favoritmu (misal: Zephyr atau Puck) dan persona yang diinginkan.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/40 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </span>
                <div>
                  <p className="font-medium text-slate-200 text-xs">Klik Tombol Mic / Mulai Percakapan</p>
                  <p className="text-xs text-slate-400">Izinkan browser mengakses mikrofon jika diminta, lalu tombol akan menyala hijau.</p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="w-6 h-6 rounded-lg bg-indigo-600/40 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </span>
                <div>
                  <p className="font-medium text-slate-200 text-xs">Bicara Kapan Saja</p>
                  <p className="text-xs text-slate-400">Ngobrol seperti biasa! Transkrip teks dan audio akan otomatis mengalir.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Privacy & Setup Note */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3 text-xs text-slate-400">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              API Key dikelola aman di sisi server. Kamu bisa melihat atau mengganti key di menu <strong>Settings &gt; Secrets</strong> jika diperlukan.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">Gemini 3.8 Live API • Low-latency bidirectional</span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25"
          >
            <span>Mengerti & Mulai</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
