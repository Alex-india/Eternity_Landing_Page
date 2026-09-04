/* ============================================================
   ETERNITY â€” script.js
   Handles: sticky navbar, mobile drawer, scroll animations
   ============================================================ */

(function () {
  'use strict';

  /* â”€â”€ Theme Toggle â”€â”€ */
  const html         = document.documentElement;
  const themeToggle  = document.getElementById('theme-toggle');

  // Detect initial theme: saved preference â†’ system preference â†’ dark default
  function getInitialTheme() {
    const saved = localStorage.getItem('eternity-theme');
    if (saved) return saved;
    // Respect OS preference on first visit
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
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

  // Listen for OS preference changes
  window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', e => {
    // Only auto-switch if user hasn't manually picked a theme
    if (!localStorage.getItem('eternity-theme')) {
      applyTheme(e.matches ? 'light' : 'dark');
    }
  });


  const navbar       = document.getElementById('navbar');
  const hamburger    = document.getElementById('hamburger');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const drawerPanel  = document.getElementById('drawer-panel');
  const drawerClose  = document.getElementById('drawer-close');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const mobileLinks  = document.querySelectorAll('.mobile-nav-link, .mobile-drawer__cta');
  const navLinks     = document.querySelectorAll('.nav-link');
  const sections     = document.querySelectorAll('section[id]');

  /* â”€â”€ Navbar Scroll Effect â”€â”€ */
  let lastScrollY = 0;

  function onScroll() {
    const scrollY = window.scrollY;

    // Add "scrolled" class after 40px
    if (scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Highlight active nav link
    updateActiveLink(scrollY);

    lastScrollY = scrollY;
  }

  /* â”€â”€ Active Nav Link Highlight â”€â”€ */
  function updateActiveLink(scrollY) {
    let current = '';

    sections.forEach(section => {
      const top = section.offsetTop - 90;
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

  drawerClose  && drawerClose.addEventListener('click', closeDrawer);
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
      const target   = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        const navH = navbar ? navbar.offsetHeight : 68;
        const top  = target.getBoundingClientRect().top + window.scrollY - navH;
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

  /* â”€â”€ Attach Scroll Listener â”€â”€ */
  window.addEventListener('scroll', onScroll, { passive: true });

  /* â”€â”€ Initial call (in case page loads mid-scroll) â”€â”€ */
  onScroll();

  /* â”€â”€ Active Nav Link CSS â”€â”€ */
  // Inject active link style dynamically (keeps CSS clean)
  const style = document.createElement('style');
  style.textContent = `.nav-link.active { color: var(--color-text); }`;
  document.head.appendChild(style);


  /* ================================================================
     AUTH SYSTEM - Login / Signup / Session / Logout
     Storage: localStorage key "eternity_users"   -> array of users
              localStorage key "eternity_session" -> logged-in email
     ================================================================ */

  var AUTH_USERS_KEY   = 'eternity_users';
  var AUTH_SESSION_KEY = 'eternity_session';

  function getUsers()    { try { return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || []; } catch(e) { return []; } }
  function saveUsers(u)  { localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(u)); }
  function getSession()  { return localStorage.getItem(AUTH_SESSION_KEY); }
  function setSession(e) { localStorage.setItem(AUTH_SESSION_KEY, e); }
  function clearSession(){ localStorage.removeItem(AUTH_SESSION_KEY); }
  function getInitials(name) { return name.trim().split(/\s+/).map(function(p){ return p[0].toUpperCase(); }).slice(0,2).join(''); }
  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  var navbarAuth       = document.getElementById('navbar-auth');
  var userMenuEl       = document.getElementById('user-menu');
  var userMenuTrigger  = document.getElementById('user-menu-trigger');
  var userDropdown     = document.getElementById('user-dropdown');
  var userAvatarEl     = document.getElementById('user-avatar-initials');
  var userNameEl       = document.getElementById('user-display-name');
  var dropdownName     = document.getElementById('dropdown-name');
  var dropdownEmail    = document.getElementById('dropdown-email');
  var btnLogout        = document.getElementById('btn-logout');
  var mobileAuth       = document.getElementById('mobile-auth');
  var mobileUserEl     = document.getElementById('mobile-user');
  var mobileUserAvatar = document.getElementById('mobile-user-avatar');
  var mobileUserName   = document.getElementById('mobile-user-name');
  var mobileUserEmail  = document.getElementById('mobile-user-email');
  var mobileBtnLogout  = document.getElementById('mobile-btn-logout');
  var loginModal       = document.getElementById('login-modal');
  var signupModal      = document.getElementById('signup-modal');

  function renderAuthState() {
    var email = getSession();
    if (email) {
      var users = getUsers();
      var user  = users.find(function(u){ return u.email === email; });
      if (!user) { clearSession(); renderAuthState(); return; }
      var fullName = user.firstName + ' ' + user.lastName;
      var initials = getInitials(fullName);
      if (navbarAuth)      navbarAuth.style.display      = 'none';
      if (userMenuEl)      userMenuEl.style.display      = 'flex';
      if (userAvatarEl)    userAvatarEl.textContent      = initials;
      if (userNameEl)      userNameEl.textContent        = user.firstName;
      if (dropdownName)    dropdownName.textContent      = fullName;
      if (dropdownEmail)   dropdownEmail.textContent     = email;
      if (mobileAuth)      mobileAuth.style.display      = 'none';
      if (mobileUserEl)    mobileUserEl.style.display    = 'flex';
      if (mobileUserAvatar) mobileUserAvatar.textContent = initials;
      if (mobileUserName)  mobileUserName.textContent    = fullName;
      if (mobileUserEmail) mobileUserEmail.textContent   = email;
    } else {
      if (navbarAuth)   navbarAuth.style.display   = 'flex';
      if (userMenuEl)   userMenuEl.style.display   = 'none';
      if (mobileAuth)   mobileAuth.style.display   = 'flex';
      if (mobileUserEl) mobileUserEl.style.display = 'none';
    }
  }

  function openModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(function(){ var f = modal.querySelector('.form-input'); if(f) f.focus(); }, 120);
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
    modal.querySelectorAll('.auth-alert').forEach(function(el){ el.style.display='none'; el.textContent=''; });
    modal.querySelectorAll('.form-group').forEach(function(g){ g.classList.remove('error','success'); });
    modal.querySelectorAll('.form-error').forEach(function(e){ e.textContent=''; });
    modal.querySelectorAll('.form-input').forEach(function(i){ i.value=''; if(i.type==='text' && (i.id.includes('password')||i.id.includes('confirm'))) i.type='password'; });
    modal.querySelectorAll('.form-eye').forEach(function(btn){
      var s=btn.querySelector('.eye-show'); var h=btn.querySelector('.eye-hide');
      if(s) s.style.display='block'; if(h) h.style.display='none';
    });
    var fill=modal.querySelector('#strength-fill'); var lbl=modal.querySelector('#strength-label');
    if(fill){ fill.style.width='0%'; fill.style.backgroundColor=''; }
    if(lbl){ lbl.textContent=''; lbl.style.color=''; }
  }

  var elLoginOpen   = document.getElementById('btn-open-login');
  var elSignupOpen  = document.getElementById('btn-open-signup');
  var elMobLogin    = document.getElementById('mobile-btn-login');
  var elMobSignup   = document.getElementById('mobile-btn-signup');
  var elLoginClose  = document.getElementById('login-close');
  var elSignupClose = document.getElementById('signup-close');
  var elLoginOvl    = document.getElementById('login-overlay');
  var elSignupOvl   = document.getElementById('signup-overlay');
  var elToSignup    = document.getElementById('switch-to-signup');
  var elToLogin     = document.getElementById('switch-to-login');

  if(elLoginOpen)   elLoginOpen.addEventListener('click',   function(){ openModal(loginModal); });
  if(elSignupOpen)  elSignupOpen.addEventListener('click',  function(){ openModal(signupModal); });
  if(elMobLogin)    elMobLogin.addEventListener('click',    function(){ closeDrawer(); openModal(loginModal); });
  if(elMobSignup)   elMobSignup.addEventListener('click',   function(){ closeDrawer(); openModal(signupModal); });
  if(elLoginClose)  elLoginClose.addEventListener('click',  function(){ closeModal(loginModal); });
  if(elSignupClose) elSignupClose.addEventListener('click', function(){ closeModal(signupModal); });
  if(elLoginOvl)    elLoginOvl.addEventListener('click',    function(){ closeModal(loginModal); });
  if(elSignupOvl)   elSignupOvl.addEventListener('click',   function(){ closeModal(signupModal); });
  if(elToSignup)    elToSignup.addEventListener('click',    function(){ closeModal(loginModal);  openModal(signupModal); });
  if(elToLogin)     elToLogin.addEventListener('click',     function(){ closeModal(signupModal); openModal(loginModal);  });

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    if(loginModal  && loginModal.style.display  !== 'none') closeModal(loginModal);
    if(signupModal && signupModal.style.display !== 'none') closeModal(signupModal);
  });

  if(userMenuTrigger) userMenuTrigger.addEventListener('click', function(){
    var open = userDropdown && userDropdown.classList.toggle('open');
    userMenuTrigger.setAttribute('aria-expanded', String(!!open));
  });
  document.addEventListener('click', function(e){
    if(userMenuEl && !userMenuEl.contains(e.target)){
      if(userDropdown) userDropdown.classList.remove('open');
      if(userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded','false');
    }
  });

  function doLogout(){ clearSession(); renderAuthState(); if(userDropdown) userDropdown.classList.remove('open'); }
  if(btnLogout)     btnLogout.addEventListener('click',     doLogout);
  if(mobileBtnLogout) mobileBtnLogout.addEventListener('click', function(){ closeDrawer(); doLogout(); });

  function bindEye(eyeId, inputId){
    var btn=document.getElementById(eyeId), inp=document.getElementById(inputId);
    if(!btn||!inp) return;
    btn.addEventListener('click', function(){
      var isPass = inp.type === 'password';
      inp.type = isPass ? 'text' : 'password';
      var s=btn.querySelector('.eye-show'), h=btn.querySelector('.eye-hide');
      if(s) s.style.display = isPass ? 'none'  : 'block';
      if(h) h.style.display = isPass ? 'block' : 'none';
    });
  }
  bindEye('login-eye','login-password');
  bindEye('signup-eye','signup-password');
  bindEye('confirm-eye','signup-confirm');

  var passInput = document.getElementById('signup-password');
  if(passInput) passInput.addEventListener('input', function(){
    var v=this.value;
    var fill=document.getElementById('strength-fill'), lbl=document.getElementById('strength-label');
    if(!fill||!lbl) return;
    var s=0;
    if(v.length>=8) s++; if(/[A-Z]/.test(v)) s++; if(/[0-9]/.test(v)) s++; if(/[^A-Za-z0-9]/.test(v)) s++;
    var lvls=[{p:'0%',c:'',t:''},{p:'25%',c:'#EF4444',t:'Weak'},{p:'50%',c:'#F59E0B',t:'Fair'},{p:'75%',c:'#3B82F6',t:'Good'},{p:'100%',c:'#10B981',t:'Strong'}];
    var lvl = v.length===0 ? lvls[0] : lvls[s];
    fill.style.width=lvl.p; fill.style.backgroundColor=lvl.c; lbl.textContent=lvl.t; lbl.style.color=lvl.c;
  });

  function setErr(gId,eId,msg){ var g=document.getElementById(gId); if(g){g.classList.add('error');g.classList.remove('success');} var el=document.getElementById(eId); if(el) el.textContent=msg; return false; }
  function setOk(gId,eId){ var g=document.getElementById(gId); if(g){g.classList.remove('error');g.classList.add('success');} var el=document.getElementById(eId); if(el) el.textContent=''; return true; }
  function showAlert(id,msg,show){ var el=document.getElementById(id); if(!el)return; el.textContent=msg; el.style.display=(show===false)?'none':'flex'; }
  function setLoading(id,on){ var btn=document.getElementById(id); if(!btn)return; btn.disabled=on; var t=btn.querySelector('.btn-text'),s=btn.querySelector('.btn-spinner'); if(t) t.style.display=on?'none':'inline'; if(s) s.style.display=on?'inline-flex':'none'; }

  var loginForm = document.getElementById('login-form');
  if(loginForm) loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    showAlert('login-error','',false); showAlert('login-success','',false);
    var email=document.getElementById('login-email').value.trim();
    var pass =document.getElementById('login-password').value;
    var ok=true;
    if(!email) ok=setErr('login-email-group','login-email-error','Email is required.');
    else if(!isValidEmail(email)) ok=setErr('login-email-group','login-email-error','Enter a valid email address.');
    else setOk('login-email-group','login-email-error');
    if(!pass) ok=setErr('login-pass-group','login-pass-error','Password is required.');
    else setOk('login-pass-group','login-pass-error');
    if(!ok) return;
    setLoading('login-submit',true);
    setTimeout(function(){
      var users=getUsers();
      var user=users.find(function(u){ return u.email===email && u.password===pass; });
      setLoading('login-submit',false);
      if(!user){ showAlert('login-error','Incorrect email or password. Please try again.'); setErr('login-email-group','login-email-error',' '); setErr('login-pass-group','login-pass-error',' '); return; }
      showAlert('login-success','Welcome back, '+user.firstName+'! Logging you in...');
      setTimeout(function(){ setSession(email); renderAuthState(); closeModal(loginModal); }, 900);
    }, 700);
  });

  var signupForm = document.getElementById('signup-form');
  if(signupForm) signupForm.addEventListener('submit', function(e){
    e.preventDefault();
    showAlert('signup-error','',false); showAlert('signup-success','',false);
    var fname=document.getElementById('signup-fname').value.trim();
    var lname=document.getElementById('signup-lname').value.trim();
    var email=document.getElementById('signup-email').value.trim();
    var pass =document.getElementById('signup-password').value;
    var cpass=document.getElementById('signup-confirm').value;
    var ok=true;
    if(!fname) ok=setErr('signup-fname-group','signup-fname-error','First name is required.'); else setOk('signup-fname-group','signup-fname-error');
    if(!lname) ok=setErr('signup-lname-group','signup-lname-error','Last name is required.');  else setOk('signup-lname-group','signup-lname-error');
    if(!email) ok=setErr('signup-email-group','signup-email-error','Email is required.');
    else if(!isValidEmail(email)) ok=setErr('signup-email-group','signup-email-error','Enter a valid email.');
    else setOk('signup-email-group','signup-email-error');
    if(!pass) ok=setErr('signup-pass-group','signup-pass-error','Password is required.');
    else if(pass.length<8) ok=setErr('signup-pass-group','signup-pass-error','Minimum 8 characters.');
    else setOk('signup-pass-group','signup-pass-error');
    if(!cpass) ok=setErr('signup-cpass-group','signup-cpass-error','Please confirm your password.');
    else if(pass!==cpass) ok=setErr('signup-cpass-group','signup-cpass-error','Passwords do not match.');
    else setOk('signup-cpass-group','signup-cpass-error');
    if(!ok) return;
    setLoading('signup-submit',true);
    setTimeout(function(){
      var users=getUsers();
      if(users.find(function(u){ return u.email===email; })){ setLoading('signup-submit',false); showAlert('signup-error','An account with this email already exists.'); setErr('signup-email-group','signup-email-error','Email already registered.'); return; }
      users.push({firstName:fname,lastName:lname,email:email,password:pass,createdAt:Date.now()});
      saveUsers(users);
      setLoading('signup-submit',false);
      showAlert('signup-success','Account created! Welcome to Eternity, '+fname+'!');
      setTimeout(function(){ setSession(email); renderAuthState(); closeModal(signupModal); }, 1000);
    }, 800);
  });

  renderAuthState();


})();
