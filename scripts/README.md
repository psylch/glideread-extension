# scripts/

Build-time scripts for generating static data files. These are NOT part of the extension runtime.

## build-stress-data.mjs

Generates `utils/stress-data.js` — a lookup table mapping English words to their stressed-vowel letter indices, derived from the CMU Pronouncing Dictionary.

### Prerequisites

- Node.js 18+
- Internet connection (first run downloads CMU dict + frequency list)

### Usage

```bash
cd extension
node scripts/build-stress-data.mjs
```

### What it does

1. Downloads `cmudict-0.7b.txt` (CMU Pronouncing Dictionary) if not present
2. Downloads `word-freq.txt` (Google 20K frequency list) if not present
3. Parses ARPAbet phonemes to find primary stress positions
4. Aligns vowel phonemes to vowel letter clusters (vowel-anchored mapping)
5. Filters to ~17K most common words (frequency list intersection)
6. Outputs `utils/stress-data.js` (~200 KB)

### Output format

```js
if (typeof CMU_STRESS_MAP === 'undefined') {
var CMU_STRESS_MAP = {
"computer":4,"beautiful":1,...
};
}
```

Values are letter indices of the stressed vowel. Single values are bare numbers; multiple stress points use arrays (`[3,7]`).

### Data files (gitignored)

- `scripts/cmudict-0.7b.txt` — CMU dict (~4 MB, auto-downloaded)
- `scripts/word-freq.txt` — Google 20K list (~200 KB, auto-downloaded)
