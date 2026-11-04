const READ_STORAGE_KEY = 'lq_last_read';
const PDF_CACHE_NAME = 'learn-quran-pdfs-v1';

if(window.pdfjsLib){
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const readEls = {
  status: document.getElementById('read-status'),
  parts: document.getElementById('read-parts'),
  beginningBtn: document.getElementById('read-beginning'),
  middleBtn: document.getElementById('read-middle'),
  endBtn: document.getElementById('read-end'),
  resumeBtn: document.getElementById('resume-btn'),
  lastReadBtn: document.getElementById('btn-last-read'),
  scroll: document.getElementById('read-scroll'),
  loading: document.getElementById('read-loading'),
};

const pdfDocCache = {};
let currentPart = 1;
let pdfDoc = null;
let pdfPageCount = 0;
let currentVisiblePage = 1;
let pageEntries = [];
let pageObserver = null;
let partLoading = false;
let pendingResume = null;
let loadSequence = 0;
const MOBILE_PDF_ZOOM = 1.18;
const readMarker = document.createElement('div');
readMarker.className = 'read-marker';
readMarker.style.display = 'none';

function loadLastRead(){
  try{
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    const entry = raw ? JSON.parse(raw) : null;
    if(!entry || !Number.isInteger(entry.part) || entry.part < 1 || entry.part > 5 ||
      !Number.isInteger(entry.page) || entry.page < 1 ||
      !Number.isFinite(entry.yRatio) || entry.yRatio < 0 || entry.yRatio > 1) return null;
    return entry;
  } catch(err){
    console.error('Failed to read last-read position from storage', err);
    return null;
  }
}

function saveLastRead(entry){
  try{
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(entry));
  } catch(err){
    console.error('Failed to save last-read position', err);
  }
  updateResumeButton();
}

function updateResumeButton(){
  readEls.resumeBtn.disabled = !loadLastRead();
}

function getPdfDoc(part){
  if(pdfDocCache[part]) return pdfDocCache[part];
  const task = loadCachedPdf(`data/Arabic-Bang-${part}.pdf`).catch(err => {
    delete pdfDocCache[part];
    throw err;
  });
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

function setCurrentPage(num){
  currentVisiblePage = num;
  readEls.status.textContent = pdfPageCount ? `Page ${num} of ${pdfPageCount}` : `Page ${num}`;
}

async function openPart(part, initialPage, markerYRatio){
  const sequence = ++loadSequence;
  currentPart = part;
  partLoading = true;
  pdfDoc = null;
  pdfPageCount = 0;
  readEls.status.textContent = 'Loading pages...';
  readEls.parts.querySelectorAll('.part-btn').forEach(button => {
    const active = Number(button.dataset.part) === part;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if(pageObserver) pageObserver.disconnect();
  readEls.scroll.querySelectorAll('.read-page').forEach(element => element.remove());
  pageEntries = [];
  readMarker.style.display = 'none';
  readEls.loading.textContent = 'Loading page...';
  readEls.loading.classList.remove('hidden');
  readEls.scroll.setAttribute('aria-busy', 'true');
  try{
    const loadedDoc = await getPdfDoc(part);
    const firstPage = await loadedDoc.getPage(1);
    if(sequence !== loadSequence) return;
    pdfDoc = loadedDoc;
    pdfPageCount = pdfDoc.numPages;
    const baseViewport = firstPage.getViewport({ scale: 1 });
    buildPageEntries(pdfPageCount, baseViewport.height / baseViewport.width);
    readEls.loading.classList.add('hidden');
    const queuedResume = pendingResume && pendingResume.part === part ? pendingResume : null;
    pendingResume = null;
    const target = Math.min(Math.max(1, initialPage || queuedResume?.page || 1), pdfPageCount);
    scrollToPage(target, typeof markerYRatio === 'number' ? markerYRatio : queuedResume?.yRatio, 'auto');
  } catch(err){
    if(sequence !== loadSequence) return;
    console.error('Failed to load PDF part', part, err);
    readEls.status.textContent = 'Unable to load part';
    readEls.loading.textContent = 'Could not load this part. Select the part again to retry.';
  } finally {
    if(sequence === loadSequence){
      partLoading = false;
      readEls.scroll.setAttribute('aria-busy', 'false');
    }
  }
}

function getPageWidth(){
  const width = readEls.scroll.clientWidth || 600;
  return window.matchMedia('(min-width:761px)').matches
    ? Math.min(width, 760)
    : width * MOBILE_PDF_ZOOM;
}

function buildPageEntries(count, aspect){
  const fragment = document.createDocumentFragment();
  const width = getPageWidth();
  for(let pageNum = 1; pageNum <= count; pageNum++){
    const container = document.createElement('div');
    container.className = 'read-page';
    container.dataset.page = String(pageNum);
    container.style.minHeight = `${Math.round(width * aspect)}px`;
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `Quran PDF part ${currentPart}, page ${pageNum}`);
    container.appendChild(canvas);
    fragment.appendChild(container);
    pageEntries.push({ container, canvas, rendered:false, rendering:false, pageNum });
  }
  readEls.scroll.appendChild(fragment);
  pageEntries.forEach(entry => {
    entry.container.addEventListener('click', event => {
      const rect = entry.container.getBoundingClientRect();
      const yRatio = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      saveLastRead({ part: currentPart, page: entry.pageNum, yRatio, ts: Date.now() });
      placeMarker(entry.pageNum, yRatio);
    });
  });
  pageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const pageNum = Number(entry.target.dataset.page);
      if(entry.isIntersecting){
        renderPageCanvas(pageNum);
      }
    });
  }, { root: readEls.scroll, rootMargin: '800px 0px', threshold: [0, 0.5] });
  pageEntries.forEach(entry => pageObserver.observe(entry.container));
  const last = loadLastRead();
  if(last && last.part === currentPart) placeMarker(last.page, last.yRatio);
}

function renderPageCanvas(pageNum){
  const entry = pageEntries[pageNum - 1];
  if(!entry || entry.rendered || entry.rendering || !pdfDoc) return;
  entry.rendering = true;
  pdfDoc.getPage(pageNum).then(page => {
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: getPageWidth() / baseViewport.width });
    const context = entry.canvas.getContext('2d');
    const outputScale = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);
    entry.canvas.width = Math.floor(viewport.width * outputScale);
    entry.canvas.height = Math.floor(viewport.height * outputScale);
    entry.canvas.style.width = `${viewport.width}px`;
    entry.canvas.style.height = `${viewport.height}px`;
    return page.render({
      canvasContext: context,
      viewport,
      transform: [outputScale, 0, 0, outputScale, 0, 0],
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

function goToPartPosition(position){
  if(!pdfDoc || !pdfPageCount) return;
  const page = position === 'beginning' ? 1 : position === 'middle' ? Math.ceil(pdfPageCount / 2) : pdfPageCount;
  scrollToPage(page);
}

function resumeLastRead(){
  const last = loadLastRead();
  if(!last) return;
  if(last.part === currentPart && partLoading){
    pendingResume = last;
  } else if(last.part === currentPart && pageEntries.length){
    scrollToPage(last.page, last.yRatio);
  } else {
    openPart(last.part, last.page, last.yRatio);
  }
}

readEls.parts.querySelectorAll('.part-btn').forEach(button => {
  button.addEventListener('click', () => openPart(Number(button.dataset.part)));
});
readEls.beginningBtn.addEventListener('click', () => goToPartPosition('beginning'));
readEls.middleBtn.addEventListener('click', () => goToPartPosition('middle'));
readEls.endBtn.addEventListener('click', () => goToPartPosition('end'));
readEls.resumeBtn.addEventListener('click', resumeLastRead);
readEls.lastReadBtn.addEventListener('click', resumeLastRead);
readEls.scroll.addEventListener('scroll', () => {
  const position = readEls.scroll.scrollTop + 24;
  const visible = pageEntries.find(entry => entry.container.offsetTop + entry.container.clientHeight > position);
  if(visible) setCurrentPage(visible.pageNum);
}, { passive:true });
window.addEventListener('resize', () => {
  if(pdfDoc){
    pageEntries.forEach(entry => { entry.rendered = false; });
    renderPageCanvas(currentVisiblePage);
  }
});

updateResumeButton();
const initialBookmark = window.location.hash === '#resume' ? loadLastRead() : null;
openPart(initialBookmark?.part || 1, initialBookmark?.page, initialBookmark?.yRatio);