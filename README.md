# Miftah - Learn Quranic Vocabulary

A focused, elegant web app for learning high-frequency Quranic words through two modes:

- Learn mode: flip cards, frequency context, and word details.
- Test Yourself mode: multiple-choice recall with range-based quizzing.

## Why This Project

Memorization improves when repetition is structured. This app helps you:

- See words in a clean, distraction-free flow.
- Focus by type (Noun, Verb, Particle).
- Jump quickly to any word by text or number.
- Test only a selected range (for targeted revision).

## Live Features

- Interactive flip-card learning experience.
- Word frequency bar and occurrence count.
- Details panel with image support when available.
- Keyboard support in Learn mode:
  - Left/Right arrows: previous/next word
  - Space: flip card
  - Escape: close details panel
- Touch swipe support on mobile (left/right navigation).
- Test mode scoring:
  - Score, streak, and completion summary
- Test range control:
  - Start and End input to quiz only a selected slice
- Search and jump:
  - Exact transliteration-translation match
  - Numeric jump (example: entering 45 jumps to the 45th word)

## Project Structure

```text
.
|- index.html
|- styles.css
|- app.js
|- data/
|  |- words.json
|- images/
```

## Tech Stack

- HTML5
- CSS3 (custom design system via CSS variables)
- Vanilla JavaScript (no framework)
- JSON dataset loading via fetch

## Getting Started

Because the app loads data using fetch, run it from a local server (not direct file:// opening).

### Option 1: Python

```bash
cd /Users/MdOmor.Faruque/Desktop/etc/LearnQuran
python3 -m http.server 5500
```

Then open:

- http://localhost:5500

### Option 2: VS Code Live Server

- Open the folder in VS Code.
- Start Live Server on index.html.
- Open the provided localhost URL.

## How to Use

### Learn Mode

1. Use filters (All / Noun / Verb / Particle).
2. Flip each card to reveal meaning.
3. Use progress bar, prev/next controls, or keyboard arrows.
4. Open Details for visual notes when available.

### Test Yourself Mode

1. Switch to Test Yourself.
2. Set Start and End if you want targeted revision.
3. Click Apply.
4. Answer each multiple-choice prompt.
5. Review score and restart as needed.

## Data Format

The app expects an array in data/words.json with fields like:

- word_id
- arabic
- transliteration
- translation
- type
- occurrences
- image (optional)

## Customization Ideas

- Add tags such as root, theme, or lesson number.
- Add spaced-repetition scheduling.
- Persist progress and streaks using localStorage.
- Add audio pronunciation per word.
- Add multiple quiz types (typing, matching, reverse recall).

## Contributing

Suggestions and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Open a pull request with a clear description.

## License

Choose and add a license file (for example: MIT) if you plan to publish this publicly.
