import React from 'react';
import { Volume2, Check } from 'lucide-react';

export interface VoiceOption {
  id: string;
  name: string;
  character: string;
  tone: string;
  gender: string;
}

export const VOICES: VoiceOption[] = [
  { id: 'Zephyr', name: 'Zephyr', character: 'Ramah & Seimbang', tone: 'Clear & Natural', gender: 'Netral / Hangat' },
  { id: 'Puck', name: 'Puck', character: 'Ceria & Energik', tone: 'Playful & Lively', gender: 'Ekspresif' },
  { id: 'Charon', name: 'Charon', character: 'Tenang & Berwibawa', tone: 'Deep & Authoritative', gender: 'Berat / Mantap' },
  { id: 'Kore', name: 'Kore', character: 'Lembut & Empatis', tone: 'Warm & Soothing', gender: 'Halus / Menenangkan' },
  { id: 'Fenrir', name: 'Fenrir', character: 'Tegas & Percaya Diri', tone: 'Bold & Dynamic', gender: 'Kuat / Jelas' },
];

interface VoiceSelectorProps {
  selectedVoice: string;
  onSelectVoice: (voiceId: string) => void;
  disabled?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoice,
  onSelectVoice,
  disabled = false,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          Karakter Suara Gemini (Voice Persona)
        </span>
        <span className="text-[11px] text-slate-500">5 Pilihan Suara</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {VOICES.map((v) => {
          const isSelected = selectedVoice === v.id;
          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectVoice(v.id)}
              className={`relative text-left p-3 rounded-2xl border transition-all ${
                isSelected
                  ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-xs ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                  {v.name}
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-tight truncate">
                {v.character}
              </p>
              <span className="inline-block mt-1.5 text-[10px] text-slate-500 px-1.5 py-0.5 rounded-md bg-slate-800/80">
                {v.tone}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
