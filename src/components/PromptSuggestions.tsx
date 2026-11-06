import React from 'react';
import { Lightbulb, MessageCircle } from 'lucide-react';

interface PromptSuggestionsProps {
  onSelectPrompt: (promptText: string) => void;
  disabled?: boolean;
}

export const SUGGESTED_PROMPTS = [
  {
    topic: 'Santai & Humor',
    text: 'Halo Gemini! Ceritain tebak-tebakan atau lelucon lucu bahasa Indonesia dong.',
  },
  {
    topic: 'Belajar Cepat',
    text: 'Jelaskan cara kerja Machine Learning dengan perumpamaan sederhana untuk pemula.',
  },
  {
    topic: 'Latihan Bahasa',
    text: "Can we practice everyday English conversation? You correct my grammar if I make mistakes.",
  },
  {
    topic: 'Diskusi & Ide',
    text: 'Kasih 3 ide proyek aplikasi web yang unik dan berguna untuk dicoba minggu ini.',
  },
];

export const PromptSuggestions: React.FC<PromptSuggestionsProps> = ({
  onSelectPrompt,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
        <span>Ide Topik Pembicaraan (Klik untuk mulai)</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTED_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item.text)}
            className="text-left p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-850 text-slate-300 text-xs transition-all flex items-start gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-indigo-400 block mb-0.5">
                {item.topic}
              </span>
              <p className="text-slate-300 line-clamp-1 group-hover:text-white transition-colors">
                "{item.text}"
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
