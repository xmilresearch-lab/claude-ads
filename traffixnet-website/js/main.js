/* ===== NAVBAR SCROLL ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
  toggleFloatingCta();
}, { passive: true });

/* ===== HAMBURGER MENU ===== */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('open');
});
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
  });
});

/* ===== SMOOTH SCROLL FOR NAV LINKS ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ===== COUNTER ANIMATION ===== */
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1800;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.counter').forEach(el => counterObserver.observe(el));

/* ===== REVEAL ON SCROLL ===== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.service-card, .innovation-card, .case-card, .testimonial-card, .step, .pricing-card, .faq-item').forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

/* ===== AUDIT TOOL ===== */
function runAudit() {
  const input = document.getElementById('auditUrl');
  const url = input.value.trim();
  if (!url) {
    input.focus();
    input.style.borderColor = 'var(--red)';
    setTimeout(() => input.style.borderColor = '', 1500);
    return;
  }
  let domain;
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch {
    domain = url.replace(/https?:\/\//i, '').replace('www.', '').split('/')[0];
  }

  const btn = document.querySelector('.audit-input-group .btn');
  const origText = btn.innerHTML;
  btn.innerHTML = '<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Analyzing...';
  btn.disabled = true;

  setTimeout(() => {
    const tech = 68 + Math.floor(Math.random() * 22);
    const content = 58 + Math.floor(Math.random() * 24);
    const ai = 22 + Math.floor(Math.random() * 38);
    const mobile = 72 + Math.floor(Math.random() * 20);
    const overall = Math.round((tech + content + ai + mobile) / 4);

    document.getElementById('auditDomain').textContent = domain;
    document.getElementById('overallScore').textContent = overall;
    document.getElementById('techScore').textContent = tech;
    document.getElementById('contentScore').textContent = content;
    document.getElementById('aiScore').textContent = ai;
    document.getElementById('mobileScore').textContent = mobile;

    const scoreCircle = document.getElementById('scoreCircle');
    const circumference = 327;
    const offset = circumference - (overall / 100) * circumference;
    scoreCircle.style.transition = 'stroke-dashoffset 1.2s ease';
    scoreCircle.style.strokeDashoffset = offset;

    const fills = [
      { id: 'techFill', score: tech },
      { id: 'contentFill', score: content },
      { id: 'aiFill', score: ai },
      { id: 'mobileFill', score: mobile },
    ];
    fills.forEach(({ id, score }) => {
      const el = document.getElementById(id);
      if (el) setTimeout(() => { el.style.width = score + '%'; }, 200);
    });

    const resultsEl = document.getElementById('auditResults');
    resultsEl.style.display = 'block';
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    btn.innerHTML = origText;
    btn.disabled = false;
  }, 2000);
}

document.getElementById('auditUrl').addEventListener('keydown', e => {
  if (e.key === 'Enter') runAudit();
});

/* ===== PRICING TOGGLE ===== */
const prices = { monthly: [997, 2497, 4997], annual: [798, 1997, 3997] };
let isAnnual = false;

function togglePricing() {
  isAnnual = !isAnnual;
  const btn = document.getElementById('pricingToggle');
  btn.classList.toggle('active', isAnnual);
  btn.setAttribute('aria-pressed', isAnnual);
  const set = isAnnual ? prices.annual : prices.monthly;
  ['p1','p2','p3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = set[i].toLocaleString();
  });
}

/* ===== FAQ ACCORDION ===== */
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const isOpen = btn.classList.contains('open');
  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    q.nextElementSibling.classList.remove('open');
  });
  if (!isOpen) {
    btn.classList.add('open');
    answer.classList.add('open');
  }
}

/* ===== ROI CALCULATOR ===== */
function updateROI() {
  const visitors = parseInt(document.getElementById('visitorsSlider').value, 10);
  const conversion = parseFloat(document.getElementById('conversionSlider').value);
  const value = parseInt(document.getElementById('valueSlider').value, 10);
  const growth = parseInt(document.getElementById('growthSlider').value, 10);

  document.getElementById('visitorsValue').textContent = visitors.toLocaleString();
  document.getElementById('conversionValue').textContent = conversion.toFixed(1) + '%';
  document.getElementById('valueDisplay').textContent = '$' + value.toLocaleString();
  document.getElementById('growthValue').textContent = growth + '%';

  const current = Math.round(visitors * (conversion / 100) * value);
  const projected = Math.round(current * (1 + growth / 100));
  const additional = projected - current;

  document.getElementById('currentRevenue').textContent = '$' + current.toLocaleString();
  document.getElementById('projectedRevenue').textContent = '$' + projected.toLocaleString();
  document.getElementById('additionalRevenue').textContent = '+$' + additional.toLocaleString();
}

/* ===== CONTACT FORM ===== */
function submitForm(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.innerHTML = '<svg class="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sending...';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = '✓ Message Sent! We\'ll be in touch within 24 hours.';
    btn.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';
    setTimeout(() => {
      btn.innerHTML = 'Get My Free Audit &amp; Strategy Call &#8594;';
      btn.style.background = '';
      btn.disabled = false;
      e.target.reset();
    }, 4000);
  }, 1500);
}

/* ===== FLOATING CTA ===== */
function toggleFloatingCta() {
  const el = document.getElementById('floatingCta');
  if (!el) return;
  const heroBottom = document.getElementById('hero').getBoundingClientRect().bottom;
  const contactTop = document.getElementById('contact').getBoundingClientRect().top;
  const show = heroBottom < 0 && contactTop > window.innerHeight;
  el.style.opacity = show ? '1' : '0';
  el.style.pointerEvents = show ? 'auto' : 'none';
}

/* ===== SPINNER CSS ===== */
const spinStyle = document.createElement('style');
spinStyle.textContent = '@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .8s linear infinite}';
document.head.appendChild(spinStyle);

/* ===== INIT ===== */
updateROI();
