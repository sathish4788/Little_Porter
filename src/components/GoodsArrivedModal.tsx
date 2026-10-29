import React from 'react';
import { TaskStage, MathProblem } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { ArrowRight, CheckCircle2, Truck, Train, Ship, Sparkles, Box } from 'lucide-react';

interface GoodsArrivedModalProps {
  completedStage: TaskStage;
  problem: MathProblem;
  onProceed: () => void;
}

export const GoodsArrivedModal: React.FC<GoodsArrivedModalProps> = ({
  completedStage,
  problem,
  onProceed,
}) => {
  const getStageDetails = () => {
    if (completedStage === 'godown') {
      return {
        badge: 'Step 1 Complete: Godown ➔ Truck',
        title: 'Truck Arrived at Railway Station!',
        description: `The delivery truck drove straight along the roadway from the godown warehouse and parked safely beside the railway platform with ${problem.targetAnswer} boxes of ${problem.cargo.name}.`,
        mathFormula: `${problem.factorA} pallets × ${problem.factorB} boxes = ${problem.targetAnswer} total boxes`,
        nextProcessTitle: 'Next Process: Truck ➔ Train',
        nextProcessDesc: 'Transfer the crates from the truck equally into the train wagons using division!',
        icon: <Truck className="w-10 h-10 text-blue-600" />,
        buttonText: 'OK, Proceed to Railway Station 🚂',
        bgGradient: 'from-blue-500 to-indigo-600',
      };
    } else if (completedStage === 'station') {
      return {
        badge: 'Step 2 Complete: Truck ➔ Train',
        title: 'Train Arrived at Port Freight Yard!',
        description: `All items were loaded into the train wagons. Train #42 blew its steam whistle and chugged down the straight tracks to the freight yard siding.`,
        mathFormula: `${problem.factorA} crates ÷ ${problem.factorB} wagons = ${problem.targetAnswer} crates per wagon`,
        nextProcessTitle: 'Next Process: Train ➔ Container (Forklift)',
        nextProcessDesc: 'Operate the forklift to take time and load crates from the train into the shipping container!',
        icon: <Train className="w-10 h-10 text-emerald-600" />,
        buttonText: 'OK, Proceed to Forklift Loading 🚜',
        bgGradient: 'from-emerald-500 to-teal-600',
      };
    } else if (completedStage === 'forklift') {
      return {
        badge: 'Step 3 Complete: Train ➔ Shipping Container',
        title: 'Container Packed & Sealed!',
        description: `The forklift carefully transported all crates from the train and stacked them securely inside the big red shipping container.`,
        mathFormula: `${problem.factorA} boxes ÷ ${problem.factorB} per trip = ${problem.targetAnswer} forklift trips`,
        nextProcessTitle: 'Next Process: Container ➔ Cargo Ship',
        nextProcessDesc: 'Use the giant yellow gantry crane to hoist the container aboard the overseas vessel!',
        icon: <Box className="w-10 h-10 text-amber-600" />,
        buttonText: 'OK, Proceed to Harbor Crane 🚢',
        bgGradient: 'from-amber-500 to-orange-500',
      };
    } else {
      return {
        badge: 'Step 4 Complete: Container ➔ Cargo Ship',
        title: 'All Containers Hoisted Aboard Vessel!',
        description: `The giant crane hoisted every container into the ship hold bays. The vessel is battened down, ready to cross the ocean!`,
        mathFormula: `${problem.factorA} bays × ${problem.factorB} containers = ${problem.targetAnswer} containers`,
        nextProcessTitle: 'Final Step: Ocean Voyage Departure',
        nextProcessDesc: 'Blow the big ship whistle and celebrate your master shipment!',
        icon: <Ship className="w-10 h-10 text-sky-600" />,
        buttonText: 'OK, Set Sail Overseas! 🏆',
        bgGradient: 'from-sky-500 to-blue-700',
      };
    }
  };

  const details = getStageDetails();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-emerald-400 text-center relative overflow-hidden">
        {/* Top header badge */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full mb-3 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{details.badge}</span>
        </div>

        {/* Central Arrival Icon */}
        <div className="w-18 h-18 bg-emerald-50 rounded-3xl border-3 border-emerald-200 flex items-center justify-center mx-auto mb-3 shadow-inner">
          {details.icon}
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1.5">
          {details.title}
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-600 mb-4 px-2 leading-relaxed">
          {details.description}
        </p>

        {/* Educational Math Formula Card */}
        <div className="bg-sky-50 border-2 border-sky-200 rounded-2xl p-3.5 mb-3 text-left">
          <div className="text-[11px] font-black uppercase text-sky-600 tracking-wider mb-1">
            Math Lesson Learned:
          </div>
          <div className="text-base sm:text-lg font-black text-blue-700 flex items-center gap-2">
            <span>{problem.cargo.emoji}</span>
            <span>{details.mathFormula}</span>
          </div>
        </div>

        {/* Next Process Teaser */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-5 text-left">
          <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">
            {details.nextProcessTitle}
          </div>
          <div className="text-xs font-bold text-slate-700">
            {details.nextProcessDesc}
          </div>
        </div>

        {/* Action Button: OK to Proceed */}
        <button
          onClick={() => {
            soundManager.playClick();
            onProceed();
          }}
          className={`w-full py-3.5 bg-gradient-to-r ${details.bgGradient} hover:opacity-95 active:scale-98 text-white font-black text-base sm:text-lg rounded-2xl shadow-xl border-2 border-white flex items-center justify-center gap-2 cursor-pointer transition`}
        >
          <span>{details.buttonText}</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
