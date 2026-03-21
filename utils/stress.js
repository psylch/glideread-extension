// utils/stress.js — Stress capitalization for English words
// Requires: utils/stress-data.js (CMU_STRESS_MAP) loaded first
//
// CMU_STRESS_MAP stores [start, end) syllable boundaries computed at build time.
// Runtime code is just a table lookup — zero heuristics.

/**
 * Apply stress capitalization to a single English word.
 * Capitalizes the entire stressed syllable.
 *
 * @param {string} word - A single word (no spaces/punctuation)
 * @returns {string} The word with stressed syllable capitalized, or original if not found
 */
function stressifyWord(word) {
  var range = CMU_STRESS_MAP[word.toLowerCase()];
  if (!range) return word;
  return word.slice(0, range[0]) + word.slice(range[0], range[1]).toUpperCase() + word.slice(range[1]);
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
    if (/[\p{L}\p{N}]/u.test(token)) {
      if (/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/u.test(token)) {
        return token;
      }
      return stressifyWord(token);
    }
    return token;
  }).join('');
}
