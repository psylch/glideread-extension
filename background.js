// Import polyfill and site matching logic
importScripts('utils/browser-polyfill.js', 'utils/sites.js');

async function injectIfNeeded(tabId, url) {
  try {
    const hostname = new URL(url).hostname;
    const active = await shouldActivate(hostname);
    if (!active) return;

    await browserAPI.scripting.executeScript({
      target: { tabId },
      files: ['utils/browser-polyfill.js', 'utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'content.js'],
    });

    await browserAPI.scripting.insertCSS({
      target: { tabId },
      files: ['content.css'],
    });
  } catch (err) {
    console.warn('GlideRead: injection skipped', err.message);
  }
}

browserAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    injectIfNeeded(tabId, tab.url);
  }
});

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    handleToggle(message).then(sendResponse);
    return true;
  }
  if (message.action === 'getStatus') {
    handleGetStatus(message).then(sendResponse);
    return true;
  }
  if (message.action === 'forceInject') {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) forceInject(tabs[0].id, tabs[0].url);
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
  let siteActive = await shouldActivate(hostname);

  // If not in site list, probe the tab to see if already injected
  if (!siteActive) {
    try {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        const results = await browserAPI.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => !!window.__glidereadInitialized,
        });
        if (results?.[0]?.result) {
          siteActive = true;
        }
      }
    } catch {
      // Tab not scriptable (e.g. chrome://, safari-web-extension:// pages)
    }
  }

  return {
    enabled: settings.enabled,
    siteActive,
    hostname,
  };
}

// Keyboard shortcut: force-inject on any page (activeTab grants permission)
// Note: commands API may not be available on iOS Safari — guarded with optional chaining
if (browserAPI.commands?.onCommand) {
  browserAPI.commands.onCommand.addListener(async (command) => {
    if (command === 'activate-glideread') {
      const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return;
      // Skip browser-internal pages
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('safari-web-extension://') || tab.url.startsWith('about:')) return;
      forceInject(tab.id, tab.url);
    }
  });
}

async function forceInject(tabId, url) {
  try {
    await browserAPI.scripting.executeScript({
      target: { tabId },
      files: ['utils/browser-polyfill.js', 'utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'content.js'],
    });
    await browserAPI.scripting.insertCSS({
      target: { tabId },
      files: ['content.css'],
    });
  } catch (err) {
    console.warn('GlideRead: force inject failed', err.message);
  }
}

browserAPI.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
});
