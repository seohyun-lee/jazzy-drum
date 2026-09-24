// Lightweight, local-only drum transcription. Full mixes are ambiguous, so these
// are timing/instrument estimates rather than isolated drum stems.
export function analyzeAudio(buffer) {
  const sampleRate = buffer.sampleRate;
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
  const hop = Math.max(1, Math.round(sampleRate * 0.01));
  const frames = Math.ceil(buffer.length / hop);
  const bands = [new Float32Array(frames), new Float32Array(frames), new Float32Array(frames)];
  const lowFactor = 1 - Math.exp(-2 * Math.PI * 170 / sampleRate);
  const midFactor = 1 - Math.exp(-2 * Math.PI * 2300 / sampleRate);
  let low = 0;
  let mid = 0;
  for (let i = 0; i < buffer.length; i++) {
    let sample = 0;
    for (const channel of channels) sample += channel[i] / channels.length;
    low += lowFactor * (sample - low);
    mid += midFactor * (sample - mid);
    const frame = Math.floor(i / hop);
    bands[0][frame] += low * low;
    bands[1][frame] += (mid - low) ** 2;
    bands[2][frame] += (sample - mid) ** 2;
  }

  const flux = bands.map((band) => {
    const result = new Float32Array(frames);
    let previous = 0;
    for (let i = 0; i < frames; i++) {
      const energy = Math.log1p(60 * Math.sqrt(band[i] / hop));
      result[i] = Math.max(0, energy - previous);
      previous = energy;
    }
    return result;
  });
  const combined = new Float32Array(frames);
  for (let i = 0; i < frames; i++) combined[i] = flux[0][i] * 1.5 + flux[1][i] + flux[2][i] * 0.75;
  const peaks = [];
  let lastPeak = -20;
  for (let i = 3; i < frames - 3; i++) {
    const localStart = Math.max(0, i - 30);
    const localEnd = Math.min(frames, i + 30);
    let localMean = 0;
    for (let j = localStart; j < localEnd; j++) localMean += combined[j];
    localMean /= localEnd - localStart;
    if (combined[i] < Math.max(0.018, localMean * 2.25) || combined[i] < combined[i - 1] || combined[i] < combined[i + 1]) continue;
    if (i - lastPeak < 9) {
      if (peaks.length && combined[i] > peaks.at(-1).strength) peaks[peaks.length - 1] = makePeak(i, combined[i], flux, hop, sampleRate);
      lastPeak = i;
      continue;
    }
    peaks.push(makePeak(i, combined[i], flux, hop, sampleRate));
    lastPeak = i;
  }

  const bpm = estimateBpm(peaks, frames, sampleRate / hop);
  const secondsPerBeat = 60 / bpm;
  const maxNotes = Math.min(1200, Math.ceil(buffer.duration * bpm / 60 * 3));
  const selected = peaks.sort((a, b) => b.strength - a.strength).slice(0, maxNotes).sort((a, b) => a.time - b.time);
  const notes = selected.map((peak, index) => ({
    id: index + 1,
    time: peak.time,
    beat: peak.time / secondsPerBeat,
    instrument: classifyPeak(peak),
  }));
  return { bpm, notes, duration: buffer.duration, confidence: confidenceLabel(peaks.length, buffer.duration) };
}

function makePeak(frame, strength, flux, hop, sampleRate) {
  return { time: frame * hop / sampleRate, strength, low: flux[0][frame], mid: flux[1][frame], high: flux[2][frame] };
}

function classifyPeak(peak) {
  const { low, mid, high } = peak;
  if (low > mid * 1.15 && low > high * 1.35) return 'kick';
  if (mid > high * 0.8 && mid > low * 0.75) return 'snare';
  if (high > Math.max(low, mid) * 2.2 && peak.strength > 0.35) return 'ride';
  return 'hh';
}

function estimateBpm(peaks, frames, frameRate) {
  if (peaks.length < 4) return 100;
  const impulses = new Float32Array(frames);
  for (const peak of peaks) {
    const frame = Math.round(peak.time * frameRate);
    if (frame < frames) impulses[frame] = Math.min(1, peak.strength);
  }
  let bestBpm = 100;
  let bestScore = 0;
  for (let bpm = 60; bpm <= 180; bpm++) {
    const lag = Math.round(60 * frameRate / bpm);
    let score = 0;
    for (const peak of peaks) {
      const frame = Math.round(peak.time * frameRate);
      if (frame + lag >= frames) continue;
      for (let tolerance = -2; tolerance <= 2; tolerance++) {
        score += Math.min(1, peak.strength) * (impulses[frame + lag + tolerance] || 0) * (tolerance === 0 ? 1 : 0.5);
      }
    }
    // Avoid selecting double tempo from a steady eighth-note hi-hat pattern.
    score *= bpm > 145 ? 0.86 : 1;
    if (score > bestScore) { bestScore = score; bestBpm = bpm; }
  }
  return bestBpm;
}

function confidenceLabel(count, duration) {
  const rate = count / Math.max(1, duration);
  if (rate < 0.5) return '낮음';
  if (rate > 8) return '복잡한 믹스';
  return '추정';
}
