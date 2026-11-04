const MEMORY_VERSE_STORAGE_KEY = 'lq_memory_verse';
const verseFields = ['arabic', 'pronunciation', 'translation'];
const previousVerseButton = document.getElementById('memory-verse-prev');
const nextVerseButton = document.getElementById('memory-verse-next');
let memoryVerses = [];
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

async function loadMemoryVerse(){
  const section = document.querySelector('.current-verse');
  const status = document.getElementById('current-verse-status');
  try{
    const response = await fetch('data/memory-verse.json', { cache: 'no-store' });
    if(!response.ok) throw new Error(`Failed to load memory verse (${response.status})`);
    const verses = await response.json();
    if(!Array.isArray(verses) || !verses.every(verse => verse && verseFields.every(field => typeof verse[field] === 'string' && verse[field].trim()))){
      throw new Error('Memory verses must be an array with Arabic, pronunciation, and translation for each verse.');
    }
    memoryVerses = verses;
    if(!memoryVerses.length){
      status.textContent = 'No verses added yet.';
      return;
    }
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
