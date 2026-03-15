const toggle = document.getElementById('toggle');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const siteStatus = document.getElementById('site-status');
const settingsLink = document.getElementById('settings-link');
const langToggle = document.getElementById('lang-toggle');

// Apply stored theme preference (shared with options page)
chrome.storage.sync.get({ theme: 'system' }, (result) => {
  if (result.theme !== 'system') {
    document.documentElement.setAttribute('data-theme', result.theme);
  }
});

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

  toggle.checked = response.siteActive;
  statusText.textContent = response.siteActive ? t('on') : t('off');
  statusDot.classList.toggle('active', response.siteActive);
  updateSiteStatus(response);
}

toggle.addEventListener('change', async () => {
  const active = toggle.checked;
  statusText.textContent = active ? t('on') : t('off');
  statusDot.classList.toggle('active', active);
  const hostname = await getCurrentHostname();
  if (active) {
    await chrome.runtime.sendMessage({ action: 'forceInject' });
    if (hostname) {
      siteStatus.textContent = `${t('activeOn')} ${hostname}`;
      siteStatus.classList.add('active');
    }
  } else {
    siteStatus.textContent = `${t('notActiveOn')} ${hostname || t('thisPage')}`;
    siteStatus.classList.remove('active');
  }
});

settingsLink.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

const LOCALE_CYCLE = ['en', 'zh', 'fr', 'es', 'de', 'pt', 'ja', 'ko'];

langToggle.addEventListener('click', async () => {
  const currentIndex = LOCALE_CYCLE.indexOf(getLocale());
  const newLocale = LOCALE_CYCLE[(currentIndex + 1) % LOCALE_CYCLE.length];
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

const LANG_BUTTON_LABELS = { en: '中', zh: 'FR', fr: 'ES', es: 'DE', de: 'PT', pt: '日', ja: '한', ko: 'EN' };

function updateLangButton(locale) {
  langToggle.textContent = LANG_BUTTON_LABELS[locale] || 'EN';
}

init();
