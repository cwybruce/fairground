// Every sound is synthesized with WebAudio: no audio files, no network. The engine hums
// while driving, the siren wails at three stars and up, gunshots crack, and a little jingle
// plays when a mission pays out. M toggles mute.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  /** Call from a user gesture at least once; browsers block audio before that. */
  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * seconds)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, seconds, type, volume) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** A short pickup blip. */
    pickup() {
      blip(880, 0.12, 'sine', 0.25);
      setTimeout(() => blip(1320, 0.14, 'sine', 0.2), 70);
    },
    /** A coin-till jingle: four rising notes. */
    jingle() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => blip(freq, 0.22, 'triangle', 0.28), i * 95);
      });
    },
    /** A gunshot crack. */
    gunshot() {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.12);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t);
    },
    /** A soft thud when the player is hit. */
    hurt() {
      blip(140, 0.18, 'sawtooth', 0.22);
    },
    /** Engine hum follows the speed; call every frame while driving, or with 0 to stop it. */
    engine(speed, maxSpeed) {
      if (!ensure()) return;
      if (speed <= 1 || muted) {
        if (engineOsc) {
          try { engineOsc.stop(); } catch { /* already stopped */ }
          engineOsc = null;
          engineGain = null;
        }
        return;
      }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0.05;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      const ratio = Math.min(1, speed / maxSpeed);
      engineOsc.frequency.setValueAtTime(55 + ratio * 130, ctx.currentTime);
      engineGain.gain.value = muted ? 0 : 0.04 + ratio * 0.05;
    },
    /** Two-tone siren; call every frame with the wanted level (0 silences it). */
    siren(wanted, dt) {
      if (!ensure()) return;
      if (wanted < 3 || muted) {
        if (sirenOsc) {
          try { sirenOsc.stop(); } catch { /* already stopped */ }
          sirenOsc = null;
          sirenGain = null;
        }
        return;
      }
      if (!sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'square';
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.045;
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        sirenTimer = 0;
        sirenHigh = false;
      }
      sirenTimer += dt;
      if (sirenTimer > 0.45) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setValueAtTime(sirenHigh ? 920 : 620, ctx.currentTime);
      }
    },
  };
}
