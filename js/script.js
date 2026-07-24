document.addEventListener('DOMContentLoaded', function () {
  // Godina u footeru
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Izbornik
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      mainNav.classList.toggle('open');
      navToggle.classList.toggle('open');
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('open');
        navToggle.classList.remove('open');
      });
    });
    document.addEventListener('click', function (e) {
      if (!mainNav.contains(e.target) && !navToggle.contains(e.target)) {
        mainNav.classList.remove('open');
        navToggle.classList.remove('open');
      }
    });
  }

  // Rotirajući prikaz sorti vina u zaglavlju — klik vodi na taj proizvod u Vinoteci
  var wineTicker = document.getElementById('wine-ticker-text');
  if (wineTicker) {
    var wineNames = [
      'Graševina', 'Rizvanac', 'Manzoni', 'Johaniter', 'Chardonnay',
      'Sauvignon', 'Mirisni Traminac', 'Vetovo Cuvee', 'Merlot',
      'Mystique', 'Rosé', 'Pjenušac Chardonnay'
    ];
    var wineSlugs = [
      'grasevina', 'rizvanac', 'manzoni', 'johaniter', 'chardonnay',
      'sauvignon', 'mirisni-traminac', 'vetovo-cuvee', 'merlot',
      'mystique', 'rose', 'pjenusac-chardonnay'
    ];
    var wineIndex = 0;
    setInterval(function () {
      wineTicker.classList.add('fade');
      setTimeout(function () {
        wineIndex = (wineIndex + 1) % wineNames.length;
        wineTicker.textContent = wineNames[wineIndex];
        wineTicker.setAttribute('href', 'vina.html#' + wineSlugs[wineIndex]);
        wineTicker.classList.remove('fade');
      }, 350);
    }, 2600);
  }

  // Filtriranje vina na stranici Vina
  var filterButtons = document.querySelectorAll('.wine-filters button');
  var wineCards = document.querySelectorAll('#wine-grid .wine-card');
  if (filterButtons.length && wineCards.length) {
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

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('wine-highlight');
    setTimeout(function () {
      target.classList.remove('wine-highlight');
    }, 2600);
  }
  jumpToWineFromHash();
  window.addEventListener('hashchange', jumpToWineFromHash);

  // Kontakt forma (bez backenda - samo potvrda)
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = document.getElementById('form-status');
      status.textContent = 'Hvala na poruci! Javit ćemo vam se u najkraćem mogućem roku.';
      status.classList.add('visible');
      contactForm.reset();
    });
  }

  // Animacije pri skrolanju
  var revealSelectors = [
    '.section-heading', '.wine-card', '.vinoteka-card', '.feature-card', '.timeline-item',
    '.values-grid > div', '.grid-2 > div', '.contact-info-item',
    '.contact-form', '.quote-block', '.map-embed', '.instagram-tile'
  ];
  var revealEls = document.querySelectorAll(revealSelectors.join(', '));

  if (revealEls.length && 'IntersectionObserver' in window) {
    revealEls.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (i % 3) * 0.1 + 's';
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  }
});
