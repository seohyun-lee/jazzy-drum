export function fixedPageLayout(time, beatSeconds, meter, width) {
  const beatsPerPage = meter * (width < 600 ? 1 : 2);
  const duration = beatsPerPage * beatSeconds;
  const pageIndex = Math.floor(Math.max(0, time) / duration);
  const startBeat = pageIndex * beatsPerPage;
  const endBeat = startBeat + beatsPerPage;
  const margin = Math.max(18, width * 0.04);
  const span = Math.max(1, width - margin * 2);
  const xForBeat = (beat) => margin + (beat - startBeat) / beatsPerPage * span;
  const currentBeat = Math.max(startBeat, Math.min(endBeat, time / beatSeconds));
  return { startBeat, endBeat, playheadX: xForBeat(currentBeat), xForBeat };
}
