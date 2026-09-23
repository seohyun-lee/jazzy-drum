import { upcomingGroups } from './chart.js';

export function guideTargets(notes, time) {
  const seen = new Set();
  return upcomingGroups(notes, time, 4).flatMap((group) => {
    const remaining = group.time - time;
    if (remaining > 1) return [];
    return group.notes.flatMap((note) => {
      if (seen.has(note.instrument)) return [];
      seen.add(note.instrument);
      return [{
        instrument: note.instrument,
        opacity: remaining > 0.5 ? 0.35 : 1,
        scale: 1 + Math.max(0, remaining) * 0.85,
      }];
    });
  });
}
