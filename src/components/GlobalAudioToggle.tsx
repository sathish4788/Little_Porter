import React, { useEffect, useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { Volume2, VolumeX } from 'lucide-react';

export const GlobalAudioToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(() => soundManager.getMuted());

  useEffect(() => {
    const handleMuteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isMuted: boolean }>;
      setIsMuted(customEvent.detail.isMuted);
    };

    window.addEventListener('port_sound_mute_change', handleMuteChange);
    return () => {
      window.removeEventListener('port_sound_mute_change', handleMuteChange);
    };
  }, []);

  const handleToggle = () => {
    // If enabling sound for the first time, also kick off background music for joyful vibe
    const nextMuted = soundManager.toggleMute();
    setIsMuted(nextMuted);

    if (!nextMuted) {
      if (!soundManager.isBackgroundMusicRunning()) {
        soundManager.startBackgroundMusic();
      }
      soundManager.playClick();
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={isMuted ? 'Turn Sound ON (SFX & Music)' : 'Mute All Sound (SFX & Music)'}
      className={`fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-xl border-2 transition-all duration-200 cursor-pointer active:scale-95 select-none ${
        isMuted
          ? 'bg-rose-500/90 hover:bg-rose-600 text-white border-rose-300'
          : 'bg-emerald-500/90 hover:bg-emerald-600 text-white border-emerald-300'
      }`}
    >
      {isMuted ? (
        <>
          <VolumeX className="w-5 h-5 text-white" />
          <span className="text-xs sm:text-sm font-black tracking-wide">
            Sound OFF
          </span>
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5 text-white animate-pulse" />
          <span className="text-xs sm:text-sm font-black tracking-wide">
            Sound ON
          </span>
        </>
      )}
    </button>
  );
};
