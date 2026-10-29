import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { Lightbulb, Volume2 } from 'lucide-react';

interface MascotSpeechProps {
  stageTitle: string;
  speechText: string;
  hintText: string;
}

export const MascotSpeech: React.FC<MascotSpeechProps> = ({
  stageTitle,
  speechText,
  hintText,
}) => {
  const [showHint, setShowHint] = useState(false);

  const handleToggleHint = () => {
    soundManager.playClick();
    setShowHint((prev) => !prev);
  };

  const handleReadAloud = () => {
    soundManager.playClick();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.pitch = 1.2;
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex items-end gap-3 max-w-xl mx-auto w-full px-2">
      {/* Mascot Avatar */}
      <div className="shrink-0 relative group">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-400 border-3 border-white shadow-lg flex items-center justify-center overflow-hidden transition-transform active:scale-95">
          {/* Cartoon Mascot Face: Captain Cody */}
          <div className="flex flex-col items-center">
            {/* Hard Hat */}
            <div className="w-11 h-4.5 bg-yellow-300 rounded-t-full border-b-2 border-amber-500 relative flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
            </div>
            {/* Face */}
            <div className="w-10 h-7 bg-amber-100 rounded-b-xl flex flex-col items-center justify-center relative">
              {/* Smiling eyes */}
              <div className="flex gap-2.5 mb-0.5">
                <div className="w-1.5 h-2 bg-slate-900 rounded-full" />
                <div className="w-1.5 h-2 bg-slate-900 rounded-full" />
              </div>
              {/* Cheerful grin */}
              <div className="w-4 h-2 border-b-2 border-amber-800 rounded-full" />
            </div>
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white rounded-full text-[10px] font-black px-1.5 py-0.5 border border-white shadow">
          Cody
        </div>
      </div>

      {/* Speech Bubble */}
      <div className="flex-1 bg-white/95 backdrop-blur-xs rounded-2xl rounded-bl-xs p-3 sm:p-4 shadow-lg border-2 border-sky-300 relative text-slate-800">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-sky-600">
            {stageTitle}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReadAloud}
              title="Read aloud"
              className="p-1 text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleHint}
              className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                showHint
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-amber-50'
              }`}
            >
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>{showHint ? 'Hide Hint' : 'Need Hint?'}</span>
            </button>
          </div>
        </div>

        <p className="text-sm sm:text-base font-extrabold text-slate-800 leading-snug">
          "{speechText}"
        </p>

        {showHint && (
          <div className="mt-2 pt-2 border-t border-amber-200 bg-amber-50/80 -mx-2 -mb-2 p-2 rounded-b-xl text-xs sm:text-sm font-bold text-amber-900 flex items-start gap-1.5 animate-in fade-in">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>{hintText}</span>
          </div>
        )}
      </div>
    </div>
  );
};
