import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { soundManager } from '../audio/soundManager';
import { Trophy, Star, ArrowRight, Anchor, Sparkles, Volume2 } from 'lucide-react';

interface VictoryModalProps {
  level: number;
  stars: number;
  totalShipped: number;
  onNextLevel: () => void;
  onExplore: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  stars,
  totalShipped,
  onNextLevel,
  onExplore,
}) => {
  useEffect(() => {
    // Big steam whistle blast as the ship leaves the harbor!
    soundManager.playBigShipWhistle();

    setTimeout(() => {
      soundManager.playCorrectDing();
    }, 600);

    const count = 220;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  const handleBlowWhistleAgain = () => {
    soundManager.playBigShipWhistle();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-amber-400 text-center relative overflow-hidden">
        {/* Decorative background sunburst */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-200/50 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-200/50 rounded-full blur-xl" />

        <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 text-white rounded-3xl flex items-center justify-center mx-auto mb-2.5 shadow-lg border-2 border-white animate-bounce">
          <Trophy className="w-10 h-10 stroke-[2.5]" />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 font-black text-xs px-3.5 py-1 rounded-full mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          Ship Setting Sail Overseas!
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">
          Master Port Manager!
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-3.5">
          You packed the factory, loaded the wagons, and hoisted all containers aboard the ship!
        </p>

        {/* Big Ship Whistle Button */}
        <button
          onClick={handleBlowWhistleAgain}
          title="Blow the Big Ship Whistle!"
          className="mb-4 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-black px-4 py-2.5 rounded-2xl shadow-md border-2 border-sky-300 cursor-pointer transition"
        >
          <Volume2 className="w-4 h-4 animate-pulse text-yellow-300" />
          <span>Blow Big Ship Whistle! 🚢💨</span>
        </button>

        {/* Certificate Badge */}
        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3.5 mb-4">
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-0.5">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-base sm:text-lg font-black text-slate-800">{stars}</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">Stars Earned</span>
            </div>

            <div className="h-8 w-px bg-slate-300" />

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sky-600 mb-0.5">
                <Anchor className="w-4 h-4" />
                <span className="text-base sm:text-lg font-black text-slate-800">{totalShipped}</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">Crates Shipped</span>
            </div>

            <div className="h-8 w-px bg-slate-300" />

            <div className="text-center">
              <div className="text-base sm:text-lg font-black text-emerald-600 mb-0.5">
                Lv. {level}
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500">Port Rank</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onNextLevel();
            }}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white font-black text-base rounded-2xl shadow-lg border-2 border-white flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <span>Start Next Shipment (Level {level + 1})</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onExplore();
            }}
            className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer transition"
          >
            Watch the Ship Sail Away in 3D
          </button>
        </div>
      </div>
    </div>
  );
};
