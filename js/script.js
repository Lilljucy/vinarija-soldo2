var PAGE_FILES = ['index.html', 'o-nama.html', 'vina.html', 'kontakt.html', 'politika-privatnosti.html', 'uvjeti-koristenja.html'];
var wineTickerInterval = null;
var quoteInterval = null;
var photoStackTimers = [];
var revealObserver = null;
var AGE_GATE_KEY = 'soldoAgeVerifiedAt';
var AGE_GATE_TTL_MS = 30 * 60 * 1000; // 30 minuta
var COOKIE_CONSENT_KEY = 'soldoCookieConsent';

// Jezik stranice se čita iz URL putanje (/en/..., /de/...), ne iz
// <html lang>, jer AJAX prijelazi (swapPageContent) ne mijenjaju taj
// atribut pri prelasku na drugu jezičnu verziju iste stranice.
var QUOTES = {
  hr: [
    '"Vino je poezija zemlje pretočena u čašu."',
    '"Sav misterij slavonske noći krije se u dubini crnog vina Mystique."',
    '"Ne proizvodimo samo vino, mi stvaramo trenutke."',
    '"Vino je umjetnost koja se dovršava tek kada se podijeli s pravim ljudima."',
    '"Zemlja nam daje, mi joj vraćamo strpljenjem."',
    '"Svaka boca čuva okus sunca i kamena s naših vinograda."'
  ],
  en: [
    '"Wine is the poetry of the earth poured into a glass."',
    '"All the mystery of a Slavonian night lies within the depths of Mystique red wine."',
    '"We don\'t just make wine, we create moments."',
    '"Wine is an art that is only complete once it is shared with the right people."',
    '"The land gives to us, and we give back with patience."',
    '"Every bottle preserves the taste of sun and stone from our vineyards."'
  ],
  de: [
    '"Wein ist die Poesie der Erde, gegossen in ein Glas."',
    '"Das ganze Geheimnis einer slawonischen Nacht verbirgt sich in der Tiefe des Rotweins Mystique."',
    '"Wir produzieren nicht nur Wein, wir schaffen Momente."',
    '"Wein ist eine Kunst, die erst vollendet ist, wenn man sie mit den richtigen Menschen teilt."',
    '"Die Erde gibt uns, und wir geben ihr mit Geduld zurück."',
    '"Jede Flasche bewahrt den Geschmack von Sonne und Stein aus unseren Weinbergen."'
  ]
};

function getLocale() {
  var seg = location.pathname.split('/').filter(Boolean)[0];
  if (seg === 'en' || seg === 'de') return seg;
  return 'hr';
}

function isInternalPageLink(href) {
  if (!href) return false;
  if (href.indexOf('#') === 0) return false;
  var path = href.split('#')[0].split('?')[0];
  var file = path.split('/').pop();
  if (file === '') file = 'index.html';
  return PAGE_FILES.indexOf(file) !== -1;
}

function initPage() {
  // Starosna provjera — potvrda vrijedi 30 minuta (pamti se preko
  // localStorage), pa se pitanje ne postavlja iznova kod svakog refresha
  // unutar tog vremena, nego tek kad ta "sesija" istekne.
  var ageGate = document.getElementById('age-gate');
  if (ageGate) {
    var verifiedAt = Number(localStorage.getItem(AGE_GATE_KEY));
    if (verifiedAt && Date.now() - verifiedAt < AGE_GATE_TTL_MS) {
      ageGate.setAttribute('hidden', '');
    } else {
      localStorage.removeItem(AGE_GATE_KEY);
      document.body.classList.add('age-gate-open');
    }
  }

  // Kolačići — traka ostaje skrivena dok korisnik ne odabere prihvaćam/odbijam;
  // odluka se pamti trajno (bez isteka), pa se pitanje ne ponavlja svaki posjet.
  var cookieBanner = document.getElementById('cookie-banner');
  if (cookieBanner) {
    var cookieChoice = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!cookieChoice) {
      cookieBanner.removeAttribute('hidden');
    }
  }

  // Godina u footeru
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Rotirajući prikaz sorti vina u zaglavlju — klik vodi na taj proizvod u Vinoteci
  if (wineTickerInterval) {
    clearInterval(wineTickerInterval);
    wineTickerInterval = null;
  }
  var wineTicker = document.getElementById('wine-ticker-text');
  if (wineTicker) {
    var wineNames = [
      'Graševina', 'Premium Graševina', 'Rizvanac', 'Manzoni', 'Johaniter', 'Hibernal',
      'Chardonnay', 'Sauvignon', 'Mirisni Traminac', 'Vetovo Cuvée', 'Merlot',
      'Mystique', 'Rosé', 'Lumina Brut'
    ];
    var wineSlugs = [
      'grasevina', 'premium-grasevina', 'rizvanac', 'manzoni', 'johaniter', 'hibernal',
      'chardonnay', 'sauvignon', 'mirisni-traminac', 'vetovo-cuvee', 'merlot',
      'mystique', 'rose', 'lumina-brut'
    ];
    var wineIndex = 0;
    wineTickerInterval = setInterval(function () {
      var el = document.getElementById('wine-ticker-text');
      if (!el) return;
      el.classList.add('fade');
      setTimeout(function () {
        wineIndex = (wineIndex + 1) % wineNames.length;
        el.textContent = wineNames[wineIndex];
        el.setAttribute('href', 'vina.html#' + wineSlugs[wineIndex]);
        el.classList.remove('fade');
      }, 350);
    }, 2600);
  }

  // Rotirajući citati u "alt" sekciji
  if (quoteInterval) {
    clearInterval(quoteInterval);
    quoteInterval = null;
  }
  var quoteEl = document.getElementById('rotating-quote');
  if (quoteEl) {
    var quotes = QUOTES[getLocale()] || QUOTES.hr;
    var quoteIndex = 0;
    quoteInterval = setInterval(function () {
      var el = document.getElementById('rotating-quote');
      if (!el) return;
      el.classList.add('fade');
      setTimeout(function () {
        quoteIndex = (quoteIndex + 1) % quotes.length;
        el.textContent = quotes[quoteIndex];
        el.classList.remove('fade');
      }, 400);
    }, 5000);
  }

  // Svaka slika u photo-stack komponenti (koja ima data-alt-src) neovisno
  // i nasumično izmjenjuje svoj par (originalna/nova), umjesto da se sve
  // slike u istom stacku mijenjaju istovremeno.
  photoStackTimers.forEach(function (id) { clearTimeout(id); });
  photoStackTimers = [];
  var zastoImgs = document.querySelectorAll('.photo-stack-item img[data-alt-src]');
  zastoImgs.forEach(function (img) {
    (function scheduleSwap() {
      var delay = 3000 + Math.random() * 4000;
      var id = setTimeout(function () {
        img.classList.add('fade');
        setTimeout(function () {
          var src = img.getAttribute('src');
          var alt = img.getAttribute('alt');
          img.setAttribute('src', img.getAttribute('data-alt-src'));
          img.setAttribute('alt', img.getAttribute('data-alt-alt'));
          img.setAttribute('data-alt-src', src);
          img.setAttribute('data-alt-alt', alt);
          img.classList.remove('fade');
        }, 450);
        scheduleSwap();
      }, delay);
      photoStackTimers.push(id);
    })();
  });

  // Filtriranje vina na stranici Vina
  var filterButtons = document.querySelectorAll('.wine-filters button');
  var wineCards = document.querySelectorAll('#wine-grid .wine-card');
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var filter = btn.getAttribute('data-filter');
      wineCards.forEach(function (card) {
        var show = filter === 'sve' || card.getAttribute('data-type') === filter;
        card.style.display = show ? '' : 'none';
      });
    });
  });

  jumpToWineFromHash();

  // Lightbox trigeri (klik na sliku s više fotografija)
  document.querySelectorAll('[data-lightbox-images]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var srcList = trigger.getAttribute('data-lightbox-images').split(',').map(function (s) { return s.trim(); });
      var imgEl = trigger.querySelector('img');
      openLightbox(srcList, imgEl ? imgEl.alt : '');
    });
  });

  // Animacije pri skrolanju
  var revealSelectors = [
    '.section-heading', '.wine-card', '.vinoteka-card', '.feature-card', '.timeline-item',
    '.values-grid > div', '.grid-2 > div', '.contact-info-item', '.contact-field',
    '.quote-block', '.map-embed', '.map-full', '.instagram-tile', '.visit-band > div'
  ];
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }
  var revealEls = document.querySelectorAll(revealSelectors.join(', '));
  if (revealEls.length && 'IntersectionObserver' in window) {
    revealEls.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 3) * 0.1 + 's';
    });
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  // Vinski showcase carousel
  document.querySelectorAll('.showcase-carousel').forEach(function (carousel) {
    var slides = Array.from(carousel.querySelectorAll('.showcase-slide'));
    if (!slides.length) return;
    var prevBtn = carousel.querySelector('.showcase-arrow-prev');
    var nextBtn = carousel.querySelector('.showcase-arrow-next');
    var wrap = carousel.parentElement;
    var dotsWrap = wrap.querySelector('.showcase-dots');
    var nameEl = wrap.querySelector('.showcase-caption h3');
    var regionEl = wrap.querySelector('.showcase-caption p');
    var current = 0;

    var isSwipe = false;

    var dots = slides.map(function (slide, i) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'showcase-dot';
      dot.setAttribute('aria-label', 'Prikaži vino ' + (i + 1));
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
      slide.addEventListener('click', function () {
        if (isSwipe) return;
        goTo(i);
      });
      return dot;
    });

    function render() {
      var n = slides.length;
      slides.forEach(function (slide, i) {
        var offset = i - current;
        offset = ((offset % n) + n) % n;
        if (offset > n / 2) offset -= n;
        var abs = Math.abs(offset);
        var scale, tx, opacity, z;
        if (abs === 0) { scale = 1; tx = 0; opacity = 1; z = 10; }
        else if (abs === 1) { scale = 0.72; tx = offset > 0 ? -62 : 62; opacity = 0.55; z = 5; }
        else if (abs === 2) { scale = 0.5; tx = offset > 0 ? -100 : 100; opacity = 0.25; z = 2; }
        else { scale = 0.5; tx = offset > 0 ? -130 : 130; opacity = 0; z = 0; }
        slide.style.transform = 'translate(-50%, -50%) translateX(' + tx + '%) scale(' + scale + ')';
        slide.style.opacity = String(opacity);
        slide.style.zIndex = String(z);
        slide.style.pointerEvents = abs > 2 ? 'none' : 'auto';
        slide.classList.toggle('is-active', abs === 0);
      });
      dots.forEach(function (dot, i) { dot.classList.toggle('active', i === current); });
      if (nameEl) nameEl.textContent = slides[current].dataset.name;
      if (regionEl) regionEl.textContent = slides[current].dataset.region;
    }

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      render();
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goTo(current + 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goTo(current - 1); });

    // Listanje prstom (swipe) na dodirnim ekranima — zamjenjuje strelice na mobitelu
    var touchStartX = 0;
    var touchStartY = 0;
    var SWIPE_THRESHOLD = 40;

    carousel.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwipe = false;
    }, { passive: true });

    carousel.addEventListener('touchmove', function (e) {
      if (!e.touches.length) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
        isSwipe = true;
      }
    }, { passive: true });

    carousel.addEventListener('touchend', function (e) {
      if (!isSwipe) return;
      var endX = e.changedTouches.length ? e.changedTouches[0].clientX : touchStartX;
      var dx = endX - touchStartX;
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) goTo(current - 1); else goTo(current + 1);
      }
    });

    render();
  });
}

// Skrolanje i isticanje vina kad se stigne preko linka iz zaglavlja (npr. vina.html#grasevina)
function jumpToWineFromHash() {
  if (!location.hash) return;
  var target;
  try {
    target = document.querySelector(location.hash);
  } catch (err) {
    return;
  }
  if (!target || !target.classList.contains('wine-card')) return;

  var allFilterBtn = document.querySelector('.wine-filters button[data-filter="sve"]');
  if (allFilterBtn && !allFilterBtn.classList.contains('active')) {
    allFilterBtn.click();
  }

  setTimeout(function () {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('wine-highlight');
    setTimeout(function () {
      target.classList.remove('wine-highlight');
    }, 2600);
  }, 60);
}

// Lightbox helpers (dijele stanje preko cijele stranice)
var lightboxSrcs = [];
var lightboxIndex = 0;
var lightboxAlt = '';

function renderLightboxImage() {
  var lightboxImg = document.getElementById('lightbox-img');
  if (!lightboxImg) return;
  lightboxImg.src = lightboxSrcs[lightboxIndex];
  lightboxImg.alt = lightboxAlt;
}

function openLightbox(srcList, alt) {
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightboxSrcs = srcList;
  lightboxIndex = 0;
  lightboxAlt = alt;
  renderLightboxImage();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

// AJAX prijelazi između stranica (bez punog ponovnog učitavanja)
function swapPageContent(html, url) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');
  document.title = doc.title;
  document.documentElement.lang = doc.documentElement.lang;
  document.body.className = doc.body.className;
  document.body.innerHTML = doc.body.innerHTML;
  runInlineScripts(document.body);
  initPage();
  window.scrollTo(0, 0);
  document.body.classList.remove('page-transitioning');
}

function runInlineScripts(container) {
  container.querySelectorAll('script').forEach(function (oldScript) {
    if (oldScript.src) return;
    var newScript = document.createElement('script');
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}

function navigateTo(url, pushHistory) {
  document.body.classList.add('page-transitioning');
  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Network response was not ok');
      return res.text();
    })
    .then(function (html) {
      if (pushHistory) history.pushState({ url: url }, '', url);
      setTimeout(function () {
        swapPageContent(html, url);
      }, 280);
    })
    .catch(function () {
      window.location.href = url;
    });
}

document.addEventListener('DOMContentLoaded', function () {
  initPage();

  // Presretanje klikova na interne linkove za AJAX prijelaz
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;

    if (link.getAttribute('href') === '#top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (link.target && link.target !== '' && link.target !== '_self') return;
    if (link.hasAttribute('download')) return;

    var href = link.getAttribute('href');
    if (!isInternalPageLink(href)) return;

    e.preventDefault();
    var full = link.href;
    if (full === location.href) return;
    navigateTo(full, true);
  });

  window.addEventListener('popstate', function () {
    navigateTo(location.href, false);
  });

  // Izbornik (delegirano — radi i nakon AJAX prijelaza)
  document.addEventListener('click', function (e) {
    var navToggle = document.querySelector('.nav-toggle');
    var mainNav = document.querySelector('.main-nav');
    if (!navToggle || !mainNav) return;

    if (navToggle.contains(e.target)) {
      mainNav.classList.toggle('open');
      navToggle.classList.toggle('open');
      document.body.classList.toggle('nav-open', mainNav.classList.contains('open'));
      return;
    }

    if (mainNav.contains(e.target) && e.target.closest('a')) {
      mainNav.classList.remove('open');
      navToggle.classList.remove('open');
      document.body.classList.remove('nav-open');
      return;
    }

    if (mainNav.classList.contains('open') && !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
      mainNav.classList.remove('open');
      navToggle.classList.remove('open');
      document.body.classList.remove('nav-open');
    }
  });

  // Starosna provjera — gumb "Imam" (delegirano)
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#age-gate-yes')) return;
    var ageGate = document.getElementById('age-gate');
    if (!ageGate) return;
    localStorage.setItem(AGE_GATE_KEY, String(Date.now()));
    ageGate.setAttribute('hidden', '');
    document.body.classList.remove('age-gate-open');
  });

  // Kolačići — gumbi "Prihvaćam" / "Odbijam" (delegirano)
  document.addEventListener('click', function (e) {
    var accept = e.target.closest('#cookie-accept');
    var decline = e.target.closest('#cookie-decline');
    if (!accept && !decline) return;
    var banner = document.getElementById('cookie-banner');
    if (!banner) return;
    localStorage.setItem(COOKIE_CONSENT_KEY, accept ? 'accepted' : 'declined');
    banner.setAttribute('hidden', '');
  });

  // Lightbox — zatvaranje (delegirano)
  document.addEventListener('click', function (e) {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    var lightboxImg = document.getElementById('lightbox-img');
    if (e.target.closest('#lightbox-close')) {
      closeLightbox();
      return;
    }
    if (e.target === lightbox) {
      closeLightbox();
      return;
    }
    if (lightboxImg && e.target === lightboxImg) {
      lightboxIndex = (lightboxIndex + 1) % lightboxSrcs.length;
      renderLightboxImage();
    }
  });

  document.addEventListener('keydown', function (e) {
    var lightbox = document.getElementById('lightbox');
    if (e.key === 'Escape' && lightbox && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });

  window.addEventListener('hashchange', jumpToWineFromHash);
});
