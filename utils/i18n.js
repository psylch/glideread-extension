const TRANSLATIONS = {
  en: {
    appName: 'GlideRead',
    on: 'ON',
    off: 'OFF',
    checkingSite: 'Checking current site...',
    activeOn: 'Active on',
    notActiveOn: 'Not active on',
    thisPage: 'this page',
    settings: 'Settings',
    settingsTitle: 'GlideRead Settings',
    readingEnhancement: 'Reading Enhancement',
    fontScale: 'Font Scale',
    lineHeight: 'Line Height',
    readingMode: 'Reading Mode',
    modeEnlarge: 'Enlarge Only',
    modeEnlargeDesc: 'Only scale up font size and line height. Clean and distraction-free.',
    modeGlideread: 'GlideRead',
    modeGlidereadDesc: 'Bold first letters + fade the rest. Guides your eyes with soft contrast.',
    modeBionic: 'Bionic Reading',
    modeBionicDesc: 'Classic bold-first-letters style. Heavier weight, no opacity change.',
    intensity: 'Intensity',
    light: 'Light',
    medium: 'Medium',
    heavy: 'Heavy',
    siteManagement: 'Site Management',
    presetSites: 'Preset Sites',
    customSites: 'Custom Sites',
    addSite: 'Add Site',
    remove: 'Remove',
    about: 'About',
    description: 'Enhance readability on English websites with smart font scaling and Bionic Reading. GlideRead automatically adjusts text on your favorite sites so you can read faster and more comfortably.',
    madeBy: 'Made by',
    sendFeedback: 'Send Feedback',
    noPresetSites: 'No preset sites configured.',
    noCustomSites: 'No custom sites added yet.',
    shortcutHint: 'Alt+G to activate on any page',
  },
  zh: {
    appName: 'GlideRead',
    on: '已开启',
    off: '已关闭',
    checkingSite: '正在检查当前站点...',
    activeOn: '已在此生效',
    notActiveOn: '未在此生效',
    thisPage: '此页面',
    settings: '设置',
    settingsTitle: 'GlideRead 设置',
    readingEnhancement: '阅读增强',
    fontScale: '字体缩放',
    lineHeight: '行高',
    readingMode: '阅读模式',
    modeEnlarge: '仅放大',
    modeEnlargeDesc: '仅放大字体和行高，简洁无干扰。',
    modeGlideread: 'GlideRead',
    modeGlidereadDesc: '加粗词首字母，其余部分降低透明度，以柔和对比引导视线。',
    modeBionic: '仿生阅读',
    modeBionicDesc: '经典加粗词首风格，加粗更重，无透明度变化。',
    intensity: '强度',
    light: '轻度',
    medium: '中度',
    heavy: '重度',
    siteManagement: '站点管理',
    presetSites: '预置站点',
    customSites: '自定义站点',
    addSite: '添加站点',
    remove: '移除',
    about: '关于',
    description: '通过智能字体缩放和仿生阅读，提升英文网站的可读性。GlideRead 自动调整你常用网站的文本，让你更快、更舒适地阅读。',
    madeBy: '作者',
    sendFeedback: '反馈问题',
    noPresetSites: '暂无预置站点。',
    noCustomSites: '暂未添加自定义站点。',
    shortcutHint: '按 Alt+G 可在任意页面激活',
  },
};

let _currentLocale = 'en';

function detectLocale() {
  const lang = chrome.i18n.getUILanguage();
  return lang.startsWith('zh') ? 'zh' : 'en';
}

async function initLocale() {
  const result = await chrome.storage.sync.get({ locale: null });
  _currentLocale = result.locale || detectLocale();
  return _currentLocale;
}

async function setLocale(locale) {
  _currentLocale = locale;
  await chrome.storage.sync.set({ locale });
}

function t(key) {
  return TRANSLATIONS[_currentLocale]?.[key] || TRANSLATIONS.en[key] || key;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  document.title = t('settingsTitle');
}

function getLocale() {
  return _currentLocale;
}
