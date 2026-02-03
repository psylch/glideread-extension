# GlideRead

Chrome Extension that enhances readability on English websites with smart font scaling and Bionic Reading.

Built for non-native English readers who find information-dense English text hard to scan.

## Features

- **Smart Font Scaling** - Enlarges body text only (not UI elements), configurable 1.0x - 1.5x
- **Bionic Reading** - Bolds the first portion of each word to create fixation points, guiding the eye faster through text. Skips CJK characters for clean mixed-language support
- **Soft Contrast** - Uses opacity-based highlighting instead of harsh bolding, comfortable on both light and dark themes
- **Smart Site Matching** - Preset list of info-dense sites (X, Reddit, HN, Medium, etc.) with custom site support
- **SPA Support** - Handles dynamic content loading and DOM recycling on modern web apps
- **Keyboard Shortcut** - `Alt+G` to activate on any page, even without pre-configuration

## Install

### From Source

1. Clone this repo
2. Open `chrome://extensions`
3. Enable Developer Mode
4. Click "Load unpacked" and select the project folder

### Keyboard Shortcut

Press `Alt+G` on any page to activate GlideRead instantly. Customize at `chrome://extensions/shortcuts`.

## Configuration

Click the extension icon for a quick toggle. Open **Settings** for:

- Font scale and line height adjustment
- Bionic Reading intensity (Light / Medium / Heavy)
- Site management (enable/disable preset sites, add custom domains)

## Preset Sites

twitter.com, x.com, reddit.com, news.ycombinator.com, medium.com, dev.to, techcrunch.com, arstechnica.com, theverge.com, hackernoon.com, substack.com

## Author

[psylch](https://github.com/psylch)

## License

MIT
