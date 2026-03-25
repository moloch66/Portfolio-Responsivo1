/* =========================================
   GSAP ScrollTrigger Animations + Anime.js
   ========================================= */

const Animations = (() => {
  const isMobile = () => window.innerWidth < 768;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // --- About section ---
    const aboutItems = document.querySelectorAll('.about__content > *');
    if (aboutItems.length) {
      gsap.to(aboutItems, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: '#about',
          start: 'top 75%',
          once: true,
        },
      });
    }

    // --- Portfolio cards ---
    const projectCards = document.querySelectorAll('.project-card');
    if (projectCards.length) {
      gsap.to(projectCards, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: '#portfolio',
          start: 'top 70%',
          once: true,
        },
      });
    }

    // --- Services cards ---
    const serviceCards = document.querySelectorAll('.service-card');
    if (serviceCards.length) {
      gsap.to(serviceCards, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: '#services',
          start: 'top 70%',
          once: true,
          onEnter: () => initSVGStroke(),
        },
      });
    }

    // Services CTA
    const servicesCta = document.querySelector('.services__cta-wrap');
    if (servicesCta) {
      gsap.to(servicesCta, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: servicesCta,
          start: 'top 85%',
          once: true,
        },
      });
    }

    // --- Contact section ---
    const contactInner = document.querySelector('.contact__inner');
    if (contactInner) {
      gsap.to(contactInner, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: '#contact',
          start: 'top 75%',
          once: true,
        },
      });
    }

    // --- Section labels & headings fade in ---
    document.querySelectorAll('.section__label, .section__heading').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        }
      );
    });

    // --- Desktop-only parallax on services ---
    if (!isMobile()) {
      const cards = document.querySelectorAll('.service-card');
      cards.forEach(card => {
        const depth = parseFloat(getComputedStyle(card).getPropertyValue('--parallax-depth')) || 0;
        if (!depth) return;
        gsap.to(card, {
          y: depth,
          ease: 'none',
          scrollTrigger: {
            trigger: '#services',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        });
      });
    }

    // --- Scroll progress bar ---
    const progressBar = document.querySelector('.scroll-progress');
    if (progressBar) {
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          progressBar.style.width = `${self.progress * 100}%`;
        },
      });
    }
  }

  // SVG stroke animation with Anime.js
  function initSVGStroke() {
    if (typeof anime === 'undefined') return;

    document.querySelectorAll('.service-card').forEach(card => {
      const rect = card.querySelector('.service-card__border rect');
      if (!rect || card.dataset.strokeDone) return;

      const w = card.offsetWidth;
      const h = card.offsetHeight;
      const perimeter = 2 * (w + h);
      card.style.setProperty('--perimeter', perimeter);
      rect.style.strokeDasharray  = perimeter;
      rect.style.strokeDashoffset = perimeter;

      anime({
        targets: rect,
        strokeDashoffset: [perimeter, 0],
        duration: 800,
        easing: 'easeOutQuad',
        delay: card.dataset.index * 100 || 0,
      });

      card.dataset.strokeDone = '1';
    });
  }

  // Anime.js stagger on skill tags
  let skillsAnimated = false;

  function initSkillStagger() {
    if (typeof anime === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animateSkills(entry.target);
      });
    }, { threshold: 0.3 });

    const skillsGrid = document.querySelector('.skills-grid');
    if (skillsGrid) observer.observe(skillsGrid);

    // Re-animate on lang change (skills are rebuilt)
    document.addEventListener('langchange', () => {
      const grid = document.querySelector('.skills-grid');
      if (grid && skillsAnimated) animateSkills(grid);
    });
  }

  function animateSkills(grid) {
    if (typeof anime === 'undefined') return;
    skillsAnimated = true;
    anime({
      targets: grid.querySelectorAll('.skill-tag'),
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 400,
      delay: anime.stagger(60, { start: 100 }),
      easing: 'easeOutExpo',
    });
  }

  // Hover lift on service cards (desktop only)
  function initServiceCardHover() {
    if (isMobile() || prefersReduced) return;

    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { y: -10, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { y: 0, duration: 0.45, ease: 'power2.inOut', overwrite: 'auto' });
      });
    });
  }

  // 3D tilt on portfolio cards (desktop only)
  function initCardTilt() {
    if (isMobile() || prefersReduced) return;

    document.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('mousemove', onTiltMove);
      card.addEventListener('mouseleave', onTiltLeave);
    });
  }

  function onTiltMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    const maxTilt = 8;
    card.style.transform = `perspective(800px) rotateY(${dx * maxTilt}deg) rotateX(${-dy * maxTilt}deg) translateZ(8px)`;
  }

  function onTiltLeave(e) {
    e.currentTarget.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateZ(0)';
    e.currentTarget.style.transition = `transform 0.5s ${getComputedStyle(document.documentElement).getPropertyValue('--ease-out-expo')}`;
    setTimeout(() => { e.currentTarget.style.transition = ''; }, 500);
  }

  // Typewriter effect
  const Typewriter = (() => {
    let el, text, speed = 60, timerId;
    let cursor;

    function start(targetEl, str) {
      if (prefersReduced) {
        targetEl.textContent = str;
        return;
      }
      el = targetEl;
      text = str;
      el.textContent = '';

      cursor = document.createElement('span');
      cursor.className = 'typewriter-cursor';
      cursor.setAttribute('aria-hidden', 'true');
      el.parentNode.insertBefore(cursor, el.nextSibling);

      let i = 0;
      function type() {
        if (i < text.length) {
          el.textContent += text[i++];
          timerId = setTimeout(type, speed);
        } else {
          cursor.classList.add('done');
        }
      }
      type();
    }

    function reset(newText) {
      clearTimeout(timerId);
      if (cursor) { cursor.remove(); cursor = null; }
      if (el) start(el, newText);
    }

    return { start, reset };
  })();

  window.Typewriter = Typewriter;

  function init() {
    initGSAP();
    initSkillStagger();
    initCardTilt();
    initServiceCardHover();

    // Start typewriter on hero tagline
    const taglineEl = document.querySelector('.hero__tagline');
    if (taglineEl) {
      // Wait until i18n has loaded and set text
      document.addEventListener('langchange', () => {
        Typewriter.reset(window.I18n?.t('hero.tagline') || taglineEl.textContent);
      }, { once: false });
    }
  }

  return { init, initSVGStroke, Typewriter };
})();

window.Animations = Animations;
