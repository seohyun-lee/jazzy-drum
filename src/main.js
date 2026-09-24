import { INSTRUMENTS, freshChart, songs } from './chart.js';
import { DrumAudio } from './audio.js';
import { instrumentForKey } from './input.js';
import { guideTargets } from './guide.js';
import { retimeTimeline } from './timing.js';
import { analyzeAudio } from './analysis.js';
import { followTempo, tempoFromFourTaps } from './jam.js';
import { fixedPageLayout } from './notation.js';
import './style.css';

const app = document.querySelector('#app');
const drumKitImage = `${import.meta.env.BASE_URL}assets/drum-kit-labelled.png`;
let audio = new DrumAudio();
const previewAudio = new DrumAudio();
const preview = { token: 0, timer: null, track: null, gain: null, song: null, notes: [], startAt: 0, nextNote: 0, nextBeat: 0 };
let song = songs[0];
const importedSongs = [];
const ENABLE_AUDIO_IMPORT = false; // Automatic charting is hidden until drum transcription is reliable.
const jamSong = {
  id: 'live-jam', title: '즉흥 리듬', style: 'LIVE JAM', difficulty: '자유 연주',
  bpm: 100, bars: 250, meter: 4, duration: 600,
  mood: '네 번의 첫 박자로 시작하는 나만의 합주', color: '#7a5b78', icon: '≈',
  source: 'jam', parts: { drums: [] },
  chords: [[45, 55, 60, 64], [50, 57, 60, 65], [43, 53, 59, 62], [48, 55, 59, 64]],
};
let trackSource = null;
let trackGain = null;
const jam = { taps: [], started: false, lastHitAt: null, nextBeatAt: 0, beatIndex: 0 };
let BPM, BEAT, COUNT_IN, DURATION;
function setSong(nextSong) {
  song = nextSong;
  setTempo(song.bpm);
}
function setTempo(bpm) {
  BPM = Math.max(40, Math.min(180, Math.round(bpm)));
  BEAT = 60 / BPM;
  COUNT_IN = song.meter * BEAT;
  DURATION = song.duration ? song.duration * song.bpm / BPM : song.bars * song.meter * BEAT;
}
setSong(song);
const hitZones = [
  ['hh', '하이햇'], ['crash', '크래시 1'], ['tom1', '하이 탐'], ['tom2', '로우 탐'],
  ['crash2', '크래시 2'], ['ride', '라이드'], ['snare', '스네어'], ['kick', '킥'], ['floor', '플로어 탐'],
  ['hhPedal', '하이햇 페달'], ['kickPedal', '킥 페달'],
];
const keyGuide = [
  ['크래시 1', 'F'], ['하이햇', 'D'], ['하이햇 페달', 'C'],
  ['스네어', 'V'], ['하이 탐', 'G'], ['로우 탐', 'H'],
  ['크래시 2', 'J'], ['라이드', 'K'], ['플로어 탐', 'N'], ['킥·킥 페달', 'Space'],
];
const fullKeyGuide = keyGuide.map(([label, key]) => `<span>${label} <kbd>${key}</kbd></span>`).join('');

const state = {
  status: 'ready',
  notes: freshChart(song),
  startAt: 0,
  pausedAt: 0,
  scheduledBeat: -4,
  combo: 0,
  maxCombo: 0,
  results: { perfect: 0, great: 0, good: 0, miss: 0 },
  lastFeedback: '',
  feedbackUntil: 0,
  guide: true,
  lookahead: 4,
  notationMode: 'scroll',
  raf: 0,
};

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">j.</span><span>jazzy<small>일상에 리듬 한 스푼</small></span></div>
      <div class="top-right"><span class="top-note">오늘의 작은 리듬</span><button class="fullscreen-button" id="fullscreen" type="button" aria-pressed="false">⛶ 전체화면</button><button class="icon-button" id="help" aria-label="연주 방법 보기">?</button></div>
    </header>

    <section class="game-card" aria-label="드럼 리듬 게임">
      <div class="songbar">
        <div><p class="eyebrow">${song.style} · ${song.difficulty}</p><h1>${song.title}</h1><p class="songmeta">${song.difficulty} <span>·</span> ${BPM} BPM <span>·</span> ${Math.round(DURATION)}초</p></div>
        <div class="song-actions"><button class="library-button" id="library">곡 선택</button><span id="clock">0:00 / ${Math.floor(DURATION / 60)}:${String(Math.round(DURATION) % 60).padStart(2, '0')}</span><button class="round-button" id="pause" aria-label="일시정지" disabled>Ⅱ</button></div>
      </div>

      <div class="notation-wrap">
        <div class="practice-strip"><button id="tempo-settings" class="library-button">연주 BPM · ${BPM}</button><label>악보 방식 <select id="notation-mode-main"><option value="scroll">노트 이동</option><option value="follow">판정선 이동</option></select></label><label class="scroll-choice">악보 속도 <select id="scroll-speed"><option value="6">느리게 · 6초 미리보기</option><option value="4" selected>보통 · 4초 미리보기</option><option value="2">빠르게 · 2초 미리보기</option></select></label></div>
        <div class="notation" id="notation" aria-label="다가오는 드럼 노트"><div class="staff-lines"></div><div class="playhead" aria-label="현재 연주 위치"></div><div id="beat-lines"></div><div id="notes-layer"></div></div>
      </div>

      <div class="play-surface">
        <div class="surface-heading"><span class="live-dot"></span><span id="feedback">편하게 한 박자씩 시작해요</span><span id="combo">0번 연속</span></div>
        <div class="kit" id="kit" aria-label="연주할 드럼 세트">
          <img src="${drumKitImage}" alt="양쪽 위의 크래시 1·2, 오른쪽 아래의 큰 라이드와 두 페달이 보이는 드럼 세트" draggable="false" />
          <div id="target-layer"></div>
          ${hitZones.map(([id, label]) => `<button class="hit-zone zone-${id}" data-instrument="${id === 'kickPedal' ? 'kick' : id}" aria-label="${label} 연주"></button>`).join('')}
        </div>
        <div class="kit-footer"><button id="guide" class="pill is-on" aria-pressed="true">◎ 가이드 켜짐</button><span>하이햇 <kbd>D</kbd> · 스네어 <kbd>V</kbd> · 킥 <kbd>Space</kbd> · 라이드 <kbd>K</kbd></span></div>
        <div class="fullscreen-keymap" aria-label="키보드 악기 배치">${fullKeyGuide}</div>
      </div>
    </section>
  </main>

  <div class="overlay" id="overlay"><div class="modal" id="modal"></div></div>
`;

const $ = (selector) => document.querySelector(selector);
const elements = {
  overlay: $('#overlay'), modal: $('#modal'), notation: $('#notation'), beatLines: $('#beat-lines'),
  notesLayer: $('#notes-layer'), targetLayer: $('#target-layer'), feedback: $('#feedback'),
  combo: $('#combo'), clock: $('#clock'), pause: $('#pause'), guide: $('#guide'),
};

function openModal(html) {
  elements.modal.classList.remove('song-library', 'play-modal', 'result-modal');
  elements.modal.innerHTML = html;
  elements.overlay.classList.add('visible');
  const first = elements.modal.querySelector('button');
  first?.focus();
}

function closeModal() {
  elements.overlay.classList.remove('visible');
}

function stopPreview() {
  preview.token++;
  if (preview.timer) window.clearInterval(preview.timer);
  preview.timer = null;
  previewAudio.stopAll();
  if (preview.track) {
    try { preview.track.stop(); } catch { /* Already ended. */ }
    preview.track.disconnect();
    preview.gain?.disconnect();
  }
  preview.track = null;
  preview.gain = null;
  preview.song = null;
  document.querySelectorAll('.song-option.is-previewing').forEach(card => card.classList.remove('is-previewing'));
  const button = $('#preview-toggle');
  if (button) button.textContent = '▶ 미리 듣기';
}

function scheduleSongBackingBeat(engine, selected, beat, at, beatLength) {
  const bar = Math.floor(beat / selected.meter);
  const step = beat % selected.meter;
  const chord = selected.chords[bar % selected.chords.length];
  if (selected.id === 'blue-note-walk') {
    const nextRoot = selected.chords[(bar + 1) % selected.chords.length][0];
    const walkingBass = [chord[0] - 12, chord[0] - 8, chord[0] - 5, nextRoot - 13];
    engine.bass(at, 440 * 2 ** ((walkingBass[step] - 69) / 12));
    if (step === 1 || step === 3) engine.chord(at + beatLength * 2 / 3, chord, beatLength * 1.15);
    return;
  }
  const bassNote = step === 0 ? chord[0] - 12 : chord[step % chord.length] - 12;
  engine.bass(at, 440 * 2 ** ((bassNote - 69) / 12));
  if (step === 0 || (selected.meter === 4 && step === 2)) engine.chord(at, chord, beatLength * 1.5);
}

function schedulePreview() {
  const selected = preview.song;
  if (!selected || selected.source === 'file') return;
  const context = previewAudio.context;
  const beatLength = 60 / selected.bpm;
  const beats = selected.bars * selected.meter;
  const duration = beats * beatLength;
  const horizon = context.currentTime + 0.16;
  while (preview.startAt <= horizon) {
    while (preview.nextNote < preview.notes.length && preview.startAt + preview.notes[preview.nextNote].time <= horizon) {
      const note = preview.notes[preview.nextNote++];
      const at = preview.startAt + note.time;
      if (at >= context.currentTime - 0.03) previewAudio.play(note.instrument, at, note.velocity);
    }
    while (preview.nextBeat < beats && preview.startAt + preview.nextBeat * beatLength <= horizon) {
      const beat = preview.nextBeat++;
      const at = preview.startAt + beat * beatLength;
      if (at >= context.currentTime - 0.03) scheduleSongBackingBeat(previewAudio, selected, beat, at, beatLength);
    }
    if (preview.nextNote < preview.notes.length || preview.nextBeat < beats || preview.startAt + duration > horizon) break;
    preview.startAt += duration;
    preview.nextNote = 0;
    preview.nextBeat = 0;
  }
}

async function startPreview() {
  stopPreview();
  if (song.source === 'jam') return;
  const token = preview.token;
  const selected = song;
  try {
    await previewAudio.unlock();
    if (preview.token !== token || song !== selected || state.status !== 'ready') return;
    preview.song = selected;
    preview.startAt = previewAudio.context.currentTime + 0.04;
    preview.nextNote = 0;
    preview.nextBeat = 0;
    if (selected.source === 'file') {
      const source = previewAudio.context.createBufferSource();
      const gain = previewAudio.context.createGain();
      source.buffer = selected.audioBuffer;
      source.loop = true;
      gain.gain.value = 0.6;
      source.connect(gain).connect(previewAudio.context.destination);
      source.start(preview.startAt);
      preview.track = source;
      preview.gain = gain;
    } else {
      preview.notes = freshChart(selected);
      preview.timer = window.setInterval(schedulePreview, 40);
      schedulePreview();
    }
    const button = $('#preview-toggle');
    if (button) button.textContent = 'Ⅱ 미리 듣기';
    document.querySelector(`.song-option[data-song="${selected.id}"]`)?.classList.add('is-previewing');
  } catch {
    stopPreview();
  }
}

function practiceMarkup(collapsible = false) {
  const controls = `<div class="tempo-heading"><label for="bpm-number">연주 BPM</label><span><input id="bpm-number" aria-label="연주 BPM 숫자 입력" type="number" min="40" max="180" step="1" value="${BPM}"> BPM</span></div><input id="bpm-range" aria-label="연주 BPM 슬라이더" type="range" min="40" max="180" step="1" value="${BPM}"><div class="tempo-presets"><span id="original-tempo">원곡 ${song.bpm} BPM</span><button data-tempo="0.5">절반 속도</button><button data-tempo="0.75">75% 속도</button><button data-tempo="1">원곡 속도</button></div><label class="scroll-choice notation-choice">악보 방식 <select id="modal-notation-mode"><option value="scroll">노트 이동</option><option value="follow">판정선 이동</option></select></label><label class="scroll-choice">악보 속도 <select id="modal-scroll-speed"><option value="6">느리게 · 6초 미리보기</option><option value="4">보통 · 4초 미리보기</option><option value="2">빠르게 · 2초 미리보기</option></select></label>`;
  if (collapsible) return `<details class="practice-panel library-practice" aria-label="연주 속도 설정"><summary><span>연주 설정</span><strong id="practice-summary">${BPM} BPM · ${state.notationMode === 'follow' ? '판정선 이동' : `악보 ${state.lookahead}초 미리보기`}</strong></summary><div class="practice-content">${controls}</div></details>`;
  return `<section class="practice-panel" aria-label="연주 속도 설정">${controls}</section>`;
}

function syncPracticeControls() {
  if ($('#bpm-number')) $('#bpm-number').value = BPM;
  if ($('#bpm-range')) $('#bpm-range').value = BPM;
  if ($('#original-tempo')) $('#original-tempo').textContent = `원곡 ${song.bpm} BPM`;
  if ($('#practice-summary')) $('#practice-summary').textContent = `${BPM} BPM · ${state.notationMode === 'follow' ? '판정선 이동' : `악보 ${state.lookahead}초 미리보기`}`;
  if ($('#modal-notation-mode')) $('#modal-notation-mode').value = state.notationMode;
  $('#notation-mode-main').value = state.notationMode;
  document.querySelectorAll('.scroll-choice:not(.notation-choice)').forEach(label => { label.hidden = state.notationMode === 'follow'; });
  if ($('#modal-scroll-speed')) $('#modal-scroll-speed').value = String(state.lookahead);
  $('#scroll-speed').value = String(state.lookahead);
  $('#tempo-settings').textContent = `연주 BPM · ${BPM}`;
  $('.songmeta').textContent = `${song.difficulty} · ${BPM} BPM · ${Math.round(DURATION)}초`;
  elements.clock.textContent = `${formatTime(Math.max(0, Math.min(DURATION, currentTime())))} / ${formatTime(DURATION)}`;
}

function changePracticeTempo(value) {
  const requested = Number(value);
  if (!Number.isFinite(requested) || requested <= 0) return syncPracticeControls();
  const oldBpm = BPM;
  const elapsed = currentTime();
  setTempo(requested);
  if (state.status === 'paused') {
    const updated = retimeTimeline(state.notes, elapsed, oldBpm, BPM);
    state.notes = updated.notes;
    state.startAt = state.pausedAt - updated.seconds;
    state.scheduledBeat = Math.floor(updated.seconds / BEAT);
    renderNotation(updated.seconds);
    renderTargets(updated.seconds);
  } else {
    state.notes = freshChart(song, BPM);
  }
  syncPracticeControls();
}

function changeNotationMode(mode) {
  if (mode !== 'scroll' && mode !== 'follow') return;
  state.notationMode = mode;
  syncPracticeControls();
  renderNotation(currentTime());
}

function bindPracticeControls() {
  $('#bpm-range').addEventListener('input', event => changePracticeTempo(event.target.value));
  $('#bpm-number').addEventListener('change', event => changePracticeTempo(event.target.value));
  document.querySelectorAll('[data-tempo]').forEach(button => button.addEventListener('click', () => changePracticeTempo(song.bpm * Number(button.dataset.tempo))));
  $('#modal-notation-mode').addEventListener('change', event => changeNotationMode(event.target.value));
  $('#modal-scroll-speed').addEventListener('change', event => {
    state.lookahead = Number(event.target.value);
    syncPracticeControls();
    if (state.status === 'paused') renderNotation(currentTime());
  });
  syncPracticeControls();
}

function showReady() {
  stopPreview();
  const library = [...songs, ...importedSongs, jamSong];
  const importOpen = song.source === 'file';
  const songCards = songs.map((item, index) => `<button class="song-option ${item.id === song.id ? 'selected' : ''}" data-song="${item.id}" aria-pressed="${item.id === song.id}" style="--cover-color:${item.color}"><span class="song-art" aria-hidden="true">${item.icon}</span><span class="song-description"><small class="song-number">TRACK ${String(index + 1).padStart(2, '0')} · ${item.style}</small><strong>${item.title}</strong><span>${item.difficulty} · ${item.bpm} BPM · ${item.meter}/4 · ${Math.round(item.duration || item.bars * item.meter * 60 / item.bpm)}초</span><em>${item.mood}</em></span><span class="song-wave" aria-hidden="true"><i></i><i></i><i></i></span></button>`).join('');
  const importedCards = importedSongs.map(item => `<button class="imported-track ${item.id === song.id ? 'selected' : ''}" data-song="${item.id}" aria-pressed="${item.id === song.id}"><span>♫</span><strong>${item.title}</strong><small>${item.bpm} BPM</small></button>`).join('');
  const importCard = `<button class="song-option mode-option import-toggle ${importOpen ? 'selected is-open' : ''}" id="import-toggle" type="button" aria-expanded="${importOpen}" aria-controls="import-body"><span class="song-art import-art" aria-hidden="true">＋</span><span class="song-description"><small class="song-number">MY MUSIC</small><strong>내 음악으로 연주하기</strong><span>파일로 채보 만들기</span></span><span class="card-arrow" aria-hidden="true">⌄</span></button>`;
  const importBody = `<div class="import-body" id="import-body" ${importOpen ? '' : 'hidden'}><p>MP3·WAV·M4A를 기기 안에서 분석해요. 원곡을 들으며 칠 수 있습니다.</p><input id="audio-file" type="file" accept="audio/*,.mp3,.wav,.m4a" aria-label="분석할 음악 파일 선택"><p id="import-status" role="status">파일은 업로드되지 않습니다. 8분·50MB 이하를 권장합니다.</p>${importedCards ? `<div class="imported-list">${importedCards}</div>` : ''}</div>`;
  const jamCard = `<button class="song-option mode-option jam-option ${song.source === 'jam' ? 'selected' : ''}" data-song="${jamSong.id}" aria-pressed="${song.source === 'jam'}" style="--cover-color:${jamSong.color}"><span class="song-art" aria-hidden="true">${jamSong.icon}</span><span class="song-description"><small class="song-number">LIVE JAM</small><strong>즉흥 리듬</strong><span>네 번 치면 합주가 시작돼요</span><em>${jamSong.mood}</em></span></button>`;
  openModal(`<div class="library-header"><div><p class="modal-kicker">JAZZY</p><h2>오늘은 어떤 리듬으로?</h2><p>판정선에 노트가 닿으면 연주하세요. SP는 스페이스바예요.</p></div><button class="preview-toggle" id="preview-toggle" type="button" ${song.source === 'jam' ? 'hidden' : ''}>▶ 미리 듣기</button></div><div class="library-body"><section class="library-section"><div class="library-section-title"><strong>SETLIST</strong></div><div class="song-grid">${songCards}</div></section><section class="library-section"><div class="library-section-title"><strong>다르게 즐기기</strong></div><div class="mode-grid">${ENABLE_AUDIO_IMPORT ? importCard : ''}${jamCard}${ENABLE_AUDIO_IMPORT ? importBody : ''}</div></section><div id="practice-slot">${song.source === 'jam' ? '' : practiceMarkup(true)}</div></div><div class="library-footer"><button class="primary" id="start">${song.source === 'jam' ? '즉흥 합주 시작' : `${song.title} 연주`} <span>→</span></button><p class="modal-footnote">${song.source === 'file' ? '자동 채보는 추정 결과라 원곡과 다른 타격이 있을 수 있어요.' : song.source === 'jam' ? '처음 네 번은 일정하게 · 이후 반주가 속도를 따라가요' : '키보드 또는 터치로 연주'}</p></div>`);
  elements.modal.classList.add('song-library');
  const updateChoice = (nextSong) => {
    setSong(nextSong);
    document.querySelectorAll('[data-song]').forEach(option => {
      const selected = option.dataset.song === song.id;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    const isFile = song.source === 'file';
    $('#import-toggle')?.classList.toggle('selected', isFile);
    if (isFile) {
      $('#import-toggle').setAttribute('aria-expanded', 'true');
      $('#import-toggle').classList.add('is-open');
      $('#import-body').hidden = false;
    }
    $('#preview-toggle').hidden = song.source === 'jam';
    $('#start').innerHTML = `${song.source === 'jam' ? '즉흥 합주 시작' : `${song.title} 연주`} <span>→</span>`;
    $('.modal-footnote').textContent = isFile ? '자동 채보는 추정 결과라 원곡과 다른 타격이 있을 수 있어요.' : song.source === 'jam' ? '처음 네 번은 일정하게 · 이후 반주가 속도를 따라가요' : '키보드 또는 터치로 연주';
    $('#practice-slot').innerHTML = song.source === 'jam' ? '' : practiceMarkup(true);
    if (song.source !== 'jam') bindPracticeControls();
    else { syncPracticeControls(); stopPreview(); }
    if (song.source !== 'jam') startPreview();
  };
  document.querySelectorAll('[data-song]').forEach(button => button.addEventListener('click', () => updateChoice(library.find(item => item.id === button.dataset.song))));
  $('#import-toggle')?.addEventListener('click', () => {
    const button = $('#import-toggle');
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    button.classList.toggle('is-open', open);
    $('#import-body').hidden = !open;
    if (open) { stopPreview(); $('#audio-file').focus(); }
  });
  $('#start').addEventListener('click', start);
  $('#preview-toggle').addEventListener('click', () => {
    if (preview.song) stopPreview();
    else startPreview();
  });
  if (song.source !== 'jam') bindPracticeControls();
  else syncPracticeControls();
  $('#audio-file')?.addEventListener('change', importAudioFile);
}

async function importAudioFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = $('#import-status');
  if (file.size > 50 * 1024 * 1024) { status.textContent = '50MB 이하의 오디오 파일을 선택해 주세요.'; return; }
  status.textContent = '음악을 분석하고 있어요…';
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  let decoder;
  try {
    decoder = new AudioContext();
    const buffer = await decoder.decodeAudioData(await file.arrayBuffer());
    if (buffer.duration > 480) throw new Error('8분 이하의 오디오 파일을 선택해 주세요.');
    if (buffer.duration < 4) throw new Error('4초 이상의 오디오 파일을 선택해 주세요.');
    const result = analyzeAudio(buffer);
    if (result.notes.length < 4) throw new Error('드럼 타격을 충분히 찾지 못했어요. 다른 음악을 시도해 주세요.');
    const title = file.name.replace(/\.[^.]+$/, '').replace(/[<>&"']/g, '').slice(0, 48) || '내 음악';
    const imported = {
      id: `import-${Date.now()}`, title, style: '내 음악', difficulty: '자동 채보',
      bpm: result.bpm, bars: Math.ceil(buffer.duration * result.bpm / 60 / 4), meter: 4,
      duration: buffer.duration, mood: `${result.notes.length}개 타격 추정 · 정확도 ${result.confidence}`,
      color: '#688578', icon: '♫', source: 'file', audioBuffer: buffer,
      parts: { drums: result.notes },
    };
    importedSongs.push(imported);
    setSong(imported);
    state.notes = freshChart(song);
    showReady();
    $('#import-status').textContent = `${result.bpm} BPM · ${result.notes.length}개 타격을 찾았어요. 아래에서 BPM을 조절한 뒤 연주해 보세요.`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : '파일을 분석할 수 없습니다.';
  } finally {
    if (decoder) await decoder.close();
  }
}

function currentTime() {
  if (state.status === 'paused') return state.pausedAt - state.startAt;
  if (state.status !== 'playing') return 0;
  return audio.context.currentTime - state.startAt;
}

function stopTrack() {
  if (trackSource) {
    try { trackSource.stop(); } catch { /* Source has already ended. */ }
    trackSource.disconnect();
    trackGain?.disconnect();
    trackSource = null;
    trackGain = null;
  }
}

function startTrack(elapsed, at) {
  if (song.source !== 'file' || !song.audioBuffer) return;
  const offset = Math.max(0, elapsed * BPM / song.bpm);
  if (offset >= song.audioBuffer.duration) return;
  const source = audio.context.createBufferSource();
  const gain = audio.context.createGain();
  source.buffer = song.audioBuffer;
  source.playbackRate.value = BPM / song.bpm;
  gain.gain.value = 0.65;
  source.connect(gain).connect(audio.context.destination);
  source.start(at, offset);
  trackSource = source;
  trackGain = gain;
}

async function start() {
  stopPreview();
  stopTrack();
  audio.stopAll();
  const now = await audio.unlock();
  state.notes = freshChart(song, BPM);
  $('.songbar h1').textContent = song.title;
  $('.eyebrow').textContent = `${song.style} · ${song.meter}/4`;
  $('.practice-strip').hidden = song.source === 'jam';
  $('.songmeta').textContent = song.source === 'jam' ? '첫 4번의 타격을 기다리는 중 · 자유 연주' : `${song.difficulty} · ${BPM} BPM · ${Math.round(DURATION)}초`;
  $('.kit-footer').classList.toggle('jam-keymap', song.source === 'jam');
  $('.kit-footer>span').innerHTML = song.source === 'jam'
    ? fullKeyGuide
    : [...new Set(state.notes.map(note => note.instrument))].map(id => `${INSTRUMENTS[id].label} <kbd>${INSTRUMENTS[id].key}</kbd>`).join(' · ');
  state.status = 'playing';
  state.startAt = song.source === 'jam' ? now : now + COUNT_IN;
  startTrack(0, state.startAt);
  state.scheduledBeat = -song.meter - 1;
  state.combo = 0;
  state.maxCombo = 0;
  state.results = { perfect: 0, great: 0, good: 0, miss: 0 };
  state.lastFeedback = '';
  jam.taps = [];
  jam.started = false;
  jam.lastHitAt = null;
  jam.nextBeatAt = 0;
  jam.beatIndex = 0;
  elements.pause.disabled = false;
  elements.pause.textContent = 'Ⅱ';
  elements.pause.setAttribute('aria-label', '일시정지');
  closeModal();
  cancelAnimationFrame(state.raf);
  state.raf = requestAnimationFrame(frame);
}

function pause() {
  if (state.status === 'playing') {
    state.pausedAt = audio.context.currentTime;
    state.status = 'paused';
    stopTrack();
    audio.stopAll();
    state.scheduledBeat = Math.floor((state.pausedAt - state.startAt) / BEAT);
    audio.context.suspend();
    elements.pause.textContent = '▶';
    elements.pause.setAttribute('aria-label', '계속하기');
    showPause();
  } else if (state.status === 'paused') resume();
}

function showPause() {
  if (song.source === 'jam') {
    openModal(`<p class="modal-kicker">LIVE JAM · 잠시 멈춤</p><h2>합주를 잠깐 쉬어가요.</h2><p>${jam.started ? `지금 반주는 약 ${Math.round(BPM)} BPM으로 따라오고 있어요.` : '아직 시작 BPM을 기다리고 있어요.'}</p><button class="primary" id="resume">계속 합주 <span>→</span></button><button class="text-button" id="restart">처음부터</button>`);
    elements.modal.classList.add('play-modal');
    $('#resume').addEventListener('click', resume);
    $('#restart').addEventListener('click', start);
    return;
  }
  openModal(`<p class="modal-kicker">나에게 맞는 속도로</p><h2>천천히 익혀도 좋아요.</h2><p>BPM을 낮추면 반주와 채보가 함께 느려져요. 준비되면 멈춘 자리에서 이어가세요.</p>${practiceMarkup()}<button class="primary" id="resume">계속 연주 <span>→</span></button><button class="text-button" id="restart">처음부터</button>`);
  elements.modal.classList.add('play-modal');
  bindPracticeControls();
  $('#resume').addEventListener('click', resume);
  $('#restart').addEventListener('click', start);
}

async function resume() {
  await audio.context.resume();
  const pausedFor = audio.context.currentTime - state.pausedAt;
  state.startAt += pausedFor;
  if (song.source === 'jam' && jam.started) jam.nextBeatAt += pausedFor;
  startTrack(audio.context.currentTime - state.startAt, Math.max(audio.context.currentTime, state.startAt));
  state.status = 'playing';
  elements.pause.textContent = 'Ⅱ';
  elements.pause.setAttribute('aria-label', '일시정지');
  closeModal();
  state.raf = requestAnimationFrame(frame);
}

function play(instrument) {
  if (state.status !== 'playing') return;
  const time = currentTime();
  if (time < -0.1 || time > DURATION + 0.3) return;
  audio.play(instrument);
  if (song.source === 'jam') {
    handleJamHit(audio.context.currentTime);
    flashZone(instrument);
    return;
  }
  const candidates = state.notes.filter((note) => note.instrument === instrument && !note.hit && !note.missed && Math.abs(note.time - time) <= 0.15);
  const note = candidates.reduce((best, item) => !best || Math.abs(item.time - time) < Math.abs(best.time - time) ? item : best, null);
  if (note) {
    note.hit = true;
    const error = Math.abs(note.time - time);
    const grade = error <= 0.045 ? 'perfect' : error <= 0.095 ? 'great' : 'good';
    state.results[grade]++;
    state.combo++;
    state.maxCombo = Math.max(state.combo, state.maxCombo);
    state.lastFeedback = grade === 'perfect' ? '완벽한 박자!' : grade === 'great' ? '좋은 리듬!' : '좋아요, 계속!';
  } else {
    state.lastFeedback = '드럼 소리가 더해졌어요';
  }
  state.feedbackUntil = performance.now() + 650;
  flashZone(instrument);
}

function flashZone(instrument) {
  const zone = document.querySelector(`.zone-${instrument}`);
  zone?.classList.remove('struck');
  void zone?.offsetWidth;
  zone?.classList.add('struck');
  window.setTimeout(() => zone?.classList.remove('struck'), 220);
}

function handleJamHit(now) {
  if (!jam.started) {
    if (jam.taps.length && now - jam.taps.at(-1) > 1.5) jam.taps = [];
    jam.taps.push(now);
    const remaining = Math.max(0, 4 - jam.taps.length);
    state.lastFeedback = remaining ? `${remaining}번 더 · 같은 간격으로 쳐보세요` : '템포를 듣고 있어요…';
    if (jam.taps.length >= 4) {
      const detected = tempoFromFourTaps(jam.taps);
      if (detected) {
        BPM = detected;
        BEAT = 60 / BPM;
        jam.started = true;
        jam.nextBeatAt = now + BEAT;
        jam.beatIndex = 0;
        state.lastFeedback = `${Math.round(BPM)} BPM · 합주 시작!`;
        $('.songmeta').textContent = `LIVE · ${Math.round(BPM)} BPM · 연주 속도를 따라가는 중`;
      } else {
        jam.taps = [now];
        state.lastFeedback = '간격이 달라요 · 다시 3번 더 쳐보세요';
      }
    }
  } else {
    if (jam.lastHitAt != null) {
      BPM = followTempo(BPM, now - jam.lastHitAt);
      BEAT = 60 / BPM;
      $('.songmeta').textContent = `LIVE · ${Math.round(BPM)} BPM · 연주 속도를 따라가는 중`;
    }
    state.lastFeedback = `${Math.round(BPM)} BPM · 같이 가는 중`;
  }
  jam.lastHitAt = now;
  state.feedbackUntil = performance.now() + 900;
}

function scheduleBacking(time) {
  if (time >= DURATION) return;
  if (song.source === 'jam') {
    scheduleJamBacking();
    return;
  }
  const beatNow = Math.floor(time / BEAT);
  const ahead = Math.floor((time + 0.15) / BEAT);
  for (let beat = Math.max(state.scheduledBeat + 1, beatNow - 1); beat <= ahead; beat++) {
    const at = state.startAt + beat * BEAT;
    if (at < audio.context.currentTime - 0.03) continue;
    if (beat < 0) {
      audio.click(at, beat === -1);
    } else if (song.source !== 'file') {
      scheduleSongBackingBeat(audio, song, beat, at, BEAT);
    }
  }
  state.scheduledBeat = Math.max(state.scheduledBeat, ahead);
}

function scheduleJamBacking() {
  if (!jam.started) return;
  const horizon = audio.context.currentTime + 0.15;
  while (jam.nextBeatAt <= horizon) {
    const beat = jam.beatIndex;
    const bar = Math.floor(beat / 4);
    const step = beat % 4;
    const chord = jamSong.chords[bar % jamSong.chords.length];
    const bassNote = step === 0 ? chord[0] - 12 : chord[(step + 1) % chord.length] - 12;
    audio.bass(jam.nextBeatAt, 440 * 2 ** ((bassNote - 69) / 12));
    if (step === 0 || step === 2) audio.chord(jam.nextBeatAt, chord, BEAT * 1.45);
    jam.nextBeatAt += BEAT;
    jam.beatIndex++;
  }
}

function renderNotation(time) {
  if (song.source === 'jam') {
    elements.notesLayer.innerHTML = '';
    elements.beatLines.innerHTML = '';
    return;
  }
  const width = elements.notation.clientWidth;
  const movingLine = state.notationMode === 'follow';
  elements.notation.classList.toggle('score-follow', movingLine);
  const line = elements.notation.querySelector('.playhead');
  if (movingLine) {
    const page = fixedPageLayout(time, BEAT, song.meter, width);
    line.style.left = `${page.playheadX}px`;
    const visible = state.notes.filter(note => note.beat >= page.startBeat && note.beat < page.endBeat);
    elements.notesLayer.innerHTML = visible.map(note => {
      const instrument = INSTRUMENTS[note.instrument];
      const faded = note.hit || note.missed || note.time < time - 0.15;
      return `<span class="note note-${note.instrument}" style="left:${page.xForBeat(note.beat)}px;--note-color:${instrument.color};opacity:${faded ? 0.35 : 1}" title="${instrument.label} · ${instrument.key}">${instrument.key === 'Space' ? 'SP' : instrument.key}</span>`;
    }).join('');
    let lines = '';
    for (let beat = page.startBeat; beat <= page.endBeat; beat++) {
      lines += `<span class="beat-line ${beat % song.meter === 0 ? 'measure' : ''}" style="left:${page.xForBeat(beat)}px"></span>`;
    }
    elements.beatLines.innerHTML = lines;
    return;
  }
  line.style.left = '';
  const playhead = width * 0.105;
  const pxPerSecond = (width - playhead - 20) / state.lookahead;
  const visible = state.notes.filter((note) => !note.missed && !note.hit && note.time >= time - 0.12 && note.time <= time + state.lookahead + 0.2);
  elements.notesLayer.innerHTML = visible.map((note) => {
    const x = playhead + (note.time - time) * pxPerSecond;
    const instrument = INSTRUMENTS[note.instrument];
    return `<span class="note note-${note.instrument}" style="left:${x}px;--note-color:${instrument.color}" title="${instrument.label} · ${instrument.key}">${instrument.key === 'Space' ? 'SP' : instrument.key}</span>`;
  }).join('');
  const startBeat = Math.max(0, Math.ceil(time / BEAT));
  let lines = '';
  for (let beat = startBeat; beat <= startBeat + Math.ceil(state.lookahead / BEAT) + 1; beat++) {
    const x = playhead + (beat * BEAT - time) * pxPerSecond;
    if (x < playhead || x > width) continue;
    lines += `<span class="beat-line ${beat % song.meter === 0 ? 'measure' : ''}" style="left:${x}px"></span>`;
  }
  elements.beatLines.innerHTML = lines;
}

function renderTargets(time) {
  if (!state.guide) {
    elements.targetLayer.innerHTML = '';
    return;
  }
  elements.targetLayer.innerHTML = guideTargets(state.notes, time).map((target) =>
    `<span class="target target-${target.instrument}" style="opacity:${target.opacity};--target-color:${INSTRUMENTS[target.instrument].color};--ring-scale:${target.scale.toFixed(3)}"><span class="approach"></span></span>`
  ).join('');
}

function frame() {
  if (state.status !== 'playing') return;
  const time = currentTime();
  scheduleBacking(time);
  if (time >= 0) {
    for (const note of state.notes) {
      if (!note.hit && !note.missed && time - note.time > 0.15) {
        note.missed = true;
        state.results.miss++;
        state.combo = 0;
      }
    }
  }
  renderNotation(time);
  renderTargets(time);
  elements.clock.textContent = `${formatTime(Math.max(0, Math.min(time, DURATION)))} / ${formatTime(DURATION)}`;
  elements.combo.textContent = song.source === 'jam' ? (jam.started ? `${Math.round(BPM)} BPM` : `${Math.min(4, jam.taps.length)} / 4`) : `${state.combo}번 연속`;
  const idleFeedback = song.source === 'jam' ? (jam.started ? '반주가 연주 속도를 듣고 있어요' : '아무 드럼이나 네 번 일정하게 쳐보세요') : '리듬을 따라 연주해요';
  elements.feedback.textContent = time < 0 ? '곧 시작해요' : performance.now() < state.feedbackUntil ? state.lastFeedback : idleFeedback;
  if (time >= DURATION + 0.5) return finish();
  state.raf = requestAnimationFrame(frame);
}

function formatTime(value) {
  const total = Math.floor(value);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function finish() {
  stopTrack();
  state.status = 'finished';
  elements.pause.disabled = true;
  elements.targetLayer.innerHTML = '';
  if (song.source === 'jam') {
    openModal(`<div class="result-head"><div><p class="modal-kicker">LIVE JAM · 합주 완료</p><h2>오늘의 즉흥 연주를 마쳤어요.</h2><p>${formatTime(DURATION)} 동안 반주와 함께 연주했어요${jam.started ? ` · 마지막 템포 ${Math.round(BPM)} BPM` : ''}.</p></div></div><div class="result-actions"><button class="primary" id="retry">다시 합주 <span>↻</span></button><button class="text-button" id="choose-another">다른 곡 고르기</button></div>`);
    elements.modal.classList.add('result-modal');
    $('#retry').addEventListener('click', start);
    $('#choose-another').addEventListener('click', openLibrary);
    return;
  }
  const { perfect, great, good, miss } = state.results;
  const count = perfect + great + good + miss;
  const accuracy = count ? Math.round((perfect + great * 0.8 + good * 0.5) / count * 100) : 0;
  openModal(`<div class="result-head"><div><p class="modal-kicker">오늘의 리듬 완료</p><h2>오늘, 리듬을 하나 배웠어요.</h2><p>${song.title} · ${song.style}</p></div><div class="score"><strong>${accuracy}<small>%</small></strong><span>정확도</span></div></div><div class="result-stats"><span>좋은 박자 <b>${perfect + great + good}</b></span><span>최고 연속 <b>${state.maxCombo}</b></span><span>놓친 박자 <b>${miss}</b></span></div><div class="result-actions"><button class="primary" id="retry">한 번 더 <span>↻</span></button><button class="text-button" id="choose-another">다른 곡 고르기</button></div>`);
  elements.modal.classList.add('result-modal');
  $('#retry').addEventListener('click', start);
  $('#choose-another').addEventListener('click', openLibrary);
}

function openLibrary() {
  stopPreview();
  cancelAnimationFrame(state.raf);
  stopTrack();
  audio.context?.close();
  audio = new DrumAudio();
  state.status = 'ready';
  elements.pause.disabled = true;
  elements.targetLayer.innerHTML = '';
  showReady();
}

document.querySelectorAll('.hit-zone').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    play(button.dataset.instrument);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLSelectElement || event.target instanceof HTMLInputElement) return;
  const instrument = instrumentForKey(event);
  if (instrument) {
    event.preventDefault();
    play(instrument);
  }
  if (event.key === 'Escape' && !document.fullscreenElement && state.status === 'playing') pause();
});

const fullscreenButton = $('#fullscreen');
function syncFullscreenButton() {
  const active = Boolean(document.fullscreenElement);
  fullscreenButton.textContent = active ? '⛶ 화면 복귀' : '⛶ 전체화면';
  fullscreenButton.setAttribute('aria-pressed', String(active));
}
fullscreenButton.disabled = !document.documentElement.requestFullscreen;
fullscreenButton.title = fullscreenButton.disabled ? '이 브라우저는 전체화면을 지원하지 않습니다' : '전체화면 전환';
fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      screen.orientation?.unlock?.();
    } else {
      await document.documentElement.requestFullscreen();
      if (matchMedia('(pointer: coarse) and (max-width: 900px)').matches) {
        try { await screen.orientation?.lock?.('landscape'); } catch { /* Some mobile browsers do not allow orientation lock. */ }
      }
    }
  } catch {
    fullscreenButton.title = '이 브라우저에서는 전체화면을 사용할 수 없습니다';
  }
  syncFullscreenButton();
});
document.addEventListener('fullscreenchange', syncFullscreenButton);

$('#pause').addEventListener('click', pause);
$('#library').addEventListener('click', openLibrary);
$('#tempo-settings').addEventListener('click', () => {
  if (state.status === 'playing') pause();
  else if (state.status === 'paused') showPause();
  else showReady();
});
$('#scroll-speed').addEventListener('change', event => {
  state.lookahead = Number(event.target.value);
  if (state.status === 'paused') renderNotation(currentTime());
});
$('#notation-mode-main').addEventListener('change', event => changeNotationMode(event.target.value));
$('#guide').addEventListener('click', () => {
  state.guide = !state.guide;
  elements.guide.classList.toggle('is-on', state.guide);
  elements.guide.setAttribute('aria-pressed', String(state.guide));
  elements.guide.textContent = state.guide ? '◎ 가이드 켜짐' : '◎ 가이드 꺼짐';
  if (!state.guide) elements.targetLayer.innerHTML = '';
});
$('#help').addEventListener('click', () => {
  if (state.status === 'playing') pause();
  openModal(`<p class="modal-kicker">연주 방법</p><h2>악보를 보고, 드럼을 쳐요.</h2><p>노트가 판정선에 닿을 때 해당 드럼을 터치하세요. 드럼 위의 표시는 1초 전에 나타나고, 0.5초 전에 선명해져요.</p><div class="key-list"><span>하이햇 <kbd>D</kbd></span><span>스네어 <kbd>V</kbd></span><span>킥 <kbd>Space</kbd></span><span>라이드 <kbd>K</kbd></span></div><button class="primary" id="close-help">${state.status === 'paused' ? '계속 연주' : state.status === 'ready' ? '연주 시작' : '확인'} <span>→</span></button>`);
  $('#close-help').addEventListener('click', state.status === 'paused' ? resume : state.status === 'ready' ? start : closeModal);
});

showReady();
