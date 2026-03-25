/* =========================================
   i18n — PT / EN Toggle
   ========================================= */

const I18n = (() => {
  const STORAGE_KEY = 'portfolio_lang';
  let currentLang = 'pt';
  let translations = {};

  async function load(lang) {
    const res = await fetch(`locales/${lang}.json`);
    if (!res.ok) throw new Error(`Failed to load ${lang}.json`);
    return res.json();
  }

  function t(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], translations) ?? path;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const value = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = value;
      } else {
        el.textContent = value;
      }
    });

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    // Update lang attribute
    document.documentElement.lang = currentLang;

    // Update toggle UI
    updateToggleUI();

    // Rebuild dynamic content
    rebuildProjects();
    rebuildServices();
    rebuildSkills();

    // Reset typewriter if hero is present
    if (window.Typewriter) {
      window.Typewriter.reset(t('hero.tagline'));
    }
  }

  function updateToggleUI() {
    const toggle = document.querySelector('.lang-toggle');
    if (!toggle) return;

    const ptEl = toggle.querySelector('[data-lang="pt"]');
    const enEl = toggle.querySelector('[data-lang="en"]');

    ptEl?.classList.toggle('active', currentLang === 'pt');
    enEl?.classList.toggle('active', currentLang === 'en');

    const label = currentLang === 'pt'
      ? 'Mudar idioma para Inglês'
      : 'Switch language to Portuguese';
    toggle.setAttribute('aria-label', label);
  }

  function rebuildProjects() {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;
    const projects = t('portfolio.projects');
    if (!Array.isArray(projects)) return;

    grid.querySelectorAll('.project-card').forEach((card, i) => {
      const p = projects[i];
      if (!p) return;
      const category = card.querySelector('.project-card__category');
      const title    = card.querySelector('.project-card__title');
      const desc     = card.querySelector('.project-card__desc');
      if (category) category.textContent = p.category_label;
      if (title)    title.textContent    = p.title;
      if (desc)     desc.textContent     = p.description;
      card.dataset.projectId = p.id;
    });
  }

  function rebuildServices() {
    const cards = document.querySelectorAll('.service-card');
    const items = t('services.items');
    if (!Array.isArray(items)) return;

    cards.forEach((card, i) => {
      const item = items[i];
      if (!item) return;
      const title = card.querySelector('.service-card__title');
      const desc  = card.querySelector('.service-card__desc');
      if (title) title.textContent = item.title;
      if (desc)  desc.textContent  = item.description;
    });
  }

  function rebuildSkills() {
    const grid = document.querySelector('.skills-grid');
    if (!grid) return;
    const skills = t('about.skills');
    if (!Array.isArray(skills)) return;
    grid.innerHTML = skills
      .map(s => `<span class="skill-tag">${s}</span>`)
      .join('');
  }

  async function switchTo(lang) {
    if (lang === currentLang && Object.keys(translations).length) return;
    try {
      translations = await load(lang);
      currentLang = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      applyTranslations();
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
    } catch (err) {
      console.error('[i18n] Failed to switch language:', err);
    }
  }

  async function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const initial = saved || 'pt';
    await switchTo(initial);

    const toggle = document.querySelector('.lang-toggle');
    toggle?.addEventListener('click', () => {
      switchTo(currentLang === 'pt' ? 'en' : 'pt');
    });
  }

  return { init, t, switchTo, get lang() { return currentLang; } };
})();

window.I18n = I18n;
