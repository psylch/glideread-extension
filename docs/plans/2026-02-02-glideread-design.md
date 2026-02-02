# GlideRead - Chrome Extension Design

## Overview

Chrome Extension (Manifest V3) for non-native English readers. Automatically enhances readability on English information-dense websites through:

1. **Smart font enlargement** - Only enlarges body text in reading areas, leaves UI elements untouched
2. **Bionic Reading** - Bolds the first portion of each word to create fixation points, guiding the eye through text faster

## Target Sites

Smart mode with presets + user customization:

**Preset list:**
- twitter.com / x.com
- reddit.com
- news.ycombinator.com
- medium.com
- dev.to
- techcrunch.com
- arstechnica.com
- theverge.com
- hackernoon.com
- substack.com (and *.substack.com)

Users can add/remove sites in Settings page.

## Architecture

```
glideread/
├── manifest.json
├── background.js            # Service Worker - site matching, script injection
├── content.js               # Core logic injected into pages
├── content.css              # Injected styles
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/
│   ├── options.html
│   ├── options.js
│   └── options.css
├── utils/
│   ├── bionic.js            # Bionic Reading algorithm
│   ├── sites.js             # Preset site list & matching logic
│   └── dom.js               # DOM traversal utilities
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Core Logic (Content Script)

### DOM Selection

Target elements: `p`, `article`, `span` (within body), `li`, `blockquote`, `.comment`, `.post-body`

Exclude elements: `nav`, `header`, `footer`, `button`, `input`, `select`, `code`, `pre`, `script`, `style`

Site-specific selectors for major sites (Reddit `.md`, HN `.commtext`, etc.)

### Font Enlargement

- Read `computed font-size` of target elements
- Multiply by scale factor (default 1.15x)
- Proportionally adjust `line-height`
- Do not touch headings, buttons, nav, or other UI elements

### Bionic Reading Algorithm

Word length to bold character count:

| Word Length | Bold Characters |
|------------|----------------|
| 1          | 1              |
| 2-3        | 1              |
| 4-5        | 2              |
| 6-8        | 3              |
| 9+         | ~40%           |

Implementation:
- Use `TreeWalker` to traverse `TEXT_NODE` within target areas
- Split text into words, calculate bold portion per word
- Replace text node with `<span>` structure: `<b>bol</b>ded`
- Bold uses `font-weight: 700`, preserves original font family

### Dynamic Content

Use `MutationObserver` to watch for DOM changes (infinite scroll, lazy loading). Apply processing to newly added nodes automatically.

## UI

### Popup (minimal)

- 300px wide, ~120px tall
- Large toggle switch: "GlideRead ON / OFF"
- Status line showing if current site is in the active list
- "Settings" link at bottom
- Dark background, light text

### Settings Page (options.html)

Three sections:

1. **Reading Enhancement**
   - Font scale slider (1.0x - 1.5x, default 1.15x)
   - Line height slider (1.0x - 2.0x, default 1.5x)
   - Bionic Reading toggle + intensity (light / medium / heavy)

2. **Site Management**
   - Preset site list with individual toggles
   - "Add site" input field (domain)
   - Note: can also enable temporarily via Popup on non-listed sites

3. **About**
   - Version, description, feedback link

## Permissions (Manifest V3)

- `activeTab` - access current tab
- `storage` - persist user settings (chrome.storage.sync)
- `scripting` - dynamic content script injection

No `host_permissions: <all_urls>`. Uses `scripting.executeScript` for on-demand injection only. Better for privacy and Chrome Web Store review.

## Data Storage

`chrome.storage.sync` for cross-device sync:

```json
{
  "enabled": true,
  "fontScale": 1.15,
  "lineHeightScale": 1.5,
  "bionicEnabled": true,
  "bionicIntensity": "medium",
  "presetSites": {
    "twitter.com": true,
    "x.com": true,
    "reddit.com": true,
    "news.ycombinator.com": true,
    "medium.com": true,
    "dev.to": true,
    "techcrunch.com": true,
    "arstechnica.com": true,
    "theverge.com": true,
    "hackernoon.com": true,
    "substack.com": true
  },
  "customSites": [],
  "disabledSites": []
}
```

## Tech Stack

- Pure vanilla JS, HTML, CSS
- No build tools (webpack, vite, etc.)
- No external dependencies
