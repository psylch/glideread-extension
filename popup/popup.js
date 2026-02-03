const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const siteStatus = document.getElementById('site-status');
const settingsLink = document.getElementById('settings-link');
const langToggle = document.getElementById('lang-toggle');

async function getCurrentHostname() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

function updateSiteStatus(response) {
  if (response.siteActive) {
    siteStatus.textContent = `${t('activeOn')} ${response.hostname}`;
    siteStatus.classList.add('active');
  } else {
    siteStatus.textContent = `${t('notActiveOn')} ${response.hostname || t('thisPage')}`;
    siteStatus.classList.remove('active');
  }
}

async function init() {
  const locale = await initLocale();
  updateLangButton(locale);
  applyI18n();

  const hostname = await getCurrentHostname();
  const response = await chrome.runtime.sendMessage({
    action: 'getStatus',
    hostname,
  });

  toggle.checked = response.enabled;
  statusText.textContent = response.enabled ? t('on') : t('off');
  updateSiteStatus(response);
}

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  statusText.textContent = enabled ? t('on') : t('off');
  await chrome.runtime.sendMessage({ action: 'toggle', enabled });
  if (enabled) {
    await chrome.runtime.sendMessage({ action: 'forceInject' });
  }
});

settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

langToggle.addEventListener('click', async () => {
  const newLocale = getLocale() === 'en' ? 'zh' : 'en';
  await setLocale(newLocale);
  updateLangButton(newLocale);
  applyI18n();
  statusText.textContent = toggle.checked ? t('on') : t('off');
  const hostname = await getCurrentHostname();
  if (hostname) {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus', hostname });
    updateSiteStatus(response);
  }
});

function updateLangButton(locale) {
  langToggle.textContent = locale === 'en' ? '中' : 'EN';
}

init();
