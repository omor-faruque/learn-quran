const MEMORY_VERSE_STORAGE_KEY = 'lq_memory_verse';
const verseFields = ['arabic', 'pronunciation', 'translation'];
const previousVerseButton = document.getElementById('memory-verse-prev');
const nextVerseButton = document.getElementById('memory-verse-next');
const surahSelect = document.getElementById('memory-surah-select');
const verseSelect = document.getElementById('memory-verse-select');
let memorySurahs = [];
let memoryVerses = [];
let verseLocations = [];
let currentVerseIndex = 0;

function getVerseKey(verse){
  return typeof verse.reference === 'string' && verse.reference.trim()
    ? verse.reference.trim()
    : verse.arabic.trim();
}

function renderMemoryVerse(){
  const verse = memoryVerses[currentVerseIndex];
  verseFields.forEach(field => {
    document.getElementById(`current-verse-${field}`).textContent = verse[field];
  });
  const reference = document.getElementById('current-verse-reference');
  reference.textContent = typeof verse.reference === 'string' ? verse.reference.trim() : '';
  reference.href = typeof verse.link === 'string' ? verse.link.trim() : '';
  reference.hidden = !reference.textContent || !reference.href;
  const location = verseLocations[currentVerseIndex];
  surahSelect.value = String(location.surahIndex);
  if(verseSelect.dataset.surahIndex !== String(location.surahIndex)){
    populateVerseSelect(location.surahIndex);
  }
  verseSelect.value = String(location.verseIndex);
  document.getElementById('memory-verse-position').textContent = `${currentVerseIndex + 1} / ${memoryVerses.length}`;
  previousVerseButton.disabled = currentVerseIndex === 0;
  nextVerseButton.disabled = currentVerseIndex === memoryVerses.length - 1;
  document.getElementById('current-verse-content').hidden = false;
  document.getElementById('current-verse-status').hidden = true;
  try{
    localStorage.setItem(MEMORY_VERSE_STORAGE_KEY, getVerseKey(verse));
  } catch(err){
    console.error('Failed to save current memory verse', err);
  }
}

function changeMemoryVerse(direction){
  if(!memoryVerses.length) return;
  currentVerseIndex = Math.max(0, Math.min(memoryVerses.length - 1, currentVerseIndex + direction));
  renderMemoryVerse();
}

previousVerseButton.addEventListener('click', () => changeMemoryVerse(-1));
nextVerseButton.addEventListener('click', () => changeMemoryVerse(1));
surahSelect.addEventListener('change', () => {
  const surahIndex = Number(surahSelect.value);
  const firstVerseIndex = verseLocations.findIndex(location => location.surahIndex === surahIndex);
  if(firstVerseIndex >= 0){
    currentVerseIndex = firstVerseIndex;
    renderMemoryVerse();
  }
});
verseSelect.addEventListener('change', () => {
  const surahIndex = Number(surahSelect.value);
  const verseIndex = Number(verseSelect.value);
  const location = verseLocations.find(item => item.surahIndex === surahIndex && item.verseIndex === verseIndex);
  if(location){
    currentVerseIndex = location.globalIndex;
    renderMemoryVerse();
  }
});

function populateSurahSelect(){
  const fragment = document.createDocumentFragment();
  memorySurahs.forEach((surah, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = surah.name ? `${surah.surah}. ${surah.name}` : `Surah ${surah.surah}`;
    fragment.appendChild(option);
  });
  surahSelect.replaceChildren(fragment);
  surahSelect.disabled = !memorySurahs.length;
}

function populateVerseSelect(surahIndex){
  const fragment = document.createDocumentFragment();
  memorySurahs[surahIndex].verses.forEach((verse, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = String(verse.verse ?? index + 1);
    fragment.appendChild(option);
  });
  verseSelect.replaceChildren(fragment);
  verseSelect.dataset.surahIndex = String(surahIndex);
  verseSelect.disabled = !memorySurahs[surahIndex].verses.length;
}

async function loadMemoryVerse(){
  const section = document.querySelector('.current-verse');
  const status = document.getElementById('current-verse-status');
  try{
    const response = await fetch('data/quran.json', { cache: 'no-store' });
    if(!response.ok) throw new Error(`Failed to load Quran data (${response.status})`);
    const surahs = await response.json();
    if(!Array.isArray(surahs) || !surahs.every(surah => surah && Array.isArray(surah.verses))){
      throw new Error('Quran data must be an array of surahs with verse arrays.');
    }
    memorySurahs = surahs.filter(surah => surah.verses.length);
    memoryVerses = [];
    verseLocations = [];
    memorySurahs.forEach((surah, surahIndex) => {
      surah.verses.forEach((verse, verseIndex) => {
        verseLocations.push({ surahIndex, verseIndex, globalIndex: memoryVerses.length });
        memoryVerses.push(verse);
      });
    });
    if(!memoryVerses.every(verse => verse && verseFields.every(field => typeof verse[field] === 'string' && verse[field].trim()))){
      throw new Error('Each Quran verse must include Arabic, pronunciation, and translation.');
    }
    if(!memoryVerses.length){
      status.textContent = 'No verses added yet.';
      return;
    }
    populateSurahSelect();
    try{
      const savedKey = localStorage.getItem(MEMORY_VERSE_STORAGE_KEY);
      const savedIndex = memoryVerses.findIndex(verse => getVerseKey(verse) === savedKey);
      currentVerseIndex = savedIndex >= 0 ? savedIndex : 0;
    } catch(err){
      console.error('Failed to read current memory verse', err);
    }
    renderMemoryVerse();
  } catch(err){
    console.error('Failed to load memory verse', err);
    status.textContent = 'Could not load the verse. Please check the memorization data file.';
  } finally {
    section.setAttribute('aria-busy', 'false');
  }
}

loadMemoryVerse();
