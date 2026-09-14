// Stella's Beach House - front-end helpers (no backend, theme unchanged)
(function () {
  const PRICES = {
    'Couples Room': 2000,
    'Family Room 4': 2500,
    'Family Room 6': 3000,
    'Family Room 12': 4500,
    'Family Room 15': 7000
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const peso = (n) => '₱' + Number(n).toLocaleString('en-PH');

  function getUsers() {
    try { return JSON.parse(localStorage.getItem('stella_users') || '[]'); }
    catch { return []; }
  }
  function saveUsers(u) { localStorage.setItem('stella_users', JSON.stringify(u)); }
  function getSession() {
    try { return JSON.parse(localStorage.getItem('stella_session') || 'null'); }
    catch { return null; }
  }
  function setSession(s) { localStorage.setItem('stella_session', JSON.stringify(s)); }
  function getReservations() {
    try { return JSON.parse(localStorage.getItem('stella_reservations') || '[]'); }
    catch { return []; }
  }
  function saveReservations(r) { localStorage.setItem('stella_reservations', JSON.stringify(r)); }

  // Active nav link (same colors, just underline)
  function markActiveNav() {
    const page = (location.pathname.split('/').pop() || 'landingpage.html').toLowerCase();
    $$('nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase();
      if (href === page) a.classList.add('active');
    });
  }

  // Mobile nav toggle (uses existing colors)
  function initMobileNav() {
    const nav = $('nav');
    if (!nav || $('.nav-toggle')) return;
    const firstLink = $('nav a');
    if (!firstLink) return;
    const btn = document.createElement('button');
    btn.className = 'nav-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Toggle menu');
    btn.textContent = '☰';
    nav.insertBefore(btn, nav.children[1] || null);
    btn.addEventListener('click', () => nav.classList.toggle('open'));
  }

  function showMsg(form, text, ok) {
    let el = form.querySelector('.form-msg');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-msg';
      form.prepend(el);
    }
    el.textContent = text;
    el.classList.toggle('error', !ok);
    el.classList.toggle('success', !!ok);
  }

  function initRegister() {
    const form = $('#registerForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#regName').value.trim();
      const email = $('#regEmail').value.trim().toLowerCase();
      const pw = $('#regPassword').value;
      const pw2 = $('#regPassword2').value;
      if (!name || !email || !pw) return showMsg(form, 'Please fill in all fields.', false);
      if (pw.length < 6) return showMsg(form, 'Password must be at least 6 characters.', false);
      if (pw !== pw2) return showMsg(form, 'Passwords do not match.', false);
      const users = getUsers();
      if (users.some(u => u.email === email)) return showMsg(form, 'That email is already registered. Try logging in.', false);
      users.push({ name, email, pw, contact: '', created: new Date().toISOString() });
      saveUsers(users);
      setSession({ name, email });
      showMsg(form, 'Account created! Taking you to rooms...', true);
      setTimeout(() => location.href = 'rooms.html', 800);
    });
  }

  function initLogin() {
    const form = $('#loginForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#loginEmail').value.trim().toLowerCase();
      const pw = $('#loginPassword').value;
      const users = getUsers();
      const found = users.find(u => u.email === email && u.pw === pw);
      if (!found) return showMsg(form, 'Invalid email or password. Register first if you are new.', false);
      setSession({ name: found.name, email: found.email });
      showMsg(form, 'Welcome back, ' + found.name + '!', true);
      setTimeout(() => location.href = 'rooms.html', 700);
    });
  }

  function initLogout() {
    $$('[data-logout]').forEach(a => {
      a.addEventListener('click', () => localStorage.removeItem('stella_session'));
    });
  }

  function roomKeyFromOption(opt) {
    // "Couples Room - ₱2,000" -> "Couples Room"
    return (opt || '').split(' - ')[0].trim();
  }

  function calcNights(cin, cout) {
    const d1 = new Date(cin), d2 = new Date(cout);
    if (isNaN(d1) || isNaN(d2)) return 0;
    return Math.round((d2 - d1) / 86400000);
  }

  function initReservation() {
    const form = $('#reserveForm');
    if (!form) return;
    const roomSel = $('#resRoom'), cin = $('#resCheckin'), cout = $('#resCheckout');
    const summary = $('#priceSummary');

    // Preselect from ?room=Couples%20Room
    const params = new URLSearchParams(location.search);
    const want = params.get('room');
    if (want && roomSel) {
      Array.from(roomSel.options).forEach(o => {
        if (roomKeyFromOption(o.text) === want) roomSel.value = o.value || o.text;
      });
      // fallback: match by value containing room name
      if (roomSel.selectedIndex <= 0) {
        Array.from(roomSel.options).forEach((o, i) => {
          if (o.text.includes(want)) roomSel.selectedIndex = i;
        });
      }
    }

    // Min = today
    const today = new Date().toISOString().split('T')[0];
    if (cin) cin.min = today;
    if (cout) cout.min = today;

    function update() {
      if (!summary) return;
      const room = roomKeyFromOption(roomSel.options[roomSel.selectedIndex].text);
      const price = PRICES[room] || 0;
      const nights = calcNights(cin.value, cout.value);
      if (!price || nights <= 0) {
        summary.innerHTML = 'Select a room and valid dates to see your total.';
        return;
      }
      summary.innerHTML = `<strong>${room}</strong> × ${nights} night${nights > 1 ? 's' : ''} = <strong>${peso(price * nights)}</strong> <span class="muted">(${peso(price)}/night)</span>`;
    }
    [roomSel, cin, cout].forEach(el => el && el.addEventListener('change', update));
    update();

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#resName').value.trim();
      const contact = $('#resContact').value.trim();
      const roomOpt = roomSel.options[roomSel.selectedIndex].text;
      const room = roomKeyFromOption(roomOpt);
      const nights = calcNights(cin.value, cout.value);
      if (!name) return showMsg(form, 'Please enter your full name.', false);
      if (!/^09\d{9}$/.test(contact)) return showMsg(form, 'Contact must be 11 digits starting with 09.', false);
      if (!PRICES[room]) return showMsg(form, 'Please select a room.', false);
      if (nights <= 0) return showMsg(form, 'Check-out must be after check-in.', false);
      const session = getSession();
      const all = getReservations();
      all.push({
        id: 'ST-' + Date.now().toString(36).toUpperCase(),
        name, contact, room,
        checkin: cin.value, checkout: cout.value,
        nights, total: PRICES[room] * nights,
        payment: $('#resPay') ? $('#resPay').value : '',
        status: 'Confirmed',
        by: session ? session.email : 'guest',
        created: new Date().toISOString()
      });
      saveReservations(all);
      location.href = 'my-reservations.html?booked=1';
    });
  }

  function initMyReservations() {
    const list = $('#reservationsList');
    if (!list) return;
    const all = getReservations();
    const params = new URLSearchParams(location.search);
    if (params.get('booked') === '1') {
      const ok = document.createElement('p');
      ok.className = 'form-msg success';
      ok.textContent = 'Reservation saved! See it below.';
      list.before(ok);
    }
    if (!all.length) return; // keep static sample card
    list.innerHTML = '';
    all.slice().reverse().forEach(r => {
      const div = document.createElement('div');
      div.className = 'reservation-card';
      div.innerHTML = `<h2>${r.room}</h2>
        <p><strong>ID:</strong> ${r.id}</p>
        <p><strong>Check-in:</strong> ${r.checkin} &nbsp; <strong>Check-out:</strong> ${r.checkout}</p>
        <p><strong>Nights:</strong> ${r.nights} &nbsp; <strong>Total:</strong> ${peso(r.total)}</p>
        <p><strong>Payment:</strong> ${r.payment || '-'} &nbsp; <strong>Status:</strong> ${r.status}</p>
        <button type="button" data-cancel="${r.id}">Cancel Reservation</button>`;
      list.appendChild(div);
    });
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cancel]');
      if (!btn) return;
      saveReservations(getReservations().filter(x => x.id !== btn.getAttribute('data-cancel')));
      location.reload();
    });
  }

  function initAccount() {
    const nameEl = $('#accName'), emailEl = $('#accEmail'), contactEl = $('#accContact');
    if (!nameEl) return;
    const s = getSession();
    const users = getUsers();
    const me = s ? users.find(u => u.email === s.email) : null;
    nameEl.textContent = me ? me.name : (s ? s.name : 'Guest');
    emailEl.textContent = me ? me.email : (s ? s.email : '-');
    if (contactEl && me) contactEl.textContent = me.contact || 'Not set yet';
    const form = $('#accountForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!me) return showMsg(form, 'Log in first to update your account.', false);
        const c = $('#accContactInput').value.trim();
        if (c && !/^09\d{9}$/.test(c)) return showMsg(form, 'Contact must be 11 digits starting with 09.', false);
        me.contact = c;
        saveUsers(users);
        contactEl.textContent = c || 'Not set yet';
        showMsg(form, 'Account updated!', true);
      });
    }
  }

  function initFeedback() {
    const form = $('#feedbackForm');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = $('#fbName').value.trim();
      const r = $('#fbRating').value;
      const t = $('#fbText').value.trim();
      if (!n || !r || !t) return showMsg(form, 'Please complete name, rating, and feedback.', false);
      const all = JSON.parse(localStorage.getItem('stella_feedback') || '[]');
      all.push({ n, r, t, at: new Date().toISOString() });
      localStorage.setItem('stella_feedback', JSON.stringify(all));
      form.reset();
      showMsg(form, 'Thanks, ' + n + '! Your feedback was saved.', true);
    });
  }

  function initSmoothScroll() {
    // Smooth scroll for same-page #links with sticky-nav offset
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const nav = document.querySelector('nav');
      const offset = (nav ? nav.offsetHeight : 70) + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      if (nav && nav.classList.contains('open')) nav.classList.remove('open');
      history.replaceState(null, '', id);
    });
  }

  function initReveal() {
    const els = document.querySelectorAll('.about, .room-card, .feature-card, .contact-card, .contact-info div, .rooms h2, .features h2, .contact h2');
    if (!('IntersectionObserver' in window) || !els.length) return;
    els.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  document.addEventListener('DOMContentLoaded', () => {
    markActiveNav();
    initMobileNav();
    initSmoothScroll();
    initReveal();
    initRegister();
    initLogin();
    initLogout();
    initReservation();
    initMyReservations();
    initAccount();
    initFeedback();
  });
})();
