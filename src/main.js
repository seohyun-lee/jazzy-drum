import { INSTRUMENTS, freshChart, songs } from './chart.js';
import { DrumAudio } from './audio.js';
import { instrumentForKey } from './input.js';
import { guideTargets } from './guide.js';
import { retimeTimeline } from './timing.js';
import './style.css';

const app = document.querySelector('#app');
const drumKitImage = `${import.meta.env.BASE_URL}assets/drum-kit-labelled.png`;
let audio = new DrumAudio();
let song = songs[0];
let BPM, BEAT, COUNT_IN, DURATION;
function setSong(nextSong) {
  song = nextSong;
  setTempo(song.bpm);
}
function setTempo(bpm) {
  BPM = Math.max(40, Math.min(180, Math.round(bpm)));
  BEAT = 60 / BPM;
  COUNT_IN = song.meter * BEAT;
  DURATION = song.bars * song.meter * BEAT;
}
setSong(song);
const hitZones = [
  ['hh', '하이햇'], ['crash', '크래시 1'], ['tom1', '하이 탐'], ['tom2', '로우 탐'],
  ['crash2', '크래시 2'], ['ride', '라이드'], ['snare', '스네어'], ['kick', '킥'], ['floor', '플로어 탐'],
  ['hhPedal', '하이햇 페달'], ['kickPedal', '킥 페달'],
];

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
  lookahead: 6,
  raf: 0,
};

app.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-mark">j.</span><span>jazzy<small>삶을 리듬감있게 살자</small></span></div>
      <div class="top-right"><span class="top-note">오늘의 작은 리듬</span><button class="fullscreen-button" id="fullscreen" type="button" aria-pressed="false">⛶ 전체화면</button><button class="icon-button" id="help" aria-label="연주 방법 보기">?</button></div>
    </header>

    <section class="game-card" aria-label="드럼 리듬 게임">
      <div class="songbar">
        <div><p class="eyebrow">BOSSA NOVA · BEGINNER</p><h1>${song.title}</h1><p class="songmeta">${song.difficulty} <span>·</span> ${BPM} BPM <span>·</span> 약 35초</p></div>
        <div class="song-actions"><button class="library-button" id="library">곡 선택</button><span id="clock">0:00 / 0:35</span><button class="round-button" id="pause" aria-label="일시정지" disabled>Ⅱ</button></div>
      </div>

      <div class="notation-wrap">
        <div class="practice-strip"><button id="tempo-settings" class="library-button">연습 BPM · ${BPM}</button><label>악보 속도 <select id="scroll-speed"><option value="8">아주 느리게 · 8초 미리보기</option><option value="6" selected>느리게 · 6초 미리보기</option><option value="4">보통 · 4초 미리보기</option><option value="2">빠르게 · 2초 미리보기</option></select></label></div>
        <div class="notation-title"><span>한 줄 악보</span><span>노트 글자 = 입력 키 · 왼쪽 선에 닿으면 연주</span></div>
        <div class="notation" id="notation" aria-label="다가오는 드럼 노트"><div class="staff-lines"></div><div class="playhead"><span>지금</span></div><div id="beat-lines"></div><div id="notes-layer"></div></div>
      </div>

      <div class="play-surface">
        <div class="surface-heading"><span class="live-dot"></span><span id="feedback">편하게 한 박자씩 시작해요</span><span id="combo">0번 연속</span></div>
        <div class="kit" id="kit" aria-label="연주할 드럼 세트">
          <img src="${drumKitImage}" alt="양쪽 위의 크래시 1·2, 오른쪽 아래의 큰 라이드와 두 페달이 보이는 드럼 세트" draggable="false" />
          <div id="target-layer"></div>
          ${hitZones.map(([id, label]) => `<button class="hit-zone zone-${id}" data-instrument="${id === 'kickPedal' ? 'kick' : id}" aria-label="${label} 연주"></button>`).join('')}
        </div>
        <div class="kit-footer"><button id="guide" class="pill is-on" aria-pressed="true">◎ 가이드 켜짐</button><span>하이햇 <kbd>S</kbd> · 스네어 <kbd>D</kbd> · 킥 <kbd>Space</kbd> · 라이드 <kbd>K</kbd></span></div>
      </div>
    </section>

    <div class="below"><div><strong>오늘, 리듬을 하나 배워봐요.</strong><span>짧게 즐기고, 조금씩 익숙해지는 재즈 드럼.</span></div><span class="future">자유 연주와 합주는 다음 이야기 ↗</span></div>
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
  elements.modal.classList.remove('song-library');
  elements.modal.innerHTML = html;
  elements.overlay.classList.add('visible');
  const first = elements.modal.querySelector('button');
  first?.focus();
}

function closeModal() {
  elements.overlay.classList.remove('visible');
}

function practiceMarkup() {
  return `<section class="practice-panel" aria-label="연습 속도 설정"><div class="tempo-heading"><label for="bpm-number">연습 BPM</label><span><input id="bpm-number" aria-label="연습 BPM 숫자 입력" type="number" min="40" max="180" step="1" value="${BPM}"> BPM</span></div><input id="bpm-range" aria-label="연습 BPM 슬라이더" type="range" min="40" max="180" step="1" value="${BPM}"><div class="tempo-presets"><span id="original-tempo">원곡 ${song.bpm} BPM</span><button data-tempo="0.5">절반 속도</button><button data-tempo="0.75">75% 속도</button><button data-tempo="1">원곡 속도</button></div><label class="scroll-choice">악보 속도 <select id="modal-scroll-speed"><option value="8">아주 느리게 · 8초 미리보기</option><option value="6">느리게 · 6초 미리보기</option><option value="4">보통 · 4초 미리보기</option><option value="2">빠르게 · 2초 미리보기</option></select></label></section>`;
}

function syncPracticeControls() {
  if ($('#bpm-number')) $('#bpm-number').value = BPM;
  if ($('#bpm-range')) $('#bpm-range').value = BPM;
  if ($('#original-tempo')) $('#original-tempo').textContent = `원곡 ${song.bpm} BPM`;
  if ($('#modal-scroll-speed')) $('#modal-scroll-speed').value = String(state.lookahead);
  $('#scroll-speed').value = String(state.lookahead);
  $('#tempo-settings').textContent = `연습 BPM · ${BPM}`;
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

function bindPracticeControls() {
  $('#bpm-range').addEventListener('input', event => changePracticeTempo(event.target.value));
  $('#bpm-number').addEventListener('change', event => changePracticeTempo(event.target.value));
  document.querySelectorAll('[data-tempo]').forEach(button => button.addEventListener('click', () => changePracticeTempo(song.bpm * Number(button.dataset.tempo))));
  $('#modal-scroll-speed').addEventListener('change', event => {
    state.lookahead = Number(event.target.value);
    syncPracticeControls();
    if (state.status === 'paused') renderNotation(currentTime());
  });
  syncPracticeControls();
}

function showReady() {
  openModal(`<p class="modal-kicker">JAZZY · 오늘의 플레이리스트</p><h2>오늘은 어떤 리듬으로?</h2><p>짧은 재즈 한 곡으로, 일상에 박자를 더해요.</p><div class="song-grid">${songs.map(item => `<button class="song-option ${item.id === song.id ? 'selected' : ''}" data-song="${item.id}" aria-pressed="${item.id === song.id}" style="--cover-color:${item.color}"><span class="song-art" aria-hidden="true">${item.icon}</span><span class="song-description"><strong>${item.title}</strong><span>${item.style} · ${item.bpm} BPM · ${item.meter}/4</span><small>${item.difficulty} · ${Math.round(item.bars * item.meter * 60 / item.bpm)}초</small></span></button>`).join('')}</div><p class="selected-mood" id="selected-mood">${song.mood}</p><button class="primary" id="start">${song.title} 연주 <span>→</span></button><p class="modal-footnote">직접 만든 짧은 반주와 채보 · 키보드 또는 터치로 연주</p>`);
  elements.modal.classList.add('song-library');
  document.querySelectorAll('[data-song]').forEach(button => button.addEventListener('click', () => {
    setSong(songs.find(item => item.id === button.dataset.song));
    document.querySelectorAll('[data-song]').forEach(option => {
      const selected = option.dataset.song === song.id;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    $('#selected-mood').textContent = song.mood;
    $('#start').innerHTML = `${song.title} 연주 <span>→</span>`;
    syncPracticeControls();
  }));
  $('#start').addEventListener('click', start);
  $('#start').insertAdjacentHTML('beforebegin', `<div class="sound-preview"><strong>소리 미리 듣기</strong><div class="preview-buttons">${['kick', 'snare', 'hh', 'crash', 'crash2', 'ride'].map(id => `<button data-preview="${id}">${INSTRUMENTS[id].label}</button>`).join('')}</div></div>`);
  $('.sound-preview').insertAdjacentHTML('beforebegin', practiceMarkup());
  bindPracticeControls();
  document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', async () => {
    await audio.unlock();
    audio.play(button.dataset.preview);
  }));
}

function currentTime() {
  if (state.status === 'paused') return state.pausedAt - state.startAt;
  if (state.status !== 'playing') return 0;
  return audio.context.currentTime - state.startAt;
}

async function start() {
  audio.stopAll();
  const now = await audio.unlock();
  state.notes = freshChart(song, BPM);
  $('.songbar h1').textContent = song.title;
  $('.eyebrow').textContent = `${song.style} · ${song.meter}/4`;
  $('.songmeta').textContent = `${song.difficulty} · ${BPM} BPM · ${Math.round(DURATION)}초`;
  $('.kit-footer>span').innerHTML = [...new Set(state.notes.map(note => note.instrument))].map(id => `${INSTRUMENTS[id].label} <kbd>${INSTRUMENTS[id].key}</kbd>`).join(' · ');
  state.status = 'playing';
  state.startAt = now + COUNT_IN;
  state.scheduledBeat = -song.meter - 1;
  state.combo = 0;
  state.maxCombo = 0;
  state.results = { perfect: 0, great: 0, good: 0, miss: 0 };
  state.lastFeedback = '';
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
    audio.stopAll();
    state.scheduledBeat = Math.floor((state.pausedAt - state.startAt) / BEAT);
    audio.context.suspend();
    elements.pause.textContent = '▶';
    elements.pause.setAttribute('aria-label', '계속하기');
    showPause();
  } else if (state.status === 'paused') resume();
}

function showPause() {
  openModal(`<p class="modal-kicker">나에게 맞는 속도로</p><h2>천천히 익혀도 좋아요.</h2><p>BPM을 낮추면 반주와 채보가 함께 느려져요. 준비되면 멈춘 자리에서 이어가세요.</p>${practiceMarkup()}<button class="primary" id="resume">계속 연주 <span>→</span></button><button class="text-button" id="restart">처음부터</button>`);
  bindPracticeControls();
  $('#resume').addEventListener('click', resume);
  $('#restart').addEventListener('click', start);
}

async function resume() {
  await audio.context.resume();
  state.startAt += audio.context.currentTime - state.pausedAt;
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
  const zone = document.querySelector(`.zone-${instrument}`);
  zone?.classList.remove('struck');
  void zone?.offsetWidth;
  zone?.classList.add('struck');
  window.setTimeout(() => zone?.classList.remove('struck'), 220);
}

function scheduleBacking(time) {
  if (time >= DURATION) return;
  const beatNow = Math.floor(time / BEAT);
  const ahead = Math.floor((time + 0.15) / BEAT);
  for (let beat = Math.max(state.scheduledBeat + 1, beatNow - 1); beat <= ahead; beat++) {
    const at = state.startAt + beat * BEAT;
    if (at < audio.context.currentTime - 0.03) continue;
    if (beat < 0) {
      audio.click(at, beat === -1);
    } else {
      const bar = Math.floor(beat / song.meter);
      const step = beat % song.meter;
      const chord = song.chords[bar % song.chords.length];
      const bassNote = step === 0 ? chord[0] - 12 : chord[step % chord.length] - 12;
      audio.bass(at, 440 * 2 ** ((bassNote - 69) / 12));
      if (step === 0 || (song.meter === 4 && step === 2)) audio.chord(at, chord, BEAT * 1.5);
    }
  }
  state.scheduledBeat = Math.max(state.scheduledBeat, ahead);
}

function renderNotation(time) {
  const width = elements.notation.clientWidth;
  const playhead = width * 0.105;
  const pxPerSecond = (width - playhead - 20) / state.lookahead;
  const visible = state.notes.filter((note) => !note.missed && !note.hit && note.time >= time - 0.12 && note.time <= time + state.lookahead + 0.2);
  elements.notesLayer.innerHTML = visible.map((note) => {
    const x = playhead + (note.time - time) * pxPerSecond;
    const instrument = INSTRUMENTS[note.instrument];
    return `<span class="note note-${note.instrument}" style="left:${x}px;--note-color:${instrument.color}" title="${instrument.label} · ${instrument.key}">${instrument.key}</span>`;
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
  elements.combo.textContent = `${state.combo}번 연속`;
  elements.feedback.textContent = time < 0 ? '곧 시작해요' : performance.now() < state.feedbackUntil ? state.lastFeedback : '리듬을 따라 연주해요';
  if (time >= DURATION + 0.5) return finish();
  state.raf = requestAnimationFrame(frame);
}

function formatTime(value) {
  const total = Math.floor(value);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function finish() {
  state.status = 'finished';
  elements.pause.disabled = true;
  elements.targetLayer.innerHTML = '';
  const { perfect, great, good, miss } = state.results;
  const count = perfect + great + good + miss;
  const accuracy = count ? Math.round((perfect + great * 0.8 + good * 0.5) / count * 100) : 0;
  openModal(`<p class="modal-kicker">오늘의 리듬 완료</p><h2>오늘, 리듬을 하나 배웠어요.</h2><p>${song.title} · ${song.style}</p><div class="score"><strong>${accuracy}<small>%</small></strong><span>정확도</span></div><div class="result-stats"><span>좋은 박자 <b>${perfect + great + good}</b></span><span>최고 연속 <b>${state.maxCombo}</b></span><span>놓친 박자 <b>${miss}</b></span></div><button class="primary" id="retry">한 번 더 <span>↻</span></button><button class="text-button" id="choose-another">다른 곡 고르기</button>`);
  $('#retry').addEventListener('click', start);
  $('#choose-another').addEventListener('click', openLibrary);
}

function openLibrary() {
  cancelAnimationFrame(state.raf);
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
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
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
$('#guide').addEventListener('click', () => {
  state.guide = !state.guide;
  elements.guide.classList.toggle('is-on', state.guide);
  elements.guide.setAttribute('aria-pressed', String(state.guide));
  elements.guide.textContent = state.guide ? '◎ 가이드 켜짐' : '◎ 가이드 꺼짐';
  if (!state.guide) elements.targetLayer.innerHTML = '';
});
$('#help').addEventListener('click', () => {
  if (state.status === 'playing') pause();
  openModal(`<p class="modal-kicker">연주 방법</p><h2>악보를 보고, 드럼을 쳐요.</h2><p>노트가 왼쪽의 ‘지금’ 선에 닿을 때 해당 드럼을 터치하세요. 칠 위치는 1초 전에 나타나고, 0.5초 전에 선명해져요.</p><div class="key-list"><span>하이햇 <kbd>S</kbd></span><span>스네어 <kbd>D</kbd></span><span>킥 <kbd>Space</kbd></span><span>라이드 <kbd>K</kbd></span></div><button class="primary" id="close-help">${state.status === 'paused' ? '계속 연주' : state.status === 'ready' ? '연주 시작' : '확인'} <span>→</span></button>`);
  $('#close-help').addEventListener('click', state.status === 'paused' ? resume : state.status === 'ready' ? start : closeModal);
});

showReady();
