export const INSTRUMENTS = {
  hh: { label: '하이햇', key: 'D', color: '#637b4b' },
  snare: { label: '스네어', key: 'V', color: '#bf6f50' },
  kick: { label: '킥', key: 'Space', color: '#3c765f' },
  tom1: { label: '하이 탐', key: 'G', color: '#818876' },
  tom2: { label: '로우 탐', key: 'H', color: '#818876' },
  floor: { label: '플로어 탐', key: 'N', color: '#818876' },
  crash: { label: '크래시 1', key: 'F', color: '#a45e32' },
  crash2: { label: '크래시 2', key: 'J', color: '#765d91' },
  ride: { label: '라이드', key: 'K', color: '#436b8d' },
  hhPedal: { label: '하이햇 페달', key: 'C', color: '#637b4b' },
};

// One song timeline can later hold separate instrument parts for ensemble play.
const bossa = {
  id: 'evening-bossa',
  title: '퇴근길 보사노바',
  style: '보사노바',
  difficulty: 'EASY', level: 1,
  bpm: 84,
  bars: 12,
  meter: 4,
  mood: '가벼운 발걸음에 맞추는 보사노바',
  color: '#a67c40',
  icon: '◒',
  chords: [[50, 57, 60, 64], [43, 53, 59, 64], [48, 55, 59, 62], [45, 55, 61, 64]],
};

// A twenty-bar small-combo chorus: each bar has its own comping and fill choices.
const blueNoteRide = {
  a: [0, 1, 1 + 2 / 3, 2, 3, 3 + 2 / 3],
  b: [0, 1, 1 + 2 / 3, 2, 2 + 2 / 3, 3],
  c: [0, 2 / 3, 1, 2, 3, 3 + 2 / 3],
  d: [0, 1, 2, 2 + 2 / 3, 3],
  e: [0, 1, 1 + 2 / 3, 2, 3],
  f: [0, 1, 1 + 2 / 3, 2, 2 + 2 / 3, 3, 3 + 2 / 3],
  g: [0, 1, 2, 3],
  h: [0, 2 / 3, 1, 1 + 2 / 3, 2, 3],
};
const blueNoteBars = [
  { r: 'a', k: [0], s: [1 + 2 / 3], c: 'crash' },
  { r: 'b', k: [0, 2 + 2 / 3], s: [3], g: [1 + 2 / 3] },
  { r: 'c', k: [0], s: [1, 3 + 2 / 3] },
  { r: 'd', k: [0, 2], s: [2 + 2 / 3], t: [['tom1', 3 + 1 / 3]] },
  { r: 'f', k: [0], s: [1 + 2 / 3, 3], g: [2 + 1 / 3] },
  { r: 'e', k: [0, 3 + 1 / 3], s: [2], foot: [1] },
  { r: 'h', k: [0, 2 + 2 / 3], s: [1 + 2 / 3], g: [3 + 1 / 3] },
  { r: 'g', k: [0], s: [1, 2 + 2 / 3], t: [['tom1', 3], ['tom2', 3 + 2 / 3]] },
  { r: 'b', k: [0, 2], s: [3 + 1 / 3], c: 'crash2' },
  { r: 'a', k: [0], s: [1, 3], g: [2 + 2 / 3] },
  { r: 'd', k: [0, 3], s: [1 + 2 / 3], foot: [3] },
  { r: 'f', k: [0, 2 + 1 / 3], s: [2, 3 + 2 / 3], t: [['floor', 3 + 1 / 3]] },
  { r: 'c', k: [0], s: [1 + 2 / 3, 3], g: [2 + 1 / 3] },
  { r: 'e', k: [0, 2], s: [3 + 2 / 3], foot: [1, 2] },
  { r: 'h', k: [0, 2 + 2 / 3], s: [1, 3 + 1 / 3] },
  { r: 'g', k: [0], s: [2 + 2 / 3], t: [['tom1', 3], ['tom2', 3 + 1 / 3], ['floor', 3 + 2 / 3]] },
  { r: 'f', k: [0, 2], s: [1 + 2 / 3, 3], c: 'crash' },
  { r: 'b', k: [0], s: [2 + 1 / 3], g: [3 + 2 / 3] },
  { r: 'a', k: [0, 3], s: [1, 2 + 2 / 3], foot: [1] },
  { r: 'd', k: [0, 2], s: [1 + 2 / 3], t: [['tom1', 3], ['tom2', 3 + 1 / 3], ['floor', 3 + 2 / 3]], c: 'crash2' },
];

export const songs = [bossa, {
  id: 'after-hours', title: '막차 뒤 스윙', style: '재즈 스윙', difficulty: 'NORMAL', level: 3,
  bpm: 108, bars: 16, meter: 4, mood: '라이드 위에서 통통 튀는 늦은 밤',
  color: '#526b9b', icon: '☾',
  chords: [[50, 57, 60, 64], [43, 53, 59, 63], [48, 55, 59, 64], [45, 55, 61, 65]],
}, {
  id: 'blue-waltz', title: '푸른 골목의 왈츠', style: '재즈 왈츠', difficulty: 'EASY+', level: 2,
  bpm: 96, bars: 16, meter: 3, mood: '하나, 둘, 셋. 세 박자로 걷는 골목',
  color: '#537e76', icon: '≋',
  chords: [[53, 60, 64, 67], [46, 56, 62, 65], [52, 58, 62, 67], [45, 55, 61, 65]],
}, {
  id: 'pocket-funk', title: '주머니 속 그루브', style: '재즈 펑크', difficulty: 'HARD', level: 4,
  bpm: 102, bars: 16, meter: 4, mood: '엇박 킥과 단단한 백비트의 대화',
  color: '#a25e49', icon: '◉',
  chords: [[40, 55, 62, 66], [45, 55, 59, 64], [50, 60, 64, 67], [47, 57, 63, 67]],
}, {
  id: 'blue-note-walk', title: '새벽의 블루 노트', style: '모던 재즈', difficulty: 'EXPERT', level: 5,
  bpm: 112, bars: 20, meter: 4, mood: '스윙과 엇박, 매 마디 달라지는 재즈 대화',
  color: '#344d70', icon: '♭',
  chords: [
    [48, 55, 59, 64], [45, 52, 55, 60], [50, 57, 60, 65], [43, 53, 59, 62],
    [48, 55, 59, 64], [52, 56, 62, 67], [45, 52, 55, 60], [45, 55, 61, 64],
    [50, 57, 60, 65], [43, 53, 59, 68], [52, 59, 62, 67], [45, 55, 61, 64],
    [50, 57, 60, 65], [53, 56, 60, 62], [48, 55, 59, 64], [48, 58, 64, 67],
    [53, 60, 64, 69], [53, 56, 60, 62], [52, 59, 62, 67], [43, 53, 59, 62],
  ],
}].map(item => ({ ...item, parts: { drums: createDrumChart(item) } })).sort((a, b) => a.level - b.level);

function createDrumChart(song) {
  const events = [];
  let id = 0;
  const add = (beat, instrument, velocity = 1) => events.push({ id: ++id, time: beat * 60 / song.bpm, beat, instrument, velocity });
  for (let bar = 0; bar < song.bars; bar++) {
    const base = bar * song.meter;
    if (song.id === 'blue-note-walk') {
      const sketch = blueNoteBars[bar];
      const cymbal = bar < 4 || (bar >= 12 && bar < 16) ? 'ride' : 'hh';
      const pulse = cymbal === 'ride' ? blueNoteRide[sketch.r].filter((_, index) => index % 2 === 0) : blueNoteRide[sketch.r];
      pulse.forEach(offset => add(base + offset, cymbal, offset % 1 === 0 ? 0.64 : 0.46));
      (sketch.foot || [1, 3]).forEach(offset => add(base + offset, 'hhPedal', 0.42));
      sketch.k.forEach(offset => add(base + offset, 'kick', 0.56));
      sketch.s.forEach(offset => add(base + offset, 'snare', 0.78));
      sketch.g?.forEach(offset => add(base + offset, 'snare', 0.3));
      sketch.t?.forEach(([instrument, offset]) => add(base + offset, instrument, 0.66));
      if (sketch.c) add(base, sketch.c, 0.7);
    } else if (song.id === 'after-hours') {
      (bar % 2 === 0 ? [0, 1 + 2 / 3, 2, 3 + 2 / 3] : [0, 1, 2, 3])
        .forEach(offset => add(base + offset, 'ride', 0.72));
      [1, 3].forEach(offset => add(base + offset, 'hhPedal'));
      add(base, 'kick');
      if (bar % 4 !== 3) add(base + 2, 'kick', 0.68);
      [1, 3].forEach(offset => add(base + offset, 'snare'));
      if (bar % 8 === 7) {
        add(base + 3 + 2 / 3, 'tom2');
        add(base + 3 + 2 / 3, bar === 7 ? 'crash' : 'crash2');
      }
    } else if (song.id === 'blue-waltz') {
      [0, 1, 2].forEach(offset => add(base + offset, 'ride'));
      add(base, 'kick');
      add(base + 2, 'snare');
      if (bar % 2 === 1) add(base + 1 + 2 / 3, 'ride');
      if (bar % 4 === 3) { add(base + 2 + 2 / 3, 'tom1'); add(base + 2 + 2 / 3, bar % 8 === 3 ? 'crash' : 'crash2'); }
    } else if (song.id === 'pocket-funk') {
      for (let step = 0; step < 8; step++) add(base + step / 2, 'hh');
      [0, 1.75, 2.5].forEach(offset => add(base + offset, 'kick'));
      [1, 3].forEach(offset => add(base + offset, 'snare'));
      if (bar % 2 === 1) add(base + 2.75, 'snare');
      if (bar % 4 === 3) { add(base + 3.5, 'tom2'); add(base + 3.75, 'floor'); add(base + 3.75, bar % 8 === 3 ? 'crash' : 'crash2'); }
    } else {
      for (let step = 0; step < 8; step++) add(base + step / 2, 'hh');
      add(base, 'kick');
      add(base + 1.5, 'snare');
      add(base + 2, 'kick');
      add(base + 3, 'snare');
      if (bar >= 4 && bar % 2 === 1) add(base + 3.5, 'kick');
      if (bar === 3 || bar === 7 || bar === 11) add(base, bar === 7 ? 'crash2' : 'crash');
    }
  }
  return events.sort((a, b) => a.time - b.time || a.id - b.id);
}

export function freshChart(song = songs[0], bpm = song.bpm) {
  return song.parts.drums.map((note) => ({ ...note, time: note.beat * 60 / bpm, hit: false, missed: false }));
}

export function upcomingGroups(notes, time, count = 3) {
  const groups = [];
  for (const note of notes) {
    if (note.hit || note.missed || note.time < time - 0.13) continue;
    let group = groups.find((item) => Math.abs(item.time - note.time) < 0.001);
    if (!group) {
      if (groups.length === count) break;
      group = { time: note.time, notes: [] };
      groups.push(group);
    }
    group.notes.push(note);
  }
  return groups;
}
