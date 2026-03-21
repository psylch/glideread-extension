// Uses getSettings() from ../utils/sites.js for consistent defaults
async function loadSettings() {
  return getSettings();
}

// ---- Sliding Indicator Helpers ----

function positionIndicator(container) {
  const indicator = container.querySelector('.segmented-indicator, .tabs-indicator');
  const activeBtn = container.querySelector('[data-active="true"]');
  if (!indicator || !activeBtn) return;
  const containerRect = container.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  const pad = container.classList.contains('tabs') ? 4 : 3;
  indicator.style.width = btnRect.width + 'px';
  indicator.style.transform = `translateX(${btnRect.left - containerRect.left - pad}px)`;
}

function activateButton(container, value) {
  container.querySelectorAll('.segmented-btn, .tab-btn').forEach((btn) => {
    btn.setAttribute('data-active', btn.dataset.value === value || btn.dataset.tab === value ? 'true' : 'false');
  });
  positionIndicator(container);
}

// ---- Tab Switching ----

const tabsContainer = document.getElementById('tabs');
const tabContents = document.querySelectorAll('.tab-content');

tabsContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const tab = btn.dataset.tab;
  activateButton(tabsContainer, tab);
  tabContents.forEach((content) => {
    content.setAttribute('data-active', content.dataset.content === tab ? 'true' : 'false');
  });
  // Reposition indicators after tab switch (elements may have been hidden)
  repositionAllIndicators();
});

// ---- Theme Switcher (Segmented) ----

const themePicker = document.getElementById('theme-picker');

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

themePicker.addEventListener('click', async (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  const theme = btn.dataset.value;
  activateButton(themePicker, theme);
  applyTheme(theme);
  await chrome.storage.sync.set({ theme });
});

// Apply theme immediately to avoid flash
chrome.storage.sync.get({ theme: 'system' }, (result) => {
  applyTheme(result.theme);
  activateButton(themePicker, result.theme);
});

// ---- Reading Mode (Segmented) ----

const modePicker = document.getElementById('mode-picker');
const modeDesc = document.getElementById('mode-desc');

const MODE_DESC_KEYS = {
  glideread: 'modeGlidereadDesc',
  bionic: 'modeBionicDesc',
  off: 'modeOffDesc',
};

function updateModeDesc(mode) {
  modeDesc.textContent = t(MODE_DESC_KEYS[mode] || MODE_DESC_KEYS.glideread);
  // Also update the data-i18n attribute so applyI18n() can refresh it on lang switch
  modeDesc.setAttribute('data-i18n', MODE_DESC_KEYS[mode] || MODE_DESC_KEYS.glideread);
}

modePicker.addEventListener('click', async (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  const mode = btn.dataset.value;
  activateButton(modePicker, mode);
  updateModeDesc(mode);
  updatePreview();
  await chrome.storage.sync.set({ readingMode: mode });
});

// ---- Stress Toggle ----

const stressToggle = document.getElementById('stress-toggle');

stressToggle.addEventListener('change', async () => {
  await chrome.storage.sync.set({ stressEnabled: stressToggle.checked });
  updatePreview();
});

// ---- Intensity (Segmented) ----

const intensityPicker = document.getElementById('intensity-picker');

intensityPicker.addEventListener('click', async (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  const intensity = btn.dataset.value;
  activateButton(intensityPicker, intensity);
  updatePreview();
  await chrome.storage.sync.set({ bionicIntensity: intensity });
});

// ---- Advanced Section ----

const advancedSection = document.getElementById('advanced-section');
const advancedTrigger = document.getElementById('advanced-trigger');

advancedTrigger.addEventListener('click', () => {
  const expanded = advancedSection.getAttribute('data-expanded') === 'true';
  advancedSection.setAttribute('data-expanded', expanded ? 'false' : 'true');
});

// ---- Reset to Defaults ----

document.getElementById('reset-defaults').addEventListener('click', async () => {
  const defaults = {
    readingMode: 'glideread',
    fontScale: 1.15,
    lineHeightScale: 1.5,
    bionicIntensity: 'medium',
    stressEnabled: false,
  };
  await chrome.storage.sync.set(defaults);

  // Update UI
  activateButton(modePicker, defaults.readingMode);
  updateModeDesc(defaults.readingMode);
  activateButton(intensityPicker, defaults.bionicIntensity);
  stressToggle.checked = false;

  const fontSlider = document.getElementById('font-scale');
  fontSlider.value = defaults.fontScale;
  document.getElementById('font-scale-value').textContent = defaults.fontScale + 'x';

  const lineSlider = document.getElementById('line-height-scale');
  lineSlider.value = defaults.lineHeightScale;
  document.getElementById('line-height-value').textContent = defaults.lineHeightScale + 'x';

  updatePreview();
  repositionAllIndicators();
});

// ---- Preview ----

const PREVIEW_TEXT = 'Digital screens present unique challenges for our eyes. Unlike printed text, pixels emit light directly, which can cause fatigue over extended reading sessions. Research suggests that subtle typographic adjustments — like emphasizing word beginnings — can significantly reduce cognitive load and improve reading speed.';

const previewCard = document.getElementById('preview-card');
const previewBody = document.getElementById('preview-body');
const previewToggle = document.getElementById('preview-toggle');
let showingOriginal = false;

function updatePreview() {
  // Preview base is realistic website density (15px / 1.5 line-height).
  // Sliders scale relative to that base, so 1.0x = real site feel.
  const fontScale = parseFloat(document.getElementById('font-scale').value) || 1.15;
  const lineHeightScale = parseFloat(document.getElementById('line-height-scale').value) || 1.5;
  previewBody.style.setProperty('--preview-font-scale', fontScale);
  previewBody.style.setProperty('--preview-lh-scale', lineHeightScale);

  if (showingOriginal) {
    previewBody.style.setProperty('--preview-font-scale', 1);
    previewBody.style.setProperty('--preview-lh-scale', 1);
    previewBody.textContent = PREVIEW_TEXT;
    return;
  }

  const activeMode = modePicker.querySelector('[data-active="true"]');
  const activeIntensity = intensityPicker.querySelector('[data-active="true"]');
  const mode = activeMode ? activeMode.dataset.value : 'glideread';
  const intensity = activeIntensity ? activeIntensity.dataset.value : 'medium';

  // Apply stress first if enabled, then reading mode on top
  const text = stressToggle.checked ? stressifyText(PREVIEW_TEXT) : PREVIEW_TEXT;

  if (mode === 'off') {
    previewBody.textContent = text;
  } else {
    previewBody.innerHTML = bionicify(text, intensity, mode);
  }
}

previewToggle.addEventListener('click', () => {
  showingOriginal = !showingOriginal;
  previewToggle.setAttribute('data-active', showingOriginal ? 'true' : 'false');
  previewToggle.textContent = showingOriginal ? t('previewProcessed') : t('previewOriginal');
  updatePreview();
});

// ---- Language Picker ----

const langPicker = document.getElementById('lang-picker');

langPicker.addEventListener('click', async (e) => {
  const btn = e.target.closest('.segmented-btn');
  if (!btn) return;
  const newLocale = btn.dataset.value;
  activateButton(langPicker, newLocale);
  await setLocale(newLocale);
  applyI18n();
  // Update mode description for current reading mode
  const activeMode = modePicker.querySelector('[data-active="true"]');
  if (activeMode) updateModeDesc(activeMode.dataset.value);
  // Re-render site lists to update dynamic strings
  const settings = await loadSettings();
  renderPresetSites(settings.presetSites || {});
  renderCustomSites(settings.customSites || []);
  // Reposition indicators since text widths changed
  repositionAllIndicators();
});

// ---- Init ----

async function init() {
  const locale = await initLocale();
  activateButton(langPicker, locale);
  applyI18n();

  const settings = await loadSettings();

  // Theme
  const theme = settings.theme || 'system';
  applyTheme(theme);
  activateButton(themePicker, theme);

  // Reading mode
  const readingMode = settings.readingMode || 'glideread';
  activateButton(modePicker, readingMode);
  updateModeDesc(readingMode);

  // Stress toggle
  stressToggle.checked = settings.stressEnabled || false;

  // Intensity
  const intensity = settings.bionicIntensity || 'medium';
  activateButton(intensityPicker, intensity);

  // Font scale slider
  const fontSlider = document.getElementById('font-scale');
  fontSlider.value = settings.fontScale || 1.15;
  document.getElementById('font-scale-value').textContent = fontSlider.value + 'x';
  fontSlider.addEventListener('input', (e) => {
    document.getElementById('font-scale-value').textContent = e.target.value + 'x';
    updatePreview();
    chrome.storage.sync.set({ fontScale: parseFloat(e.target.value) });
  });

  // Line height slider
  const lineSlider = document.getElementById('line-height-scale');
  lineSlider.value = settings.lineHeightScale || 1.5;
  document.getElementById('line-height-value').textContent = lineSlider.value + 'x';
  lineSlider.addEventListener('input', (e) => {
    document.getElementById('line-height-value').textContent = e.target.value + 'x';
    updatePreview();
    chrome.storage.sync.set({ lineHeightScale: parseFloat(e.target.value) });
  });

  // Sites
  renderPresetSites(settings.presetSites || {});
  renderCustomSites(settings.customSites || []);
  document.getElementById('add-site-btn').addEventListener('click', addCustomSite);
  document.getElementById('new-site').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCustomSite();
  });

  // Initial preview
  updatePreview();

  // Position all indicators after layout settles
  repositionAllIndicators();
}

// ---- Site Rendering ----

function renderPresetSites(presetSites) {
  const container = document.getElementById('preset-sites');
  container.innerHTML = '';

  const entries = Object.entries(presetSites);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('noPresetSites');
    container.appendChild(empty);
    return;
  }

  for (const [site, enabled] of entries) {
    const row = document.createElement('div');
    row.className = 'site-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'site-name';
    nameSpan.textContent = site;

    const label = document.createElement('label');
    label.className = 'toggle small';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = enabled;
    checkbox.dataset.site = site;
    const track = document.createElement('span');
    track.className = 'toggle-track';
    label.appendChild(checkbox);
    label.appendChild(track);

    row.appendChild(nameSpan);
    row.appendChild(label);

    checkbox.addEventListener('change', async (e) => {
      if (e.target.checked) {
        // Request permission on user gesture
        const granted = await requestSitePermission(site);
        if (!granted) {
          e.target.checked = false;
          return;
        }
      } else {
        await removeSitePermission(site);
      }
      const settings = await loadSettings();
      settings.presetSites[site] = e.target.checked;
      chrome.storage.sync.set({ presetSites: settings.presetSites });
    });
    container.appendChild(row);
  }
}

function renderCustomSites(customSites) {
  const container = document.getElementById('custom-sites');
  container.innerHTML = '';

  if (customSites.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = t('noCustomSites');
    container.appendChild(empty);
    return;
  }

  customSites.forEach((site, index) => {
    const row = document.createElement('div');
    row.className = 'site-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'site-name';
    nameSpan.textContent = site;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = t('remove');
    removeBtn.dataset.index = index;

    row.appendChild(nameSpan);
    row.appendChild(removeBtn);

    removeBtn.addEventListener('click', async () => {
      await removeSitePermission(site);
      const settings = await loadSettings();
      settings.customSites.splice(index, 1);
      chrome.storage.sync.set({ customSites: settings.customSites });
      renderCustomSites(settings.customSites);
    });
    container.appendChild(row);
  });
}

async function addCustomSite() {
  const input = document.getElementById('new-site');
  let domain = input.value.trim().toLowerCase();
  if (!domain) return;

  // Strip protocol and trailing path
  domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  const settings = await loadSettings();
  if (!settings.customSites) {
    settings.customSites = [];
  }

  if (!settings.customSites.includes(domain)) {
    const granted = await requestSitePermission(domain);
    if (!granted) return;
    settings.customSites.push(domain);
    chrome.storage.sync.set({ customSites: settings.customSites });
    renderCustomSites(settings.customSites);
  }
  input.value = '';
}

// Reposition all indicators (after resize, lang switch, etc.)
function repositionAllIndicators() {
  requestAnimationFrame(() => {
    positionIndicator(tabsContainer);
    positionIndicator(themePicker);
    positionIndicator(modePicker);
    positionIndicator(intensityPicker);
    positionIndicator(langPicker);
  });
}

window.addEventListener('resize', repositionAllIndicators);

init();
