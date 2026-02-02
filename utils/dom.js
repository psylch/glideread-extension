const EXCLUDED_TAGS = new Set([
  'NAV', 'HEADER', 'FOOTER', 'BUTTON', 'INPUT', 'SELECT',
  'TEXTAREA', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'SVG',
  'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'IFRAME',
]);

const TARGET_SELECTORS = [
  'p', 'li', 'blockquote', 'td', 'th', 'dd', 'dt',
  'article', '.comment', '.post-body',
  // Site-specific
  '.commtext',        // Hacker News
  '.md',              // Reddit (old)
  '[data-testid="tweetText"]', // Twitter/X
  '.postArticle-content',      // Medium
];

/**
 * Check if an element or any of its ancestors is in the exclusion list.
 */
function isExcluded(element) {
  let el = element;
  while (el && el !== document.body) {
    if (EXCLUDED_TAGS.has(el.tagName)) return true;
    if (el.classList && (
      el.classList.contains('glideread-processed') ||
      el.isContentEditable
    )) return true;
    el = el.parentElement;
  }
  return false;
}

/**
 * Get all text-bearing elements in the document that should be processed.
 * Returns elements matching our target selectors that aren't excluded.
 */
function getTargetElements(root = document) {
  const selector = TARGET_SELECTORS.join(', ');
  const elements = root.querySelectorAll(selector);
  return Array.from(elements).filter((el) => !isExcluded(el));
}

/**
 * Get all text nodes within an element using TreeWalker.
 */
function getTextNodes(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip empty/whitespace-only nodes
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        // Skip if parent is already a bionic bold tag
        if (node.parentElement?.classList?.contains('glideread-b')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  return nodes;
}
