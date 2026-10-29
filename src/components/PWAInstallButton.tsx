import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundManager } from '../audio/soundManager';
import { Download, Smartphone, X, CheckCircle, Sparkles } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showFirstVisitPrompt, setShowFirstVisitPrompt] = useState(false);

  useEffect(() => {
    // Check if first visit
    const hasSeenPrompt = localStorage.getItem('port_manager_install_prompt_seen');
    if (!hasSeenPrompt && !isInstalled) {
      const timer = setTimeout(() => {
        setShowFirstVisitPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  const handleDismissFirstVisit = () => {
    soundManager.playClick();
    localStorage.setItem('port_manager_install_prompt_seen', 'true');
    setShowFirstVisitPrompt(false);
  };

  const handleInstallClick = async () => {
    soundManager.playClick();
    if (isInstallable) {
      const success = await install();
      if (success) {
        setShowFirstVisitPrompt(false);
        localStorage.setItem('port_manager_install_prompt_seen', 'true');
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
      setShowFirstVisitPrompt(false);
      localStorage.setItem('port_manager_install_prompt_seen', 'true');
    } else {
      // Browser didn't trigger prompt yet or desktop browser
      setShowIOSGuide(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-800 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-400">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Installed</span>
      </div>
    );
  }

  return (
    <>
      {/* Header Install Button */}
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-slate-900 font-extrabold text-xs sm:text-sm px-3.5 py-2 rounded-2xl shadow-md border-2 border-white/80 transition-all duration-200 cursor-pointer"
        title="Install game on your phone or tablet"
      >
        <Smartphone className="w-4 h-4 text-slate-900 animate-bounce" />
        <span>Install App</span>
      </button>

      {/* First-Visit Pop-up Modal / Banner */}
      {showFirstVisitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border-4 border-amber-300 relative text-center animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={handleDismissFirstVisit}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Download className="w-8 h-8 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Manifest Ready
            </div>

            <h3 className="text-xl font-black text-slate-800 mb-1">
              Install Little Port Manager!
            </h3>
            <p className="text-sm font-semibold text-slate-600 mb-5 leading-snug">
              Install this 3D math game onto your phone or tablet home screen for instant full-screen play anytime!
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 active:scale-98 text-white text-base font-extrabold rounded-2xl shadow-lg border-2 border-white cursor-pointer transition"
              >
                📲 Install on Device
              </button>
              <button
                onClick={handleDismissFirstVisit}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Play in Browser for Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device-Adaptive Installation Helper Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border-4 border-sky-300 text-center animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Smartphone className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Install Little Port Manager
            </h3>
            <p className="text-xs text-slate-500 font-semibold mb-3">
              Play offline anytime on your home screen!
            </p>

            {isIOS ? (
              <div className="text-left bg-sky-50 p-4 rounded-2xl mb-4 text-xs sm:text-sm font-semibold text-slate-700 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>In Safari, tap the <strong>Share</strong> button (box with upward arrow) at the bottom toolbar.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Tap <strong>Add</strong> in the top right corner. Done!</span>
                </p>
              </div>
            ) : (
              <div className="text-left bg-sky-50 p-4 rounded-2xl mb-4 text-xs sm:text-sm font-semibold text-slate-700 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Tap the Chrome menu <strong>(three dots ⋮)</strong> in the top right.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Tap <strong>Install</strong> when prompted to start playing as an app!</span>
                </p>
              </div>
            )}

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold cursor-pointer transition"
            >
              Got it! Let's Play
            </button>
          </div>
        </div>
      )}
    </>
  );
};
