/**
 * Calculate how many characters to bold for a given word length.
 * Light:  ~30% of the classic values
 * Medium: classic bionic reading
 * Heavy:  ~50%+ of word
 */
function getBoldCount(wordLength, intensity = 'medium') {
  if (wordLength <= 0) return 0;

  if (intensity === 'light') {
    if (wordLength <= 3) return 1;
    if (wordLength <= 6) return 1;
    if (wordLength <= 9) return 2;
    return Math.ceil(wordLength * 0.25);
  }

  if (intensity === 'medium') {
    if (wordLength === 1) return 1;
    if (wordLength <= 3) return 1;
    if (wordLength <= 5) return 2;
    if (wordLength <= 8) return 3;
    return Math.ceil(wordLength * 0.4);
  }

  // heavy
  if (wordLength === 1) return 1;
  if (wordLength <= 3) return 2;
  if (wordLength <= 5) return 3;
  return Math.ceil(wordLength * 0.55);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Convert a text string into HTML with bionic reading markup.
 * Words get their first N characters wrapped in <b>.
 * Whitespace and punctuation are preserved as-is.
 */
function bionicify(text, intensity = 'medium') {
  // Split into tokens: CJK chars individually, Latin/number words as groups, rest as-is
  // CJK characters match first (single char), then Latin words, then non-word chars
  const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3040-\\u309f\\u30a0-\\u30ff\\uac00-\\ud7af\\uf900-\\ufaff';
  const tokens = text.match(new RegExp(`[${CJK}]|[^${CJK}\\s\\p{P}\\p{S}]+|[\\s\\p{P}\\p{S}]+`, 'gu'));
  if (!tokens) return escapeHtml(text);

  return tokens
    .map((token) => {
      // Check if token is a word (contains letters/numbers)
      if (/[\p{L}\p{N}]/u.test(token)) {
        // Skip CJK characters — bionic reading only helps with Latin/alphabetic scripts
        if (/[\u4e00-\u9fff\u3400-\u4dbf\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/u.test(token)) {
          return escapeHtml(token);
        }
        const boldLen = getBoldCount(token.length, intensity);
        const boldPart = token.slice(0, boldLen);
        const rest = token.slice(boldLen);
        return `<span class="glideread-b">${escapeHtml(boldPart)}</span><span class="glideread-r">${escapeHtml(rest)}</span>`;
      }
      return escapeHtml(token);
    })
    .join('');
}
