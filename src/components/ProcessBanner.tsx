import React from 'react';
import { TaskStage } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { FastForward, Loader2 } from 'lucide-react';

interface ProcessBannerProps {
  stage: TaskStage;
  stepMessage: string;
  progressPercent: number;
  onSkip: () => void;
}

export const ProcessBanner: React.FC<ProcessBannerProps> = ({
  stage,
  stepMessage,
  progressPercent,
  onSkip,
}) => {
  const getStageHeader = () => {
    if (stage === 'godown') return '🏭 Step 1: Godown ➔ Truck Loading & Transit';
    if (stage === 'station') return '🚂 Step 2: Station ➔ Truck to Train Transfer';
    if (stage === 'forklift') return '🚜 Step 3: Yard ➔ Train to Container (Forklift)';
    return '🚢 Step 4: Harbor ➔ Container to Cargo Ship';
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/65 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-2xl border-2 border-white/40 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 drop-shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          {getStageHeader()}
        </span>
        <button
          onClick={() => {
            soundManager.playClick();
            onSkip();
          }}
          className="flex items-center gap-1 text-[11px] font-bold text-white/90 hover:text-white bg-white/20 hover:bg-white/30 border border-white/30 px-2.5 py-1 rounded-xl transition cursor-pointer backdrop-blur-xs"
        >
          <span>Skip</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-3 mb-2.5">
        {/* Animated Mascot Mini Badge */}
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400/90 border-2 border-white/80 shadow-md flex items-center justify-center shrink-0">
          <span className="text-xl animate-bounce">👷‍♂️</span>
        </div>

        {/* Live Logistics Narration */}
        <div className="flex-1 bg-white/15 backdrop-blur-xs rounded-2xl p-2.5 border border-white/25">
          <p className="text-xs sm:text-sm font-black text-white leading-snug drop-shadow-xs">
            "{stepMessage}"
          </p>
        </div>
      </div>

      {/* Transparent Glassmorphic Progress Bar */}
      <div>
        <div className="flex justify-between text-[10px] font-black text-white/80 mb-1">
          <span>Goods Moving Along Logistics Route...</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2.5 bg-black/25 backdrop-blur-xs rounded-full overflow-hidden border border-white/30">
          <div
            className="h-full bg-gradient-to-r from-amber-400/85 via-emerald-400/90 to-cyan-400/95 rounded-full transition-all duration-150 ease-out shadow-inner"
            style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
