export class DrumAudio {
  constructor() {
    this.context = null;
    this.noiseBuffer = null;
    this.cymbalBuffers = new Map();
    this.cymbalCounts = new Map();
    this.sources = new Set();
  }

  async unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.noiseBuffer = this.makeNoise();
      for (const instrument of ['ride', 'crash', 'crash2']) {
        this.cymbalBuffers.set(instrument, [0, 1, 2].map(variant => this.makeCymbal(instrument, variant)));
      }
    }
    await this.context.resume();
    return this.context.currentTime;
  }

  makeNoise() {
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  track(source, nodes = []) {
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      nodes.forEach(node => node.disconnect());
    };
  }

  stopAll() {
    for (const source of this.sources) {
      try { source.stop(); } catch { /* Already ended. */ }
    }
    this.sources.clear();
  }

  makeCymbal(instrument, variant) {
    const ctx = this.context;
    const ride = instrument === 'ride';
    const seconds = ride ? 1.65 : instrument === 'crash' ? 2.6 : 2.15;
    const count = Math.ceil(seconds * ctx.sampleRate);
    const buffer = ctx.createBuffer(1, count, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const modes = (ride ? [1377, 2031, 2867, 3719, 4823, 6293] : instrument === 'crash' ? [809, 1247, 1901, 2683, 3599, 5039] : [1019, 1637, 2381, 3271, 4583, 6011])
      .map((frequency, index) => ({ phase: variant * index * 0.23, frequency: frequency * (1 + variant * 0.003), decay: (ride ? 0.47 : 0.36) / (1 + index * 0.18), weight: 1 / (1 + index * 0.55) }));
    let seed = 77123 + variant * 2711 + (ride ? 11 : instrument === 'crash' ? 23 : 37);
    let low = 0;
    for (let i = 0; i < count; i++) {
      const t = i / ctx.sampleRate;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      low += 0.36 * (noise - low);
      const high = noise - low;
      let metal = 0;
      for (const mode of modes) {
        mode.phase += 2 * Math.PI * mode.frequency / ctx.sampleRate;
        metal += Math.sin(mode.phase) * mode.weight * Math.exp(-t / mode.decay);
      }
      const wash = Math.exp(-t / (ride ? 0.39 : instrument === 'crash' ? 0.82 : 0.61));
      const attack = Math.exp(-t / (ride ? 0.009 : 0.004));
      const bloom = ride ? 1 : 0.45 + 0.55 * (1 - Math.exp(-t / 0.017));
      const bell = ride ? Math.sin(2 * Math.PI * 1660 * t) * Math.exp(-t / 0.37) * 0.18 : 0;
      data[i] = Math.tanh((high * wash * (ride ? 0.25 : 0.62) * bloom + metal * (ride ? 0.09 : 0.065) + noise * attack * 0.36 + bell) * 0.74)
        * Math.min(1, (seconds - t) / 0.04);
    }
    return buffer;
  }

  cymbal(instrument, time, velocity = 1) {
    const count = this.cymbalCounts.get(instrument) ?? 0;
    this.cymbalCounts.set(instrument, count + 1);
    const source = this.context.createBufferSource();
    const volume = this.context.createGain();
    const pan = this.context.createStereoPanner();
    source.buffer = this.cymbalBuffers.get(instrument)[count % 3];
    volume.gain.value = (instrument === 'ride' ? 0.52 : 0.77) * velocity;
    pan.pan.value = instrument === 'crash' ? -0.38 : instrument === 'crash2' ? 0.46 : 0.25;
    source.connect(volume).connect(pan).connect(this.context.destination);
    this.track(source, [volume, pan]);
    source.start(time);
  }

  oscillator(frequency, endFrequency, time, length, gain, type = 'sine') {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const volume = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    osc.frequency.exponentialRampToValueAtTime(endFrequency, time + length);
    volume.gain.setValueAtTime(gain, time);
    volume.gain.exponentialRampToValueAtTime(0.001, time + length);
    osc.connect(volume).connect(ctx.destination);
    this.track(osc, [volume]);
    osc.start(time);
    osc.stop(time + length + 0.01);
  }

  noise(time, length, gain, highpass = 1000) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'highpass';
    filter.frequency.value = highpass;
    volume.gain.setValueAtTime(gain, time);
    volume.gain.exponentialRampToValueAtTime(0.001, time + length);
    source.connect(filter).connect(volume).connect(ctx.destination);
    this.track(source, [filter, volume]);
    source.start(time);
    source.stop(time + length + 0.01);
  }

  play(instrument, at = this.context?.currentTime, velocity = 1) {
    if (!this.context || at == null) return;
    const time = Math.max(at, this.context.currentTime);
    if (instrument === 'kick') {
      this.oscillator(145, 42, time, 0.22, 0.7 * velocity);
      this.noise(time, 0.03, 0.09 * velocity, 900);
    } else if (instrument === 'snare') {
      this.noise(time, 0.18, 0.32 * velocity, 1300);
      this.oscillator(190, 120, time, 0.11, 0.22 * velocity, 'triangle');
    } else if (instrument === 'hh' || instrument === 'hhPedal') {
      this.noise(time, instrument === 'hhPedal' ? 0.08 : 0.13, 0.16 * velocity, 6500);
    } else if (this.cymbalBuffers.has(instrument)) {
      this.cymbal(instrument, time, velocity);
    } else {
      const start = instrument === 'tom1' ? 180 : instrument === 'tom2' ? 140 : 110;
      this.oscillator(start, start * 0.48, time, 0.28, 0.35 * velocity);
    }
  }

  click(at, strong = false) {
    this.oscillator(strong ? 950 : 720, strong ? 720 : 580, at, 0.035, strong ? 0.12 : 0.07, 'triangle');
  }

  bass(at, note = 55) {
    this.oscillator(note, note * 0.97, at, 0.34, 0.12, 'triangle');
  }

  chord(at, midiNotes, length) {
    if (!this.context) return;
    const ctx = this.context;
    for (const midi of midiNotes.slice(1)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      gain.gain.setValueAtTime(0.001, at);
      gain.gain.linearRampToValueAtTime(0.018, at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, at + length);
      osc.connect(gain).connect(ctx.destination);
      this.track(osc, [gain]);
      osc.start(at);
      osc.stop(at + length + 0.02);
    }
  }
}
