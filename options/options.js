async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, resolve);
  });
}

async function init() {
  const settings = await loadSettings();

  // Font scale slider
  const fontSlider = document.getElementById('font-scale');
  fontSlider.value = settings.fontScale || 1.15;
  document.getElementById('font-scale-value').textContent = fontSlider.value + 'x';
  fontSlider.addEventListener('input', (e) => {
    document.getElementById('font-scale-value').textContent = e.target.value + 'x';
    chrome.storage.sync.set({ fontScale: parseFloat(e.target.value) });
  });

  // Line height slider
  const lineSlider = document.getElementById('line-height-scale');
  lineSlider.value = settings.lineHeightScale || 1.5;
  document.getElementById('line-height-value').textContent = lineSlider.value + 'x';
  lineSlider.addEventListener('input', (e) => {
    document.getElementById('line-height-value').textContent = e.target.value + 'x';
    chrome.storage.sync.set({ lineHeightScale: parseFloat(e.target.value) });
  });

  // Bionic toggle
  const bionicToggle = document.getElementById('bionic-toggle');
  bionicToggle.checked = settings.bionicEnabled !== false;
  bionicToggle.addEventListener('change', (e) => {
    chrome.storage.sync.set({ bionicEnabled: e.target.checked });
  });

  // Bionic intensity radios
  const intensity = settings.bionicIntensity || 'medium';
  document.querySelector(`input[name="intensity"][value="${intensity}"]`).checked = true;
  document.querySelectorAll('input[name="intensity"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      chrome.storage.sync.set({ bionicIntensity: e.target.value });
    });
  });

  renderPresetSites(settings.presetSites || {});
  renderCustomSites(settings.customSites || []);
  document.getElementById('add-site-btn').addEventListener('click', addCustomSite);

  // Allow pressing Enter to add a site
  document.getElementById('new-site').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addCustomSite();
    }
  });
}

function renderPresetSites(presetSites) {
  const container = document.getElementById('preset-sites');
  container.innerHTML = '';

  const entries = Object.entries(presetSites);
  if (entries.length === 0) {
    container.innerHTML = '<div class="empty-state">No preset sites configured.</div>';
    return;
  }

  for (const [site, enabled] of entries) {
    const row = document.createElement('div');
    row.className = 'site-row';
    row.innerHTML = `
      <span class="site-name">${site}</span>
      <label class="toggle small">
        <input type="checkbox" ${enabled ? 'checked' : ''} data-site="${site}">
        <span class="toggle-track"></span>
      </label>
    `;
    row.querySelector('input').addEventListener('change', async (e) => {
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
    container.innerHTML = '<div class="empty-state">No custom sites added yet.</div>';
    return;
  }

  customSites.forEach((site, index) => {
    const row = document.createElement('div');
    row.className = 'site-row';
    row.innerHTML = `
      <span class="site-name">${site}</span>
      <button class="remove-btn" data-index="${index}">Remove</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', async () => {
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
    settings.customSites.push(domain);
    chrome.storage.sync.set({ customSites: settings.customSites });
    renderCustomSites(settings.customSites);
  }
  input.value = '';
}

init();
