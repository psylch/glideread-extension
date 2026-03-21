# Stress Capitalization (重音大写) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Stress" reading mode that capitalizes the stressed syllable of English words (e.g. `computer` → `comPUter`), helping non-native readers perceive pronunciation rhythm.

**Architecture:** Plain JS, zero build tools — consistent with the existing extension architecture. A one-time Node.js script pre-generates a compact stress lookup table from CMU Pronouncing Dictionary. The lookup table ships as a static JS file alongside existing utils. Content script gains a new `stress` mode branch parallel to `glideread`/`bionic`.

**Tech Stack:** Vanilla JS (extension runtime), Node.js (one-time data generation script only)

---

## Background

The original design doc proposed bundling this with a TypeScript migration + esbuild toolchain. After review, we decided against it:

- The extension is ~1,200 lines across 8 files with zero build step — this simplicity is a feature
- Safari Web Extension shares code via git submodule + Xcode build-phase sed patching — a TS migration would break all of this
- CMU dictionary data can be pre-generated once and committed as a static JS file — no runtime npm dependency needed

## Data Strategy

**CMU Pronouncing Dictionary** maps ~134K English words to ARPAbet phonemes. Vowel phonemes carry stress markers: `1` (primary), `2` (secondary), `0` (unstressed).

Example: `COMPUTER  K AH0 M P Y UW1 T ER0` → primary stress on `UW1` → syllable "pu" → `comPUter`

**Pre-processing pipeline** (one-time script, NOT part of extension runtime):

1. Read raw CMU dict data (downloadable text file, no npm package needed)
2. Parse each entry: word → phoneme sequence
3. Map phonemes back to letter positions using alignment heuristic
4. Output: `{ "computer": [3, 5], "beautiful": [0, 4], ... }` where `[start, end]` = indices of stressed syllable letters
5. Filter to top ~20K high-frequency words (intersection with a word frequency list) to keep file size reasonable (~250KB)
6. Write as `var CMU_STRESS_MAP = { ... };` in a plain JS file

**Why not the full 134K?** Full dict → ~1.5MB JS file. Top 20K covers 95%+ of words encountered in typical web reading. Unrecognized words simply stay unchanged — graceful degradation.

---

### Task 1: Create the CMU data generation script

**Files:**
- Create: `scripts/build-stress-data.mjs`
- Create: `scripts/README.md` (brief usage note)

**Step 1: Write the generation script**

```js
// scripts/build-stress-data.mjs
//
// One-time script to generate utils/stress-data.js from CMU Pronouncing Dictionary.
// Usage: node scripts/build-stress-data.mjs
//
// Prerequisites:
//   Download cmudict-0.7b from http://www.speech.cs.cmu.edu/cgi-bin/cmudict
//   Place as scripts/cmudict-0.7b.txt
//
// Optional: place a word frequency list as scripts/word-freq.txt (one word per line)
//   to filter output to high-frequency words only.

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DICT_PATH = join(__dirname, 'cmudict-0.7b.txt');
const FREQ_PATH = join(__dirname, 'word-freq.txt');
const OUTPUT_PATH = join(__dirname, '..', 'utils', 'stress-data.js');

// --- Parse CMU dict ---

function parseCmuDict(text) {
  const entries = new Map();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith(';;;')) continue;
    const match = line.match(/^([A-Z']+)\s+(.+)$/);
    if (!match) continue;
    const word = match[1].toLowerCase();
    // Skip variant pronunciations like RECORD(2)
    if (word.includes('(')) continue;
    const phonemes = match[2].trim().split(/\s+/);
    entries.set(word, phonemes);
  }
  return entries;
}

// --- Find stressed syllable letter range ---

// ARPAbet vowels (the phonemes that carry stress markers)
const VOWEL_PHONEMES = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY',
  'EH', 'ER', 'EY', 'IH', 'IY',
  'OW', 'OY', 'UH', 'UW',
]);

// Simple phoneme-to-letter-count mapping for alignment.
// This is a rough heuristic — perfect alignment is impossible without
// a full grapheme-to-phoneme model, but it's good enough for ~90% of words.
function alignPhonemes(word, phonemes) {
  // Strategy: walk through phonemes, consume letters proportionally.
  // Track which phoneme index has primary stress (1).
  let stressPhonemeIdx = -1;
  for (let i = 0; i < phonemes.length; i++) {
    const p = phonemes[i];
    const base = p.replace(/[012]$/, '');
    if (VOWEL_PHONEMES.has(base) && p.endsWith('1')) {
      stressPhonemeIdx = i;
      break;
    }
  }
  if (stressPhonemeIdx === -1) return null;

  // Proportional alignment: divide word length across phonemes
  const lettersPerPhoneme = word.length / phonemes.length;
  const start = Math.round(stressPhonemeIdx * lettersPerPhoneme);

  // Find syllable boundaries: extend from stress phoneme to adjacent vowels
  let phonemeEnd = stressPhonemeIdx + 1;
  // Include trailing consonant phonemes (they belong to this syllable)
  while (phonemeEnd < phonemes.length) {
    const base = phonemes[phonemeEnd].replace(/[012]$/, '');
    if (VOWEL_PHONEMES.has(base)) break;
    phonemeEnd++;
  }

  const end = Math.min(Math.round(phonemeEnd * lettersPerPhoneme), word.length);

  // Sanity: at least 1 char, not the entire word
  if (start >= end || (start === 0 && end === word.length)) return null;

  return [start, end];
}

// --- Main ---

console.log('Reading CMU dict...');
const dictText = readFileSync(DICT_PATH, 'utf-8');
const dict = parseCmuDict(dictText);
console.log(`Parsed ${dict.size} entries`);

// Optional frequency filter
let allowedWords = null;
if (existsSync(FREQ_PATH)) {
  console.log('Applying word frequency filter...');
  const freqText = readFileSync(FREQ_PATH, 'utf-8');
  allowedWords = new Set(
    freqText.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean)
  );
  console.log(`Frequency list: ${allowedWords.size} words`);
}

const stressMap = {};
let count = 0;
for (const [word, phonemes] of dict) {
  // Skip short words (stress marking not useful)
  if (word.length <= 3) continue;
  // Skip if not in frequency list (when provided)
  if (allowedWords && !allowedWords.has(word)) continue;
  // Skip words with apostrophes
  if (word.includes("'")) continue;

  const range = alignPhonemes(word, phonemes);
  if (range) {
    stressMap[word] = range;
    count++;
  }
}

console.log(`Generated stress map: ${count} entries`);

// Write output
const output = `// Auto-generated by scripts/build-stress-data.mjs — DO NOT EDIT
// Source: CMU Pronouncing Dictionary (cmudict-0.7b)
// Entries: ${count}
//
// Format: { word: [startIndex, endIndex] }
// startIndex/endIndex mark the stressed syllable's letter range.

// Guard against re-injection
if (typeof CMU_STRESS_MAP === 'undefined') {
var CMU_STRESS_MAP = ${JSON.stringify(stressMap, null, 0)};
}
`;

writeFileSync(OUTPUT_PATH, output, 'utf-8');
console.log(`Written to ${OUTPUT_PATH} (${(output.length / 1024).toFixed(0)} KB)`);
```

**Step 2: Download CMU dict data and a word frequency list**

Run:
```bash
cd extension/scripts
curl -o cmudict-0.7b.txt https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict-0.7b
# Use a common English word frequency list (e.g. Google 10K or similar)
# Place as word-freq.txt, one word per line
```

**Step 3: Run the script and verify output**

Run: `cd extension && node scripts/build-stress-data.mjs`
Expected: `utils/stress-data.js` created, ~200-400KB, contains `var CMU_STRESS_MAP = {...};`

**Step 4: Spot-check the generated data**

Verify in the output file:
- `CMU_STRESS_MAP["computer"]` → `[3, 5]` (comPUter)
- `CMU_STRESS_MAP["beautiful"]` → `[0, 4]` (BEAUtiful)
- `CMU_STRESS_MAP["information"]` → `[5, 7]` (inforMAtion)
- Short words (<=3 chars) are excluded
- Total entry count is 15K-25K

**Step 5: Add scripts/ data files to .gitignore selectively**

Add to `extension/.gitignore`:
```
scripts/cmudict-0.7b.txt
scripts/word-freq.txt
```

The generated `utils/stress-data.js` SHOULD be committed (it's a runtime dependency).
The raw data files should NOT be committed (large, easily re-downloaded).

**Step 6: Commit**

```bash
git add scripts/build-stress-data.mjs scripts/README.md utils/stress-data.js .gitignore
git commit -m "feat: add CMU stress data generation script and pre-built lookup table"
```

---

### Task 2: Create stress.js module

**Files:**
- Create: `utils/stress.js`

**Step 1: Write stress.js**

```js
// utils/stress.js — Stress capitalization for English words
// Requires: utils/stress-data.js (CMU_STRESS_MAP) loaded first

/**
 * Apply stress capitalization to a single English word.
 * Looks up the word in CMU_STRESS_MAP and capitalizes the stressed syllable.
 *
 * @param {string} word - A single word (no spaces/punctuation)
 * @returns {string} The word with stressed syllable capitalized, or original if not found
 */
function stressifyWord(word) {
  if (word.length <= 3) return word;

  var range = CMU_STRESS_MAP[word.toLowerCase()];
  if (!range) return word;

  var start = range[0];
  var end = range[1];
  return word.slice(0, start) + word.slice(start, end).toUpperCase() + word.slice(end);
}

/**
 * Process a text string, applying stress capitalization to each word.
 * Non-word characters (spaces, punctuation) are preserved as-is.
 * CJK characters are skipped (same logic as bionicify).
 *
 * @param {string} text - Input text
 * @returns {string} Text with stressed syllables capitalized
 */
function stressifyText(text) {
  var CJK = '\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\uf900-\ufaff';
  var tokens = text.match(new RegExp('[' + CJK + ']|[^' + CJK + '\\s\\p{P}\\p{S}]+|[\\s\\p{P}\\p{S}]+', 'gu'));
  if (!tokens) return text;

  return tokens.map(function(token) {
    // Only process Latin/alphabetic words
    if (/[\p{L}\p{N}]/u.test(token)) {
      if (/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/u.test(token)) {
        return token;
      }
      return stressifyWord(token);
    }
    return token;
  }).join('');
}
```

**Step 2: Verify the functions work in a browser console**

Load `stress-data.js` then `stress.js` in a browser console and test:
```js
stressifyWord('computer')   // → "comPUter"
stressifyWord('the')        // → "the" (too short)
stressifyWord('xyz')        // → "xyz" (not in dict)
stressifyText('The computer is beautiful') // → "The comPUter is BEAUtiful"
```

**Step 3: Commit**

```bash
git add utils/stress.js
git commit -m "feat: add stress.js — stress capitalization module"
```

---

### Task 3: Integrate stress mode into content.js

**Files:**
- Modify: `content.js:26-35`

**Step 1: Add stress mode branch**

In `content.js`, the `processElement` function currently has:

```js
if (readingMode === 'glideread' || readingMode === 'bionic') {
```

Add an `else if` branch after the closing `}` of this block:

```js
} else if (readingMode === 'stress') {
  const textNodes = getTextNodes(el);
  textNodes.forEach((textNode) => {
    const stressed = stressifyText(textNode.textContent);
    if (stressed !== textNode.textContent) {
      textNode.textContent = stressed;
    }
  });
}
```

Note: `stress` mode uses `textContent` replacement (pure text), not `innerHTML` — no `<span>` wrappers needed, zero CSS dependency.

**Step 2: Commit**

```bash
git add content.js
git commit -m "feat: integrate stress reading mode into content script"
```

---

### Task 4: Update background.js injection list

**Files:**
- Modify: `background.js:10-13`
- Modify: `background.js:94-97`

**Step 1: Add stress-data.js and stress.js to both injection arrays**

In `injectIfNeeded()` (line 12):

```js
files: ['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'utils/stress-data.js', 'utils/stress.js', 'content.js'],
```

In `forceInject()` (line 96), same change:

```js
files: ['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'utils/stress-data.js', 'utils/stress.js', 'content.js'],
```

**Step 2: Commit**

```bash
git add background.js
git commit -m "feat: inject stress-data.js and stress.js in content script pipeline"
```

---

### Task 5: Add "Stress" option to Options UI

**Files:**
- Modify: `options/options.html:42-47` (mode picker)
- Modify: `options/options.html:191-194` (script imports)
- Modify: `options/options.js:76-80` (MODE_DESC_KEYS)
- Modify: `options/options.js:178-183` (preview rendering)

**Step 1: Add Stress button to mode picker in HTML**

In `options.html`, the mode picker segmented control, add a Stress button between Bionic and Enlarge:

```html
<button class="segmented-btn" data-value="bionic" data-i18n="modeBionic">Bionic</button>
<button class="segmented-btn" data-value="stress" data-i18n="modeStress">Stress</button>
<button class="segmented-btn" data-value="enlarge" data-i18n="modeEnlarge">Enlarge</button>
```

**Step 2: Add stress-data.js and stress.js script imports**

In `options.html`, add after bionic.js and before i18n.js:

```html
<script src="../utils/sites.js"></script>
<script src="../utils/bionic.js"></script>
<script src="../utils/stress-data.js"></script>
<script src="../utils/stress.js"></script>
<script src="../utils/i18n.js"></script>
<script src="options.js"></script>
```

**Step 3: Add stress mode description key to options.js**

In `options.js`, update `MODE_DESC_KEYS`:

```js
const MODE_DESC_KEYS = {
  glideread: 'modeGlidereadDesc',
  bionic: 'modeBionicDesc',
  stress: 'modeStressDesc',
  enlarge: 'modeEnlargeDesc',
};
```

**Step 4: Update preview to handle stress mode**

In `options.js`, `updatePreview()`, change the mode rendering:

```js
if (mode === 'enlarge') {
  previewBody.textContent = PREVIEW_TEXT;
} else if (mode === 'stress') {
  previewBody.textContent = stressifyText(PREVIEW_TEXT);
} else {
  previewBody.innerHTML = bionicify(PREVIEW_TEXT, intensity, mode);
}
```

**Step 5: Commit**

```bash
git add options/options.html options/options.js
git commit -m "feat: add Stress reading mode to Options UI with live preview"
```

---

### Task 6: Add i18n translations for stress mode

**Files:**
- Modify: `utils/i18n.js`

**Step 1: Add translation keys to all 4 locales**

Add to each locale object in `TRANSLATIONS`:

**English (en):** after `modeBionicDesc` line
```js
modeStress: 'Stress',
modeStressDesc: 'Capitalize stressed syllables to reveal pronunciation rhythm. Great for language learners.',
```

**Chinese (zh):** after `modeBionicDesc` line
```js
modeStress: '重音',
modeStressDesc: '将重读音节大写显示，帮助感知单词发音节奏。适合英语学习者。',
```

**Japanese (ja):** after `modeBionicDesc` line
```js
modeStress: 'ストレス',
modeStressDesc: 'ストレス音節を大文字にして発音リズムを可視化します。語学学習者に最適です。',
```

**Korean (ko):** after `modeBionicDesc` line
```js
modeStress: '강세',
modeStressDesc: '강세 음절을 대문자로 표시하여 발음 리듬을 보여줍니다. 어학 학습자에게 적합합니다.',
```

**Step 2: Commit**

```bash
git add utils/i18n.js
git commit -m "feat: add i18n translations for stress reading mode (en/zh/ja/ko)"
```

---

### Task 7: Update Safari build phase (safari repo)

**Files:**
- Modify: `safari/GlideRead/GlideRead.xcodeproj/project.pbxproj` (sed patterns in Prepare Safari Resources)

**Step 1: Update the sed pattern for injection list**

The current sed in the Xcode build phase patches `background.js` injection list. Update the match pattern to include the new files:

Old pattern:
```
files: \['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'content.js'\]
```

New pattern:
```
files: \['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'utils/stress-data.js', 'utils/stress.js', 'content.js'\]
```

And the replacement adds `_safari-shim.js` at the front as before.

No other Safari changes needed — `stress-data.js` and `stress.js` are plain JS files in `utils/`, they'll be picked up by the submodule automatically.

**Step 2: Update Safari extension submodule to latest**

```bash
cd safari/GlideRead/Shared\ \(Extension\)/Resources
git pull origin master
cd ../../../..
git add "GlideRead/Shared (Extension)/Resources"
```

**Step 3: Commit**

```bash
git add GlideRead/GlideRead.xcodeproj/project.pbxproj "GlideRead/Shared (Extension)/Resources"
git commit -m "chore: update extension submodule + build phase for stress capitalization"
```

---

### Task 8: Version bump

**Files:**
- Modify: `manifest.json:5`
- Modify: `options/options.html:178`

**Step 1: Bump version**

In `manifest.json`: `"version": "1.3.0"`

In `options.html`: `<span class="version-badge">v1.3.0</span>`

**Step 2: Commit**

```bash
git add manifest.json options/options.html
git commit -m "chore: bump version to v1.3.0 — stress capitalization"
```

---

### Task 9: Manual testing checklist

**Chrome:**
- [ ] Load unpacked extension from `extension/` directory
- [ ] Options page: "Stress" appears in reading mode picker between Bionic and Enlarge
- [ ] Options page: selecting Stress shows correct description in all 4 languages
- [ ] Options preview: shows stressed text (e.g. "comPUter", "BEAUtiful")
- [ ] Enable a preset site (e.g. news.ycombinator.com), visit it, set mode to Stress
- [ ] Verify: multi-syllable words have stressed syllable capitalized
- [ ] Verify: short words (<=3 chars) unchanged
- [ ] Verify: words not in CMU dict unchanged
- [ ] Verify: CJK text unchanged
- [ ] Verify: switching back to GlideRead/Bionic/Enlarge still works
- [ ] Alt+G force-inject on a non-preset site works with Stress mode

**Safari (if building locally):**
- [ ] Build & run in Xcode (iOS simulator + macOS)
- [ ] Options page shows Stress mode option
- [ ] Content injection works with Stress mode on a preset site

---

## Notes for the implementing agent

- **Do NOT introduce any build tools** (esbuild, webpack, TypeScript, npm dependencies). The extension must remain zero-build.
- **`var` declarations** in `stress-data.js` are intentional — they use the re-injection guard pattern (`if (typeof CMU_STRESS_MAP === 'undefined')`) consistent with `sites.js` and `dom.js`.
- **`stress.js` uses `function` declarations** (not `const`/arrow) for the same reason — these files may be re-injected and need to be idempotent.
- The phoneme-to-letter alignment in the generation script is a **heuristic**. It won't be perfect for every word. That's OK — incorrect entries can be manually fixed in the generated data.
- **Safari Task 7** must be done in the `safari` repo, not the `extension` repo.
- **Task 1 (data generation) must complete first** — all other tasks depend on `utils/stress-data.js` existing. Tasks 2-6 can be parallelized after Task 1. Task 7 depends on the extension changes being pushed. Task 8 is last.
