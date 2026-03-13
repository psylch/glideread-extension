/**
 * Minimal browser API polyfill for cross-browser compatibility.
 * Safari Web Extensions support both `chrome.*` (callback-based) and
 * `browser.*` (Promise-based) namespaces. This polyfill ensures our
 * code works consistently across Chrome, Firefox, and Safari (including iOS).
 *
 * Usage: all source files should reference the `browserAPI` global
 * instead of `chrome` or `browser` directly.
 */

// Prefer `browser` (Promise-native in Safari/Firefox), fall back to `chrome`.
var browserAPI = (typeof browser !== 'undefined' && browser.runtime)
  ? browser
  : (typeof chrome !== 'undefined' ? chrome : null);

/**
 * Detect if we are running in Safari (desktop or iOS).
 */
var isSafari = (function () {
  try {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
      (typeof browser !== 'undefined' && /Safari/.test(navigator.userAgent));
  } catch {
    return false;
  }
})();

/**
 * Detect if we are on iOS Safari.
 */
var isIOSSafari = (function () {
  try {
    return isSafari && /iPad|iPhone|iPod/.test(navigator.userAgent);
  } catch {
    return false;
  }
})();
