// Import site matching logic
importScripts('utils/sites.js');

async function injectIfNeeded(tabId, url) {
  try {
    const hostname = new URL(url).hostname;
    const active = await shouldActivate(hostname);
    if (!active) return;

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['utils/sites.js', 'utils/dom.js', 'utils/bionic.js', 'content.js'],
    });

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content.css'],
    });
  } catch (err) {
    console.warn('GlideRead: injection skipped', err.message);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    injectIfNeeded(tabId, tab.url);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggle') {
    handleToggle(message).then(sendResponse);
    return true;
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

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await saveSettings(settings);
});
