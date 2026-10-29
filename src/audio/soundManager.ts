/**
 * 100% Procedural Web Audio API Sound Generator
 * Zero external mp3/wav files required!
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isMusicPlaying: boolean = false;
  private musicTimer: number | null = null;

  constructor() {
    // Load persistent mute state
    try {
      const saved = localStorage.getItem('port_manager_global_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    } catch {
      this.isMuted = false;
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);

      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    return this.setMute(!this.isMuted);
  }

  public setMute(muted: boolean): boolean {
    this.isMuted = muted;
    try {
      localStorage.setItem('port_manager_global_muted', String(muted));
    } catch {
      // Safe catch
    }

    if (this.ctx) {
      if (this.musicGain) {
        this.musicGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);
      }
      if (this.sfxGain) {
        this.sfxGain.gain.setValueAtTime(this.isMuted ? 0 : 0.65, this.ctx.currentTime);
      }
    }

    // Broadcast to UI components
    window.dispatchEvent(new CustomEvent('port_sound_mute_change', { detail: { isMuted: this.isMuted } }));
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Box thud: deep wooden/cardboard landing thump
  public playBoxThud() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const now = this.ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, now);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Audio fallback silent
    }
  }

  // Truck Horn: two-tone warm friendly honk
  public playTruckHorn() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const freqs = [330, 392]; // E4 & G4
      freqs.forEach((f) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.setValueAtTime(0.2, now + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 0.36);
      });
    } catch {
      // Fallback
    }
  }

  // Train Whistle: two-chime steam whistle (D5 + F#5 + A5)
  public playTrainWhistle() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const notes = [587.33, 739.99, 880.0]; // D5, F#5, A5
      notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq + 4, now + 0.25);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.5);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
        gain.gain.setValueAtTime(0.18, now + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 0.66);
      });
    } catch {
      // Fallback
    }
  }

  // Standard Ship Horn
  public playShipHorn() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const pitches = [110, 138.59]; // A2 + C#3
      pitches.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
        gain.gain.setValueAtTime(0.3, now + 0.85);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now);
        osc.stop(now + 1.35);
      });
    } catch {
      // Fallback
    }
  }

  /**
   * BIG WHISTLE BLOW FOR SHIP DEPARTURE:
   * Powerful, deep, resonant oceanic steam whistle blast with rich harmonics and coastal echo!
   */
  public playBigShipWhistle() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      // Majestic chord: G2 (98 Hz), D3 (146.8 Hz), G3 (196 Hz), B3 (246.9 Hz)
      const freqs = [98.0, 146.83, 196.0, 246.94];

      // Two blast pattern: short herald blast (0.8s), breath (0.3s), then long grand majestic blast (2.4s)
      const blasts = [
        { start: now + 0.05, duration: 0.85, volume: 0.35 },
        { start: now + 1.1, duration: 2.5, volume: 0.5 },
      ];

      blasts.forEach((blast) => {
        freqs.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(freq, blast.start);
          // Subtle natural pitch sag & rise under high steam pressure
          osc.frequency.linearRampToValueAtTime(freq * 1.015, blast.start + blast.duration * 0.4);
          osc.frequency.linearRampToValueAtTime(freq, blast.start + blast.duration);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(380 + idx * 60, blast.start);

          const peakVol = blast.volume / (1 + idx * 0.3);
          gain.gain.setValueAtTime(0.001, blast.start);
          gain.gain.linearRampToValueAtTime(peakVol, blast.start + 0.12);
          gain.gain.setValueAtTime(peakVol, blast.start + blast.duration - 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, blast.start + blast.duration + 0.6); // Deep coastal echo decay

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain!);

          osc.start(blast.start);
          osc.stop(blast.start + blast.duration + 0.7);
        });

        // Steam hiss texture
        try {
          const bufferSize = this.ctx!.sampleRate * (blast.duration + 0.4);
          const noiseBuffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }

          const whiteNoise = this.ctx!.createBufferSource();
          whiteNoise.buffer = noiseBuffer;

          const noiseFilter = this.ctx!.createBiquadFilter();
          noiseFilter.type = 'bandpass';
          noiseFilter.frequency.setValueAtTime(1200, blast.start);
          noiseFilter.Q.setValueAtTime(1.5, blast.start);

          const noiseGain = this.ctx!.createGain();
          noiseGain.gain.setValueAtTime(0.001, blast.start);
          noiseGain.gain.linearRampToValueAtTime(0.08, blast.start + 0.1);
          noiseGain.gain.setValueAtTime(0.08, blast.start + blast.duration - 0.15);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, blast.start + blast.duration + 0.3);

          whiteNoise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(this.sfxGain!);

          whiteNoise.start(blast.start);
          whiteNoise.stop(blast.start + blast.duration + 0.35);
        } catch {
          // Noise fallback safe
        }
      });
    } catch {
      // Fallback
    }
  }

  // Correct Ding: bright joyful marimba arpeggio (C5 -> E5 -> G5 -> C6)
  public playCorrectDing() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const arpeggio = [523.25, 659.25, 783.99, 1046.5];
      arpeggio.forEach((pitch, i) => {
        const noteTime = now + i * 0.08;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(pitch, noteTime);

        gain.gain.setValueAtTime(0.3, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(noteTime);
        osc.stop(noteTime + 0.36);
      });
    } catch {
      // Fallback
    }
  }

  // Gentle Try Again tone
  public playTryAgainTone() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const tones = [370, 311];
      tones.forEach((pitch, idx) => {
        const noteTime = now + idx * 0.14;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, noteTime);

        gain.gain.setValueAtTime(0.25, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(noteTime);
        osc.stop(noteTime + 0.23);
      });
    } catch {
      // Fallback
    }
  }

  // UI Pop
  public playClick() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Fallback
    }
  }

  // Crane whirr
  public playCraneHum() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain || this.isMuted) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.4);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.75);
    } catch {
      // Fallback
    }
  }

  // Gentle, cheerful procedural music loop
  public startBackgroundMusic() {
    if (this.isMusicPlaying) return;
    this.isMusicPlaying = true;
    this.initContext();

    const melodyNotes = [
      523.25, 659.25, 783.99, 659.25,
      587.33, 698.46, 880.00, 698.46,
      783.99, 987.77, 880.00, 783.99,
      659.25, 587.33, 523.25, 783.99,
    ];

    let noteIndex = 0;
    const tempo = 220;

    const playNextMelodyNote = () => {
      if (!this.isMusicPlaying) return;

      try {
        if (this.ctx && this.musicGain && !this.isMuted) {
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(melodyNotes[noteIndex], now);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.002, now + 0.18);

          osc.connect(gain);
          gain.connect(this.musicGain);

          osc.start(now);
          osc.stop(now + 0.2);
        }
      } catch {
        // Safe catch
      }

      noteIndex = (noteIndex + 1) % melodyNotes.length;
      this.musicTimer = window.setTimeout(playNextMelodyNote, tempo);
    };

    playNextMelodyNote();
  }

  public stopBackgroundMusic() {
    this.isMusicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public isBackgroundMusicRunning(): boolean {
    return this.isMusicPlaying;
  }
}

export const soundManager = new SoundManager();
