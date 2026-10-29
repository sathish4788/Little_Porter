import React, { useEffect, useRef, useState } from 'react';
import { WorldScene } from './scene/WorldScene';
import { TaskStage, MathProblem } from './types/game';
import { generateProblem } from './math/mathGenerator';
import { soundManager } from './audio/soundManager';
import { GameHUD } from './components/GameHUD';
import { MascotSpeech } from './components/MascotSpeech';
import { MathProblemCard } from './components/MathProblemCard';
import { ProcessBanner } from './components/ProcessBanner';
import { GoodsArrivedModal } from './components/GoodsArrivedModal';
import { VictoryModal } from './components/VictoryModal';
import { GlobalAudioToggle } from './components/GlobalAudioToggle';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';

type GameMode = 'question' | 'processing' | 'arrived' | 'victory';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<WorldScene | null>(null);

  // 4-stage shipment sequence: godown -> station -> forklift -> harbor
  const [stage, setStage] = useState<TaskStage>('godown');
  const [mode, setMode] = useState<GameMode>('question');
  const [level, setLevel] = useState<number>(1);
  const [stars, setStars] = useState<number>(() => {
    const saved = localStorage.getItem('port_manager_stars');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [totalShipped, setTotalShipped] = useState<number>(() => {
    const saved = localStorage.getItem('port_manager_shipped');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(() =>
    generateProblem('godown', 1)
  );

  // Process animation state
  const [processMessage, setProcessMessage] = useState<string>('');
  const [processPercent, setProcessPercent] = useState<number>(0);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  // Initialize Three.js 3D World once on mount
  useEffect(() => {
    if (!mountRef.current) return;

    const world = new WorldScene(mountRef.current);
    worldRef.current = world;

    // Start background music loop on initial user tap if not muted
    const handleFirstGesture = () => {
      if (!soundManager.getMuted() && !soundManager.isBackgroundMusicRunning()) {
        soundManager.startBackgroundMusic();
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
    window.addEventListener('pointerdown', handleFirstGesture);

    return () => {
      world.dispose();
      worldRef.current = null;
      window.removeEventListener('pointerdown', handleFirstGesture);
    };
  }, []);

  // Update 3D scene when problem or stage changes
  useEffect(() => {
    if (!worldRef.current) return;

    if (mode === 'question') {
      worldRef.current.resetToStage(stage);

      if (stage === 'godown') {
        worldRef.current.updateGodownBoxes(
          currentProblem.arrayRows,
          currentProblem.arrayCols,
          currentProblem.cargo.color
        );
      } else if (stage === 'station') {
        worldRef.current.updateStationTrainCargo(
          currentProblem.factorA,
          currentProblem.factorB,
          currentProblem.cargo.color
        );
      } else if (stage === 'forklift') {
        worldRef.current.updateForkliftCargo(
          currentProblem.factorB,
          currentProblem.cargo.color
        );
      } else if (stage === 'harbor') {
        worldRef.current.updateShipContainers(
          currentProblem.arrayRows,
          currentProblem.arrayCols
        );
      }
    }
  }, [stage, currentProblem, mode]);

  // Stage selection from HUD (free navigation)
  const handleSelectStage = (newStage: TaskStage) => {
    if (newStage === stage && mode === 'question') return;
    setStage(newStage);
    setMode('question');
    setCurrentProblem(generateProblem(newStage, level));
  };

  // 1. Math question answered correctly -> Start 3D Logistics Loading Process
  const handleSolveProblem = (answeredCorrect: boolean) => {
    if (!answeredCorrect) return;

    const newStars = stars + 3;
    const newShipped = totalShipped + currentProblem.targetAnswer;
    setStars(newStars);
    setTotalShipped(newShipped);
    localStorage.setItem('port_manager_stars', newStars.toString());
    localStorage.setItem('port_manager_shipped', newShipped.toString());

    // Switch to animated loading process mode
    setMode('processing');
    setProcessPercent(0);
    setProcessMessage('Starting goods loading process...');

    if (worldRef.current) {
      worldRef.current.startGoodsLoadingProcess(
        stage,
        (msg, pct) => {
          setProcessMessage(msg);
          setProcessPercent(pct);
        },
        () => {
          // 2. Goods have arrived! Intimate the player and ask for OK to proceed
          handleGoodsArrived();
        }
      );
    }
  };

  // Skip 3D animation
  const handleSkipProcess = () => {
    if (worldRef.current) {
      worldRef.current.skipLoadingProcess();
    }
  };

  // 2. Goods Arrival Intimation
  const handleGoodsArrived = () => {
    // Stage-specific arrival sounds
    if (stage === 'godown') {
      soundManager.playTruckHorn();
    } else if (stage === 'station') {
      soundManager.playTrainWhistle();
    } else if (stage === 'forklift') {
      soundManager.playBoxThud();
      soundManager.playCraneHum();
    } else if (stage === 'harbor') {
      soundManager.playShipHorn();
    }
    soundManager.playCorrectDing();

    // Show Goods Arrived Confirmation Dialog
    setMode('arrived');
  };

  // 3. User taps "OK to Proceed to Next Process"
  const handleProceedToNextProcess = () => {
    if (stage === 'godown') {
      // Step 1 done -> Step 2: Railway Station (Truck to Train)
      setStage('station');
      setCurrentProblem(generateProblem('station', level));
      setMode('question');
    } else if (stage === 'station') {
      // Step 2 done -> Step 3: Freight Yard (Train to Container via Forklift)
      setStage('forklift');
      setCurrentProblem(generateProblem('forklift', level));
      setMode('question');
    } else if (stage === 'forklift') {
      // Step 3 done -> Step 4: Harbor Crane (Container to Cargo Ship)
      setStage('harbor');
      setCurrentProblem(generateProblem('harbor', level));
      setMode('question');
    } else if (stage === 'harbor') {
      // All 4 stages complete! Ship voyage departure & big whistle celebration
      if (worldRef.current) {
        worldRef.current.sailShipAway();
      }
      setMode('victory');
    }
  };

  // Next shipment level after victory
  const handleNextLevel = () => {
    const nextLvl = level + 1;
    setLevel(nextLvl);
    setStage('godown');
    setCurrentProblem(generateProblem('godown', nextLvl));
    setMode('question');
  };

  const handleExplore = () => {
    setMode('question');
    setIsDockCollapsed(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-300 font-sans select-none">
      {/* 1. Dedicated 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 z-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. Top-Right Corner Persistent Master Audio Toggle */}
      <GlobalAudioToggle />

      {/* 3. Top HUD Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-auto pr-14 sm:pr-36">
        <GameHUD
          currentStage={stage}
          onSelectStage={handleSelectStage}
          stars={stars}
          totalShipped={totalShipped}
          level={level}
          onResetShipment={() => {
            soundManager.playClick();
            setStage('godown');
            setMode('question');
            setCurrentProblem(generateProblem('godown', level));
          }}
        />
      </div>

      {/* 4. Bottom Ergonomic Interaction Dock */}
      <div
        className={`absolute bottom-2 left-0 right-0 z-30 flex flex-col items-center justify-end px-3 transition-transform duration-300 pointer-events-none ${
          isDockCollapsed ? 'translate-y-[calc(100%-48px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Button (only when in question mode) */}
        {mode === 'question' && (
          <button
            onClick={() => {
              soundManager.playClick();
              setIsDockCollapsed((prev) => !prev);
            }}
            className="pointer-events-auto mb-1.5 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs hover:bg-white text-slate-800 text-xs font-black px-4 py-1.5 rounded-full shadow-md border-2 border-sky-300 transition-all cursor-pointer"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-4 h-4 text-sky-600" />
                <span>Show Math Task</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-sky-600" />
                <ChevronDown className="w-4 h-4 text-slate-500" />
                <span>Hide for 3D View</span>
              </>
            )}
          </button>
        )}

        {/* Content Container */}
        <div className="w-full max-w-xl flex flex-col gap-2 pointer-events-auto">
          {mode === 'question' && (
            <>
              {/* Captain Cody Mascot Speech */}
              <MascotSpeech
                stageTitle={currentProblem.title}
                speechText={currentProblem.storyPrompt}
                hintText={currentProblem.hint}
              />

              {/* Math Problem Card (Smoothly scrolls up when correct) */}
              <MathProblemCard
                problem={currentProblem}
                onSolve={handleSolveProblem}
                isTransitioning={false}
              />
            </>
          )}

          {mode === 'processing' && (
            <ProcessBanner
              stage={stage}
              stepMessage={processMessage}
              progressPercent={processPercent}
              onSkip={handleSkipProcess}
            />
          )}
        </div>
      </div>

      {/* 5. Goods Arrived Intimation Modal (Requires user to click OK to proceed) */}
      {mode === 'arrived' && (
        <GoodsArrivedModal
          completedStage={stage}
          problem={currentProblem}
          onProceed={handleProceedToNextProcess}
        />
      )}

      {/* 6. Victory Celebration Modal */}
      {mode === 'victory' && (
        <VictoryModal
          level={level}
          stars={stars}
          totalShipped={totalShipped}
          onNextLevel={handleNextLevel}
          onExplore={handleExplore}
        />
      )}
    </div>
  );
}
