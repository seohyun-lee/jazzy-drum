export function retimeTimeline(notes, seconds, oldBpm, newBpm) {
  return {
    seconds: seconds * oldBpm / newBpm,
    notes: notes.map(note => ({ ...note, time: note.beat * 60 / newBpm })),
  };
}
