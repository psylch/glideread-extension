<p align="center">
  <img src="icons/icon128.png" width="80" height="80" alt="GlideRead">
</p>

<h1 align="center">GlideRead</h1>

<p align="center">
  Enhance readability on English websites with smart font scaling and Bionic Reading.
  <br>
  <a href="https://github.com/psylch/glideread-extension/releases/latest">Download Latest Release</a>
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#install">Install</a> &middot;
  <a href="#configuration">Configuration</a> &middot;
  <a href="README_CN.md">中文文档</a>
</p>

---

## Features

- **Smart Font Scaling** - Enlarges body text only (not UI elements), configurable 1.0x - 1.5x
- **Bionic Reading** - Bolds the first portion of each word to create fixation points, guiding the eye faster through text
- **CJK Aware** - Skips Chinese, Japanese, and Korean characters for clean mixed-language support
- **Soft Contrast** - Uses opacity-based highlighting instead of harsh bolding, comfortable on both light and dark themes
- **Smart Site Matching** - Preset list of info-dense sites (X, Reddit, HN, Medium, etc.) with custom site support
- **SPA Support** - Handles dynamic content loading and DOM recycling on modern web apps
- **Keyboard Shortcut** - `Alt+G` to activate on any page, even without pre-configuration

## Install

### From Release

1. Download `glideread-v*.zip` from the [Releases page](https://github.com/psylch/glideread-extension/releases/latest)
2. Unzip the file
3. Open `chrome://extensions` in Chrome
4. Enable **Developer Mode** (top right)
5. Click **Load unpacked** and select the unzipped folder

### From Source

```bash
git clone https://github.com/psylch/glideread-extension.git
```

Then load the cloned folder as an unpacked extension in Chrome.

### Keyboard Shortcut

Press `Alt+G` on any page to activate GlideRead instantly. Customize at `chrome://extensions/shortcuts`.

## Configuration

Click the extension icon for a quick toggle. Open **Settings** for:

- Font scale and line height adjustment
- Bionic Reading intensity (Light / Medium / Heavy)
- Site management (enable/disable preset sites, add custom domains)

## Preset Sites

`twitter.com` `x.com` `reddit.com` `news.ycombinator.com` `medium.com` `dev.to` `techcrunch.com` `arstechnica.com` `theverge.com` `hackernoon.com` `substack.com`

## Author

[psylch](https://github.com/psylch)

## License

[MIT](LICENSE)
