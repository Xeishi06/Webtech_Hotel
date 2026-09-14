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
      showMsg(form, 'Welcome, ' + found.name + '!', true);
      setTimeout(() => location.href = 'landingpage.html', 700);
    });
  }

  function confirmLogout(proceed) {
    // Themed confirm dialog (inline styles so it works on every page).
    const old = document.getElementById('logoutConfirm');
    if (old) old.remove();
    const back = document.createElement('div');
    back.id = 'logoutConfirm';
    back.style.cssText = 'position:fixed;inset:0;background:rgba(40,80,50,0.55);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99;';
    back.innerHTML = `<div style="background:#FFF8E7;border:1px solid #C5D4B8;border-radius:14px;max-width:360px;width:100%;padding:26px 24px;text-align:center;color:#333;font-family:inherit;">
      <h3 style="color:#3F6B4F;margin:0 0 8px 0;">Log out?</h3>
      <p style="margin:0 0 18px 0;">You'll stay on this device's guest bookings, but your account perks (prefill, private list) turn off.</p>
      <div style="display:flex;gap:10px;">
        <button type="button" id="logoutStay" style="flex:1;padding:11px;border-radius:20px;border:1px solid #C5D4B8;background:white;color:#3F6B4F;font:inherit;font-weight:bold;cursor:pointer;">Stay</button>
        <button type="button" id="logoutGo" style="flex:1;padding:11px;border-radius:20px;border:none;background:#6F9E72;color:white;font:inherit;font-weight:bold;cursor:pointer;">Log out</button>
      </div></div>`;
    document.body.appendChild(back);
    const cleanup = () => back.remove();
    back.addEventListener('click', (e) => { if (e.target === back) cleanup(); });
    document.getElementById('logoutStay').addEventListener('click', cleanup);
    document.getElementById('logoutGo').addEventListener('click', () => { cleanup(); proceed(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', esc); }
    });
  }

  function doLogout() {
    localStorage.removeItem('stella_session');
    location.href = 'landingpage.html';
  }

  function initLogout() {
    $$('[data-logout]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        confirmLogout(doLogout);
      });
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
    let all = getReservations();
    const session = getSession();
    if (session && session.email) {
      const mine = all.filter(r => (r.by || r.email || '').toLowerCase() === session.email.toLowerCase());
      if (mine.length) {
        all = mine;
      } else if (all.length) {
        // Logged in but no bookings under this email: show nothing-new state
        const note = document.createElement('p');
        note.className = 'form-msg';
        note.textContent = `No bookings yet under ${session.email}. Guest bookings on this device are hidden while logged in.`;
        list.before(note);
        list.innerHTML = '';
        return;
      }
    }
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

  function initQuickReserve() {
    const modal = $('#reserveModal');
    if (!modal) return;
    const form = $('#quickReserveForm');
    const roomSel = $('#qRoom'), cin = $('#qCheckin'), cout = $('#qCheckout');
    const total = $('#quickTotal');
    const formView = $('#modalFormView'), doneView = $('#modalDoneView');

    const today = new Date().toISOString().split('T')[0];
    if (cin) cin.min = today;
    if (cout) cout.min = today;

    function roomKey(opt) { return (opt || '').split(' - ')[0].trim(); }
    function nights() { return calcNights(cin.value, cout.value); }

    function updateTotal() {
      if (!total) return;
      const room = roomSel ? roomKey(roomSel.options[roomSel.selectedIndex].text) : '';
      const price = PRICES[room] || 0;
      const n = nights();
      if (!price || n <= 0) {
        total.textContent = 'Select a room and valid dates to see your total.';
        return;
      }
      total.innerHTML = `<strong>${room}</strong> × ${n} night${n > 1 ? 's' : ''} = <strong>${peso(price * n)}</strong>`;
    }
    [roomSel, cin, cout].forEach(el => el && el.addEventListener('change', updateTotal));

    function open(room) {
      if (formView) formView.hidden = false;
      if (doneView) doneView.hidden = true;
      if (room && roomSel) {
        const want = decodeURIComponent(room);
        Array.from(roomSel.options).forEach((o, i) => {
          if (o.text.includes(want) || roomKey(o.text) === want) roomSel.selectedIndex = i;
        });
      }
      // Prefill from login session (convenience, still optional)
      try {
        const s = getSession();
        const users = getUsers();
        const me = s ? users.find(u => u.email === s.email) : null;
        const note = document.getElementById('quickSessionNote');
        if (me) {
          if (document.getElementById('qName') && !document.getElementById('qName').value) document.getElementById('qName').value = me.name || '';
          if (document.getElementById('qEmail') && !document.getElementById('qEmail').value) document.getElementById('qEmail').value = me.email || '';
          if (document.getElementById('qContact') && !document.getElementById('qContact').value && me.contact) document.getElementById('qContact').value = me.contact;
          if (note) { note.hidden = false; note.textContent = `Booking as ${me.email} (logged in) — you can still edit.`; }
        } else if (note) { note.hidden = true; }
      } catch { /* guest mode */ }
      updateTotal();
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
    }

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-reserve]');
      if (t) { open(t.getAttribute('data-reserve') || ''); return; }
      if (e.target.closest('[data-close]') || e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });

    // Support landingpage.html?reserve=Family%20Room%206 (for rooms.html links)
    const params = new URLSearchParams(location.search);
    if (params.get('reserve') !== null) open(params.get('reserve') || '');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#qName').value.trim();
        const email = $('#qEmail').value.trim();
        const contact = $('#qContact').value.trim();
        const roomOpt = roomSel.options[roomSel.selectedIndex].text;
        const room = roomKey(roomOpt);
        const n = nights();
        if (!name) return showMsg(form, 'Please enter your full name.', false);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMsg(form, 'Enter a valid email for confirmation.', false);
        if (!/^09\d{9}$/.test(contact)) return showMsg(form, 'Contact must be 11 digits starting with 09.', false);
        if (!PRICES[room]) return showMsg(form, 'Please select a room.', false);
        if (n <= 0) return showMsg(form, 'Check-out must be after check-in.', false);
        const all = getReservations();
        const booking = {
          id: 'ST-' + Date.now().toString(36).toUpperCase(),
          name, email, contact, room,
          checkin: cin.value, checkout: cout.value,
          nights: n, total: PRICES[room] * n,
          payment: $('#qPay') ? $('#qPay').value : '',
          status: 'Confirmed (guest)',
          by: email,
          created: new Date().toISOString()
        };
        all.push(booking);
        saveReservations(all);
        if (formView) formView.hidden = true;
        if (doneView) doneView.hidden = false;
        const dt = $('#modalDoneText');
        if (dt) dt.textContent = `Confirmation will be sent to ${email}. Show this ID at check-in.`;
        const bid = $('#modalBookingId');
        if (bid) bid.textContent = booking.id;
        form.reset();
      });
    }
  }

  function initAuthNav() {
    // Swap Login/Create Account for Hi, Name/Logout when session exists.
    const s = getSession();
    if (!s) return;
    const first = (s.name || s.email || 'Guest').split(' ')[0];
    document.querySelectorAll('nav a[data-login]').forEach(a => {
      a.textContent = `Hi, ${first}`;
      a.setAttribute('href', 'account.html');
      a.removeAttribute('data-login');
    });
    document.querySelectorAll('nav a[data-register], nav button[data-register]').forEach(a => {
      const out = document.createElement('a');
      out.textContent = 'Logout';
      out.setAttribute('href', 'landingpage.html');
      out.className = a.className;
      out.addEventListener('click', (e) => { e.preventDefault(); confirmLogout(doLogout); });
      a.replaceWith(out);
    });
  }

  function initLoginModal() {
    const modal = $('#loginModal');
    if (!modal) return;
    const form = $('#quickLoginForm');
    function open() {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      const em = $('#qLoginEmail');
      if (em) em.focus();
    }
    function close() {
      modal.hidden = true;
      if ($('#reserveModal') && $('#reserveModal').hidden) document.body.style.overflow = '';
    }
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-login]');
      if (t) {
        if (getSession()) return; // initAuthNav already swapped it
        e.preventDefault();
        open();
        return;
      }
      if (e.target.closest('[data-close-login]') || e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
    // Support landingpage.html?login=1 (old login.html links/bookmarks)
    try {
      if (new URLSearchParams(location.search).get('login') !== null && !getSession()) open();
    } catch { /* ignore */ }
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = $('#qLoginEmail').value.trim().toLowerCase();
        const pw = $('#qLoginPassword').value;
        const found = getUsers().find(u => u.email === email && u.pw === pw);
        if (!found) return showMsg(form, 'Invalid email or password. Register first if you are new.', false);
        setSession({ name: found.name, email: found.email });
        showMsg(form, 'Welcome, ' + found.name + '!', true);
        initAuthNav();
        setTimeout(close, 700);
      });
    }
  }

  function initRegisterModal() {
    const modal = $('#registerModal');
    if (!modal) return;
    const form = $('#quickRegisterForm');
    function open() {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      const n = $('#qRegName');
      if (n) n.focus();
    }
    function close() {
      modal.hidden = true;
      if ($('#reserveModal') && $('#reserveModal').hidden
        && $('#loginModal') && $('#loginModal').hidden) document.body.style.overflow = '';
    }
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-register]');
      if (t) {
        if (getSession()) return; // already swapped to Logout
        e.preventDefault();
        open();
        return;
      }
      if (e.target.closest('[data-close-register]') || e.target === modal) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) close();
    });
    // Support landingpage.html?register=1 (old register.html links/bookmarks)
    try {
      if (new URLSearchParams(location.search).get('register') !== null && !getSession()) open();
    } catch { /* ignore */ }
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#qRegName').value.trim();
        const email = $('#qRegEmail').value.trim().toLowerCase();
        const pw = $('#qRegPassword').value;
        const pw2 = $('#qRegPassword2').value;
        if (!name || !email || !pw) return showMsg(form, 'Please fill in all fields.', false);
        if (pw.length < 6) return showMsg(form, 'Password must be at least 6 characters.', false);
        if (pw !== pw2) return showMsg(form, 'Passwords do not match.', false);
        const users = getUsers();
        if (users.some(u => u.email === email)) return showMsg(form, 'That email is already registered. Try logging in.', false);
        users.push({ name, email, pw, contact: '', created: new Date().toISOString() });
        saveUsers(users);
        setSession({ name, email });
        showMsg(form, 'Welcome, ' + name + '! Your account is ready.', true);
        initAuthNav();
        setTimeout(close, 800);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    markActiveNav();
    initMobileNav();
    initAuthNav();
    initLoginModal();
    initRegisterModal();
    initSmoothScroll();
    initReveal();
    initQuickReserve();
    initRegister();
    initLogin();
    initLogout();
    initReservation();
    initMyReservations();
    initAccount();
    initFeedback();
  });
})();
