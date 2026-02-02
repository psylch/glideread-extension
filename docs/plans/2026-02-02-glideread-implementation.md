# GlideRead Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome Extension that auto-enhances readability on English info-dense websites via smart font enlargement and Bionic Reading.

**Architecture:** Manifest V3 extension with dynamic content script injection. Background service worker matches URLs against preset/custom site lists, injects content script on demand. Content script applies font scaling and bionic reading transforms to body text nodes only, with MutationObserver for dynamic content.

**Tech Stack:** Vanilla JS, HTML, CSS. No build tools. No dependencies.

---

### Task 1: Project Scaffold & Manifest

**Files:**
- Create: `manifest.json`
- Create: `icons/icon16.png`
- Create: `icons/icon48.png`
- Create: `icons/icon128.png`

**Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "GlideRead",
  "version": "1.0.0",
  "description": "Enhance readability on English websites with smart font scaling and Bionic Reading.",
  "permissions": ["activeTab", "storage", "scripting"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options/options.html",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Step 2: Create placeholder icons**

Generate simple SVG-based PNG icons at 16x16, 48x48, 128x128. Use a "G" letter mark with a teal/dark color scheme.

**Step 3: Verify**

Load the extension in `chrome://extensions` (Developer mode > Load unpacked). Confirm it loads without errors and the icon appears in the toolbar.

**Step 4: Commit**

```bash
git add manifest.json icons/
git commit -m "feat: project scaffold with manifest v3 and icons"
```

---

### Task 2: Site Matching Utility

**Files:**
- Create: `utils/sites.js`

**Step 1: Implement sites.js**

```js
// Default preset sites
const DEFAULT_PRESET_SITES = {
  'twitter.com': true,
  'x.com': true,
  'reddit.com': true,
  'news.ycombinator.com': true,
  'medium.com': true,
  'dev.to': true,
  'techcrunch.com': true,
  'arstechnica.com': true,
  'theverge.com': true,
  'hackernoon.com': true,
  'substack.com': true,
};

const DEFAULT_SETTINGS = {
  enabled: true,
  fontScale: 1.15,
  lineHeightScale: 1.5,
  bionicEnabled: true,
  bionicIntensity: 'medium', // 'light' | 'medium' | 'heavy'
  presetSites: { ...DEFAULT_PRESET_SITES },
  customSites: [],
  disabledSites: [],
};

/**
 * Check if a hostname matches the site list.
 * Handles subdomains (e.g., old.reddit.com matches reddit.com,
 * myblog.substack.com matches substack.com).
 */
function matchesSite(hostname, siteList) {
  // Direct match
  if (siteList.includes(hostname)) return true;
  // Subdomain match: strip first subdomain and check
  for (const site of siteList) {
    if (hostname === site || hostname.endsWith('.' + site)) {
      return true;
    }
  }
  return false;
}

/**
 * Determine if GlideRead should be active for the given hostname.
 * Returns true if hostname is in (enabled presets + custom sites) and not in disabled list.
 */
async function shouldActivate(hostname) {
  const settings = await getSettings();
  if (!settings.enabled) return false;

  // Check disabled list first
  if (matchesSite(hostname, settings.disabledSites)) return false;

  // Check preset sites (only enabled ones)
  const enabledPresets = Object.entries(settings.presetSites)
    .filter(([, enabled]) => enabled)
    .map(([site]) => site);

  if (matchesSite(hostname, enabledPresets)) return true;

  // Check custom sites
  if (matchesSite(hostname, settings.customSites)) return true;

  return false;
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve(result);
    });
  });
}

async function saveSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}
```

**Step 2: Verify**

Open the extension's service worker console (chrome://extensions > "Inspect views: service worker"). Import and test `shouldActivate('reddit.com')` returns true, `shouldActivate('google.com')` returns false.

**Step 3: Commit**

```bash
git add utils/sites.js
git commit -m "feat: site matching utility with preset list and settings storage"
```

---

### Task 3: Bionic Reading Algorithm

**Files:**
- Create: `utils/bionic.js`

**Step 1: Implement bionic.js**

```js
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

/**
 * Convert a text string into HTML with bionic reading markup.
 * Words get their first N characters wrapped in <b>.
 * Whitespace and punctuation are preserved as-is.
 */
function bionicify(text, intensity = 'medium') {
  // Split into tokens: words and non-words (spaces, punctuation)
  const tokens = text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu);
  if (!tokens) return text;

  return tokens
    .map((token) => {
      // Check if token is a word (contains letters/numbers)
      if (/[\p{L}\p{N}]/u.test(token)) {
        const boldLen = getBoldCount(token.length, intensity);
        const boldPart = token.slice(0, boldLen);
        const rest = token.slice(boldLen);
        return `<b class="glideread-b">${boldPart}</b>${rest}`;
      }
      return token;
    })
    .join('');
}
```

**Step 2: Verify in browser console**

Test in any browser console:
```js
// Paste bionicify function, then:
bionicify("This is a sample sentence to demonstrate the reading experience.", "medium")
// Expected: "<b class="glideread-b">Th</b>is <b class="glideread-b">i</b>s <b class="glideread-b">a</b> <b class="glideread-b">sam</b>ple ..."
```

**Step 3: Commit**

```bash
git add utils/bionic.js
git commit -m "feat: bionic reading algorithm with light/medium/heavy intensity"
```

---

### Task 4: DOM Traversal Utility

**Files:**
- Create: `utils/dom.js`

**Step 1: Implement dom.js**

```js
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
```

**Step 2: Verify**

Load extension, open reddit.com, run `getTargetElements()` in console — should return body text elements but not nav/header.

**Step 3: Commit**

```bash
git add utils/dom.js
git commit -m "feat: DOM traversal utility with exclusion rules and site-specific selectors"
```

---

### Task 5: Content Script — Core Processing

**Files:**
- Create: `content.js`
- Create: `content.css`

**Step 1: Create content.css**

```css
.glideread-b {
  font-weight: 700;
}

.glideread-processed {
  /* marker class, no additional styles needed */
}
```

**Step 2: Create content.js**

This is the main content script that ties together utils and applies transformations.

```js
// Content script - injected into matching pages
// utils/bionic.js, utils/dom.js, and utils/sites.js are injected before this file

(async function glideread() {
  // Get settings
  const settings = await getSettings();
  if (!settings.enabled) return;

  const intensity = settings.bionicIntensity || 'medium';
  const fontScale = settings.fontScale || 1.15;
  const lineHeightScale = settings.lineHeightScale || 1.5;
  const bionicEnabled = settings.bionicEnabled !== false;

  /**
   * Process a single element: apply font scaling and bionic reading.
   */
  function processElement(el) {
    if (el.classList.contains('glideread-processed')) return;
    el.classList.add('glideread-processed');

    // Font scaling
    const computed = window.getComputedStyle(el);
    const currentSize = parseFloat(computed.fontSize);
    if (currentSize && fontScale !== 1.0) {
      el.style.fontSize = (currentSize * fontScale) + 'px';
      el.style.lineHeight = lineHeightScale;
    }

    // Bionic reading
    if (bionicEnabled) {
      const textNodes = getTextNodes(el);
      textNodes.forEach((textNode) => {
        const html = bionicify(textNode.textContent, intensity);
        const wrapper = document.createElement('span');
        wrapper.classList.add('glideread-bionic');
        wrapper.innerHTML = html;
        textNode.parentNode.replaceChild(wrapper, textNode);
      });
    }
  }

  /**
   * Process all target elements in a root.
   */
  function processRoot(root = document) {
    const elements = getTargetElements(root);
    elements.forEach(processElement);
  }

  // Initial processing
  processRoot();

  // Watch for dynamic content (infinite scroll, lazy loading)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processRoot(node);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
```

**Step 3: Verify**

Manually load extension, navigate to medium.com or reddit.com. Body text should be slightly larger with bionic bolding applied.

**Step 4: Commit**

```bash
git add content.js content.css
git commit -m "feat: content script with font scaling, bionic reading, and MutationObserver"
```

---

### Task 6: Background Service Worker

**Files:**
- Create: `background.js`

**Step 1: Implement background.js**

```js
// Import site matching logic
importScripts('utils/sites.js');

/**
 * Inject content scripts into the given tab if the site matches.
 */
async function injectIfNeeded(tabId, url) {
  try {
    const hostname = new URL(url).hostname;
    const active = await shouldActivate(hostname);
    if (!active) return;

    // Inject utils first, then content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'content.js'],
    });

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css'],
    });
  } catch (err) {
    // Tab may have been closed or URL is restricted (chrome://)
    console.warn('GlideRead: injection skipped', err.message);
  }
}

// Listen for tab updates (page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    injectIfNeeded(tabId, tab.url);
  }
});

// Listen for messages from popup (toggle, force-enable on current site)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    handleToggle(message).then(sendResponse);
    return true; // async response
  }
  if (message.action === 'getStatus') {
    handleGetStatus(message).then(sendResponse);
    return true;
  }
  if (message.action === 'forceInject') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) injectIfNeeded(tabs[0].id, tabs[0].url);
    });
    sendResponse({ ok: true });
  }
});

async function handleToggle({ enabled }) {
  const settings = await getSettings();
  settings.enabled = enabled;
  await saveSettings(settings);
  return { enabled };
}

async function handleGetStatus({ hostname }) {
  const settings = await getSettings();
  const siteActive = await shouldActivate(hostname);
  return {
    enabled: settings.enabled,
    siteActive,
    hostname,
  };
}

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  // getSettings already merges with defaults, just persist
  await saveSettings(settings);
});
```

**Step 2: Verify**

Reload extension. Navigate to reddit.com — content script should auto-inject. Navigate to google.com — should not inject. Check service worker console for any errors.

**Step 3: Commit**

```bash
git add background.js
git commit -m "feat: background service worker with dynamic injection and tab listeners"
```

---

### Task 7: Popup UI

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`
- Create: `popup/popup.js`

**Step 1: Create popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">G</span>
      <span class="title">GlideRead</span>
    </div>
    <div class="toggle-row">
      <label class="switch">
        <input type="checkbox" id="toggle" checked>
        <span class="slider"></span>
      </label>
      <span id="status-text" class="status-text">ON</span>
    </div>
    <div id="site-status" class="site-status">
      Checking current site...
    </div>
    <a id="settings-link" class="settings-link">Settings</a>
  </div>
  <script src="popup.js"></script>
</body>
</html>
```

**Step 2: Create popup.css**

Dark theme, minimal layout. 300px wide. Toggle switch with smooth animation. See implementation for full CSS — key points:
- Background: `#1a1a2e`
- Accent: `#16c79a` (teal)
- Toggle slider with CSS-only animation
- Font: system-ui

**Step 3: Create popup.js**

```js
const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const siteStatus = document.getElementById('site-status');
const settingsLink = document.getElementById('settings-link');

// Get current tab hostname
async function getCurrentHostname() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

// Initialize popup state
async function init() {
  const hostname = await getCurrentHostname();
  const response = await chrome.runtime.sendMessage({
    action: 'getStatus',
    hostname,
  });

  toggle.checked = response.enabled;
  statusText.textContent = response.enabled ? 'ON' : 'OFF';

  if (response.siteActive) {
    siteStatus.textContent = `Active on ${response.hostname}`;
    siteStatus.classList.add('active');
  } else {
    siteStatus.textContent = `Not active on ${response.hostname || 'this page'}`;
    siteStatus.classList.remove('active');
  }
}

// Toggle handler
toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  statusText.textContent = enabled ? 'ON' : 'OFF';
  await chrome.runtime.sendMessage({ action: 'toggle', enabled });
  if (enabled) {
    await chrome.runtime.sendMessage({ action: 'forceInject' });
  }
});

// Settings link
settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
```

**Step 4: Verify**

Click extension icon. Popup shows with toggle, site status, and settings link. Toggle on/off works. Settings link opens options page.

**Step 5: Commit**

```bash
git add popup/
git commit -m "feat: minimal popup UI with toggle and site status"
```

---

### Task 8: Settings Page (Options)

**Files:**
- Create: `options/options.html`
- Create: `options/options.css`
- Create: `options/options.js`

**Step 1: Create options.html**

Full settings page with three sections:
1. Reading Enhancement — font scale slider, line height slider, bionic toggle + intensity radio
2. Site Management — preset sites with toggles, add custom site input
3. About — version info

**Step 2: Create options.css**

Clean, readable design. Light background. Organized sections with cards. Sliders with teal accent. Responsive layout.

**Step 3: Create options.js**

```js
// Load settings, bind to UI, save on change
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, resolve);
  });
}

async function init() {
  const settings = await loadSettings();

  // Bind sliders
  const fontSlider = document.getElementById('font-scale');
  fontSlider.value = settings.fontScale || 1.15;
  document.getElementById('font-scale-value').textContent = fontSlider.value + 'x';
  fontSlider.addEventListener('input', (e) => {
    document.getElementById('font-scale-value').textContent = e.target.value + 'x';
    chrome.storage.sync.set({ fontScale: parseFloat(e.target.value) });
  });

  const lineSlider = document.getElementById('line-height-scale');
  lineSlider.value = settings.lineHeightScale || 1.5;
  document.getElementById('line-height-value').textContent = lineSlider.value + 'x';
  lineSlider.addEventListener('input', (e) => {
    document.getElementById('line-height-value').textContent = e.target.value + 'x';
    chrome.storage.sync.set({ lineHeightScale: parseFloat(e.target.value) });
  });

  // Bionic toggle
  const bionicToggle = document.getElementById('bionic-toggle');
  bionicToggle.checked = settings.bionicEnabled !== false;
  bionicToggle.addEventListener('change', (e) => {
    chrome.storage.sync.set({ bionicEnabled: e.target.checked });
  });

  // Bionic intensity radios
  const intensity = settings.bionicIntensity || 'medium';
  document.querySelector(`input[name="intensity"][value="${intensity}"]`).checked = true;
  document.querySelectorAll('input[name="intensity"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      chrome.storage.sync.set({ bionicIntensity: e.target.value });
    });
  });

  // Render preset sites
  renderPresetSites(settings.presetSites || {});

  // Render custom sites
  renderCustomSites(settings.customSites || []);

  // Add site button
  document.getElementById('add-site-btn').addEventListener('click', addCustomSite);
}

function renderPresetSites(presetSites) {
  const container = document.getElementById('preset-sites');
  container.innerHTML = '';
  for (const [site, enabled] of Object.entries(presetSites)) {
    const row = document.createElement('div');
    row.className = 'site-row';
    row.innerHTML = `
      <span class="site-name">${site}</span>
      <label class="switch small">
        <input type="checkbox" ${enabled ? 'checked' : ''} data-site="${site}">
        <span class="slider"></span>
      </label>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
      const settings = await loadSettings();
      settings.presetSites[site] = e.target.checked;
      chrome.storage.sync.set({ presetSites: settings.presetSites });
    });
    container.appendChild(row);
  }
}

function renderCustomSites(customSites) {
  const container = document.getElementById('custom-sites');
  container.innerHTML = '';
  customSites.forEach((site, index) => {
    const row = document.createElement('div');
    row.className = 'site-row';
    row.innerHTML = `
      <span class="site-name">${site}</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', async () => {
      const settings = await loadSettings();
      settings.customSites.splice(index, 1);
      chrome.storage.sync.set({ customSites: settings.customSites });
      renderCustomSites(settings.customSites);
    });
    container.appendChild(row);
  });
}

async function addCustomSite() {
  const input = document.getElementById('new-site');
  let domain = input.value.trim().toLowerCase();
  if (!domain) return;

  // Strip protocol and path
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const settings = await loadSettings();
  if (!settings.customSites.includes(domain)) {
    settings.customSites.push(domain);
    chrome.storage.sync.set({ customSites: settings.customSites });
    renderCustomSites(settings.customSites);
  }
  input.value = '';
}

init();
```

**Step 4: Verify**

Open settings page. Adjust sliders — values update. Toggle sites — settings persist after page reload. Add/remove custom sites works.

**Step 5: Commit**

```bash
git add options/
git commit -m "feat: settings page with reading enhancement and site management"
```

---

### Task 9: End-to-End Testing & Polish

**Step 1: Test on each preset site**

Load the extension, navigate to each preset site one by one:
- reddit.com — verify body text enlarged, bionic bolding applied, nav untouched
- news.ycombinator.com — verify comments processed
- medium.com — verify article body processed
- x.com — verify tweet text processed

**Step 2: Test dynamic content**

On reddit.com or x.com, scroll down to trigger infinite scroll. Verify new content gets processed automatically.

**Step 3: Test popup**

- Toggle off → reload page → no processing
- Toggle on → page gets processed again
- Site status shows correctly

**Step 4: Test settings**

- Change font scale → reload target page → font size changes
- Change bionic intensity → reload → bolding changes
- Disable a preset site → that site no longer gets processed
- Add custom site → that site gets processed

**Step 5: Edge cases**

- Navigate to chrome:// page → no errors
- Navigate to non-matching site → no injection
- Fast tab switching → no duplicate processing (check for `.glideread-processed` class)

**Step 6: Commit final polish**

```bash
git add -A
git commit -m "chore: end-to-end testing polish and fixes"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Project scaffold & manifest | None |
| 2 | Site matching utility | None |
| 3 | Bionic reading algorithm | None |
| 4 | DOM traversal utility | None |
| 5 | Content script (core processing) | 2, 3, 4 |
| 6 | Background service worker | 2 |
| 7 | Popup UI | 6 |
| 8 | Settings page | 2 |
| 9 | End-to-end testing & polish | All |

Tasks 1-4 can be done in parallel. Task 5 depends on 2+3+4. Tasks 6-8 depend on 2. Task 9 depends on all.
