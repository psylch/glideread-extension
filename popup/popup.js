const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const siteStatus = document.getElementById('site-status');
const settingsLink = document.getElementById('settings-link');

async function getCurrentHostname() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

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

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  statusText.textContent = enabled ? 'ON' : 'OFF';
  await chrome.runtime.sendMessage({ action: 'toggle', enabled });
  if (enabled) {
    await chrome.runtime.sendMessage({ action: 'forceInject' });
  }
});

settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

init();
