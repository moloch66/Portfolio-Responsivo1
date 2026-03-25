/* =========================================
   main.js — Initialization & Global Events
   ========================================= */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Load i18n first (sets all text content)
  await I18n.init();

  // 1b. Particles (canvas 2D — no dependencies)
  Particles?.init();

  // 2. Initialize Three.js scenes
  // rAF garante que o layout finalizou e os canvas têm dimensões reais
  requestAnimationFrame(() => {
    if (!window.THREE) {
      console.warn('[main] THREE não disponível');
      return;
    }
    const isoCanvas = document.getElementById('iso-canvas');
    if (isoCanvas) IsoScene?.init(isoCanvas);
    // Hero GLB canvas is initialised by glb-scene.js (ES module)
  });

  // 3. Animations (GSAP + Anime.js)
  Animations.init();

  // 4. Contact form
  ContactForm.init();

  // 6. Header scroll effect
  initHeader();

  // 7. Smooth scroll for nav links
  initSmoothScroll();

  // 8. Mobile menu
  initMobileMenu();

  // 9. Portfolio filter + modal + carousel
  initPortfolio();
  initCarousel();

  // 10. Active nav link on scroll
  initActiveNav();

  // 11. Scroll progress bar
  initScrollProgress();

  // 12. Mouse tracking
  if (!isMobile()) {
    document.addEventListener('mousemove', (e) => {
      IsoScene?.onMouseMove(e);
      // GLBScene mouse is handled internally in glb-scene.js
    });
  }

  // 13. Scroll → scenes
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // IsoScene: raw scrollY for parallax
    IsoScene?.onScroll(scrollY);

    // Hero text fade: 20–55% of first viewport
    const heroH = window.innerHeight;
    const textProgress = Math.max(0, Math.min(1, (scrollY / heroH - 0.20) / 0.35));
    const heroContent = document.querySelector('.hero__content');
    if (heroContent) heroContent.style.opacity = 1 - textProgress;
  }, { passive: true });

  // 14. Resize handler
  window.addEventListener('resize', debounce(() => {
    IsoScene?.onResize();
    // GLBScene resize is handled internally in glb-scene.js
  }, 200));
});

// (Three.js agora carrega com defer — não precisa de three-loaded event)

// ---- Header ----
function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---- Smooth scroll ----
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
      const top = target.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: 'smooth' });

      // Close mobile menu if open
      closeMobileMenu();
    });
  });
}

// ---- Mobile menu ----
let mobileMenuOpen = false;

function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu      = document.querySelector('.mobile-menu');
  if (!hamburger || !menu) return;

  hamburger.addEventListener('click', () => {
    mobileMenuOpen ? closeMobileMenu() : openMobileMenu();
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenuOpen) closeMobileMenu();
  });
}

function openMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu      = document.querySelector('.mobile-menu');
  mobileMenuOpen = true;
  menu?.classList.add('open');
  hamburger?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu      = document.querySelector('.mobile-menu');
  mobileMenuOpen = false;
  menu?.classList.remove('open');
  hamburger?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

// ---- Portfolio ----
function initPortfolio() {
  initFilters();
  initModal();
}

function initFilters() {
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      projectCards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !match);
      });

      document.dispatchEvent(new CustomEvent('filterchange'));
    });
  });
}

// ---- Modal ----
let activeProjectId = null;

function initModal() {
  const backdrop = document.querySelector('.modal-backdrop');
  if (!backdrop) return;

  // Card clicks
  document.querySelector('.projects-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    openModal(card.dataset.projectId);
  });

  // Keyboard on cards
  document.querySelectorAll('.project-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.dataset.projectId);
      }
    });
  });

  // Close — X button
  backdrop.querySelector('.modal__close')?.addEventListener('click', closeModal);

  // Close — backdrop click
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Close — ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeProjectId) closeModal();
  });
}

function openModal(projectId) {
  if (!projectId) return;
  activeProjectId = projectId;

  const projects = I18n.t('portfolio.projects');
  const project  = Array.isArray(projects)
    ? projects.find(p => p.id === projectId)
    : null;

  if (!project) return;

  const backdrop = document.querySelector('.modal-backdrop');
  const modal    = backdrop?.querySelector('.modal');
  if (!backdrop || !modal) return;

  // Populate content
  const img      = modal.querySelector('.modal__gallery img');
  const category = modal.querySelector('.modal__category');
  const title    = modal.querySelector('.modal__title');
  const desc     = modal.querySelector('.modal__desc');
  const tagsWrap = modal.querySelector('.modal__tags');
  const link     = modal.querySelector('.modal__link');

  if (img) {
    const idx = parseInt(projectId.split('-')[1]) || 1;
    img.src = `https://placehold.co/760x427/050a0a/00f5ff?text=Project+${idx}`;
    img.alt = project.title;
  }
  if (category) category.textContent = project.category_label;
  if (title)    title.textContent    = project.title;
  if (desc)     desc.textContent     = project.full_description;

  if (tagsWrap) {
    tagsWrap.innerHTML = project.tags
      .map(tag => `<span class="modal__tag">${tag}</span>`)
      .join('');
  }

  if (link) {
    link.href = project.link;
    link.textContent = I18n.t('portfolio.modal_visit');
    link.style.display = project.link && project.link !== '#' ? 'inline-flex' : 'none';
  }

  // Open
  backdrop.classList.add('open');
  document.body.classList.add('modal-open');

  // Focus trap — focus close button
  requestAnimationFrame(() => {
    backdrop.querySelector('.modal__close')?.focus();
  });
}

function closeModal() {
  activeProjectId = null;
  const backdrop = document.querySelector('.modal-backdrop');
  backdrop?.classList.remove('open');
  document.body.classList.remove('modal-open');
}

// ---- Active nav ----
function initActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks  = document.querySelectorAll('.nav__link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));
}

// ---- Scroll progress ----
function initScrollProgress() {
  const bar = document.querySelector('.scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${(window.scrollY / max) * 100}%`;
  }, { passive: true });
}

// ---- Carousel (auto-scroll infinite) ----
function initCarousel() {
  const track = document.getElementById('projects-carousel');
  if (!track) return;

  // Clone all cards and append for seamless infinite loop
  const originals = Array.from(track.querySelectorAll('.project-card'));
  originals.forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('tabindex', '-1');
    track.appendChild(clone);
  });

  // Pause / resume on hover of the entire carousel area
  const carousel = track.closest('.carousel');
  carousel?.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });
  carousel?.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });

  // When filters change, rebuild (show/hide originals only, re-clone)
  document.addEventListener('filterchange', () => {
    // Remove existing clones
    track.querySelectorAll('[aria-hidden="true"]').forEach(c => c.remove());
    // Re-clone visible cards
    track.querySelectorAll('.project-card:not(.hidden)').forEach(card => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      track.appendChild(clone);
    });
    // Restart animation
    track.style.animation = 'none';
    requestAnimationFrame(() => {
      track.style.animation = '';
    });
  });
}

// ---- Utilities ----
function isMobile() {
  return window.innerWidth < 768;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
