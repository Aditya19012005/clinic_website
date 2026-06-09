/**
 * NovaMed Clinic – script.js
 * Interactive canvas background, scroll animations,
 * carousel, FAQ accordion, form validation & utilities
 */

'use strict';

/* =====================================================================
   0. UTILITY HELPERS
===================================================================== */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return Math.random() * (max - min) + min; }

/* =====================================================================
   1. HERO CANVAS — PARTICLE NETWORK WITH MOUSE PARALLAX
===================================================================== */
(function initCanvas() {
  const canvas = $('#heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ── Config ── */
  const CFG = {
    particleCount: window.innerWidth < 768 ? 45 : 90,
    maxConnectDist: 130,
    particleSpeed: 0.35,
    mouseRadius: 140,
    mouseForce: 0.006,
    colorA: [0, 212, 255],      // accent cyan
    colorB: [79, 70, 229],      // accent indigo
    lineOpacityMax: 0.25,
    particleSizeMin: 1.2,
    particleSizeMax: 3.2,
  };

  let W, H, particles = [];
  let mouse = { x: -999, y: -999, moving: false };
  let mouseTimer;
  let animId;
  let isMobile = window.innerWidth < 768;

  /* ── Particle Class ── */
  class Particle {
    constructor() { this.reset(true); }

    reset(randomPos) {
      this.x  = randomPos ? rand(0, W) : rand(-50, W + 50);
      this.y  = randomPos ? rand(0, H) : rand(-50, H + 50);
      this.vx = rand(-CFG.particleSpeed, CFG.particleSpeed);
      this.vy = rand(-CFG.particleSpeed, CFG.particleSpeed);
      this.size = rand(CFG.particleSizeMin, CFG.particleSizeMax);
      // Mix between colorA and colorB
      const t = Math.random();
      this.r = Math.round(lerp(CFG.colorA[0], CFG.colorB[0], t));
      this.g = Math.round(lerp(CFG.colorA[1], CFG.colorB[1], t));
      this.b = Math.round(lerp(CFG.colorA[2], CFG.colorB[2], t));
      this.opacity = rand(0.3, 0.85);
      this.opacityDir = Math.random() > 0.5 ? 1 : -1;
      this.opacitySpeed = rand(0.004, 0.012);
    }

    update() {
      // Mouse repulsion
      if (mouse.moving) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CFG.mouseRadius && dist > 0) {
          const force = (CFG.mouseRadius - dist) / CFG.mouseRadius;
          this.vx += (dx / dist) * force * CFG.mouseForce * 12;
          this.vy += (dy / dist) * force * CFG.mouseForce * 12;
        }
      }

      // Speed cap
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      if (speed > CFG.particleSpeed * 3) {
        this.vx = (this.vx / speed) * CFG.particleSpeed * 3;
        this.vy = (this.vy / speed) * CFG.particleSpeed * 3;
      }

      // Friction
      this.vx *= 0.995;
      this.vy *= 0.995;

      this.x += this.vx;
      this.y += this.vy;

      // Pulse opacity
      this.opacity += this.opacityDir * this.opacitySpeed;
      if (this.opacity >= 0.85 || this.opacity <= 0.25) this.opacityDir *= -1;

      // Wrap edges
      if (this.x < -60) this.x = W + 60;
      else if (this.x > W + 60) this.x = -60;
      if (this.y < -60) this.y = H + 60;
      else if (this.y > H + 60) this.y = -60;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${this.opacity})`;
      ctx.fill();
    }
  }

  /* ── Resize ── */
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    isMobile = W < 768;
    CFG.particleCount = isMobile ? 45 : 90;

    // Re-create if count changed
    if (particles.length !== CFG.particleCount) {
      particles = Array.from({ length: CFG.particleCount }, () => new Particle());
    }
  }

  /* ── Draw connecting lines ── */
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CFG.maxConnectDist) {
          const alpha = (1 - dist / CFG.maxConnectDist) * CFG.lineOpacityMax;
          // Blend colors from both particles
          const r = Math.round((particles[i].r + particles[j].r) / 2);
          const g = Math.round((particles[i].g + particles[j].g) / 2);
          const b = Math.round((particles[i].b + particles[j].b) / 2);
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  /* ── Mouse highlight ring ── */
  function drawMouseGlow() {
    if (!mouse.moving) return;
    const grad = ctx.createRadialGradient(
      mouse.x, mouse.y, 0,
      mouse.x, mouse.y, CFG.mouseRadius
    );
    grad.addColorStop(0,   'rgba(0,212,255,0.06)');
    grad.addColorStop(0.5, 'rgba(0,212,255,0.02)');
    grad.addColorStop(1,   'rgba(0,212,255,0)');
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, CFG.mouseRadius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  /* ── Main loop ── */
  function loop() {
    ctx.clearRect(0, 0, W, H);
    drawMouseGlow();
    drawLines();
    particles.forEach(p => { p.update(); p.draw(); });
    animId = requestAnimationFrame(loop);
  }

  /* ── Events ── */
  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    loop();
  }, { passive: true });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.moving = true;
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => { mouse.moving = false; }, 2000);
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    mouse.x = t.clientX - rect.left;
    mouse.y = t.clientY - rect.top;
    mouse.moving = true;
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => { mouse.moving = false; }, 1500);
  }, { passive: true });

  /* ── Init ── */
  resize();
  loop();
})();

/* =====================================================================
   2. CURSOR GLOW TRAIL (desktop only)
===================================================================== */
(function initCursorGlow() {
  const glow = $('#cursorGlow');
  if (!glow || window.matchMedia('(hover: none)').matches) return;

  let cx = -999, cy = -999;
  let tx = -999, ty = -999;

  document.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });

  function tick() {
    cx = lerp(cx, tx, 0.12);
    cy = lerp(cy, ty, 0.12);
    glow.style.left = cx + 'px';
    glow.style.top  = cy + 'px';
    requestAnimationFrame(tick);
  }

  tick();
})();

/* =====================================================================
   3. NAVBAR – scroll shrink + active link
===================================================================== */
(function initNavbar() {
  const navbar    = $('#navbar');
  const toggle    = $('#navToggle');
  const menu      = $('#navMenu');
  const links     = $$('.nav-link');
  const sections  = $$('section[id]');
  if (!navbar) return;

  /* Scroll shrink */
  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 40);

    /* Back-to-top */
    const btn = $('#backToTop');
    if (btn) btn.classList.toggle('visible', window.scrollY > 400);

    /* Active section highlight */
    let current = '';
    sections.forEach(sec => {
      const top = sec.offsetTop - 100;
      if (window.scrollY >= top) current = sec.id;
    });
    links.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hamburger */
  toggle?.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  /* Close on link click */
  links.forEach(a => {
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  /* Close on outside tap */
  document.addEventListener('click', e => {
    if (!navbar.contains(e.target) && menu.classList.contains('open')) {
      menu.classList.remove('open');
      toggle?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
})();

/* =====================================================================
   4. BACK TO TOP BUTTON
===================================================================== */
(function initBackToTop() {
  const btn = $('#backToTop');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* =====================================================================
   5. SCROLL REVEAL (IntersectionObserver)
===================================================================== */
(function initScrollReveal() {
  const targets = $$('.reveal-up, .reveal-left, .reveal-right, .reveal-fade');
  if (!targets.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(el => observer.observe(el));
})();

/* =====================================================================
   6. ANIMATED COUNTERS
===================================================================== */
(function initCounters() {
  const counters = $$('.stat-num[data-count]');
  if (!counters.length) return;

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function animateCounter(el) {
    const target   = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const start    = performance.now();

    function frame(now) {
      const elapsed  = now - start;
      const progress = clamp(elapsed / duration, 0, 1);
      const val      = Math.round(easeOut(progress) * target);
      el.textContent = val.toLocaleString();
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));
})();

/* =====================================================================
   7. SERVICE CARD 3D TILT
===================================================================== */
(function initTilt() {
  const cards = $$('.tilt-card');
  const MAX_TILT = 8; // degrees

  cards.forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width  / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width  / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `
        perspective(800px)
        rotateY(${clamp(dx * MAX_TILT, -MAX_TILT, MAX_TILT)}deg)
        rotateX(${clamp(-dy * MAX_TILT, -MAX_TILT, MAX_TILT)}deg)
        translateZ(8px)
      `;
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.4,0,0.2,1)';
      card.style.transform  = '';
      setTimeout(() => { card.style.transition = ''; }, 500);
    });
  });
})();

/* =====================================================================
   8. TESTIMONIAL CAROUSEL
===================================================================== */
(function initCarousel() {
  const track    = $('#testimonialTrack');
  const prevBtn  = $('#carouselPrev');
  const nextBtn  = $('#carouselNext');
  const dotsWrap = $('#carouselDots');
  if (!track) return;

  const cards    = $$('.testimonial-card', track);
  const isMobile = () => window.innerWidth <= 768;
  const visCount = () => isMobile() ? 1 : 2;

  let current    = 0;
  let autoTimer;
  const total    = cards.length;

  /* ── Build dots ── */
  function buildDots() {
    dotsWrap.innerHTML = '';
    const pages = Math.ceil(total / visCount());
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Testimonial page ${i + 1}`);
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    }
  }

  /* ── Update dots ── */
  function updateDots(page) {
    $$('.dot', dotsWrap).forEach((d, i) => {
      d.classList.toggle('active', i === page);
      d.setAttribute('aria-selected', i === page ? 'true' : 'false');
    });
  }

  /* ── Go to slide ── */
  function goTo(page) {
    const pages = Math.ceil(total / visCount());
    current     = (page + pages) % pages;
    const offset = current * (100 / visCount());
    track.style.transform = `translateX(-${offset}%)`;
    updateDots(current);
  }

  /* ── Navigation ── */
  prevBtn?.addEventListener('click', () => { resetAuto(); goTo(current - 1); });
  nextBtn?.addEventListener('click', () => { resetAuto(); goTo(current + 1); });

  /* ── Touch swipe ── */
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { resetAuto(); goTo(current + (diff > 0 ? 1 : -1)); }
  }, { passive: true });

  /* ── Auto-play ── */
  function startAuto() { autoTimer = setInterval(() => goTo(current + 1), 4500); }
  function resetAuto()  { clearInterval(autoTimer); startAuto(); }

  /* ── Resize recalc ── */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { buildDots(); goTo(0); }, 300);
  }, { passive: true });

  /* ── Init ── */
  buildDots();
  goTo(0);
  startAuto();
})();

/* =====================================================================
   9. FAQ ACCORDION
===================================================================== */
(function initFAQ() {
  const items = $$('.faq-item');
  items.forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all others
      items.forEach(other => {
        if (other !== item) {
          other.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-answer')?.classList.remove('open');
        }
      });

      // Toggle current
      btn.setAttribute('aria-expanded', !isOpen);
      answer.classList.toggle('open', !isOpen);
    });
  });
})();

/* =====================================================================
   10. APPOINTMENT FORM VALIDATION
===================================================================== */
(function initForm() {
  const form        = $('#appointmentForm');
  const successMsg  = $('#formSuccess');
  if (!form) return;

  /* ── Validators ── */
  const rules = {
    apptName:  v => v.trim().length >= 2
                 ? '' : 'Please enter your full name (at least 2 characters).',
    apptPhone: v => /^[\+\d\s\-\(\)]{7,20}$/.test(v.trim())
                 ? '' : 'Please enter a valid phone number.',
    apptEmail: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
                 ? '' : 'Please enter a valid email address.',
    apptDate:  v => {
                  if (!v) return 'Please select a preferred date.';
                  const sel  = new Date(v);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return sel >= today ? '' : 'Please choose today or a future date.';
               },
  };

  /* ── Show / clear error ── */
  function showError(input, msg) {
    input.classList.add('error');
    const errEl = input.closest('.form-group')?.querySelector('.form-error');
    if (errEl) errEl.textContent = msg;
  }

  function clearError(input) {
    input.classList.remove('error');
    const errEl = input.closest('.form-group')?.querySelector('.form-error');
    if (errEl) errEl.textContent = '';
  }

  /* ── Live validation ── */
  Object.keys(rules).forEach(id => {
    const field = $(`#${id}`, form);
    if (!field) return;
    field.addEventListener('blur', () => {
      const err = rules[id](field.value);
      err ? showError(field, err) : clearError(field);
    });
    field.addEventListener('input', () => {
      if (field.classList.contains('error')) {
        const err = rules[id](field.value);
        err ? showError(field, err) : clearError(field);
      }
    });
  });

  /* ── Submit ── */
  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;

    Object.keys(rules).forEach(id => {
      const field = $(`#${id}`, form);
      if (!field) return;
      const err = rules[id](field.value);
      if (err) { showError(field, err); valid = false; }
      else { clearError(field); }
    });

    if (!valid) {
      // Focus first error
      const firstErr = form.querySelector('.error');
      firstErr?.focus();
      return;
    }

    /* ── Simulate submission ── */
    const submitBtn = form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    setTimeout(() => {
      form.reset();
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
        Request Appointment
      `;
      if (successMsg) {
        successMsg.style.display = 'flex';
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => { successMsg.style.display = 'none'; }, 6000);
      }
    }, 1200);
  });
})();

/* =====================================================================
   11. SECTION PARALLAX ON SCROLL
===================================================================== */
(function initParallax() {
  // Only on capable screens, no reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 768) return;

  const hero    = $('.hero');
  const floats  = $$('.float-card');

  function onScroll() {
    const y = window.scrollY;
    if (hero) {
      hero.style.backgroundPositionY = `${y * 0.3}px`;
    }
    floats.forEach((el, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      el.style.transform = `translateY(${dir * y * 0.06}px)`;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* =====================================================================
   12. BUTTON RIPPLE (programmatic backup for non-CSS)
===================================================================== */
(function initRipple() {
  document.addEventListener('pointerdown', e => {
    const btn = e.target.closest('.ripple');
    if (!btn) return;

    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height);
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position:absolute;
      width:${size}px; height:${size}px;
      left:${x}px; top:${y}px;
      background:rgba(255,255,255,0.18);
      border-radius:50%;
      transform:scale(0);
      animation:rippleAnim 0.55s linear;
      pointer-events:none;
    `;

    // Ensure button has position
    const prevPos = getComputedStyle(btn).position;
    if (prevPos === 'static') btn.style.position = 'relative';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });

  // Inject keyframes once
  if (!document.querySelector('#rippleKF')) {
    const style = document.createElement('style');
    style.id = 'rippleKF';
    style.textContent = `
      @keyframes rippleAnim {
        to { transform:scale(2.5); opacity:0; }
      }
    `;
    document.head.appendChild(style);
  }
})();

/* =====================================================================
   13. SET FOOTER YEAR
===================================================================== */
(function setYear() {
  const el = $('#footerYear');
  if (el) el.textContent = new Date().getFullYear();
})();

/* =====================================================================
   14. SMOOTH ACTIVE NAV ON LOAD (hash in URL)
===================================================================== */
(function handleInitialHash() {
  if (window.location.hash) {
    const target = $(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }
})();
