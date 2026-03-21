// Guard against re-injection in content script context
if (typeof DEFAULT_PRESET_SITES === 'undefined') {

var DEFAULT_PRESET_SITES = {
  'twitter.com': false,
  'x.com': false,
  'reddit.com': false,
  'news.ycombinator.com': false,
  'medium.com': false,
  'dev.to': false,
  'techcrunch.com': false,
  'arstechnica.com': false,
  'theverge.com': false,
  'hackernoon.com': false,
  'substack.com': false,
};

var DEFAULT_SETTINGS = {
  enabled: true,
  theme: 'system',
  fontScale: 1.15,
  lineHeightScale: 1.5,
  readingMode: 'glideread',
  bionicIntensity: 'medium',
  stressEnabled: false,
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

/**
 * Convert a domain string to a Chrome permission origin pattern.
 * e.g. "reddit.com" → "*://*.reddit.com/*"
 */
function domainToOrigin(domain) {
  return `*://*.${domain}/*`;
}

/**
 * Request host permission for a domain. Must be called from a user gesture.
 * Returns true if granted, false if denied.
 */
async function requestSitePermission(domain) {
  return new Promise((resolve) => {
    chrome.permissions.request(
      { origins: [domainToOrigin(domain)] },
      (granted) => resolve(granted)
    );
  });
}

/**
 * Remove host permission for a domain.
 */
async function removeSitePermission(domain) {
  return new Promise((resolve) => {
    chrome.permissions.remove(
      { origins: [domainToOrigin(domain)] },
      (removed) => resolve(removed)
    );
  });
}
