if (window.__glidereadInitialized) return;
window.__glidereadInitialized = true;

(async function glideread() {
  const settings = await getSettings();
  if (!settings.enabled) return;

  const intensity = settings.bionicIntensity || 'medium';
  const fontScale = settings.fontScale || 1.15;
  const lineHeightScale = settings.lineHeightScale || 1.5;
  const bionicEnabled = settings.bionicEnabled !== false;

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
    if (bionicEnabled) {
      const textNodes = getTextNodes(el);
      textNodes.forEach((textNode) => {
        const html = bionicify(textNode.textContent, intensity);
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

  // Initial processing
  processRoot();

  // Watch for dynamic content (infinite scroll, lazy loading)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processRoot(node);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
