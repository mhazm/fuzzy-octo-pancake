/**
 * Halloween Audio Effects Synthesizer using Web Audio API
 * Menghasilkan efek suara real-time tanpa ketergantungan file eksternal:
 * - Ghost poke chime (saat ghost diklik)
 * - Glass shatter (suara kaca retak/pecah keras)
 * - Horror scream / jumpscare blast (efek kejut audio teror intens)
 */

class HalloweenAudio {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Suara saat ghost diklik (chime/giggle bernuansa mistis)
   */
  playGhostClick(pitchMultiplier: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440 * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(880 * pitchMultiplier, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(320 * pitchMultiplier, now + 0.3);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("Gagal memainkan suara click:", e);
    }
  }

  /**
   * Suara kaca retak (glass shatter burst)
   */
  playGlassShatter() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.8;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Noise generation untuk pecahan kaca
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.15));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // High-pass filter agar terdengar seperti kaca garing pecah
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1200, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.75);
    } catch (e) {
      console.warn("Gagal memainkan suara glass shatter:", e);
    }
  }

  /**
   * Suara Jumpscare Sinematik: Drone kemunculan 0.8s -> Ledakan scream menerjang -> Kaca retak saat whiteout
   */
  playIntenseJumpscare() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Drone mencekam saat driver terlihat jelas (0s - 0.8s)
      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();
      droneOsc.type = "sawtooth";
      droneOsc.frequency.setValueAtTime(65, now);
      droneOsc.frequency.linearRampToValueAtTime(115, now + 0.8);
      droneGain.gain.setValueAtTime(0.3, now);
      droneGain.gain.linearRampToValueAtTime(0.65, now + 0.8);
      droneOsc.connect(droneGain);
      droneGain.connect(ctx.destination);
      droneOsc.start(now);
      droneOsc.stop(now + 0.85);

      // 2. Ledakan Screamer saat hantu menerjang maju (mulai detik ke-0.8)
      const chargeTime = now + 0.8;
      const frequencies = [760, 840, 1150, 1320, 1580];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? "sawtooth" : "square";
        osc.frequency.setValueAtTime(freq, chargeTime);
        osc.frequency.linearRampToValueAtTime(freq * 1.35, chargeTime + 0.4);
        osc.frequency.linearRampToValueAtTime(freq * 0.85, chargeTime + 1.1);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.6, chargeTime + 1.9);

        gain.gain.setValueAtTime(0.01, chargeTime);
        gain.gain.linearRampToValueAtTime(0.35, chargeTime + 0.08);
        gain.gain.linearRampToValueAtTime(0.3, chargeTime + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, chargeTime + 2.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(chargeTime);
        osc.stop(chargeTime + 2.0);
      });

      // 3. Sub-Bass Rumble saat menerjang
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = "sawtooth";
      subOsc.frequency.setValueAtTime(160, chargeTime);
      subOsc.frequency.exponentialRampToValueAtTime(35, chargeTime + 1.2);
      subGain.gain.setValueAtTime(0.85, chargeTime);
      subGain.gain.exponentialRampToValueAtTime(0.001, chargeTime + 1.9);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(chargeTime);
      subOsc.stop(chargeTime + 1.9);

      // 4. Kaca retak keras saat mencapai titik benturan / whiteout (+2.3s)
      setTimeout(() => {
        this.playGlassShatter();
      }, 2300);
    } catch (e) {
      console.warn("Gagal memainkan jumpscare sound:", e);
    }
  }
}

export const halloweenAudio = new HalloweenAudio();
