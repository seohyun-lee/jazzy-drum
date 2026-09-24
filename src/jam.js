export function tempoFromFourTaps(taps) {
  if (taps.length < 4) return null;
  const recent = taps.slice(-4);
  const intervals = recent.slice(1).map((time, index) => time - recent[index]);
  if (intervals.some(interval => interval < 0.22 || interval > 1.5)) return null;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[1];
  if (intervals.some(interval => Math.abs(interval - median) / median > 0.32)) return null;
  return clampTempo(60 / (intervals.reduce((sum, value) => sum + value, 0) / intervals.length));
}

export function followTempo(currentBpm, gap) {
  if (!Number.isFinite(gap) || gap < 0.12 || gap > 2.5) return currentBpm;
  const beat = 60 / currentBpm;
  const divisions = [0.5, 1, 2, 4];
  const division = divisions.reduce((best, value) =>
    Math.abs(gap / value - beat) < Math.abs(gap / best - beat) ? value : best
  );
  const observed = clampTempo(60 / (gap / division));
  if (Math.abs(observed - currentBpm) / currentBpm > 0.38) return currentBpm;
  return Math.round((currentBpm * 0.82 + observed * 0.18) * 10) / 10;
}

function clampTempo(bpm) {
  while (bpm < 50) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm);
}
