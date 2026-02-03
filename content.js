(async function glideread() {
  if (window.__glidereadInitialized) return;
  window.__glidereadInitialized = true;
  const settings = await getSettings();
  if (!settings.enabled) return;

  const intensity = settings.bionicIntensity || 'medium';
  const fontScale = settings.fontScale || 1.15;
  const lineHeightScale = settings.lineHeightScale || 1.5;
  const readingMode = settings.readingMode || 'enlarge';
  const targetSelector = TARGET_SELECTORS.join(', ');

  function processElement(el) {
    if (el.classList.contains('glideread-processed')) return;
    el.classList.add('glideread-processed');

    // Font scaling
    const computed = window.getComputedStyle(el);
    const currentSize = parseFloat(computed.fontSize);
    if (currentSize && fontScale !== 1.0) {
      el.style.fontSize = (currentSize * fontScale) + 'px';
      el.style.lineHeight = lineHeightScale;
    }

    // Bionic reading
    if (readingMode === 'glideread' || readingMode === 'bionic') {
      const textNodes = getTextNodes(el);
      textNodes.forEach((textNode) => {
        const html = bionicify(textNode.textContent, intensity, readingMode);
        const wrapper = document.createElement('span');
        wrapper.classList.add('glideread-bionic');
        wrapper.innerHTML = html;
        textNode.parentNode.replaceChild(wrapper, textNode);
      });
    }
  }

  function processRoot(root = document) {
    const elements = getTargetElements(root);
    elements.forEach(processElement);
  }

  function processNode(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    // Check if the node itself matches target selectors
    if (node.matches && node.matches(targetSelector) && !isExcluded(node)) {
      processElement(node);
    }
    // Check descendants
    processRoot(node);
  }

  // Initial processing
  processRoot();

  // Watch for dynamic content (infinite scroll, lazy loading)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        processNode(node);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Periodic re-scan for SPA sites (X/Twitter, etc.) that recycle DOM elements
  // Runs every 2 seconds, lightweight — only processes unprocessed elements
  setInterval(() => {
    processRoot();
  }, 2000);
})();
