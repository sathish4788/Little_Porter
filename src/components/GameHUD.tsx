import React, { useState } from 'react';
import { TaskStage } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { PWAInstallButton } from './PWAInstallButton';
import { Volume2, VolumeX, Star, Box, Compass, Music } from 'lucide-react';

interface GameHUDProps {
  currentStage: TaskStage;
  onSelectStage: (stage: TaskStage) => void;
  stars: number;
  totalShipped: number;
  level: number;
  onResetShipment: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentStage,
  onSelectStage,
  stars,
  totalShipped,
  level,
  onResetShipment,
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());
  const [isMusicPlaying, setIsMusicPlaying] = useState(() => soundManager.isBackgroundMusicRunning());

  React.useEffect(() => {
    const handleMute = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted: boolean }>;
      setIsMuted(customEvent.detail.isMuted);
    };
    window.addEventListener('port_sound_mute_change', handleMute);
    return () => window.removeEventListener('port_sound_mute_change', handleMute);
  }, []);

  const handleToggleMute = () => {
    soundManager.playClick();
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleMusic = () => {
    soundManager.playClick();
    if (isMusicPlaying) {
      soundManager.stopBackgroundMusic();
      setIsMusicPlaying(false);
    } else {
      soundManager.startBackgroundMusic();
      setIsMusicPlaying(true);
    }
  };

  const stages: { id: TaskStage; label: string; icon: string }[] = [
    { id: 'godown', label: '1. Godown ➔ Truck', icon: '🏭' },
    { id: 'station', label: '2. Truck ➔ Train', icon: '🚂' },
    { id: 'forklift', label: '3. Train ➔ Container', icon: '🚜' },
    { id: 'harbor', label: '4. Container ➔ Ship', icon: '🚢' },
  ];

  return (
    <header className="w-full max-w-5xl mx-auto px-2 pt-2 pb-1 flex flex-col gap-2">
      {/* Top Navbar */}
      <div className="flex items-center justify-between gap-2 bg-white/90 backdrop-blur-xs px-3 sm:px-4 py-2 rounded-2xl shadow-md border-2 border-sky-200">
        {/* Brand & Level */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center text-xl shadow-inner">
            ⚓️
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-slate-800 tracking-tight leading-none">
              Little Port Manager
            </h1>
            <span className="text-[10px] sm:text-[11px] font-bold text-sky-600">
              Grade 3 Math • Level {level}
            </span>
          </div>
        </div>

        {/* Stats: Stars & Shipped */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-xl">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-xs sm:text-sm font-black text-amber-800">{stars}</span>
          </div>
          <div className="hidden xs:flex items-center gap-1.5 bg-sky-50 border border-sky-300 px-2.5 py-1 rounded-xl">
            <Box className="w-4 h-4 text-sky-600" />
            <span className="text-xs sm:text-sm font-black text-sky-800">
              {totalShipped} Shipped
            </span>
          </div>
        </div>

        {/* Controls: Audio & PWA Install */}
        <div className="flex items-center gap-1.5">
          {/* Music Toggle */}
          <button
            onClick={handleToggleMusic}
            title={isMusicPlaying ? 'Pause Melody' : 'Play Cheerful Melody'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isMusicPlaying
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Sound Effects Mute Toggle */}
          <button
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isMuted
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Install PWA Button */}
          <PWAInstallButton />
        </div>
      </div>

      {/* Stage Navigation Pills */}
      <div className="flex items-center justify-center gap-1.5 sm:gap-3 bg-white/80 backdrop-blur-xs p-1.5 rounded-2xl shadow-sm border border-sky-200 self-center">
        {stages.map((stage) => {
          const isActive = currentStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => {
                soundManager.playClick();
                onSelectStage(stage.id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-md scale-105 border-2 border-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
              }`}
            >
              <span>{stage.icon}</span>
              <span className="hidden sm:inline">{stage.label}</span>
              <span className="sm:hidden">{stage.label.split('.')[1]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
