let FREQUENT_WORDS = [];
let MAX_OCC = 0;

/* ============ helpers ============ */
function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function typeClass(type){
  if(type === 'Noun') return 'type-noun';
  if(type === 'Verb') return 'type-verb';
  if(type === 'Particle') return 'type-particle';
  return '';
}

/* ============ state ============ */
let activeType = 'All';
let filteredWords = [];
let currentIndex = 0;
let currentMode = 'learn';

/* ============ DOM refs ============ */
const els = {
  arabic: document.getElementById('w-arabic'),
  translit: document.getElementById('w-translit'),
  translation: document.getElementById('w-translation'),
  badges: document.getElementById('w-badges'),
  example: document.getElementById('w-example'),
  exArabic: document.getElementById('w-ex-arabic'),
  exPronunciation: document.getElementById('w-ex-pronunciation'),
  exMeaning: document.getElementById('w-ex-meaning'),
  occ: document.getElementById('w-occ'),
  freqFill: document.getElementById('w-freq-fill'),
  flipCard: document.getElementById('flip-card'),
  flipScene: document.getElementById('flip-scene'),
  flipBtn: document.getElementById('flip-btn'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  detailsBtn: document.getElementById('details-btn'),
  learnWrap: document.getElementById('learn-wrap'),
  quizWrap: document.getElementById('quiz-wrap'),
  learnNav: document.getElementById('learn-nav'),
  learnProgress: document.getElementById('learn-progress'),
  btnLearn: document.getElementById('btn-learn'),
  btnTest: document.getElementById('btn-test'),
  emptyState: document.getElementById('empty-state'),
  progressTrack: document.getElementById('progress-track'),
  progressFill: document.getElementById('progress-fill'),
  progressThumb: document.getElementById('progress-thumb'),
  pPos: document.getElementById('p-pos'),
  pTotal: document.getElementById('p-total'),
  pPct: document.getElementById('p-pct'),
  searchBox: document.getElementById('search-box'),
  wordList: document.getElementById('word-list'),
  subhead: document.getElementById('subhead'),
  detailsSheet: document.getElementById('details-sheet'),
  detailsBackdrop: document.getElementById('details-backdrop'),
  detailsClose: document.getElementById('details-close'),
  detailsTitle: document.getElementById('details-title'),
  detailsImage: document.getElementById('details-image'),
  detailsCaption: document.getElementById('details-caption'),
};

let detailsOpen = false;

/* ============ filtering ============ */
function applyFilter(type){
  activeType = type;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.type === type));
  filteredWords = type === 'All' ? FREQUENT_WORDS.slice() : FREQUENT_WORDS.filter(w => w.type === type);
  currentIndex = 0;
  buildDatalist();
  if(currentMode === 'learn') renderCard();
  else startQuiz();
}
document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.type));
});

function buildDatalist(){
  els.wordList.innerHTML = '';
  filteredWords.forEach(w => {
    const opt = document.createElement('option');
    opt.value = `${w.transliteration} — ${w.translation}`;
    els.wordList.appendChild(opt);
  });
}

els.searchBox.addEventListener('change', () => {
  const val = els.searchBox.value.trim().toLowerCase();
  if(!val) return;

  const numericQuery = Number(val);
  if(Number.isInteger(numericQuery) && numericQuery >= 1 && numericQuery <= filteredWords.length){
    if(currentMode !== 'learn') setMode('learn');
    goTo(numericQuery - 1);
    els.searchBox.value = '';
    els.searchBox.blur();
    return;
  }

  const idx = filteredWords.findIndex(w => `${w.transliteration} — ${w.translation}`.toLowerCase() === val);
  if(idx >= 0){
    if(currentMode !== 'learn') setMode('learn');
    goTo(idx);
    els.searchBox.value = '';
    els.searchBox.blur();
  }
});

/* ============ progress bar ============ */
function updateProgress(){
  const total = filteredWords.length;
  const pct = total <= 1 ? 100 : (currentIndex / (total - 1)) * 100;
  els.progressFill.style.width = pct + '%';
  els.progressThumb.style.left = pct + '%';
  els.pPos.textContent = currentIndex + 1;
  els.pTotal.textContent = total;
  els.pPct.textContent = Math.round(((currentIndex + 1) / total) * 100) + '%';
}
els.progressTrack.addEventListener('click', (e) => {
  const rect = els.progressTrack.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  goTo(Math.round(ratio * (filteredWords.length - 1)));
});

/* ============ learn mode render ============ */
function renderCard(){
  if(filteredWords.length === 0){
    els.learnWrap.style.display = 'none';
    els.learnNav.style.display = 'none';
    els.learnProgress.style.display = 'none';
    els.emptyState.style.display = 'block';
    els.detailsBtn.disabled = true;
    return;
  }
  els.learnWrap.style.display = 'block';
  els.learnNav.style.display = 'flex';
  els.learnProgress.style.display = 'block';
  els.emptyState.style.display = 'none';

  const w = filteredWords[currentIndex];
  els.arabic.textContent = w.arabic;
  els.translit.textContent = w.transliteration;
  els.translation.textContent = w.translation;

  els.badges.innerHTML = '';
  const typeBadge = document.createElement('span');
  typeBadge.className = `badge ${typeClass(w.type)}`;
  typeBadge.textContent = w.type;
  els.badges.appendChild(typeBadge);

  els.occ.textContent = w.occurrences.toLocaleString();
  const freqPct = MAX_OCC > 0
    ? Math.round((Math.log(w.occurrences + 1) / Math.log(MAX_OCC + 1)) * 100)
    : 0;
  els.freqFill.style.width = '0%';
  requestAnimationFrame(() => { els.freqFill.style.width = freqPct + '%'; });

  els.flipCard.classList.remove('flipped');
  els.prevBtn.disabled = currentIndex === 0;
  els.nextBtn.disabled = currentIndex === filteredWords.length - 1;
  els.detailsBtn.disabled = !w.image;
  if(w.example){
    els.exArabic.textContent = w.example.arabic;
    els.exPronunciation.textContent = w.example.pronunciation;
    els.exMeaning.textContent = w.example.meaning;
    els.example.style.display = 'block';
  } else {
    els.example.style.display = 'none';
  }
  updateDetailsContent(w);
  updateProgress();
  requestAnimationFrame(syncCardHeight);
}

function updateDetailsContent(word){
  els.detailsTitle.textContent = `${word.transliteration} — ${word.translation}`;
  els.detailsCaption.textContent = `Word #${word.word_id} · tap outside to return`;
  if(word.image){
    els.detailsImage.src = `images/${word.image}`;
    els.detailsImage.alt = `${word.transliteration} reference`;
  } else {
    els.detailsImage.removeAttribute('src');
    els.detailsImage.alt = 'No reference image available';
  }
}

function openDetails(){
  if(currentMode !== 'learn' || filteredWords.length === 0) return;
  const word = filteredWords[currentIndex];
  if(!word || !word.image) return;
  detailsOpen = true;
  els.detailsSheet.classList.add('active');
  els.detailsSheet.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeDetails(){
  detailsOpen = false;
  els.detailsSheet.classList.remove('active');
  els.detailsSheet.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

const frontFace = document.querySelector('.face.front');
const backFace = document.querySelector('.face.back');
function syncCardHeight(){
  const showingBack = els.flipCard.classList.contains('flipped');
  const activeFace = showingBack ? backFace : frontFace;
  const h = Math.max(activeFace.scrollHeight, 240);
  els.flipCard.style.height = h + 'px';
}
function toggleFlip(){
  els.flipCard.classList.toggle('flipped');
  syncCardHeight();
}
function goTo(i){
  if(filteredWords.length === 0) return;
  currentIndex = Math.max(0, Math.min(filteredWords.length-1, i));
  renderCard();
}
els.flipScene.addEventListener('click', (e) => {
  if(e.target.closest('a')) return;
  toggleFlip();
});
els.flipBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFlip(); });
els.prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
els.nextBtn.addEventListener('click', () => goTo(currentIndex + 1));
els.detailsBtn.addEventListener('click', openDetails);
els.detailsClose.addEventListener('click', closeDetails);
els.detailsBackdrop.addEventListener('click', closeDetails);

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && detailsOpen){
    closeDetails();
    return;
  }
  if(currentMode !== 'learn') return;
  if(document.activeElement === els.searchBox) return;
  if(e.key === 'ArrowRight') goTo(currentIndex + 1);
  if(e.key === 'ArrowLeft') goTo(currentIndex - 1);
  if(e.key === ' '){ e.preventDefault(); toggleFlip(); }
});

(function(){
  let startX = null;
  els.flipScene.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive:true});
  els.flipScene.addEventListener('touchend', (e) => {
    if(startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if(Math.abs(dx) > 50){ dx < 0 ? goTo(currentIndex+1) : goTo(currentIndex-1); }
    startX = null;
  }, {passive:true});
})();

window.addEventListener('resize', () => requestAnimationFrame(syncCardHeight));

/* ============ quiz mode ============ */
let quizOrder = [];
let quizWords = [];
let quizPos = 0;
let quizScore = 0;
let quizStreak = 0;
let quizAnswered = false;

const q = {
  score: document.getElementById('q-score'),
  total: document.getElementById('q-total'),
  streak: document.getElementById('q-streak'),
  gauge: document.getElementById('q-gauge'),
  arabic: document.getElementById('q-arabic'),
  name: document.getElementById('q-name'),
  options: document.getElementById('q-options'),
  feedback: document.getElementById('q-feedback'),
  nextWrap: document.getElementById('q-next-wrap'),
  nextBtn: document.getElementById('q-next-btn'),
  activeBlock: document.getElementById('quiz-active-block'),
  summary: document.getElementById('quiz-summary'),
  summaryScore: document.getElementById('qs-score'),
  summaryMsg: document.getElementById('qs-msg'),
  restartBtn: document.getElementById('q-restart-btn'),
  startInput: document.getElementById('q-start'),
  endInput: document.getElementById('q-end'),
  applyRangeBtn: document.getElementById('q-apply-range'),
};

function clampRangeValue(value, fallback, min, max){
  const n = Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function resolveQuizRange(){
  const total = filteredWords.length;
  if(total === 0) return { start: 1, end: 0 };

  const startRaw = q.startInput.value;
  const endRaw = q.endInput.value;

  let start = clampRangeValue(startRaw, 1, 1, total);
  let end = clampRangeValue(endRaw, total, 1, total);

  if(start > end){
    const swap = start;
    start = end;
    end = swap;
  }

  q.startInput.min = '1';
  q.startInput.max = String(total);
  q.endInput.min = '1';
  q.endInput.max = String(total);
  q.startInput.value = String(start);
  q.endInput.value = String(end);

  return { start, end };
}

function resetQuizRangeToFullSet(){
  const total = filteredWords.length;
  q.startInput.min = '1';
  q.endInput.min = '1';
  q.startInput.max = String(Math.max(1, total));
  q.endInput.max = String(Math.max(1, total));
  q.startInput.value = '1';
  q.endInput.value = String(Math.max(1, total));
}

function startQuiz(){
  const { start, end } = resolveQuizRange();
  quizWords = filteredWords.slice(start - 1, end);

  if(quizWords.length < 4){
    els.quizWrap.style.display = 'none';
    els.emptyState.style.display = 'block';
    els.emptyState.textContent = 'Need at least 4 words in the selected start/end range to run a quiz.';
    return;
  }
  els.quizWrap.style.display = 'block';
  els.emptyState.style.display = 'none';

  quizOrder = shuffle(quizWords.map((_, i) => i));
  quizPos = 0;
  quizScore = 0;
  quizStreak = 0;
  q.total.textContent = quizWords.length;
  q.summary.style.display = 'none';
  q.activeBlock.style.display = 'block';
  renderQuizQuestion();
}

function pickDistractors(correctIdx, count){
  const correctText = quizWords[correctIdx].translation.trim().toLowerCase();
  const uniqueMap = new Map();
  shuffle(quizWords).forEach((w) => {
    const key = w.translation.trim().toLowerCase();
    if(key !== correctText && !uniqueMap.has(key)) uniqueMap.set(key, w.translation);
  });
  return shuffle([...uniqueMap.values()]).slice(0, count);
}

function renderQuizQuestion(){
  quizAnswered = false;
  q.feedback.textContent = '';
  q.nextWrap.style.display = 'none';

  const idx = quizOrder[quizPos];
  const word = quizWords[idx];
  q.arabic.textContent = word.arabic;
  q.name.textContent = word.transliteration;

  const correctMeaning = word.translation;
  const distractors = pickDistractors(idx, 3);
  const optionTexts = shuffle([correctMeaning, ...distractors]);

  q.options.innerHTML = '';
  optionTexts.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.type = 'button';
    btn.textContent = text;
    btn.addEventListener('click', () => handleAnswer(btn, text === correctMeaning, correctMeaning));
    q.options.appendChild(btn);
  });

  q.score.textContent = quizScore;
  q.streak.textContent = quizStreak;
  const pct = quizPos === 0 ? 0 : Math.round((quizScore / quizPos) * 100);
  q.gauge.style.setProperty('--pct', pct);
  q.gauge.dataset.pct = pct;
}

function handleAnswer(btn, isCorrect, correctText){
  if(quizAnswered) return;
  quizAnswered = true;

  const allBtns = q.options.querySelectorAll('.opt-btn');
  allBtns.forEach(b => {
    b.disabled = true;
    if(b.textContent === correctText) b.classList.add('correct');
  });
  if(!isCorrect) btn.classList.add('wrong');

  if(isCorrect){
    quizScore++;
    quizStreak++;
    q.feedback.textContent = quizStreak >= 3 ? `Correct — streak of ${quizStreak}!` : 'Correct.';
  } else {
    quizStreak = 0;
    q.feedback.textContent = `Not quite — the meaning is "${correctText}".`;
  }
  q.score.textContent = quizScore;
  q.streak.textContent = quizStreak;

  q.nextWrap.style.display = 'flex';
}

q.nextBtn.addEventListener('click', () => {
  quizPos++;
  if(quizPos >= quizOrder.length){
    finishQuiz();
  } else {
    renderQuizQuestion();
  }
});

function finishQuiz(){
  q.activeBlock.style.display = 'none';
  q.summary.style.display = 'block';
  q.summaryScore.textContent = `${quizScore}/${quizOrder.length}`;
  const pct = Math.round((quizScore / quizOrder.length) * 100);
  let msg = 'Keep practicing — repetition builds recognition.';
  if(pct === 100) msg = 'Perfect score — every word recognized.';
  else if(pct >= 80) msg = 'Excellent recall.';
  else if(pct >= 50) msg = 'Good progress — a few more passes and these will stick.';
  q.summaryMsg.textContent = msg;
}
q.restartBtn.addEventListener('click', startQuiz);
q.applyRangeBtn.addEventListener('click', startQuiz);
q.startInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') startQuiz();
});
q.endInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') startQuiz();
});

/* ============ mode switching ============ */
function setMode(mode){
  currentMode = mode;
  els.btnLearn.classList.toggle('active', mode === 'learn');
  els.btnTest.classList.toggle('active', mode === 'test');
  els.quizWrap.classList.toggle('active', mode === 'test');
  if(mode === 'learn'){
    els.quizWrap.style.display = 'none';
    els.detailsBtn.style.display = 'flex';
    renderCard();
  } else {
    closeDetails();
    els.learnWrap.style.display = 'none';
    els.learnNav.style.display = 'none';
    els.learnProgress.style.display = 'none';
    els.detailsBtn.style.display = 'none';
    els.emptyState.style.display = 'none';
    resetQuizRangeToFullSet();
    startQuiz();
  }
}
els.btnLearn.addEventListener('click', () => setMode('learn'));
els.btnTest.addEventListener('click', () => setMode('test'));

/* ============ data + init ============ */
async function loadWords(){
  const response = await fetch('data/words.json', { cache: 'no-store' });
  if(!response.ok){
    throw new Error(`Failed to load words.json (${response.status})`);
  }
  const data = await response.json();
  if(!Array.isArray(data)){
    throw new Error('words.json must contain an array.');
  }
  return data;
}

async function init(){
  try{
    FREQUENT_WORDS = await loadWords();
    MAX_OCC = FREQUENT_WORDS.length
      ? Math.max(...FREQUENT_WORDS.map(w => Number(w.occurrences) || 0))
      : 0;
    filteredWords = FREQUENT_WORDS.slice();
    els.subhead.textContent = `the ${FREQUENT_WORDS.length} most frequent words of the Qur'an`;
    buildDatalist();
    renderCard();
  } catch(err){
    console.error(err);
    els.learnWrap.style.display = 'none';
    els.learnNav.style.display = 'none';
    els.learnProgress.style.display = 'none';
    els.quizWrap.style.display = 'none';
    els.emptyState.style.display = 'block';
    els.emptyState.textContent = 'Could not load words data. Please check data/words.json.';
  }
}

init();
