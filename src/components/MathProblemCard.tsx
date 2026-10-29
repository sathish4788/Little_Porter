import React, { useState } from 'react';
import { MathProblem } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { Check, Sparkles, RefreshCw } from 'lucide-react';

interface MathProblemCardProps {
  problem: MathProblem;
  onSolve: (answeredCorrect: boolean) => void;
  isTransitioning: boolean;
}

export const MathProblemCard: React.FC<MathProblemCardProps> = ({
  problem,
  onSolve,
  isTransitioning,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isScrollingUp, setIsScrollingUp] = useState<boolean>(false);

  const handleSelectOption = (option: number) => {
    if (isTransitioning || feedbackState === 'correct' || isScrollingUp) return;

    setSelectedOption(option);

    if (option === problem.targetAnswer) {
      setFeedbackState('correct');
      soundManager.playCorrectDing();

      if (problem.stage === 'godown') {
        soundManager.playBoxThud();
      } else if (problem.stage === 'station') {
        soundManager.playTruckHorn();
        soundManager.playTrainWhistle();
      } else if (problem.stage === 'forklift') {
        soundManager.playBoxThud();
        soundManager.playCraneHum();
      } else if (problem.stage === 'harbor') {
        soundManager.playShipHorn();
      }

      // Smoothly scroll/slide up the question board immediately so the background 3D process is fully visible!
      setIsScrollingUp(true);

      setTimeout(() => {
        onSolve(true);
        setSelectedOption(null);
        setFeedbackState('idle');
        setIsScrollingUp(false);
      }, 500);
    } else {
      setFeedbackState('wrong');
      soundManager.playTryAgainTone();
      setTimeout(() => {
        setFeedbackState('idle');
        setSelectedOption(null);
      }, 1200);
    }
  };

  return (
    <div
      className={`w-full max-w-xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-sky-300 text-slate-800 transition-all duration-700 ease-in-out ${
        isScrollingUp
          ? '-translate-y-48 sm:-translate-y-72 opacity-0 pointer-events-none scale-90'
          : 'translate-y-0 opacity-100'
      }`}
    >
      {/* Top Equation Bar */}
      <div className="flex items-center justify-between bg-sky-50 px-4 py-2 rounded-2xl border border-sky-200 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{problem.cargo.emoji}</span>
          <span className="text-xs sm:text-sm font-black text-slate-700">
            {problem.cargo.name}
          </span>
        </div>
        <div className="bg-white px-3.5 py-1 rounded-xl shadow-xs border-2 border-sky-300">
          <span className="text-base sm:text-lg font-black text-blue-600 tracking-wider">
            {problem.equationDisplay}
          </span>
        </div>
      </div>

      {/* Story Question Text */}
      <h2 className="text-sm sm:text-base font-black text-slate-800 text-center mb-2.5 leading-snug">
        {problem.questionText}
      </h2>

      {/* Visual Math Model */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-2.5 mb-3.5">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mb-1.5">
          {problem.operation === 'multiplication'
            ? `Visual Array (${problem.arrayRows} rows × ${problem.arrayCols} columns)`
            : `Fair Share (${problem.factorA} divided into ${problem.factorB} groups)`}
        </div>

        {problem.operation === 'multiplication' ? (
          // Visual Array of Cargo Boxes
          <div className="flex flex-col items-center justify-center gap-1.5 overflow-x-auto py-1">
            {Array.from({ length: problem.arrayRows }).map((_, rIdx) => (
              <div key={rIdx} className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-slate-400 w-3 text-right">
                  {rIdx + 1}
                </span>
                {Array.from({ length: problem.arrayCols }).map((_, cIdx) => (
                  <div
                    key={cIdx}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm flex items-center justify-center text-xs font-black text-white border-2 border-white transition-transform duration-200 hover:scale-110 ${problem.cargo.colorCss}`}
                    title={`Box ${rIdx * problem.arrayCols + cIdx + 1}`}
                  >
                    📦
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          // Fair-Sharing Trays / Wagons for Division
          <div className="flex flex-wrap items-center justify-center gap-2 overflow-x-auto py-1">
            {Array.from({ length: problem.arrayRows }).map((_, gIdx) => (
              <div
                key={gIdx}
                className="bg-white border-2 border-sky-200 rounded-xl p-1.5 flex flex-col items-center shadow-xs min-w-[56px]"
              >
                <div className="text-[10px] font-extrabold text-sky-600 mb-1">
                  Group {gIdx + 1}
                </div>
                <div className="flex flex-wrap justify-center gap-1 max-w-[76px]">
                  {Array.from({ length: problem.arrayCols }).map((_, iIdx) => (
                    <div
                      key={iIdx}
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] text-white shadow-xs ${problem.cargo.colorCss}`}
                    >
                      📦
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {problem.options.map((option) => {
          const isSelected = selectedOption === option;
          const isCorrect = isSelected && feedbackState === 'correct';
          const isWrong = isSelected && feedbackState === 'wrong';

          let btnColor =
            'bg-white text-slate-800 border-slate-200 hover:border-sky-400 hover:bg-sky-50 shadow-sm';
          if (isCorrect) {
            btnColor =
              'bg-emerald-500 text-white border-emerald-600 scale-105 shadow-lg animate-bounce';
          } else if (isWrong) {
            btnColor =
              'bg-rose-500 text-white border-rose-600 animate-shake';
          }

          return (
            <button
              key={option}
              onClick={() => handleSelectOption(option)}
              disabled={isTransitioning || feedbackState === 'correct' || isScrollingUp}
              className={`h-13 sm:h-15 rounded-2xl border-3 text-2xl sm:text-3xl font-black flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 cursor-pointer select-none ${btnColor}`}
            >
              <span>{option}</span>
              {isCorrect && <Check className="w-5 h-5 stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* Feedback banner */}
      {feedbackState === 'correct' && (
        <div className="mt-2.5 bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-black p-2 rounded-2xl text-center flex items-center justify-center gap-1.5 animate-in zoom-in-95">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Correct! Scrolling up to watch goods moving...</span>
        </div>
      )}
      {feedbackState === 'wrong' && (
        <div className="mt-2.5 bg-rose-100 text-rose-800 text-xs font-bold p-2 rounded-2xl text-center flex items-center justify-center gap-1.5 animate-in fade-in">
          <RefreshCw className="w-4 h-4 text-rose-600 animate-spin" />
          <span>Almost! Count the boxes in the visual array above and try again!</span>
        </div>
      )}
    </div>
  );
};
