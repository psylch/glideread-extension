#!/usr/bin/env node
/**
 * build-stress-data.mjs
 *
 * Generates utils/stress-data.js — a compact lookup table mapping English words
 * to their stressed syllable's letter range [start, end).
 *
 * Two-phase approach:
 *   1. CMU dict → which syllable (by vowel index) carries primary stress
 *   2. TeX hyphenation (via `hyphen` npm package) → syllable boundaries
 *   → Store [start, end) of the stressed syllable
 *
 * Usage:  cd scripts && npm install && node build-stress-data.mjs
 * Input:  cmudict-0.7b.txt, word-freq.txt (auto-downloaded)
 * Output: ../utils/stress-data.js
 */

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { hyphenateSync } = require('hyphen/en/index.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'utils', 'stress-data.js');
const CMUDICT_PATH = join(__dirname, 'cmudict-0.7b.txt');
const FREQ_PATH = join(__dirname, 'word-freq.txt');
const CMUDICT_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict-0.7b';
const FREQ_URL = 'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt';

// ── Download data files if missing ──────────────────────────────────────────
if (!existsSync(CMUDICT_PATH)) {
  console.log('Downloading CMU Pronouncing Dictionary...');
  execSync(`curl -sL -o "${CMUDICT_PATH}" "${CMUDICT_URL}"`);
}
if (!existsSync(FREQ_PATH)) {
  console.log('Downloading Google 20K word frequency list...');
  execSync(`curl -sL -o "${FREQ_PATH}" "${FREQ_URL}"`);
}

// ── Load frequency list ─────────────────────────────────────────────────────
const freqWords = new Set(
  readFileSync(FREQ_PATH, 'utf-8')
    .split('\n')
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length >= 4)
);
console.log(`Frequency list: ${freqWords.size} words`);

// ── Constants ───────────────────────────────────────────────────────────────
const VOWEL_PHONEMES = new Set([
  'AA', 'AE', 'AH', 'AO', 'AW', 'AY',
  'EH', 'ER', 'EY', 'IH', 'IY',
  'OW', 'OY', 'UH', 'UW',
]);

// ── TeX hyphenation → syllable ranges ───────────────────────────────────────
const SOFT_HYPHEN = '\u00AD';

/**
 * Split a word into syllable ranges using TeX hyphenation patterns.
 * Returns array of [start, end) pairs, or null if single-syllable.
 */
function syllabify(word) {
  const hyphenated = hyphenateSync(word);
  const parts = hyphenated.split(SOFT_HYPHEN);
  if (parts.length <= 1) return null;

  const ranges = [];
  let pos = 0;
  for (const part of parts) {
    ranges.push([pos, pos + part.length]);
    pos += part.length;
  }
  return ranges;
}

// ── CMU dict: find which vowel (by index) is stressed ───────────────────────

/**
 * Given CMU phonemes, return the 0-based index of the primary-stressed vowel
 * among all vowel phonemes. Returns -1 if not found.
 */
function stressedVowelIndex(phonemes) {
  let vowelIdx = 0;
  for (const p of phonemes) {
    const base = p.replace(/[012]$/, '');
    if (VOWEL_PHONEMES.has(base)) {
      if (p.endsWith('1')) return vowelIdx;
      vowelIdx++;
    }
  }
  return -1;
}

// ── Main ────────────────────────────────────────────────────────────────────

console.log('Parsing CMU dictionary...');
const raw = readFileSync(CMUDICT_PATH, 'latin1');
const stressMap = {};
let total = 0;
let mismatches = 0;

for (const line of raw.split('\n')) {
  if (line.startsWith(';;;') || line.trim() === '') continue;

  const match = line.match(/^([A-Z]+)(?:\(\d+\))?\s{2}(.+)$/);
  if (!match) continue;

  const word = match[1].toLowerCase();
  if (word.length < 4) continue;
  if (!freqWords.has(word)) continue;
  if (stressMap[word] !== undefined) continue;

  const phonemes = match[2].trim().split(/\s+/);

  // Phase 1: which vowel is stressed? (from CMU)
  const stressIdx = stressedVowelIndex(phonemes);
  if (stressIdx === -1) continue;

  // Phase 2: syllabify the letters (from TeX)
  const syllables = syllabify(word);
  if (!syllables) continue; // single syllable

  // Map stressed vowel index to syllable index
  // CMU counts vowel phonemes; TeX counts syllables. These should match.
  if (stressIdx >= syllables.length) {
    mismatches++;
    continue;
  }

  stressMap[word] = syllables[stressIdx];
  total++;
}

console.log(`Generated ${total} entries (${mismatches} syllable-count mismatches skipped)`);

// ── Spot checks ─────────────────────────────────────────────────────────────
function apply(word) {
  const r = stressMap[word];
  if (!r) return null;
  return word.slice(0, r[0]) + word.slice(r[0], r[1]).toUpperCase() + word.slice(r[1]);
}

const spotChecks = [
  ['computer',    'comPUTer'],
  ['beautiful',   'BEAUtiful'],
  ['information', 'inforMAtion'],
  ['remember',    'reMEMber'],
  ['important',   'imPORtant'],
  ['including',   'inCLUDing'],
  ['hardware',    'HARDware'],
  ['software',    'SOFTware'],
  ['running',     'RUNning'],
  ['entire',      'enTIRe'],
  ['yourself',    'yourSELF'],
  ['workflow',    'WORKflow'],
  ['education',   'eduCAtion'],
  ['together',    'toGETHer'],
  ['understand',  'underSTAND'],
  ['through',     null],
  ['should',      null],
  ['present',     null],
];

console.log('\nSpot checks:');
let passed = 0;
for (const [word, expected] of spotChecks) {
  const actual = apply(word);
  const ok = actual === expected;
  if (ok) passed++;
  console.log(`  ${ok ? 'OK  ' : 'MISS'}  ${word}: ${actual ?? '(skipped)'} ${ok ? '' : `— expected ${expected ?? '(skipped)'}`}`);
}
console.log(`  ${passed}/${spotChecks.length} passed\n`);

// ── Write output ────────────────────────────────────────────────────────────
const sortedKeys = Object.keys(stressMap).sort();
const entries = sortedKeys.map(w => `${JSON.stringify(w)}:[${stressMap[w][0]},${stressMap[w][1]}]`);

let body = '';
let currentLine = '';
for (const entry of entries) {
  if (!currentLine) {
    currentLine = entry;
  } else if (currentLine.length + entry.length + 1 > 120) {
    body += currentLine + ',\n';
    currentLine = entry;
  } else {
    currentLine += ',' + entry;
  }
}
if (currentLine) body += currentLine;

const output = `// Generated by scripts/build-stress-data.mjs — do not edit manually
// Source: CMU Pronouncing Dictionary + TeX hyphenation (syllable boundaries)
// Format: { word: [syllableStart, syllableEnd) }
// Entries: ${sortedKeys.length}
if (typeof CMU_STRESS_MAP === 'undefined') {
var CMU_STRESS_MAP = {
${body}
};
}
`;

writeFileSync(OUTPUT_PATH, output, 'utf-8');
const sizeKB = (Buffer.byteLength(output, 'utf-8') / 1024).toFixed(1);
console.log(`Written ${OUTPUT_PATH} (${sizeKB} KB, ${sortedKeys.length} entries)`);
