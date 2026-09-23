import { INSTRUMENTS } from './chart.js';

const codeToInstrument = Object.fromEntries(
  Object.entries(INSTRUMENTS).map(([id, item]) => [
    item.key === 'Space' ? 'Space' : `Key${item.key}`,
    id,
  ]),
);

export function instrumentForKey(event) {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return null;

  // `key` becomes a Hangul character or "Process" with the Korean IME enabled.
  // `code` stays tied to the physical key, so the displayed F/J/etc. still work.
  return codeToInstrument[event.code] ?? null;
}
