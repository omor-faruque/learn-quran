let FREQUENT_WORDS = [];
let MAX_OCC = 0;

/* ============ difficult words (tagging) ============ */
const DIFFICULT_STORAGE_KEY = 'lq_difficult_word_ids';

function loadDifficultIds(){
  try{
    const raw = localStorage.getItem(DIFFICULT_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch(err){
    console.error('Failed to read difficult words from storage', err);
    return new Set();
  }
}
function saveDifficultIds(ids){
  localStorage.setItem(DIFFICULT_STORAGE_KEY, JSON.stringify([...ids]));
}
let difficultIds = loadDifficultIds();

function isDifficult(word){
  return difficultIds.has(word.word_id) || word.difficult === true;
}
function setDifficult(word, flag){
  if(flag) difficultIds.add(word.word_id);
  else difficultIds.delete(word.word_id);
  saveDifficultIds(difficultIds);
}

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
let activeSort = 'default';
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
  btnRead: document.getElementById('btn-read'),
  btnLastRead: document.getElementById('btn-last-read'),
  emptyState: document.getElementById('empty-state'),
  progressTrack: document.getElementById('progress-track'),
  progressFill: document.getElementById('progress-fill'),
  progressThumb: document.getElementById('progress-thumb'),
  pPos: document.getElementById('p-pos'),
  pTotal: document.getElementById('p-total'),
  pPct: document.getElementById('p-pct'),
  searchBox: document.getElementById('search-box'),
  wordList: document.getElementById('word-list'),
  sortSelect: document.getElementById('sort-select'),
  subhead: document.getElementById('subhead'),
  detailsSheet: document.getElementById('details-sheet'),
  detailsBackdrop: document.getElementById('details-backdrop'),
  detailsClose: document.getElementById('details-close'),
  detailsTitle: document.getElementById('details-title'),
  detailsImage: document.getElementById('details-image'),
  detailsCaption: document.getElementById('details-caption'),
  starBtn: document.getElementById('star-btn'),
  difficultPill: document.getElementById('difficult-pill'),
  mobileMenu: document.getElementById('mobile-menu'),
  mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
};

let detailsOpen = false;
let mobileMenuOpen = false;

function setMobileMenu(open){
  mobileMenuOpen = currentMode !== 'read' || open;
  els.mobileMenu.classList.toggle('open', mobileMenuOpen);
  els.mobileMenu.classList.toggle('read-menu', currentMode === 'read');
  els.mobileMenuToggle.parentElement.classList.toggle('read-menu-active', currentMode === 'read');
  els.mobileMenuToggle.setAttribute('aria-expanded', String(mobileMenuOpen));
}

els.mobileMenuToggle.addEventListener('click', () => setMobileMenu(!mobileMenuOpen));

/* ============ filtering ============ */
function applyFilter(type){
  activeType = type;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.dataset.type === type));
  const words = type === 'All'
    ? FREQUENT_WORDS.slice()
    : type === 'Difficult'
      ? FREQUENT_WORDS.filter(w => isDifficult(w))
      : FREQUENT_WORDS.filter(w => w.type === type);
  filteredWords = sortWords(words);
  currentIndex = 0;
  buildDatalist();
  if(currentMode === 'learn') renderCard();
  else startQuiz();
}
document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.type));
});

function sortWords(words){
  if(activeSort === 'occurrences'){
    return words.sort((a, b) => (Number(b.occurrences) || 0) - (Number(a.occurrences) || 0));
  }
  return words;
}

els.sortSelect.addEventListener('change', () => {
  activeSort = els.sortSelect.value;
  applyFilter(activeType);
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

  // reset to front face instantly, without the reverse-flip animation
  els.flipCard.classList.add('no-flip-anim');
  els.flipCard.classList.remove('flipped');
  void els.flipCard.offsetWidth;
  els.flipCard.classList.remove('no-flip-anim');

  els.prevBtn.disabled = currentIndex === 0;
  els.nextBtn.disabled = currentIndex === filteredWords.length - 1;
  els.detailsBtn.disabled = !w.image;
  updateStarBtn(w);
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

function updateStarBtn(word){
  const marked = isDifficult(word);
  els.starBtn.textContent = marked ? '★ Marked difficult' : '☆ Mark difficult';
  els.starBtn.classList.toggle('active', marked);
}

function toggleDifficultCurrent(){
  if(filteredWords.length === 0) return;
  const word = filteredWords[currentIndex];
  const marked = !isDifficult(word);
  setDifficult(word, marked);
  if(activeType === 'Difficult' && !marked){
    applyFilter('Difficult');
  } else {
    updateStarBtn(word);
  }
}
els.starBtn.addEventListener('click', toggleDifficultCurrent);

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
  // size for the taller face so flipping never resizes the card
  const h = Math.max(frontFace.scrollHeight, backFace.scrollHeight, 240);
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
  els.btnRead.classList.toggle('active', mode === 'read');
  els.quizWrap.classList.toggle('active', mode === 'test');
  readEls.wrap.style.display = mode === 'read' ? 'block' : 'none';
  setMobileMenu(mode !== 'read');
  if(mode === 'learn'){
    els.quizWrap.style.display = 'none';
    els.detailsBtn.style.display = 'flex';
    renderCard();
  } else if(mode === 'test'){
    closeDetails();
    els.learnWrap.style.display = 'none';
    els.learnNav.style.display = 'none';
    els.learnProgress.style.display = 'none';
    els.detailsBtn.style.display = 'none';
    els.emptyState.style.display = 'none';
    resetQuizRangeToFullSet();
    startQuiz();
  } else {
    closeDetails();
    els.learnWrap.style.display = 'none';
    els.learnNav.style.display = 'none';
    els.learnProgress.style.display = 'none';
    els.detailsBtn.style.display = 'none';
    els.quizWrap.style.display = 'none';
    els.emptyState.style.display = 'none';
    if(!pdfDoc) openPart(currentPart);
  }
}
els.btnLearn.addEventListener('click', () => setMode('learn'));
els.btnTest.addEventListener('click', () => setMode('test'));
els.btnRead.addEventListener('click', () => setMode('read'));
els.btnLastRead.addEventListener('click', () => {
  const last = loadLastRead();
  if(!last) return;
  setMode('read');
  setTimeout(() => {
    if(last.part === currentPart && pageEntries.length){
      scrollToPage(last.page, last.yRatio);
    } else if(partLoading && last.part === currentPart){
      pendingResume = last;
    } else {
      openPart(last.part);
      pendingResume = last;
    }
  }, 100);
});

/* ============ read quran mode (PDF viewer + last read) ============ */
const READ_STORAGE_KEY = 'lq_last_read';
const PDF_CACHE_NAME = 'learn-quran-pdfs-v1';

if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const readEls = {
  wrap: document.getElementById('read-wrap'),
  status: document.getElementById('read-status'),
  parts: document.getElementById('read-parts'),
  beginningBtn: document.getElementById('read-beginning'),
  middleBtn: document.getElementById('read-middle'),
  endBtn: document.getElementById('read-end'),
  resumeBtn: document.getElementById('resume-btn'),
  scroll: document.getElementById('read-scroll'),
  loading: document.getElementById('read-loading'),
};

const pdfDocCache = {};
let currentPart = 1;
let pdfDoc = null;
let pdfPageCount = 0;
let currentVisiblePage = 1;
let pageEntries = []; // { container, canvas, rendered, rendering, pageNum }
let pageObserver = null;
let partLoading = false;
let pendingResume = null;
const PDF_ZOOM = 1.18;
const readMarker = document.createElement('div');
readMarker.className = 'read-marker';
readMarker.style.display = 'none';

function loadLastRead(){
  try{
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch(err){
    console.error('Failed to read last-read position from storage', err);
    return null;
  }
}
function saveLastRead(entry){
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(entry));
  updateResumeButton();
}
function updateResumeButton(){
  readEls.resumeBtn.disabled = !loadLastRead();
  els.btnLastRead.style.display = loadLastRead() ? 'block' : 'none';
}

function getPdfDoc(part){
  if(pdfDocCache[part]) return pdfDocCache[part];
  const url = `data/Arabic-Bang-${part}.pdf`;
  const task = loadCachedPdf(url);
  pdfDocCache[part] = task;
  return task;
}

async function loadCachedPdf(url){
  if(!('caches' in window)) return pdfjsLib.getDocument(url).promise;

  const cache = await caches.open(PDF_CACHE_NAME);
  let response = await cache.match(url);
  if(!response){
    response = await fetch(url);
    if(!response.ok) throw new Error(`Failed to load PDF (${response.status})`);
    await cache.put(url, response.clone());
  }
  const data = await response.arrayBuffer();
  return pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
}

function placeMarker(pageNum, yRatio){
  const entry = pageEntries[pageNum - 1];
  if(!entry) return;
  entry.container.appendChild(readMarker);
  readMarker.style.display = 'block';
  readMarker.style.top = `${yRatio * entry.container.clientHeight}px`;
}
function hideMarker(){
  readMarker.style.display = 'none';
}

function setCurrentPage(num){
  currentVisiblePage = num;
  readEls.status.textContent = pdfPageCount ? `Page ${num} of ${pdfPageCount}` : `Page ${num}`;
}

async function openPart(part, initialPage, markerYRatio){
  currentPart = part;
  partLoading = true;
  readEls.status.textContent = 'Loading pages…';
  document.querySelectorAll('.part-btn').forEach(b => b.classList.toggle('active', Number(b.dataset.part) === part));
  if(pageObserver) pageObserver.disconnect();
  readEls.scroll.querySelectorAll('.read-page').forEach(n => n.remove());
  pageEntries = [];
  hideMarker();
  readEls.loading.classList.remove('hidden');
  try{
    pdfDoc = await getPdfDoc(part);
    pdfPageCount = pdfDoc.numPages;
    const firstPage = await pdfDoc.getPage(1);
    const baseViewport = firstPage.getViewport({ scale: 1 });
    const aspect = baseViewport.height / baseViewport.width;
    buildPageEntries(pdfPageCount, aspect);
    readEls.loading.classList.add('hidden');
    const queuedResume = pendingResume && pendingResume.part === part ? pendingResume : null;
    pendingResume = null;
    const target = Math.min(Math.max(1, initialPage || queuedResume?.page || 1), pdfPageCount);
    setCurrentPage(target);
    scrollToPage(target, typeof markerYRatio === 'number' ? markerYRatio : queuedResume?.yRatio, 'auto');
  } catch(err){
    console.error('Failed to load PDF part', part, err);
    readEls.loading.textContent = 'Could not load this part.';
  } finally {
    partLoading = false;
  }
}

function buildPageEntries(count, aspect){
  const frag = document.createDocumentFragment();
  const width = readEls.scroll.clientWidth || 600;
  for(let i = 1; i <= count; i++){
    const container = document.createElement('div');
    container.className = 'read-page';
    container.dataset.page = String(i);
    container.style.minHeight = `${Math.round(width * aspect)}px`;
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    frag.appendChild(container);
    pageEntries.push({ container, canvas, rendered:false, rendering:false, pageNum:i });
  }
  readEls.scroll.appendChild(frag);

  pageEntries.forEach(entry => {
    entry.container.addEventListener('click', (e) => {
      const rect = entry.container.getBoundingClientRect();
      const yRatio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      saveLastRead({ part: currentPart, page: entry.pageNum, yRatio, ts: Date.now() });
      placeMarker(entry.pageNum, yRatio);
    });
  });

  pageObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const pageNum = Number(e.target.dataset.page);
      if(e.isIntersecting){
        renderPageCanvas(pageNum);
        if(e.intersectionRatio > 0.5) setCurrentPage(pageNum);
      }
    });
  }, { root: readEls.scroll, rootMargin: '800px 0px', threshold: [0, 0.5] });
  pageEntries.forEach(entry => pageObserver.observe(entry.container));

  const last = loadLastRead();
  if(last && last.part === currentPart){
    placeMarker(last.page, last.yRatio);
  }
}

function renderPageCanvas(pageNum){
  const entry = pageEntries[pageNum - 1];
  if(!entry || entry.rendered || entry.rendering) return;
  entry.rendering = true;
  pdfDoc.getPage(pageNum).then(page => {
    const containerWidth = readEls.scroll.clientWidth || 600;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = (containerWidth / baseViewport.width) * PDF_ZOOM;
    const viewport = page.getViewport({ scale });
    const ctx = entry.canvas.getContext('2d');
    const deviceScale = window.devicePixelRatio || 1;
    const outputScale = Math.min(Math.max(deviceScale, 2), 3);
    entry.canvas.width = Math.floor(viewport.width * outputScale);
    entry.canvas.height = Math.floor(viewport.height * outputScale);
    entry.canvas.style.width = `${viewport.width}px`;
    entry.canvas.style.height = `${viewport.height}px`;
    return page.render({
      canvasContext: ctx,
      viewport,
      transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
    }).promise.then(() => {
      entry.rendered = true;
      entry.rendering = false;
      entry.container.style.minHeight = '';
      if(readMarker.parentElement === entry.container){
        const last = loadLastRead();
        if(last && last.part === currentPart && last.page === pageNum){
          readMarker.style.top = `${last.yRatio * entry.container.clientHeight}px`;
        }
      }
    });
  }).catch(err => {
    entry.rendering = false;
    console.error('Failed to render page', pageNum, err);
  });
}

function scrollToPage(num, yRatio, behavior){
  const entry = pageEntries[num - 1];
  if(!entry) return;
  renderPageCanvas(num);
  const extra = typeof yRatio === 'number' ? yRatio * entry.container.clientHeight : 0;
  readEls.scroll.scrollTo({ top: entry.container.offsetTop + extra - 24, behavior: behavior || 'smooth' });
  setCurrentPage(num);
  if(typeof yRatio === 'number') placeMarker(num, yRatio);
}

function goToPage(delta){
  if(!pdfDoc) return;
  const target = Math.min(pdfPageCount, Math.max(1, currentVisiblePage + delta));
  if(target !== currentVisiblePage) scrollToPage(target);
}
readEls.parts.querySelectorAll('.part-btn').forEach(btn => {
  btn.addEventListener('click', () => openPart(Number(btn.dataset.part)));
});

function goToPartPosition(position){
  if(!pdfDoc || !pdfPageCount) return;
  const page = position === 'beginning'
    ? 1
    : position === 'middle'
      ? Math.ceil(pdfPageCount / 2)
      : pdfPageCount;
  scrollToPage(page);
}

readEls.beginningBtn.addEventListener('click', () => goToPartPosition('beginning'));
readEls.middleBtn.addEventListener('click', () => goToPartPosition('middle'));
readEls.endBtn.addEventListener('click', () => goToPartPosition('end'));

readEls.resumeBtn.addEventListener('click', () => {
  const last = loadLastRead();
  if(!last) return;
  if(last.part === currentPart && pageEntries.length){
    scrollToPage(last.page, last.yRatio);
  } else if(partLoading && last.part === currentPart){
    pendingResume = last;
  } else {
    openPart(last.part, last.page, last.yRatio);
  }
});

window.addEventListener('resize', () => {
  if(currentMode === 'read' && pdfDoc){
    pageEntries.forEach(entry => { entry.rendered = false; });
    renderPageCanvas(currentVisiblePage);
  }
});

updateResumeButton();

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
    filteredWords = sortWords(FREQUENT_WORDS.slice());
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
