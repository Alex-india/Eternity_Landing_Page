/* ============================================================
   ETERNITY â€” script.js
   Handles: sticky navbar, mobile drawer, scroll animations
   ============================================================ */

(function () {
  'use strict';

  /* â”€â”€ Theme Toggle â”€â”€ */
  const html = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');

  // Detect initial theme: saved preference -> dark default
  // Default to obsidian dark theme for ETERNITY
  function getInitialTheme() {
    const saved = localStorage.getItem('eternity-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('eternity-theme', theme);
  }

  // Apply on load (before paint to avoid flash)
  applyTheme(getInitialTheme());

  themeToggle && themeToggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });


  const navbar = document.getElementById('navbar');
  const prismaPillNav = document.getElementById('prisma-pill-nav');
  const hamburger = document.getElementById('hamburger');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerPanel = document.getElementById('drawer-panel');
  const drawerClose = document.getElementById('drawer-close');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-drawer__cta');
  const navLinks = document.querySelectorAll('.nav-link, .prisma-nav-item');
  const sections = document.querySelectorAll('section[id]');

  /* ── Navbar & Header Scroll Effect ── */
  let lastScrollY = 0;
  const siteHeader = document.getElementById('site-header') || document.querySelector('header');

  function updateHeaderCollapse(scrollY) {
    if (!siteHeader) return;
    const isCollapsed = siteHeader.classList.contains('is-collapsed');
    let stateChanged = false;

    // Hysteresis threshold: collapse at > 45px, expand only when returning to < 15px
    if (!isCollapsed && scrollY > 45) {
      siteHeader.classList.add('is-collapsed');
      stateChanged = true;
    } else if (isCollapsed && scrollY < 15) {
      siteHeader.classList.remove('is-collapsed');
      stateChanged = true;
    }

    if (stateChanged) {
      const targetH = siteHeader.classList.contains('is-collapsed') ? 28 : 52;
      document.documentElement.style.setProperty('--header-height', `${targetH}px`);
    }
  }

  function onScroll() {
    const scrollY = window.scrollY;

    // Collapse header into a slim, compact bar when scrolled
    updateHeaderCollapse(scrollY);

    // Add "scrolled" class after 40px if navbar exists
    if (navbar) {
      if (scrollY > 40) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }

    // Sticky floating pill navigation when scrolled past hero
    if (prismaPillNav) {
      if (scrollY > 500) {
        prismaPillNav.classList.add('sticky-nav');
      } else {
        prismaPillNav.classList.remove('sticky-nav');
      }
    }

    // Highlight active nav link
    updateActiveLink(scrollY);

    lastScrollY = scrollY;
  }

  /* ── Active Nav Link Highlight ── */
  function updateActiveLink(scrollY) {
    let current = '';

    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (scrollY >= top) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  /* â”€â”€ Mobile Drawer â”€â”€ */
  function openDrawer() {
    mobileDrawer.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Focus trap: move focus to close button
    setTimeout(() => drawerClose && drawerClose.focus(), 100);
  }

  function closeDrawer() {
    mobileDrawer.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    hamburger && hamburger.focus();
  }

  hamburger && hamburger.addEventListener('click', () => {
    if (mobileDrawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  drawerClose && drawerClose.addEventListener('click', closeDrawer);
  drawerOverlay && drawerOverlay.addEventListener('click', closeDrawer);

  // Close on mobile link click
  mobileLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
      closeDrawer();
    }
  });

  /* â”€â”€ Smooth Scroll for anchor links â”€â”€ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        const navH = navbar ? navbar.offsetHeight : 68;
        const top = target.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* â”€â”€ Scroll-Triggered Fade-In Animations â”€â”€ */
  const fadeElements = document.querySelectorAll('.fade-in');

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.08
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // animate once
      }
    });
  }, observerOptions);

  fadeElements.forEach(el => observer.observe(el));

  /* ── Testimonials Marquee Mobile Touch-Pause ── */
  const marqueeCols = document.querySelectorAll('.marquee-col');
  marqueeCols.forEach(col => {
    col.addEventListener('touchstart', function () {
      const track = this.querySelector('.marquee-track');
      if (track) track.style.animationPlayState = 'paused';
    }, { passive: true });

    col.addEventListener('touchend', function () {
      const track = this.querySelector('.marquee-track');
      if (track) track.style.animationPlayState = 'running';
    }, { passive: true });
  });

  /* ── Attach Scroll Listener ── */
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Initial call (in case page loads mid-scroll) ── */
  onScroll();

  /* â”€â”€ Active Nav Link CSS â”€â”€ */
  // Inject active link style dynamically (keeps CSS clean)
  const style = document.createElement('style');
  style.textContent = `.nav-link.active { color: var(--color-text); }`;
  document.head.appendChild(style);


  /* ================================================================
     AUTH SYSTEM - Login / Signup / Session / Logout
     Connected to PostgreSQL backend via Express API
     JWT token stored in localStorage for API authentication
     ================================================================ */

  var API_BASE = (window.location.hostname === 'localhost' && window.location.port !== '3000') || window.location.protocol === 'file:'
    ? 'http://localhost:3000/api'
    : '/api';
  var TOKEN_KEY = 'eternity_token';
  var CURRENT_USER = null; // Cached logged-in user object

  /* ── API Helper ── */
  function apiRequest(method, endpoint, body) {
    var headers = { 'Content-Type': 'application/json' };
    var token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var opts = { method: method, headers: headers };
    if (body) opts.body = JSON.stringify(body);

    return fetch(API_BASE + endpoint, opts)
      .then(function (res) {
        return res.json().then(function (data) {
          data._status = res.status;
          data._ok = res.ok;
          return data;
        });
      })
      .catch(function (err) {
        console.error('API request failed:', err);
        return { _ok: false, _status: 0, error: 'Network error', message: 'Could not connect to server. Please check your connection.' };
      });
  }

  function saveToken(token) { localStorage.setItem(TOKEN_KEY, token); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); CURRENT_USER = null; }
  function getInitials(name) { return name.trim().split(/\s+/).map(function (p) { return p[0].toUpperCase(); }).slice(0, 2).join(''); }
  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  var navbarAuth = document.getElementById('navbar-auth');
  var userMenuEl = document.getElementById('user-menu');
  var userMenuTrigger = document.getElementById('user-menu-trigger');
  var userDropdown = document.getElementById('user-dropdown');
  var userAvatarEl = document.getElementById('user-avatar-initials');
  var userNameEl = document.getElementById('user-display-name');
  var dropdownName = document.getElementById('dropdown-name');
  var dropdownEmail = document.getElementById('dropdown-email');
  var btnLogout = document.getElementById('btn-logout');
  var mobileAuth = document.getElementById('mobile-auth');
  var mobileUserEl = document.getElementById('mobile-user');
  var mobileUserAvatar = document.getElementById('mobile-user-avatar');
  var mobileUserName = document.getElementById('mobile-user-name');
  var mobileUserEmail = document.getElementById('mobile-user-email');
  var mobileBtnLogout = document.getElementById('mobile-btn-logout');
  var loginModal = document.getElementById('login-modal');
  var signupModal = document.getElementById('signup-modal');
  var inquiryModal = document.getElementById('inquiry-modal');

  /* ── Render Auth State from cached user or logged-out ── */
  function renderAuthState() {
    var user = CURRENT_USER;
    if (user) {
      var fullName = user.firstName + ' ' + user.lastName;
      var initials = getInitials(fullName);
      if (navbarAuth) navbarAuth.style.display = 'none';
      if (userMenuEl) userMenuEl.style.display = 'flex';
      if (userAvatarEl) userAvatarEl.textContent = initials;
      if (userNameEl) userNameEl.textContent = user.firstName;
      if (dropdownName) dropdownName.textContent = fullName;
      if (dropdownEmail) dropdownEmail.textContent = user.email;
      if (mobileAuth) mobileAuth.style.display = 'none';
      if (mobileUserEl) mobileUserEl.style.display = 'flex';
      if (mobileUserAvatar) mobileUserAvatar.textContent = initials;
      if (mobileUserName) mobileUserName.textContent = fullName;
      if (mobileUserEmail) mobileUserEmail.textContent = user.email;
    } else {
      if (navbarAuth) navbarAuth.style.display = 'flex';
      if (userMenuEl) userMenuEl.style.display = 'none';
      if (mobileAuth) mobileAuth.style.display = 'flex';
      if (mobileUserEl) mobileUserEl.style.display = 'none';
    }
  }

  /* ── Sync Meeting / Cal.com URL from backend ── */
  function syncMeetingUrl() {
    apiRequest('GET', '/cal/url').then(function (data) {
      if (data && data.meetingUrl) {
        var bookBtn = document.getElementById('lets-work-book-btn');
        if (bookBtn) bookBtn.href = data.meetingUrl;
      }
    });
  }

  /* ── Restore session from stored JWT on page load ── */
  function restoreSession() {
    syncMeetingUrl();
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) { renderAuthState(); return; }
    apiRequest('GET', '/auth/me').then(function (data) {
      if (data._ok && data.user) {
        CURRENT_USER = data.user;
      } else {
        clearToken();
      }
      renderAuthState();
    });
  }

  function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var f = modal.querySelector('.form-input'); if (f) f.focus(); }, 120);
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    modal.querySelectorAll('.auth-alert').forEach(function (el) { el.style.display = 'none'; el.textContent = ''; });
    modal.querySelectorAll('.form-group').forEach(function (g) { g.classList.remove('error', 'success'); });
    modal.querySelectorAll('.form-error').forEach(function (e) { e.textContent = ''; });
    modal.querySelectorAll('.form-input').forEach(function (i) { i.value = ''; if (i.type === 'text' && (i.id.includes('password') || i.id.includes('confirm'))) i.type = 'password'; });
    modal.querySelectorAll('.form-eye').forEach(function (btn) {
      var s = btn.querySelector('.eye-show'); var h = btn.querySelector('.eye-hide');
      if (s) s.style.display = 'block'; if (h) h.style.display = 'none';
    });
    var fill = modal.querySelector('#strength-fill'); var lbl = modal.querySelector('#strength-label');
    if (fill) { fill.style.width = '0%'; fill.style.backgroundColor = ''; }
    if (lbl) { lbl.textContent = ''; lbl.style.color = ''; }
  }

  var elLoginOpen = document.getElementById('btn-open-login');
  var elSignupOpen = document.getElementById('btn-open-signup');
  var elMobLogin = document.getElementById('mobile-btn-login');
  var elMobSignup = document.getElementById('mobile-btn-signup');
  var elLoginClose = document.getElementById('login-close');
  var elSignupClose = document.getElementById('signup-close');
  var elLoginOvl = document.getElementById('login-overlay');
  var elSignupOvl = document.getElementById('signup-overlay');
  var elToSignup = document.getElementById('switch-to-signup');
  var elToLogin = document.getElementById('switch-to-login');
  var elLoginDemo = document.getElementById('login-demo-btn');

  var elInquiryOpen = document.getElementById('lets-work-inquiry-btn');
  var elInquiryClose = document.getElementById('inquiry-close');
  var elInquiryOvl = document.getElementById('inquiry-overlay');
  var inquiryForm = document.getElementById('inquiry-form');

  if (elLoginOpen) elLoginOpen.addEventListener('click', function () { openModal(loginModal); });
  if (elSignupOpen) elSignupOpen.addEventListener('click', function () { openModal(signupModal); });
  if (elMobLogin) elMobLogin.addEventListener('click', function () { closeDrawer(); openModal(loginModal); });
  if (elMobSignup) elMobSignup.addEventListener('click', function () { closeDrawer(); openModal(signupModal); });
  if (elLoginClose) elLoginClose.addEventListener('click', function () { closeModal(loginModal); });
  if (elSignupClose) elSignupClose.addEventListener('click', function () { closeModal(signupModal); });
  if (elLoginOvl) elLoginOvl.addEventListener('click', function () { closeModal(loginModal); });
  if (elSignupOvl) elSignupOvl.addEventListener('click', function () { closeModal(signupModal); });
  if (elToSignup) elToSignup.addEventListener('click', function () { closeModal(loginModal); openModal(signupModal); });
  if (elToLogin) elToLogin.addEventListener('click', function () { closeModal(signupModal); openModal(loginModal); });

  if (elInquiryOpen) elInquiryOpen.addEventListener('click', function () { openModal(inquiryModal); });
  if (elInquiryClose) elInquiryClose.addEventListener('click', function () { closeModal(inquiryModal); });
  if (elInquiryOvl) elInquiryOvl.addEventListener('click', function () { closeModal(inquiryModal); });

  // 1-Click Demo Login button handler → calls backend API
  if (elLoginDemo) {
    elLoginDemo.addEventListener('click', function () {
      var emailInp = document.getElementById('login-email');
      var passInp = document.getElementById('login-password');
      if (emailInp) emailInp.value = 'demo@eternity.dev';
      if (passInp) passInp.value = 'Password123!';
      showAlert('login-error', '', false);
      showAlert('login-success', 'Logging into demo account...', true);
      setLoading('login-submit', true);

      apiRequest('POST', '/auth/login', {
        email: 'demo@eternity.dev',
        password: 'Password123!'
      }).then(function (data) {
        setLoading('login-submit', false);
        if (data._ok) {
          saveToken(data.token);
          CURRENT_USER = data.user;
          showAlert('login-success', 'Welcome back, ' + data.user.firstName + '! Logging you in...');
          setTimeout(function () {
            renderAuthState();
            closeModal(loginModal);
          }, 700);
        } else {
          showAlert('login-error', data.message || 'Demo login failed. Make sure the server is running.');
        }
      });
    });
  }

  // Inquiry Form Submission Handler → calls backend API
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', function (e) {
      e.preventDefault();
      showAlert('inquiry-error', '', false);
      showAlert('inquiry-success', '', false);

      var name = document.getElementById('inquiry-name').value.trim();
      var email = document.getElementById('inquiry-email').value.trim();
      var service = document.getElementById('inquiry-service').value;
      var budget = document.getElementById('inquiry-budget').value;
      var msg = document.getElementById('inquiry-msg').value.trim();
      var ok = true;

      if (!name) ok = setErr('inquiry-name-group', 'inquiry-name-error', 'Name is required.');
      else setOk('inquiry-name-group', 'inquiry-name-error');

      if (!email) ok = setErr('inquiry-email-group', 'inquiry-email-error', 'Email is required.');
      else if (!isValidEmail(email)) ok = setErr('inquiry-email-group', 'inquiry-email-error', 'Enter a valid email.');
      else setOk('inquiry-email-group', 'inquiry-email-error');

      if (!service) ok = setErr('inquiry-service-group', 'inquiry-service-error', 'Please select a service.');
      else setOk('inquiry-service-group', 'inquiry-service-error');

      if (!budget) ok = setErr('inquiry-budget-group', 'inquiry-budget-error', 'Please select a budget tier.');
      else setOk('inquiry-budget-group', 'inquiry-budget-error');

      if (!msg) ok = setErr('inquiry-msg-group', 'inquiry-msg-error', 'Please provide a project summary.');
      else setOk('inquiry-msg-group', 'inquiry-msg-error');

      if (!ok) return;

      setLoading('inquiry-submit', true);

      apiRequest('POST', '/inquiries', {
        name: name,
        email: email,
        service: service,
        budget: budget,
        message: msg
      }).then(function (data) {
        setLoading('inquiry-submit', false);
        if (data._ok) {
          showAlert('inquiry-success', data.message || 'Thank you, ' + name + '! Your inquiry has been received.');
          setTimeout(function () {
            closeModal(inquiryModal);
          }, 1600);
        } else {
          showAlert('inquiry-error', data.message || 'Something went wrong. Please try again.');
        }
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (loginModal && loginModal.style.display !== 'none') closeModal(loginModal);
    if (signupModal && signupModal.style.display !== 'none') closeModal(signupModal);
    if (inquiryModal && inquiryModal.style.display !== 'none') closeModal(inquiryModal);
  });

  if (userMenuTrigger) userMenuTrigger.addEventListener('click', function () {
    var open = userDropdown && userDropdown.classList.toggle('open');
    userMenuTrigger.setAttribute('aria-expanded', String(!!open));
  });
  document.addEventListener('click', function (e) {
    if (userMenuEl && !userMenuEl.contains(e.target)) {
      if (userDropdown) userDropdown.classList.remove('open');
      if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  function doLogout() {
    apiRequest('POST', '/auth/logout').then(function () {
      clearToken();
      renderAuthState();
      if (userDropdown) userDropdown.classList.remove('open');
    });
  }
  if (btnLogout) btnLogout.addEventListener('click', doLogout);
  if (mobileBtnLogout) mobileBtnLogout.addEventListener('click', function () { closeDrawer(); doLogout(); });

  function bindEye(eyeId, inputId) {
    var btn = document.getElementById(eyeId), inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', function () {
      var isPass = inp.type === 'password';
      inp.type = isPass ? 'text' : 'password';
      var s = btn.querySelector('.eye-show'), h = btn.querySelector('.eye-hide');
      if (s) s.style.display = isPass ? 'none' : 'block';
      if (h) h.style.display = isPass ? 'block' : 'none';
    });
  }
  bindEye('login-eye', 'login-password');
  bindEye('signup-eye', 'signup-password');
  bindEye('confirm-eye', 'signup-confirm');

  var passInput = document.getElementById('signup-password');
  if (passInput) passInput.addEventListener('input', function () {
    var v = this.value;
    var fill = document.getElementById('strength-fill'), lbl = document.getElementById('strength-label');
    if (!fill || !lbl) return;
    var s = 0;
    if (v.length >= 8) s++; if (/[A-Z]/.test(v)) s++; if (/[0-9]/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
    var lvls = [{ p: '0%', c: '', t: '' }, { p: '25%', c: '#EF4444', t: 'Weak' }, { p: '50%', c: '#F59E0B', t: 'Fair' }, { p: '75%', c: '#3B82F6', t: 'Good' }, { p: '100%', c: '#10B981', t: 'Strong' }];
    var lvl = v.length === 0 ? lvls[0] : lvls[s];
    fill.style.width = lvl.p; fill.style.backgroundColor = lvl.c; lbl.textContent = lvl.t; lbl.style.color = lvl.c;
  });

  function setErr(gId, eId, msg) { var g = document.getElementById(gId); if (g) { g.classList.add('error'); g.classList.remove('success'); } var el = document.getElementById(eId); if (el) el.textContent = msg; return false; }
  function setOk(gId, eId) { var g = document.getElementById(gId); if (g) { g.classList.remove('error'); g.classList.add('success'); } var el = document.getElementById(eId); if (el) el.textContent = ''; return true; }
  function showAlert(id, msg, show) { var el = document.getElementById(id); if (!el) return; el.textContent = msg; el.style.display = (show === false) ? 'none' : 'flex'; }
  function setLoading(id, on) { var btn = document.getElementById(id); if (!btn) return; btn.disabled = on; var t = btn.querySelector('.btn-text'), s = btn.querySelector('.btn-spinner'); if (t) t.style.display = on ? 'none' : 'inline'; if (s) s.style.display = on ? 'inline-flex' : 'none'; }

  /* ── Login Form → Backend API ── */
  var loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    showAlert('login-error', '', false); showAlert('login-success', '', false);
    var email = document.getElementById('login-email').value.trim();
    var pass = document.getElementById('login-password').value;
    var ok = true;
    if (!email) ok = setErr('login-email-group', 'login-email-error', 'Email is required.');
    else if (!isValidEmail(email)) ok = setErr('login-email-group', 'login-email-error', 'Enter a valid email address.');
    else setOk('login-email-group', 'login-email-error');
    if (!pass) ok = setErr('login-pass-group', 'login-pass-error', 'Password is required.');
    else setOk('login-pass-group', 'login-pass-error');
    if (!ok) return;
    setLoading('login-submit', true);

    apiRequest('POST', '/auth/login', { email: email, password: pass })
      .then(function (data) {
        setLoading('login-submit', false);
        if (data._ok) {
          saveToken(data.token);
          CURRENT_USER = data.user;
          showAlert('login-success', data.message || 'Welcome back! Logging you in...');
          setTimeout(function () { renderAuthState(); closeModal(loginModal); }, 900);
        } else {
          showAlert('login-error', data.message || 'Incorrect email or password. Please try again.');
          if (data.errors) {
            if (data.errors.email) setErr('login-email-group', 'login-email-error', data.errors.email);
            if (data.errors.password) setErr('login-pass-group', 'login-pass-error', data.errors.password);
          } else {
            setErr('login-email-group', 'login-email-error', ' ');
            setErr('login-pass-group', 'login-pass-error', ' ');
          }
        }
      });
  });

  /* ── Signup Form → Backend API ── */
  var signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    showAlert('signup-error', '', false); showAlert('signup-success', '', false);
    var fname = document.getElementById('signup-fname').value.trim();
    var lname = document.getElementById('signup-lname').value.trim();
    var email = document.getElementById('signup-email').value.trim();
    var pass = document.getElementById('signup-password').value;
    var cpass = document.getElementById('signup-confirm').value;
    var ok = true;
    if (!fname) ok = setErr('signup-fname-group', 'signup-fname-error', 'First name is required.'); else setOk('signup-fname-group', 'signup-fname-error');
    if (!lname) ok = setErr('signup-lname-group', 'signup-lname-error', 'Last name is required.'); else setOk('signup-lname-group', 'signup-lname-error');
    if (!email) ok = setErr('signup-email-group', 'signup-email-error', 'Email is required.');
    else if (!isValidEmail(email)) ok = setErr('signup-email-group', 'signup-email-error', 'Enter a valid email.');
    else setOk('signup-email-group', 'signup-email-error');
    if (!pass) ok = setErr('signup-pass-group', 'signup-pass-error', 'Password is required.');
    else if (pass.length < 8) ok = setErr('signup-pass-group', 'signup-pass-error', 'Minimum 8 characters.');
    else setOk('signup-pass-group', 'signup-pass-error');
    if (!cpass) ok = setErr('signup-cpass-group', 'signup-cpass-error', 'Please confirm your password.');
    else if (pass !== cpass) ok = setErr('signup-cpass-group', 'signup-cpass-error', 'Passwords do not match.');
    else setOk('signup-cpass-group', 'signup-cpass-error');
    if (!ok) return;
    setLoading('signup-submit', true);

    apiRequest('POST', '/auth/signup', {
      firstName: fname,
      lastName: lname,
      email: email,
      password: pass
    }).then(function (data) {
      setLoading('signup-submit', false);
      if (data._ok) {
        saveToken(data.token);
        CURRENT_USER = data.user;
        showAlert('signup-success', data.message || 'Account created! Welcome to Eternity, ' + fname + '!');
        setTimeout(function () { renderAuthState(); closeModal(signupModal); }, 1000);
      } else {
        showAlert('signup-error', data.message || 'Something went wrong. Please try again.');
        if (data.errors) {
          if (data.errors.firstName) setErr('signup-fname-group', 'signup-fname-error', data.errors.firstName);
          if (data.errors.lastName) setErr('signup-lname-group', 'signup-lname-error', data.errors.lastName);
          if (data.errors.email) setErr('signup-email-group', 'signup-email-error', data.errors.email);
          if (data.errors.password) setErr('signup-pass-group', 'signup-pass-error', data.errors.password);
        }
      }
    });
  });

  // Restore session from JWT on page load
  restoreSession();

  // Ensure hero video playback
  var heroVideo = document.querySelector('.prisma-hero__video');
  if (heroVideo) {
    heroVideo.play().catch(function () { });
  }

  // Lets Work Together interactive transition
  var letsWorkTrigger = document.getElementById('lets-work-trigger');
  var letsWorkWrap = document.getElementById('lets-work-wrap');
  if (letsWorkTrigger && letsWorkWrap) {
    letsWorkTrigger.addEventListener('click', function () {
      letsWorkWrap.classList.add('is-clicked');
    });
    letsWorkTrigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        letsWorkWrap.classList.add('is-clicked');
      }
    });
  }

  var letsWorkReset = document.getElementById('lets-work-reset');
  if (letsWorkReset && letsWorkWrap) {
    letsWorkReset.addEventListener('click', function () {
      letsWorkWrap.classList.remove('is-clicked');
    });
  }

  /* ============================================================
     HERO TUBES CURSOR ENGINE: Dynamic 3D Neon Luminescence Behind Text
     ============================================================ */
  (function initHeroTubes() {
    const canvas = document.getElementById('tubes-cursor-canvas');
    if (!canvas || canvas.__tubesApp) return;

    let app = null;

    const randomColors = (count) => {
      return new Array(count)
        .fill(0)
        .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
    };

    function start(TubesCursor) {
      if (!TubesCursor || !canvas || canvas.__tubesApp) return;
      try {
        app = TubesCursor(canvas, {
          tubes: {
            colors: ["#5e72e4", "#8965e0", "#f5365c"],
            lights: {
              intensity: 200,
              colors: ["#21d4fd", "#b721ff", "#f4d03f", "#11cdef"]
            }
          }
        });
        canvas.__tubesApp = app;

        // Elevate the 3D infinity symbol (lemniscate) moving flare just a bit in Three.js world space
        if (app && app.tubes && typeof app.tubes.update === 'function') {
          const origTubesUpdate = app.tubes.update.bind(app.tubes);
          app.tubes.update = function (e) {
            if (this.target) {
              // Just a bit upwards (+0.20 units) directly behind ETERNITY
              this.target.y += 0.20;
            }
            return origTubesUpdate(e);
          };
        }

        // Allow clicking on hero background to randomize neon colors
        const heroStage = document.querySelector('.hero-zoom-stage');
        if (heroStage) {
          heroStage.addEventListener('click', (e) => {
            if (e.target.closest('button, a, input, select, textarea, [role="button"]')) return;
            if (app && app.tubes) {
              const newTubeColors = randomColors(3);
              const newLightColors = randomColors(4);
              app.tubes.setColors(newTubeColors);
              app.tubes.setLightsColors(newLightColors);
            }
          });
        }
      } catch (err) {
        console.warn("TubesCursor 3D engine error:", err);
      }
    }

    if (window.TubesCursor) {
      setTimeout(() => start(window.TubesCursor), 50);
    } else {
      setTimeout(() => {
        if (window.TubesCursor) {
          start(window.TubesCursor);
        } else {
          import('https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js')
            .then((m) => start(m.default))
            .catch(() => { });
        }
      }, 50);
    }
  })();

  /* ============================================================
     HERO PARTICLES ENGINE: Animated White Moving Dots Behind Text
     ============================================================ */
  (function initHeroParticles() {
    const canvas = document.getElementById('gp-particles-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = window.devicePixelRatio || 1;
    let animId = null;
    let isVisible = true;
    let particles = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      initParticles();
    }

    function initParticles() {
      // Significantly more crowded: 600 to 1,500 ultra-fine micro-dots
      const count = Math.max(600, Math.min(1500, Math.round((width * height) / 750)));
      particles = [];

      for (let i = 0; i < count; i++) {
        const rSeed = Math.random();
        let radius;
        // Even smaller: majority are ultra-fine micro starry dust
        if (rSeed < 0.85) {
          radius = 0.35 + Math.random() * 0.45; // 0.35px to 0.80px
        } else if (rSeed < 0.96) {
          radius = 0.85 + Math.random() * 0.35; // 0.85px to 1.20px
        } else {
          radius = 1.25 + Math.random() * 0.30; // 1.25px to 1.55px max
        }

        // Slow, peaceful, ambient celestial drift
        const speed = 0.04 + Math.random() * 0.11;
        const angle = Math.random() * Math.PI * 2;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          wanderAngle: Math.random() * Math.PI * 2,
          baseAlpha: 0.25 + Math.random() * 0.7,
          alpha: 0.25 + Math.random() * 0.7,
          pulseSpeed: 0.004 + Math.random() * 0.012,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
    }

    function update() {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Subtle, gentle steering wander
        p.wanderAngle += (Math.random() - 0.5) * 0.06;
        p.vx += Math.cos(p.wanderAngle) * 0.004;
        p.vy += Math.sin(p.wanderAngle) * 0.004;

        // Capped at calm, gentle speed
        const currentSpeed = Math.hypot(p.vx, p.vy);
        const maxSpeed = 0.22;
        if (currentSpeed > maxSpeed) {
          p.vx = (p.vx / currentSpeed) * maxSpeed;
          p.vy = (p.vy / currentSpeed) * maxSpeed;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = width + 10;
        else if (p.x > width + 10) p.x = -10;

        if (p.y < -10) p.y = height + 10;
        else if (p.y > height + 10) p.y = -10;

        p.pulsePhase += p.pulseSpeed;
        p.alpha = Math.max(0.18, Math.min(0.95, p.baseAlpha + Math.sin(p.pulsePhase) * 0.2));
      }
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (p.radius > 1.3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.25})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.fill();
        }
      }
    }

    function loop() {
      if (!isVisible) return;
      update();
      render();
      animId = requestAnimationFrame(loop);
    }

    const heroSection = document.querySelector('.hero-zoom-track, #home, .gp-hero-section');
    if (heroSection && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          if (!isVisible) {
            isVisible = true;
            animId = requestAnimationFrame(loop);
          }
        } else {
          isVisible = false;
          if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        }
      }, { rootMargin: '100px' });
      observer.observe(heroSection);
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();
    animId = requestAnimationFrame(loop);
  })();

  /* ============================================================
     ETERNITY HERO SCROLL ZOOM ENGINE (INITIAL VECTOR CAMERA ENGINE)
     Zero blur, zero tilt. 100% sharp analytical vector scaling.
     ============================================================ */
  (function initEternityZoom() {
    const track = document.querySelector('.hero-zoom-track');
    const stage = document.querySelector('.hero-zoom-stage');
    const leftCol = document.getElementById('hero-left-stage');
    const slot = document.querySelector('.eternity-heading-slot');
    const art = document.getElementById('gp-art');
    const clip = document.getElementById('gp-clip-eternity');
    const glyph = document.getElementById('gp-glyph');
    const field = document.getElementById('gp-field');
    const header = document.querySelector('header');

    if (!track || !stage || !slot || !art || !clip || !glyph) return;

    const text = (glyph.textContent || 'ETERNITY').trim();
    const fontFamily = '"Plus Jakarta Sans", "Arial Black", -apple-system, sans-serif';
    const weight = 800;

    glyph.style.fontFamily = fontFamily;
    glyph.style.fontWeight = weight;
    glyph.style.fontSize = "100px";
    glyph.style.fontKerning = "none";
    glyph.style.fontVariantLigatures = "none";
    glyph.style.letterSpacing = "0";

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let ready = false;
    let W = 1, H = 1, startScale = 1, endScale = 10;
    let bounds = { x: 0, y: 0, width: 1, height: 1 };
    let center = { x: 0, y: 0 };
    let letters = [];
    let currentTargetLetter = null;
    let target = { x: 0, y: 0, radius: 14 };
    let startScreenX = 0, startScreenY = 0;
    let currentProgress = 0;
    let targetProgress = 0;
    let animId = null;

    function smooth(a, b, n) {
      const t = Math.max(0, Math.min(1, (n - a) / (b - a)));
      return t * t * (3 - 2 * t);
    }

    // Finds the largest inscribed circle of solid white ink inside a glyph
    function interior(ctx, char, font) {
      const c = ctx.canvas;
      ctx.font = font;
      const m = ctx.measureText(char);
      const pad = 8;
      const left = Math.ceil(m.actualBoundingBoxLeft || 0);
      const ascent = Math.ceil(m.actualBoundingBoxAscent || 75);
      c.width = Math.max(1, Math.ceil((m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || m.width)) + pad * 2);
      c.height = Math.max(1, Math.ceil((m.actualBoundingBoxAscent || 75) + (m.actualBoundingBoxDescent || 25)) + pad * 2);
      ctx.font = font;
      ctx.fontKerning = "none";
      ctx.fillText(char, pad + left, pad + ascent);
      const width = c.width;
      const height = c.height;
      let pixels;
      try {
        pixels = ctx.getImageData(0, 0, width, height).data;
      } catch (e) {
        return null;
      }
      const rows = new Uint16Array(width + 1);
      let size = 0, bx = 0, by = 0;
      for (let y = 0; y < height; y++) {
        let diagonal = 0;
        for (let x = 0; x < width; x++) {
          const above = rows[x + 1];
          rows[x + 1] = pixels[(y * width + x) * 4 + 3] > 245
            ? Math.min(above, rows[x], diagonal) + 1 : 0;
          diagonal = above;
          if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
        }
      }
      if (size < 3) return null;
      // Scanned at 3x size. Dividing by 3 yields exact coordinates at 100px SVG glyph size.
      return {
        x: (bx + 1 - size / 2 - pad - left) / 3,
        y: (by + 1 - size / 2 - pad - ascent) / 3,
        radius: (size / 2 - 1) / 3
      };
    }

    function readInk() {
      if (!context) return false;
      const scanFont = `${weight} 300px ${fontFamily}`;
      context.font = `${weight} 100px ${fontFamily}`;
      context.fontKerning = "none";
      const metrics = context.measureText(text);
      const advances = Array.from({ length: text.length }, (_, i) => context.measureText(text.slice(0, i)).width);

      const mLeft = typeof metrics.actualBoundingBoxLeft === 'number' ? metrics.actualBoundingBoxLeft : 0;
      const mRight = typeof metrics.actualBoundingBoxRight === 'number' ? metrics.actualBoundingBoxRight : metrics.width;
      const mAscent = typeof metrics.actualBoundingBoxAscent === 'number' ? metrics.actualBoundingBoxAscent : 75;
      const mDescent = typeof metrics.actualBoundingBoxDescent === 'number' ? metrics.actualBoundingBoxDescent : 0;

      bounds = {
        x: -mLeft,
        y: -mAscent,
        width: Math.max(10, mLeft + mRight),
        height: Math.max(10, mAscent + mDescent)
      };
      if (!bounds.width || !bounds.height || isNaN(bounds.width) || isNaN(bounds.height)) {
        bounds = { x: 0, y: -75, width: metrics.width || 600, height: 75 };
      }
      center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

      // Map every individual letter with its advance, width, and solid white ink interior target
      letters = [];
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const adv = advances[i];
        const nextAdv = i < text.length - 1 ? advances[i + 1] : bounds.width;
        const w = nextAdv - adv;
        const found = interior(context, char, scanFont);
        const inkPt = found ? {
          x: found.x + adv,
          y: found.y,
          radius: Math.max(8, found.radius)
        } : {
          x: adv + w / 2,
          y: bounds.y + bounds.height / 2,
          radius: 14
        };

        letters.push({
          index: i,
          char: char,
          advance: adv,
          width: w,
          ink: inkPt
        });
      }

      // Default target: letter 'R' (index 3) near optical center
      const defaultLetter = letters[3] || letters[0];
      currentTargetLetter = defaultLetter;
      target = defaultLetter.ink;

      return true;
    }

    function calibrate(forceReRead) {
      if (forceReRead) ready = false;
      const isDesktop = window.innerWidth >= 768;
      const headerH = header ? header.offsetHeight : 65;

      if (isDesktop) {
        stage.style.position = 'sticky';
        stage.style.top = 'var(--header-height, 52px)';
        stage.style.height = 'calc(100vh - var(--header-height, 52px))';
        stage.style.minHeight = '560px';
      } else {
        stage.style.position = 'relative';
        stage.style.top = '0px';
        stage.style.height = 'auto';
        stage.style.minHeight = 'calc(100vh - 52px)';
      }

      // Full stage dimensions (ETERNITY vector camera spans the full hero stage)
      const stageRect = stage.getBoundingClientRect();
      W = Math.max(1, stageRect.width || window.innerWidth);
      H = Math.max(1, stageRect.height || (window.innerHeight - (isDesktop ? headerH : 0)));

      art.setAttribute('viewBox', `0 0 ${W} ${H}`);
      art.setAttribute('width', String(W));
      art.setAttribute('height', String(H));

      if (!ready) ready = readInk();
      if (!ready) return;

      const slotRect = slot.getBoundingClientRect();
      const slotW = Math.max(200, slotRect.width || W * 0.85);
      const slotH = Math.max(60, slotRect.height || 100);

      // Sizing: scales to fit comfortably within the slot across the full width
      startScale = Math.min((slotW * 0.90) / bounds.width, (slotH * 0.90) / bounds.height);
      if (!startScale || isNaN(startScale) || startScale <= 0) {
        startScale = (W * 0.85) / bounds.width;
      }

      // Optical centering with upward offset to balance hero layout
      const yOffset = isDesktop ? 40 : 20;

      stage.style.setProperty('--hero-center-offset-y', `${yOffset}px`);
      stage.style.setProperty('--hero-flare-offset-y', `${yOffset + 28}px`);

      startScreenX = W * 0.50;
      startScreenY = (H * 0.50) - yOffset;

      // Distance from center to furthest corner; ensures the letter's solid white section completely fills the viewport
      const maxDist = Math.hypot(W, H);
      const inkRadius = (target && target.radius) ? target.radius : 14;
      endScale = Math.max(startScale * 35, (maxDist * 1.5) / (inkRadius * 1.35));
    }

    // Cursor tracking: Select the hovered letter, or nearest letter if not directly over one
    function updateHover(clientX, clientY) {
      if (currentProgress > 0.05 || letters.length === 0) return;
      if (typeof clientX !== 'number' || typeof clientY !== 'number') return;

      const stageRect = stage.getBoundingClientRect();
      const mouseX = clientX - stageRect.left;
      const mouseY = clientY - stageRect.top;

      let bestLetter = null;
      let bestDist = Infinity;

      for (let i = 0; i < letters.length; i++) {
        const letter = letters[i];
        const left = startScreenX + (letter.advance - center.x) * startScale;
        const right = startScreenX + (letter.advance + letter.width - center.x) * startScale;
        const top = startScreenY + (bounds.y - center.y) * startScale;
        const bottom = startScreenY + (bounds.y + bounds.height - center.y) * startScale;

        // Calculate distance from cursor to this letter's bounding box
        let dx = 0;
        if (mouseX < left) dx = left - mouseX;
        else if (mouseX > right) dx = mouseX - right;

        let dy = 0;
        if (mouseY < top) dy = top - mouseY;
        else if (mouseY > bottom) dy = mouseY - bottom;

        // If cursor is directly inside the letter bounding box, dist is 0 (exact hover hit!)
        const dist = Math.hypot(dx, dy);

        if (dist < bestDist) {
          bestDist = dist;
          bestLetter = letter;
        }
      }

      if (bestLetter && bestLetter !== currentTargetLetter) {
        currentTargetLetter = bestLetter;
        target = bestLetter.ink;
        const maxDist = Math.hypot(W, H);
        const inkRadius = (target && target.radius) ? target.radius : 14;
        endScale = Math.max(startScale * 35, (maxDist * 1.5) / (inkRadius * 1.35));
      }
    }

    function paint(progress) {
      if (!ready) calibrate();
      if (!ready) return;

      const p = Math.max(0, Math.min(1, progress));
      currentProgress = p;

      // Smoothly fade out surrounding UI (between p = 0.012 and p = 0.11)
      const fade = Math.max(0, Math.min(1, 1 - smooth(0.012, 0.11, p)));
      stage.style.setProperty('--hero-fade-opacity', fade.toFixed(4));

      if (fade <= 0.02) {
        if (leftCol) leftCol.style.pointerEvents = 'none';
      } else {
        if (leftCol) leftCol.style.pointerEvents = 'auto';
      }

      // Smooth exponential zoom curve (calibrated sweet spot)
      const t = Math.min(1, p / 0.62);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      // Pure optical vector exponential zoom
      const scale = Math.exp(Math.log(startScale) + Math.log(endScale / startScale) * eased);

      // Projective camera interpolation:
      // At scale = startScale (progress = 0): blend = 0 -> (cx, cy) = (center.x, center.y) [Word is 100% centered]
      // As scale -> endScale: blend -> 1 -> (cx, cy) -> (target.x, target.y) [Focus zooms directly into the solid white letter!]
      const blend = endScale === startScale ? 0 : (1 / scale - 1 / startScale) / (1 / endScale - 1 / startScale);
      const cx = center.x + ((target?.x ?? center.x) - center.x) * blend;
      const cy = center.y + ((target?.y ?? center.y) - center.y) * blend;

      const screenX = startScreenX;
      const screenY = startScreenY;

      const dx = screenX / scale;
      const dy = screenY / scale;

      // Zero tilt, 100% vector sharp scaling focused entirely on the white section of the letter
      clip.setAttribute('transform', `scale(${scale.toFixed(4)})`);
      glyph.setAttribute('transform', `translate(${(dx - cx).toFixed(4)} ${(dy - cy).toFixed(4)})`);

      if (field) {
        field.style.clipPath = t >= 1 ? 'none' : 'url(#gp-clip-eternity)';
        field.style.webkitClipPath = t >= 1 ? 'none' : 'url(#gp-clip-eternity)';
      }
    }

    function renderLoop() {
      const diff = targetProgress - currentProgress;
      if (Math.abs(diff) > 0.0001) {
        currentProgress += diff * 0.20;
        paint(currentProgress);
        animId = requestAnimationFrame(renderLoop);
      } else {
        currentProgress = targetProgress;
        paint(currentProgress);
        animId = null;
      }
    }

    function syncProgress(immediate) {
      const isDesktop = window.innerWidth >= 768;
      if (isDesktop) {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const travel = track.offsetHeight - window.innerHeight;
        if (travel > 0) {
          targetProgress = Math.max(0, Math.min(1, scrollY / travel));
        } else {
          targetProgress = 0;
        }
      } else {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        targetProgress = Math.max(0, Math.min(1, scrollY / 275));
      }

      if (immediate) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
        currentProgress = targetProgress;
        paint(currentProgress);
      } else {
        if (!animId) {
          animId = requestAnimationFrame(renderLoop);
        }
      }
    }

    function onScroll() {
      syncProgress(false);
    }

    function onResize() {
      calibrate();
      syncProgress(true);
    }

    window.addEventListener('mousemove', (e) => {
      updateHover(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        updateHover(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        updateHover(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        calibrate(true);
        syncProgress(true);
      });
    }

    calibrate();
    syncProgress(true);
  })();

})();

/* ============================================================
   INQUIRY / CONTACT NAVIGATION (ETERNITY)
   ============================================================ */
window.openAuthModal = function () {
  const contact = document.getElementById('contact');
  if (contact) {
    contact.scrollIntoView({ behavior: 'smooth' });
  }
};

window.closeAuthModal = function () {};
window.switchTab = function () {};

/* ============================================================
   TESTIMONIAL DETAIL POPUP MODAL (BLACK COMPONENT)
   ============================================================ */
window.openTestimonialModal = function (card) {
  if (!card) return;
  const modal = document.getElementById('testimonial-modal');
  if (!modal) return;

  const imgEl = card.querySelector('.testimonial-avatar img');
  const fallbackEl = card.querySelector('.testimonial-avatar__fallback');
  const nameEl = card.querySelector('.testimonial-name');
  const usernameEl = card.querySelector('.testimonial-username');
  const quoteEl = card.querySelector('.testimonial-body');

  const avatarSrc = imgEl ? (imgEl.getAttribute('src') || '') : '';
  const avatarAlt = imgEl ? (imgEl.getAttribute('alt') || 'Client') : 'Client';
  const fallbackText = fallbackEl ? fallbackEl.textContent.trim() : (avatarAlt ? avatarAlt.slice(0, 2).toUpperCase() : 'EC');

  let authorName = '';
  let countryText = '';
  if (nameEl) {
    const countrySpan = nameEl.querySelector('.testimonial-country');
    if (countrySpan) {
      countryText = countrySpan.textContent.trim();
      const clone = nameEl.cloneNode(true);
      const spanClone = clone.querySelector('.testimonial-country');
      if (spanClone) spanClone.remove();
      authorName = clone.textContent.trim();
    } else {
      authorName = nameEl.textContent.trim();
    }
  }

  const username = usernameEl ? usernameEl.textContent.trim() : 'Verified Client';
  const quote = quoteEl ? quoteEl.textContent.trim() : '';

  // Update modal elements
  const modalAvatar = document.getElementById('tm-modal-avatar');
  const modalFallback = document.getElementById('tm-modal-fallback');
  const modalName = document.getElementById('tm-modal-name');
  const modalCountry = document.getElementById('tm-modal-country');
  const modalHandle = document.getElementById('tm-modal-handle');
  const modalQuote = document.getElementById('tm-modal-quote');

  if (modalName) modalName.textContent = authorName;
  if (modalCountry) {
    if (countryText) {
      modalCountry.textContent = countryText;
      modalCountry.style.display = 'inline-block';
    } else {
      modalCountry.style.display = 'none';
    }
  }
  if (modalHandle) modalHandle.textContent = username;
  if (modalQuote) modalQuote.textContent = quote ? `“${quote}”` : '';

  if (modalAvatar && modalFallback) {
    if (avatarSrc) {
      modalAvatar.src = avatarSrc;
      modalAvatar.alt = authorName;
      modalAvatar.style.display = 'block';
      modalFallback.style.display = 'none';
    } else {
      modalAvatar.style.display = 'none';
      modalFallback.textContent = fallbackText || 'EC';
      modalFallback.style.display = 'flex';
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => {
    modal.classList.add('is-open');
  });
  document.body.style.overflow = 'hidden';
};

window.closeTestimonialModal = function () {
  const modal = document.getElementById('testimonial-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }, 200);
};

// Global click & keyboard delegation for testimonial cards
document.addEventListener('click', function (e) {
  const card = e.target.closest('.testimonial-card');
  if (card && !card.closest('#testimonial-modal')) {
    e.preventDefault();
    window.openTestimonialModal(card);
  }
});

// Setup accessibility attributes (tabindex, roles) for testimonial cards
function initTestimonialCardsA11y() {
  const cards = document.querySelectorAll('.testimonials-section .testimonial-card');
  cards.forEach(card => {
    if (!card.hasAttribute('tabindex')) {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('aria-label', 'Open full testimonial review');
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTestimonialCardsA11y);
} else {
  initTestimonialCardsA11y();
}

// Close modals on Escape key & keyboard support for cards
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    window.closeAuthModal();
    if (typeof window.closeTestimonialModal === 'function') {
      window.closeTestimonialModal();
    }
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('testimonial-card')) {
    e.preventDefault();
    window.openTestimonialModal(e.target);
  }
});

window.toggleMobileNav = function () {
  const menu = document.getElementById('mobile-nav-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
};

// Master Platform Circuit & Interaction Engine
(function () {
  /* ============================================================
     PIXEL-PERFECT DYNAMIC CIRCUIT NETWORK ENGINE
     Computes exact border-to-border orthogonal routing,
     solder junction pads, and normalized traveling laser beams.
     ============================================================ */
  function initMasterPlatformCircuit() {
    const container = document.querySelector('.master-platform__visual');
    const svg = document.getElementById('master-platform-svg');
    if (!container || !svg) return;

    const hub = container.querySelector('.integration-card__hub');
    if (!hub) return;

    function renderCircuit() {
      const cRect = container.getBoundingClientRect();
      const width = cRect.width;
      const height = cRect.height;
      if (width <= 0 || height <= 0) return;

      // 1:1 SVG coordinate space matching live container pixels
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('width', width);
      svg.setAttribute('height', height);

      function getBounds(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const left = r.left - cRect.left;
        const top = r.top - cRect.top;
        return {
          left: left,
          right: left + r.width,
          top: top,
          bottom: top + r.height,
          width: r.width,
          height: r.height,
          cx: left + r.width / 2,
          cy: top + r.height / 2
        };
      }

      const hubB = getBounds(hub);
      if (!hubB) return;

      const nodeElements = container.querySelectorAll('.integration-card__node');
      const nodes = {};
      nodeElements.forEach(el => {
        const k = el.dataset.node;
        if (k) nodes[k] = getBounds(el);
      });

      const connections = [
        // 9 Core Trunks from Eternity Hub
        { from: 'hub', to: 'react', type: 'h-straight', service: 'web' },
        { from: 'hub', to: 'nodejs', type: 'h-straight', service: 'fullstack' },
        { from: 'hub', to: 'nextjs', type: 'h-step', offY: -14, service: 'web' },
        { from: 'hub', to: 'react-native', type: 'h-step', offY: 14, service: 'mobile' },
        { from: 'hub', to: 'figma', type: 'h-step', offY: -14, service: 'web' },
        { from: 'hub', to: 'supabase', type: 'h-step', offY: 14, service: 'fullstack' },
        { from: 'hub', to: 'cloudflare', type: 'v-step', offX: -20, service: 'deployment' },
        { from: 'hub', to: 'openai', type: 'v-step', offX: 20, service: 'fullstack' },
        { from: 'hub', to: 'firebase', type: 'v-straight', service: 'deployment' },

        // 16 Symmetrical Branches from Primary Nodes
        { from: 'nextjs', to: 'typescript', type: 'h-step', service: 'web' },
        { from: 'nextjs', to: 'tailwind', type: 'h-step', service: 'web' },
        { from: 'react', to: 'tanstack', type: 'h-step', service: 'web' },
        { from: 'react', to: 'threejs', type: 'h-step', service: 'web' },
        { from: 'react-native', to: 'expo', type: 'h-step', service: 'mobile' },
        { from: 'react-native', to: 'native-sdk', type: 'h-step', service: 'mobile' },
        { from: 'figma', to: 'storybook', type: 'h-step', service: 'web' },
        { from: 'figma', to: 'vite', type: 'h-step', service: 'web' },
        { from: 'nodejs', to: 'docker', type: 'h-step', service: 'fullstack' },
        { from: 'nodejs', to: 'redis', type: 'h-step', service: 'fullstack' },
        { from: 'supabase', to: 'postgres', type: 'h-step', service: 'fullstack' },
        { from: 'supabase', to: 'prisma', type: 'h-step', service: 'fullstack' },
        { from: 'cloudflare', to: 'github-actions', type: 'h-step', service: 'deployment' },
        { from: 'openai', to: 'python', type: 'h-step', service: 'fullstack' },
        { from: 'firebase', to: 'aws', type: 'h-step', service: 'deployment' },
        { from: 'firebase', to: 'graphql', type: 'h-step', service: 'deployment' }
      ];

      let baseTracesHtml = '';
      let beamPathsHtml = '';
      let junctionsHtml = '';

      connections.forEach((conn, index) => {
        const fromB = conn.from === 'hub' ? hubB : nodes[conn.from];
        const toB = nodes[conn.to];
        if (!fromB || !toB) return;

        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        let d = '';

        if (conn.type === 'h-straight') {
          if (toB.cx > fromB.cx) {
            x1 = fromB.right;
            y1 = fromB.cy;
            x2 = toB.left;
            y2 = toB.cy;
          } else {
            x1 = fromB.left;
            y1 = fromB.cy;
            x2 = toB.right;
            y2 = toB.cy;
          }
          d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        } else if (conn.type === 'v-straight') {
          x1 = fromB.cx;
          y1 = fromB.bottom;
          x2 = toB.cx;
          y2 = toB.top;
          d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        } else if (conn.type === 'h-step') {
          if (toB.cx > fromB.cx) {
            x1 = fromB.right;
            y1 = fromB.cy + (conn.offY || 0);
            x2 = toB.left;
            y2 = toB.cy;
          } else {
            x1 = fromB.left;
            y1 = fromB.cy + (conn.offY || 0);
            x2 = toB.right;
            y2 = toB.cy;
          }
          const dx = x2 - x1;
          const dy = y2 - y1;
          if (Math.abs(dy) < 2) {
            d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
          } else {
            const midX = x1 + dx * 0.5;
            const r = Math.min(10, Math.abs(dx) * 0.4, Math.abs(dy) * 0.4);
            const signX = dx > 0 ? 1 : -1;
            const signY = dy > 0 ? 1 : -1;
            d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} H ${(midX - signX * r).toFixed(1)} Q ${midX.toFixed(1)} ${y1.toFixed(1)} ${midX.toFixed(1)} ${(y1 + signY * r).toFixed(1)} V ${(y2 - signY * r).toFixed(1)} Q ${midX.toFixed(1)} ${y2.toFixed(1)} ${(midX + signX * r).toFixed(1)} ${y2.toFixed(1)} H ${x2.toFixed(1)}`;
          }
        } else if (conn.type === 'v-step') {
          x1 = fromB.cx + (conn.offX || 0);
          y1 = fromB.top;
          x2 = toB.cx;
          y2 = toB.bottom;
          const dx = x2 - x1;
          const dy = y2 - y1;
          if (Math.abs(dx) < 2) {
            d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
          } else {
            const midY = y1 + dy * 0.5;
            const r = Math.min(10, Math.abs(dx) * 0.4, Math.abs(dy) * 0.4);
            const signX = dx > 0 ? 1 : -1;
            const signY = dy > 0 ? 1 : -1;
            d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} V ${(midY - signY * r).toFixed(1)} Q ${x1.toFixed(1)} ${midY.toFixed(1)} ${(x1 + signX * r).toFixed(1)} ${midY.toFixed(1)} H ${(x2 - signX * r).toFixed(1)} Q ${x2.toFixed(1)} ${midY.toFixed(1)} ${x2.toFixed(1)} ${(midY + signY * r).toFixed(1)} V ${y2.toFixed(1)}`;
          }
        }

        const delayClass = `beam-delay-${index % 24}`;

        baseTracesHtml += `<path class="beam-base-line" data-service="${conn.service}" d="${d}" />`;
        beamPathsHtml += `<path class="animated-path-beam ${delayClass}" data-service="${conn.service}" pathLength="100" d="${d}" />`;
        if (conn.from === 'hub') {
          junctionsHtml += `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2.5" class="circuit-junction" />`;
        }
      });

      svg.innerHTML = `
        <g class="circuit-base-group">${baseTracesHtml}</g>
        <g class="circuit-beams-group">${beamPathsHtml}</g>
        <g class="circuit-junctions-group">${junctionsHtml}</g>
      `;
    }

    renderCircuit();

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        window.requestAnimationFrame(renderCircuit);
      });
      ro.observe(container);
    } else {
      window.addEventListener('resize', renderCircuit);
    }
  }

  /* ============================================================
     INTERACTIVE LINKING: 60% VISUAL BRANCHING <-> 30% RIGHT SERVICES
     (Hovering cards highlights canvas nodes; hovering nodes highlights cards)
     ============================================================ */
  function initMasterPlatformInteraction() {
    const sideContainer = document.getElementById('master-services-side') ||
      document.querySelector('.master-platform__services-side') ||
      document.getElementById('master-services-bottom');
    const cards = document.querySelectorAll('.master-service-side-card, .master-service-card');
    const techNodes = document.querySelectorAll('.integration-card__node');
    const svg = document.getElementById('master-platform-svg');

    const serviceToNodes = {
      'web': ['nextjs', 'react', 'typescript', 'tailwind', 'tanstack', 'threejs', 'figma', 'storybook', 'vite', 'cloudflare'],
      'mobile': ['react-native', 'expo', 'native-sdk', 'firebase'],
      'fullstack': ['nodejs', 'docker', 'redis', 'supabase', 'postgres', 'prisma', 'graphql', 'openai', 'python'],
      'deployment': ['firebase', 'aws', 'cloudflare', 'github-actions', 'docker']
    };

    const nodeToService = {
      'nextjs': 'web',
      'react': 'web',
      'typescript': 'web',
      'tailwind': 'web',
      'tanstack': 'web',
      'threejs': 'web',
      'figma': 'web',
      'storybook': 'web',
      'vite': 'web',
      'react-native': 'mobile',
      'expo': 'mobile',
      'native-sdk': 'mobile',
      'nodejs': 'fullstack',
      'docker': 'fullstack',
      'redis': 'fullstack',
      'supabase': 'fullstack',
      'postgres': 'fullstack',
      'prisma': 'fullstack',
      'graphql': 'fullstack',
      'openai': 'fullstack',
      'python': 'fullstack',
      'firebase': 'deployment',
      'aws': 'deployment',
      'cloudflare': 'deployment',
      'github-actions': 'deployment'
    };

    let nodeHoverTimer = null;

    function highlightService(serviceKey, expandCard = true) {
      if (!serviceKey) return;

      if (expandCard) {
        cards.forEach(card => {
          const isMatch = card.dataset.service === serviceKey;
          card.classList.toggle('is-expanded', isMatch);
          card.setAttribute('aria-expanded', isMatch ? 'true' : 'false');
        });
      }

      cards.forEach(card => {
        card.classList.toggle('is-active', card.dataset.service === serviceKey);
      });

      const relatedNodes = serviceToNodes[serviceKey] || [];
      techNodes.forEach(node => {
        if (relatedNodes.includes(node.dataset.node)) {
          node.classList.add('is-active');
        } else {
          node.classList.remove('is-active');
        }
      });

      if (svg) {
        svg.querySelectorAll('.beam-base-line, .animated-path-beam').forEach(path => {
          if (path.dataset.service === serviceKey) {
            path.classList.add('is-active');
          } else {
            path.classList.remove('is-active');
          }
        });
      }
    }

    // ============================================================
    // AUTO-SHIFTING SYSTEM ("Keep them shifting on their own")
    // Automatically cycles through the 4 services continuously.
    // Pauses while user hovers or interacts, then resumes smoothly.
    // ============================================================
    const serviceKeys = ['web', 'mobile', 'fullstack', 'deployment'];
    let currentShiftIndex = 0;
    let autoShiftTimer = null;
    let isUserInteracting = false;
    let resumeTimeout = null;

    function activateServiceByIndex(index) {
      if (!serviceKeys.length) return;
      currentShiftIndex = ((index % serviceKeys.length) + serviceKeys.length) % serviceKeys.length;
      highlightService(serviceKeys[currentShiftIndex], true);
    }

    function stepAutoShift() {
      if (isUserInteracting) return;
      currentShiftIndex = (currentShiftIndex + 1) % serviceKeys.length;
      activateServiceByIndex(currentShiftIndex);
    }

    function startAutoShift() {
      stopAutoShift();
      autoShiftTimer = setInterval(stepAutoShift, 3600);
    }

    function stopAutoShift() {
      if (autoShiftTimer) {
        clearInterval(autoShiftTimer);
        autoShiftTimer = null;
      }
    }

    function pauseTemporarily() {
      isUserInteracting = true;
      if (resumeTimeout) clearTimeout(resumeTimeout);
    }

    function resumeSoon() {
      if (resumeTimeout) clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        isUserInteracting = false;
        const activeExpanded = document.querySelector('.master-service-side-card.is-expanded, .master-service-card.is-expanded');
        if (activeExpanded && activeExpanded.dataset.service) {
          const idx = serviceKeys.indexOf(activeExpanded.dataset.service);
          if (idx !== -1) currentShiftIndex = idx;
        }
      }, 2400);
    }

    // Card interactions
    cards.forEach(card => {
      const serviceKey = card.dataset.service;

      card.addEventListener('mouseenter', () => {
        pauseTemporarily();
        const idx = serviceKeys.indexOf(serviceKey);
        if (idx !== -1) currentShiftIndex = idx;
        highlightService(serviceKey, true);
      });

      card.addEventListener('click', () => {
        pauseTemporarily();
        const idx = serviceKeys.indexOf(serviceKey);
        if (idx !== -1) currentShiftIndex = idx;
        highlightService(serviceKey, true);
        resumeSoon();
      });

      card.addEventListener('focus', () => {
        pauseTemporarily();
        const idx = serviceKeys.indexOf(serviceKey);
        if (idx !== -1) currentShiftIndex = idx;
        highlightService(serviceKey, true);
      });

      card.addEventListener('blur', () => {
        resumeSoon();
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pauseTemporarily();
          const idx = serviceKeys.indexOf(serviceKey);
          if (idx !== -1) currentShiftIndex = idx;
          highlightService(serviceKey, true);
          resumeSoon();
        }
      });
    });

    if (sideContainer) {
      sideContainer.addEventListener('mouseenter', pauseTemporarily);
      sideContainer.addEventListener('mouseleave', resumeSoon);
    }

    // Hovering circuit nodes on the visual canvas highlights matching card & syncs auto-shift
    techNodes.forEach(node => {
      const nodeKey = node.dataset.node;
      node.addEventListener('mouseenter', () => {
        pauseTemporarily();
        if (nodeHoverTimer) clearTimeout(nodeHoverTimer);
        const relatedService = nodeToService[nodeKey];
        if (relatedService) {
          const idx = serviceKeys.indexOf(relatedService);
          if (idx !== -1) currentShiftIndex = idx;
          highlightService(relatedService, true);
        }
      });

      node.addEventListener('mouseleave', () => {
        resumeSoon();
      });
    });

    // Pause when document tab is hidden, resume when visible
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoShift();
      } else {
        startAutoShift();
      }
    });

    // Initialize with first card highlighted and start auto-shifting immediately
    activateServiceByIndex(0);
    startAutoShift();
  }

  // Initialize both circuit rendering and hover interaction
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMasterPlatformCircuit();
      initMasterPlatformInteraction();
    });
  } else {
    initMasterPlatformCircuit();
    initMasterPlatformInteraction();
  }
})();

/* ============================================================
   MINIMAL PROCESS TIMELINE MODULE
   ============================================================ */
(function initMinimalProcessTimeline() {
  function setup() {
    const cols = document.querySelectorAll('.process-col');
    if (!cols.length) return;

    let currentStep = 1;
    let timer = null;
    let isPaused = false;

    function setActiveStep(stepNum) {
      currentStep = stepNum;
      cols.forEach(col => {
        const s = parseInt(col.dataset.step, 10);
        if (s === stepNum) {
          col.classList.add('is-active');
        } else {
          col.classList.remove('is-active');
        }
      });
    }

    function startCycle() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        if (!isPaused) {
          currentStep = currentStep >= cols.length ? 1 : currentStep + 1;
          setActiveStep(currentStep);
        }
      }, 4000);
    }

    cols.forEach(col => {
      const s = parseInt(col.dataset.step, 10);
      col.addEventListener('mouseenter', () => {
        isPaused = true;
        setActiveStep(s);
      });
      col.addEventListener('mouseleave', () => {
        isPaused = false;
      });
      col.addEventListener('click', () => {
        setActiveStep(s);
      });
    });

    setActiveStep(1);
    startCycle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* ============================================================
   STICKY CONTACT BUTTON SCROLL ACTION & DYNAMIC VISIBILITY
   ============================================================ */
(function initStickyContactButton() {
  function setupStickyBtn() {
    const widget = document.getElementById('fixed-contact-widget') || document.querySelector('.fixed-contact-widget');
    const btn = document.getElementById('sticky-contact-btn') || document.querySelector('.gleam-edge-contact');
    const contactSec = document.getElementById('contact') || document.querySelector('.lets-work-section');

    if (!widget) return;

    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (contactSec) {
          contactSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    let ticking = false;
    function updateVisibility() {
      // 1. Check if user has started scrolling down from the top
      const scrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || document.body.scrollTop || 0;
      const hasStartedScrolling = scrollY > 40;

      // 2. Check if user is on the Let's Work Together section
      let onContact = false;
      if (contactSec) {
        const contactRect = contactSec.getBoundingClientRect();
        // Disappear when the Let's Work Together section enters the screen
        onContact = contactRect.top <= (window.innerHeight - 80);
      }

      // Appears when scrolling starts, disappears when on the Let's Work Together section
      if (hasStartedScrolling && !onContact) {
        widget.classList.add('is-visible');
      } else {
        widget.classList.remove('is-visible');
      }

      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', onScroll, { passive: true });

    // Initial check on load
    updateVisibility();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStickyBtn);
  } else {
    setupStickyBtn();
  }
})();

/* ============================================================
   3D CLIENT AVATAR SPHERE (Fibonacci Distribution & Momentum)
   ============================================================ */
(function initSphereImageGrid() {
  function setup() {
    const container = document.getElementById('sphere-image-grid-root');
    if (!container) return;

    // Client images from testimonial portfolio & high-quality mirror assets
    const images = [
      { src: "https://cdn.21st.dev/assets/mirror/55/55cf6231499bcdc496f15ff1d28d4170ac9b99e9279495caa44fca70886d8b2e.jpg", alt: "Ava Green" },
      { src: "https://cdn.21st.dev/assets/mirror/f0/f07b84f12ef125cbb837a7bd64da401992f5f62bd55fee10d01cd3dcc8abae80.jpg", alt: "Ana Miller" },
      { src: "https://cdn.21st.dev/assets/mirror/7c/7c0d2aa99715b15c218385f5679347782843c02f939d8eee6f9cb1cad6ba6ed0.jpg", alt: "Mateo Rossi" },
      { src: "https://cdn.21st.dev/assets/mirror/f8/f8f2ddc445b6b2318430260bdebb665c9415865827230565aa42f57c9c794baf.jpg", alt: "Maya Patel" },
      { src: "https://cdn.21st.dev/assets/mirror/ae/ae1d49872fdd6f8d9aa933f6ca8bce8cb1ba7e87dfb9d2926661184cb7bfe26d.jpg", alt: "Noah Smith" },
      { src: "https://cdn.21st.dev/assets/mirror/9a/9aac54d62e727561f6958213b8a3649230a3bba61ba5ddf63c69d3c6e4aecb0a.jpg", alt: "Lucas Stone" },
      { src: "https://cdn.21st.dev/assets/mirror/e5/e55f3cdab57eb4084f7006cfe9f7f047e638e1b257a53498aaed14b83087152a.jpg", alt: "Haruto Sato" },
      { src: "https://cdn.21st.dev/assets/mirror/03/03410c155320ba33ecb8d798807c6c9610f33b2b2acdd4ed961a68185806df79.jpg", alt: "Emma Lee" },
      { src: "https://cdn.21st.dev/assets/mirror/b5/b58616f0d669595c9a42d60a0b9803364c9859f1c3db93a5e3dc408b603e03e8.jpg", alt: "Carlos Ray" },
      { src: "https://cdn.21st.dev/assets/mirror/0d/0d2e0b21e20ae2110e094d1c518513cb1ed1132a7cc4198130561cebb91aef07.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/45/45f94f8dc98cea6ae0070f89d21468db7cf9dd3ff64ded6b1fa0c388b000d068.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/cc/ccb0e1d128f6768a0d7888018876c98a78acf8c553834b052087982c70612990.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/89/89d2ce071dd63080e77f88174b076d68fcbfdfcfa0e3840d46c28af1dce25572.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/0e/0e39abe2e9269683a3c150dffd47937391ac95c0d219c9c541788ecb00f97b86.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/3f/3f29fec6546170bbba208f21925448b3e0c4f8e0e10517afd35286c46694a556.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/a7/a7331b043fd8c158732f1eaafdfa0cdf9711255a46a3470002138d9d83c2fcc2.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/ce/cea6e287008d0c7cdffc2a93070ad99a3ca9cef2d26fa179727715b6d2f87f54.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/f0/f014d32aa5b2f6d54a82fc49509c88445081cb6a4d33fbfd9837dab3d00cbe02.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/72/727c9683874de466ed4c8be5195541ec7100605d440e80ebee23c16c8aaac169.jpg", alt: "Client Partner" },
      { src: "https://cdn.21st.dev/assets/mirror/4e/4e093402d1e552f61e11b7d4d0ba96ce452aa4f9b1e47f78e679dbd05b54db95.jpg", alt: "Client Partner" }
    ];

    const count = images.length;
    let width = container.clientWidth || 150;
    let height = container.clientHeight || 150;
    let radius = width * 0.42;
    const baseNodeSize = width * 0.18;

    // Fibonacci sphere points
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const angleIncrement = 2 * Math.PI / goldenRatio;
    const spherePoints = [];

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = angleIncrement * i;
      spherePoints.push({
        theta: azimuth,
        phi: inclination
      });
    }

    // Populate DOM nodes
    container.innerHTML = '';
    const domNodes = images.map((img, i) => {
      const el = document.createElement('div');
      el.className = 'sphere-image-node';
      el.style.width = `${baseNodeSize}px`;
      el.style.height = `${baseNodeSize}px`;
      el.innerHTML = `
        <div class="node-avatar-inner">
          <img src="${img.src}" alt="${img.alt}" loading="lazy" />
        </div>
      `;
      el.addEventListener('click', () => {
        const cards = document.querySelectorAll('.testimonials-section .testimonial-card');
        if (cards && cards.length > 0) {
          const targetCard = cards[i % cards.length];
          if (typeof window.openTestimonialModal === 'function') {
            window.openTestimonialModal(targetCard);
          }
        }
      });
      container.appendChild(el);
      return el;
    });

    let rotX = 15;
    let rotY = 15;
    let velX = 0;
    let velY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    const dragSensitivity = 0.6;
    const momentumDecay = 0.95;
    const autoRotateSpeed = 0.35;

    function render() {
      const cx = width / 2;
      const cy = height / 2;
      const rotXRad = rotX * (Math.PI / 180);
      const rotYRad = rotY * (Math.PI / 180);

      const cosY = Math.cos(rotYRad);
      const sinY = Math.sin(rotYRad);
      const cosX = Math.cos(rotXRad);
      const sinX = Math.sin(rotXRad);

      for (let i = 0; i < count; i++) {
        const pt = spherePoints[i];
        const sinPhi = Math.sin(pt.phi);
        const cosPhi = Math.cos(pt.phi);
        const cosTheta = Math.cos(pt.theta);
        const sinTheta = Math.sin(pt.theta);

        // Initial 3D Cartesian coords on sphere
        let x = radius * sinPhi * cosTheta;
        let y = radius * cosPhi;
        let z = radius * sinPhi * sinTheta;

        // Rotate Y (horizontal drag / auto-spin)
        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        x = x1;
        z = z1;

        // Rotate X (vertical drag)
        const y2 = y * cosX - z * sinX;
        const z2 = y * sinX + z * cosX;
        y = y2;
        z = z2;

        const isVisible = z > -radius * 0.7;
        const nodeEl = domNodes[i];

        if (!isVisible) {
          nodeEl.style.opacity = '0';
          nodeEl.style.pointerEvents = 'none';
          continue;
        }

        // Scale and opacity according to depth
        const depthRatio = (z + radius) / (2 * radius);
        const scale = 0.55 + depthRatio * 0.65;
        const opacity = Math.min(1, Math.max(0.2, 0.4 + depthRatio * 0.7));
        const zIndex = Math.round(1000 + z);

        // GPU-accelerated translate3d + scale without DOM reflow
        nodeEl.style.transform = `translate3d(${cx + x - baseNodeSize / 2}px, ${cy + y - baseNodeSize / 2}px, 0) scale(${scale})`;
        nodeEl.style.opacity = opacity;
        nodeEl.style.pointerEvents = 'auto';
        nodeEl.style.zIndex = zIndex;
      }
    }

    let animId = null;
    let lastTime = performance.now();
    function update(currentTime) {
      const now = currentTime || performance.now();
      const delta = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;
      const dt = delta / 16.667;

      if (!isDragging) {
        velX *= Math.pow(momentumDecay, dt);
        velY *= Math.pow(momentumDecay, dt);
        rotY += (autoRotateSpeed + velY) * dt;
        rotX += velX * dt;
      }

      render();
      animId = requestAnimationFrame(update);
    }

    function onMouseDown(e) {
      isDragging = true;
      velX = 0;
      velY = 0;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }

    function onMouseMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;

      velX = -dy * dragSensitivity * 0.4;
      velY = dx * dragSensitivity * 0.4;

      rotX += velX;
      rotY += velY;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }

    function onMouseUp() {
      isDragging = false;
    }

    function onTouchStart(e) {
      if (e.touches.length === 1) {
        isDragging = true;
        velX = 0;
        velY = 0;
        lastMouseX = e.touches[0].clientX;
        lastMouseY = e.touches[0].clientY;
      }
    }

    function onTouchMove(e) {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouseX;
      const dy = e.touches[0].clientY - lastMouseY;

      velX = -dy * dragSensitivity * 0.4;
      velY = dx * dragSensitivity * 0.4;

      rotX += velX;
      rotY += velY;

      lastMouseX = e.touches[0].clientX;
      lastMouseY = e.touches[0].clientY;
    }

    function onTouchEnd() {
      isDragging = false;
    }

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    window.addEventListener('resize', () => {
      width = container.clientWidth || 150;
      height = container.clientHeight || 150;
      radius = width * 0.42;
      const newSize = width * 0.18;
      domNodes.forEach(el => {
        el.style.width = `${newSize}px`;
        el.style.height = `${newSize}px`;
      });
    });

    animId = requestAnimationFrame(update);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();



