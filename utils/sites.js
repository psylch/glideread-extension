// Guard against re-injection in content script context
if (typeof DEFAULT_PRESET_SITES === 'undefined') {

var DEFAULT_PRESET_SITES = {
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

var DEFAULT_SETTINGS = {
  enabled: true,
  fontScale: 1.15,
  lineHeightScale: 1.5,
  bionicEnabled: true,
  bionicIntensity: 'medium',
  presetSites: { ...DEFAULT_PRESET_SITES },
  customSites: [],
  disabledSites: [],
};

}

/**
 * Check if a hostname matches the site list.
 * Handles subdomains (e.g., old.reddit.com matches reddit.com,
 * myblog.substack.com matches substack.com).
 */
function matchesSite(hostname, siteList) {
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

  if (matchesSite(hostname, settings.disabledSites)) return false;

  const enabledPresets = Object.entries(settings.presetSites)
    .filter(([, enabled]) => enabled)
    .map(([site]) => site);

  if (matchesSite(hostname, enabledPresets)) return true;
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
