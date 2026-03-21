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

function isSafariWebExtensionContext() {
  return typeof location !== 'undefined' && location.protocol === 'safari-web-extension:';
}

function resolvePermissionRequest(apiCall, safariFallbackValue) {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // On iOS Safari, chrome.permissions callbacks can silently never fire.
    // Fall back quickly so options actions don't appear dead.
    const timeoutId = isSafariWebExtensionContext()
      ? setTimeout(() => finish(safariFallbackValue), 400)
      : null;

    try {
      apiCall((value) => {
        if (timeoutId) clearTimeout(timeoutId);
        finish(value);
      });
    } catch (_error) {
      if (timeoutId) clearTimeout(timeoutId);
      finish(safariFallbackValue);
    }
  });
}

/**
 * Request host permission for a domain. Must be called from a user gesture.
 * Returns true if granted, false if denied.
 */
async function requestSitePermission(domain) {
  if (isSafariWebExtensionContext()) {
    return true;
  }
  return resolvePermissionRequest((callback) => {
    chrome.permissions.request(
      { origins: [domainToOrigin(domain)] },
      callback
    );
  }, true);
}

/**
 * Remove host permission for a domain.
 */
async function removeSitePermission(domain) {
  if (isSafariWebExtensionContext()) {
    return true;
  }
  return resolvePermissionRequest((callback) => {
    chrome.permissions.remove(
      { origins: [domainToOrigin(domain)] },
      callback
    );
  }, true);
}
