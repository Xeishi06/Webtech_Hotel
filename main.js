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
        <p><strong>Nights:</strong> ${r.nights} &nbsp; <strong>Total:</strong> ${peso(r.total)}${r.deposit ? ` (deposit ${peso(r.deposit)} paid, ${peso(r.balance != null ? r.balance : r.total - r.deposit)} at check-in)` : ''}</p>
        <p><strong>Payment:</strong> ${r.payment || '-'}${r.ref ? ' • Ref ' + r.ref : ''} &nbsp; <strong>Status:</strong> ${r.status}</p>
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

  function ensureReserveModal() {
    // Category pages have no modal markup: inject the same reserve
    // dialog so Reserve opens in place instead of jumping pages.
    if (document.getElementById('reserveModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="modal-backdrop" id="reserveModal" hidden>
        <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <button type="button" class="modal-close" data-close aria-label="Close">×</button>
            <div class="modal-grid">
            <aside class="modal-room">
                <div class="gallery-main">
                    <img id="mRoomImg" src="scene.jpg" alt="Selected room" />
                    <button type="button" class="gal-arrow left" id="galPrev" aria-label="Previous photo">‹</button>
                    <button type="button" class="gal-arrow right" id="galNext" aria-label="Next photo">›</button>
                </div>
                <div class="modal-thumbs" id="mThumbs" role="tablist" aria-label="Room photos"></div>
                <span class="badge" id="mRoomBadge">Best for couples</span>
                <h2 id="modalTitle">Book Your Stay</h2>
                <p class="muted" id="mRoomMeta">Good for 2 persons</p>
                <p><strong id="mRoomPrice">₱2,000 per night</strong></p>
                <p class="muted">No account needed — we'll confirm via your email. Pay-first: only paid bookings occupy the room.</p>
            </aside>
            <div class="modal-form">
            <div id="modalFormView">
                <p class="label">QUICK RESERVE</p>
                <p class="muted" id="quickSessionNote" hidden></p>
                <form id="quickReserveForm" novalidate>
                    <p class="steps"><span id="stepDot1" class="step-dot current">1 Details</span> → <span id="stepDot2" class="step-dot">2 Payment</span></p>
                    <div id="payStep1">
                    <label for="qName">Full Name</label>
                    <input id="qName" type="text" placeholder="Enter your name" required autocomplete="name" />
                    <label for="qEmail">Gmail / Email</label>
                    <input id="qEmail" type="email" placeholder="you@gmail.com" required autocomplete="email" />
                    <label for="qContact">Contact Number</label>
                    <input id="qContact" type="tel" pattern="09[0-9]{9}" maxlength="11" placeholder="09XXXXXXXXX" required />
                    <label for="qRoom">Room Type</label>
                    <select id="qRoom" required>
                        <option value="">Select a room</option>
                        <option>Couples Room - ₱2,000</option>
                        <option>Family Room 4 - ₱2,500</option>
                        <option>Family Room 6 - ₱3,000</option>
                        <option>Family Room 12 - ₱4,500</option>
                        <option>Family Room 15 - ₱7,000</option>
                    </select>
                    <div class="modal-row">
                        <div>
                            <label for="qCheckin">Check-in</label>
                            <input id="qCheckin" type="date" required />
                        </div>
                        <div>
                            <label for="qCheckout">Check-out</label>
                            <input id="qCheckout" type="date" required />
                        </div>
                    </div>
                    <div id="quickTotal" aria-live="polite">Select a room and valid dates to see your total.</div>
                    <button type="button" class="main-button modal-submit" id="toPayStep">Continue to Payment →</button>
                    </div>
                    <div id="payStep2" hidden>
                        <p class="muted" style="margin-top:0;">Only <strong>50% deposit</strong> reserves your room today — balance due at check-in.</p>
                        <div class="pay-methods" role="tablist" aria-label="Payment method">
                            <button type="button" class="pay-method current" data-pay="GCash">GCash</button>
                            <button type="button" class="pay-method" data-pay="Card">Card</button>
                            <button type="button" class="pay-method" data-pay="Bank">Bank</button>
                        </div>
                        <div class="pay-box" id="payBoxGcash">
                            <p class="label">PAY WITH GCASH</p>
                            <p class="pay-total" id="payTotalLine">Total: —</p>
                            <p>Send payment to <strong>0912 345 6789</strong><br /><span class="muted">Stella's Beach House • QR code coming soon</span></p>
                        </div>
                        <div class="pay-box" id="payBoxCard" hidden>
                            <p class="label">PAY WITH CARD</p>
                            <p class="pay-total">Total: <span class="pay-total-val">—</span></p>
                            <p class="muted">Demo only — no real charge. Enter card details as printed.</p>
                            <label for="qCardNum">Card Number</label>
                            <input id="qCardNum" type="text" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" />
                            <div class="modal-row">
                                <div>
                                    <label for="qCardExp">Expiry (MM/YY)</label>
                                    <input id="qCardExp" type="text" maxlength="5" placeholder="MM/YY" />
                                </div>
                                <div>
                                    <label for="qCardCvc">CVC</label>
                                    <input id="qCardCvc" type="text" inputmode="numeric" maxlength="4" placeholder="123" />
                                </div>
                            </div>
                        </div>
                        <div class="pay-box" id="payBoxBank" hidden>
                            <p class="label">BANK TRANSFER</p>
                            <p class="pay-total">Total: <span class="pay-total-val">—</span></p>
                            <p>Transfer to <strong>Stella's Beach House • BDO •• 1234</strong><br /><span class="muted">Full account details sent with confirmation email.</span></p>
                        </div>
                        <label for="qRef" id="qRefLabel">GCash Reference Number</label>
                        <input id="qRef" type="text" inputmode="numeric" maxlength="13" placeholder="e.g. 1234567890123" required />
                        <p class="muted">No ref = no reservation. Unpaid holds never block the calendar.</p>
                        <div class="modal-row">
                            <button type="button" class="second-button modal-submit" id="backToStep1" style="border:none;cursor:pointer;font:inherit;">← Back</button>
                            <button type="submit" class="main-button modal-submit">Confirm Booking</button>
                        </div>
                    </div>
                </form>
            </div>
            <div id="modalDoneView" hidden>
                <div class="receipt">
                    <p class="label">BOOKING RECEIPT ✓</p>
                    <h2>Stella's Beach House</h2>
                    <p class="muted">San Mateo, Rizal • 0912 345 6789</p>
                    <hr />
                    <dl>
                        <div><dt>Booking ID</dt><dd id="rId">—</dd></div>
                        <div><dt>Guest</dt><dd id="rName">—</dd></div>
                        <div><dt>Email</dt><dd id="rEmail">—</dd></div>
                        <div><dt>Room</dt><dd id="rRoom">—</dd></div>
                        <div><dt>Check-in</dt><dd id="rIn">—</dd></div>
                        <div><dt>Check-out</dt><dd id="rOut">—</dd></div>
                        <div><dt>Rate</dt><dd id="rRate">—</dd></div>
                        <div><dt>Nights</dt><dd id="rNights">—</dd></div>
                        <div><dt>Payment</dt><dd id="rPay">—</dd></div>
                        <div><dt>Reference</dt><dd id="rRef">—</dd></div>
                        <div><dt>Deposit Paid (50%)</dt><dd id="rDep">—</dd></div>
                        <div><dt>Balance at Check-in</dt><dd id="rBal">—</dd></div>
                        <div class="total"><dt>Total</dt><dd id="rTotal">—</dd></div>
                        <div><dt>Status</dt><dd>Confirmed ✓</dd></div>
                    </dl>
                    <hr />
                    <p class="muted" id="modalDoneText">Show this receipt at check-in.</p>
                    <div class="modal-row">
                        <button type="button" class="second-button modal-submit" id="printReceipt" style="border:none;cursor:pointer;font:inherit;">🖨 Print</button>
                        <button type="button" class="main-button modal-submit" data-close>Done</button>
                    </div>
                    <p><a href="my-reservations.html">View My Reservations →</a></p>
                </div>
            </div>
            </div>
        </div>
    </div>`;
    document.body.appendChild(wrap.firstElementChild);
  }

  function initQuickReserve() {
    ensureReserveModal();
    const modal = $('#reserveModal');
    if (!modal) return;
    const form = $('#quickReserveForm');
    const roomSel = $('#qRoom'), cin = $('#qCheckin'), cout = $('#qCheckout');
    const total = $('#quickTotal');
    const formView = $('#modalFormView'), doneView = $('#modalDoneView');

    const today = new Date().toISOString().split('T')[0];
    if (cin) cin.min = today;
    if (cout) cout.min = today;

    const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=80`;
    const ROOM_INFO = {
      'Couples Room': { badge: 'Best for couples', meta: 'Good for 2 persons • Queen bed • Garden terrace',
        photos: [U('photo-1611892440504-42a792e24d32'), U('photo-1571896349842-33c89424de2d'), U('photo-1520250497591-112f2f40a3f4')] },
      'Family Room 4': { badge: 'Popular', meta: 'Good for 4 persons • 2 queen beds • Breakfast for 4',
        photos: [U('photo-1590490360182-c33d57733427'), U('photo-1596394516093-501ba68a0ba6'), U('photo-1615874959474-d609969a20ed')] },
      'Family Room 6': { badge: 'Popular', meta: 'Good for 6 persons • 3 queen beds • Breakfast for 6',
        photos: [U('photo-1618773928121-c32242e63f39'), U('photo-1560185127-6ed189bf02f4'), U('photo-1598928506319-c55ded91a20c')] },
      'Family Room 12': { badge: 'Big groups', meta: 'Good for 12 persons • Bunk + queen setup',
        photos: [U('photo-1591088398332-8a7791972843'), U('photo-1616594039964-ae9021a400a0'), U('photo-1560185893-a55cbc8c57e8')] },
      'Family Room 15': { badge: 'Big groups', meta: 'Good for 15 persons • Whole-floor setup',
        photos: [U('photo-1566665797739-1674de7a421a'), U('photo-1602002418082-a4443e081dd1'), U('photo-1595576508898-0ad5c879a061')] }
    };

    function roomKey(opt) { return (opt || '').split(' - ')[0].trim(); }
    function nights() { return calcNights(cin.value, cout.value); }
    function overlaps(a1, b1, a2, b2) {
      return new Date(a1) < new Date(b2) && new Date(a2) < new Date(b1);
    }

    let galPhotos = ['scene.jpg'];
    let galIdx = 0;
    function showPhoto(i) {
      const img = $('#mRoomImg');
      const thumbs = $('#mThumbs');
      if (!galPhotos.length) return;
      galIdx = (i + galPhotos.length) % galPhotos.length;
      if (img) {
        img.style.opacity = '0';
        setTimeout(() => {
          img.src = galPhotos[galIdx];
          img.alt = `${currentRoom() || 'Room'} photo ${galIdx + 1}`;
          img.style.opacity = '1';
        }, 150);
        img.onerror = () => { img.src = 'scene.jpg'; };
      }
      if (thumbs) thumbs.querySelectorAll('img').forEach((x, xi) => x.classList.toggle('active', xi === galIdx));
    }

    function fillPanel(room) {
      const info = ROOM_INFO[room];
      const img = $('#mRoomImg');
      const thumbs = $('#mThumbs');
      galPhotos = info ? info.photos.slice() : ['scene.jpg'];
      galIdx = 0;
      if (thumbs) {
        thumbs.innerHTML = '';
        galPhotos.forEach((src, i) => {
          const t = document.createElement('img');
          t.src = src;
          t.alt = `${room || 'Room'} photo ${i + 1}`;
          t.loading = 'lazy';
          t.className = i === 0 ? 'active' : '';
          t.onerror = () => { t.src = 'scene.jpg'; };
          t.addEventListener('click', () => showPhoto(i));
          thumbs.appendChild(t);
        });
      }
      if (img && info) { img.src = info.photos[0]; img.alt = room + " at Stella's Beach House"; }
      const badge = $('#mRoomBadge');
      if (badge) badge.textContent = info ? info.badge : 'Stella\'s pick';
      const meta = $('#mRoomMeta');
      if (meta) meta.textContent = info ? info.meta : 'Pick a room to see details.';
      const price = $('#mRoomPrice');
      if (price) price.textContent = room && PRICES[room] ? `${peso(PRICES[room])} per night` : '—';
    }

    function currentRoom() {
      return roomSel && roomSel.selectedIndex > 0 ? roomKey(roomSel.options[roomSel.selectedIndex].text) : '';
    }

    function updateTotal() {
      const room = currentRoom();
      fillPanel(room);
      const price = PRICES[room] || 0;
      const n = nights();
      const full = price && n > 0 ? price * n : 0;
      const dep = full ? Math.round(full / 2) : 0;
      if (total) {
        if (!full) total.textContent = 'Select a room and valid dates to see your total.';
        else total.innerHTML = `<strong>${room}</strong> × ${n} night${n > 1 ? 's' : ''} = <strong>${peso(full)}</strong> <span class="muted">(${peso(dep)} deposit due now)</span>`;
      }
      const ptl = $('#payTotalLine');
      if (ptl) ptl.textContent = !full ? 'Total: —' : `Total: ${peso(full)} • Deposit due now (50%): ${peso(dep)}`;
      document.querySelectorAll('.pay-total-val').forEach(el => {
        el.textContent = !full ? '—' : `${peso(full)} total • ${peso(dep)} deposit`;
      });
      return { full, dep, n };
    }
    [roomSel, cin, cout].forEach(el => el && el.addEventListener('change', updateTotal));

    let payMethod = 'GCash';
    function setPayMethod(m) {
      payMethod = m;
      document.querySelectorAll('.pay-method').forEach(b => b.classList.toggle('current', b.dataset.pay === m));
      const boxes = { GCash: $('#payBoxGcash'), Card: $('#payBoxCard'), Bank: $('#payBoxBank') };
      Object.keys(boxes).forEach(k => { if (boxes[k]) boxes[k].hidden = k !== m; });
      const lbl = $('#qRefLabel'), ref = $('#qRef');
      if (lbl && ref) {
        if (m === 'GCash') { lbl.textContent = 'GCash Reference Number'; ref.placeholder = 'e.g. 1234567890123'; ref.style.display = ''; lbl.style.display = ''; }
        else if (m === 'Bank') { lbl.textContent = 'Bank Transaction Reference'; ref.placeholder = 'e.g. TXN987654'; ref.style.display = ''; lbl.style.display = ''; }
        else { lbl.style.display = 'none'; ref.style.display = 'none'; } // Card: details act as proof
      }
    }
    document.addEventListener('click', (e) => {
      const pm = e.target.closest('.pay-method');
      if (pm && modal && !modal.hidden) setPayMethod(pm.dataset.pay);
    });

    function gotoStep(n) {
      const s1 = $('#payStep1'), s2 = $('#payStep2');
      if (s1) s1.hidden = n !== 1;
      if (s2) s2.hidden = n !== 2;
      const d1 = $('#stepDot1'), d2 = $('#stepDot2');
      if (d1) d1.classList.toggle('current', n === 1);
      if (d2) d2.classList.toggle('current', n === 2);
    }

    function validStep1() {
      const name = $('#qName').value.trim();
      const email = $('#qEmail').value.trim();
      const contact = $('#qContact').value.trim();
      const room = currentRoom();
      const n = nights();
      if (!name) { showMsg(form, 'Please enter your full name.', false); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showMsg(form, 'Enter a valid email for confirmation.', false); return false; }
      if (!/^09\d{9}$/.test(contact)) { showMsg(form, 'Contact must be 11 digits starting with 09.', false); return false; }
      if (!PRICES[room]) { showMsg(form, 'Please select a room.', false); return false; }
      if (n <= 0) { showMsg(form, 'Check-out must be after check-in.', false); return false; }
      // Availability: block overlapping paid bookings for the same room
      const clash = getReservations().find(r =>
        r.room === room && r.checkin && r.checkout &&
        overlaps(cin.value, cout.value, r.checkin, r.checkout));
      if (clash) { showMsg(form, `${room} is already booked ${clash.checkin} → ${clash.checkout}. Pick other dates.`, false); return false; }
      const old = form.querySelector('.form-msg');
      if (old) old.remove();
      return true;
    }

    function open(room) {
      if (formView) formView.hidden = false;
      if (doneView) doneView.hidden = true;
      // Carry hero availability dates into the booking form
      try {
        const sq = JSON.parse(localStorage.getItem('stella_search') || 'null');
        if (sq) {
          if (cin && !cin.value && sq.cin) cin.value = sq.cin;
          if (cout && !cout.value && sq.cout) cout.value = sq.cout;
        }
      } catch { /* ignore */ }
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
      gotoStep(1);
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

    const toPay = $('#toPayStep');
    if (toPay) toPay.addEventListener('click', () => { if (validStep1()) { gotoStep(2); setPayMethod(payMethod); updateTotal(); } });
    const back1 = $('#backToStep1');
    if (back1) back1.addEventListener('click', () => gotoStep(1));
    document.addEventListener('click', (e) => {
      if (e.target.closest('#galPrev') && modal && !modal.hidden) showPhoto(galIdx - 1);
      if (e.target.closest('#galNext') && modal && !modal.hidden) showPhoto(galIdx + 1);
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!validStep1()) { gotoStep(1); return; }
        let ref = '';
        if (payMethod === 'GCash') {
          ref = ($('#qRef').value || '').replace(/\D/g, '');
          if (ref.length < 10 || ref.length > 13) return showMsg(form, 'Enter your 10–13 digit GCash reference number.', false);
        } else if (payMethod === 'Bank') {
          ref = ($('#qRef').value || '').trim();
          if (!/^[A-Za-z0-9]{6,20}$/.test(ref)) return showMsg(form, 'Enter your bank transaction reference (6–20 letters/numbers).', false);
        } else {
          const num = ($('#qCardNum').value || '').replace(/\D/g, '');
          const exp = ($('#qCardExp').value || '').trim();
          const cvc = ($('#qCardCvc').value || '').replace(/\D/g, '');
          if (num.length !== 16) return showMsg(form, 'Enter the 16-digit card number.', false);
          if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) return showMsg(form, 'Enter card expiry as MM/YY.', false);
          if (cvc.length < 3 || cvc.length > 4) return showMsg(form, 'Enter the 3–4 digit CVC.', false);
          ref = 'CARD••' + num.slice(-4);
        }
        const name = $('#qName').value.trim();
        const email = $('#qEmail').value.trim();
        const contact = $('#qContact').value.trim();
        const room = currentRoom();
        const n = nights();
        const full = PRICES[room] * n;
        const dep = Math.round(full / 2);
        const all = getReservations();
        const booking = {
          id: 'ST-' + Date.now().toString(36).toUpperCase(),
          name, email, contact, room,
          checkin: cin.value, checkout: cout.value,
          nights: n, total: full,
          deposit: dep, balance: full - dep,
          payment: payMethod,
          ref,
          status: 'Confirmed (paid)',
          by: email,
          created: new Date().toISOString()
        };
        all.push(booking);
        saveReservations(all);
        if (formView) formView.hidden = true;
        if (doneView) doneView.hidden = false;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('rId', booking.id);
        set('rName', name);
        set('rEmail', email);
        set('rRoom', room);
        set('rIn', cin.value);
        set('rOut', cout.value);
        set('rRate', `${peso(PRICES[room])} / night`);
        set('rNights', `${n} night${n > 1 ? 's' : ''}`);
        set('rPay', payMethod);
        set('rRef', ref);
        set('rDep', peso(booking.deposit));
        set('rBal', peso(booking.balance));
        set('rTotal', peso(booking.total));
        const dt = $('#modalDoneText');
        if (dt) dt.textContent = `A confirmation will be sent to ${email}. Show this receipt at check-in.`;
        form.reset();
        gotoStep(1);
      });
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('#printReceipt')) window.print();
    });
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

  function initFeedbackWall() {
    const wall = $('#reviewWall');
    const modal = $('#feedbackModal');
    const form = $('#quickFeedbackForm');
    let stars = 5;

    function readAll() {
      try { return JSON.parse(localStorage.getItem('stella_feedback') || '[]'); }
      catch { return []; }
    }
    function starNum(r) {
      const m = String(r || '').match(/^[1-5]/);
      return m ? Number(m[0]) : 5;
    }
    function render() {
      if (!wall) return;
      const all = readAll().slice().reverse().slice(0, 3);
      const sum = $('#ratingSummary');
      if (!all.length) {
        if (sum) sum.textContent = 'No reviews yet — share the first one!';
        wall.innerHTML = `<div class="review-empty">No guest reviews yet. Stayed with us? Tell future guests what to expect.</div>`;
        return;
      }
      const full = readAll();
      const avg = full.reduce((a, x) => a + starNum(x.r), 0) / full.length;
      if (sum) sum.textContent = `★ ${avg.toFixed(1)} from ${full.length} review${full.length > 1 ? 's' : ''}`;
      wall.innerHTML = '';
      all.forEach(x => {
        const n = starNum(x.r);
        const div = document.createElement('div');
        div.className = 'review-card';
        div.innerHTML = `<div class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</div><h3></h3><p></p>`;
        div.querySelector('h3').textContent = x.n || 'Guest';
        div.querySelector('p').textContent = x.t || '';
        wall.appendChild(div);
      });
    }

    function paintStars() {
      document.querySelectorAll('#starPick button').forEach(b => {
        b.classList.toggle('lit', Number(b.dataset.star) <= stars);
      });
    }
    document.addEventListener('click', (e) => {
      const s = e.target.closest('#starPick button');
      if (s) { stars = Number(s.dataset.star); paintStars(); return; }
      if (e.target.closest('[data-feedback]')) {
        if (!modal) return;
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        paintStars();
        return;
      }
      if (modal && (e.target.closest('[data-close-feedback]') || e.target === modal)) {
        modal.hidden = true;
        document.body.style.overflow = '';
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) {
        modal.hidden = true;
        document.body.style.overflow = '';
      }
    });
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const n = $('#qFbName').value.trim();
        const t = $('#qFbText').value.trim();
        if (!n || !t) return showMsg(form, 'Please add your name and review.', false);
        const all = readAll();
        all.push({ n, r: `${stars} - ${['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][stars]}`, t, at: new Date().toISOString() });
        localStorage.setItem('stella_feedback', JSON.stringify(all));
        form.reset();
        stars = 5;
        paintStars();
        render();
        showMsg(form, 'Thanks! Your review is live below.', true);
        setTimeout(() => { if (modal) { modal.hidden = true; document.body.style.overflow = ''; } }, 900);
      });
    }
    render();
    paintStars();
  }

  function initAvail() {
    const bar = $('#availBar');
    if (!bar) return;
    const ain = $('#avIn'), aout = $('#avOut');
    const today = new Date().toISOString().split('T')[0];
    if (ain) ain.min = today;
    if (aout) aout.min = today;
    const CAPS = [2, 4, 6, 12, 15];
    bar.addEventListener('submit', (e) => {
      e.preventDefault();
      const hint = $('#availHint');
      if (!ain.value || !aout.value || new Date(aout.value) <= new Date(ain.value)) {
        if (hint) hint.textContent = 'Pick a check-out date after check-in.';
        return;
      }
      const g = Number($('#avGuests').value || 2);
      try { localStorage.setItem('stella_search', JSON.stringify({ cin: ain.value, cout: aout.value, guests: g })); } catch { /* ignore */ }
      const cards = Array.from(document.querySelectorAll('#rooms .room-card:not(.cta-card)'));
      cards.forEach(c => c.classList.remove('flash'));
      const idx = CAPS.findIndex(c => c >= g);
      const names = ['Couples Room', 'Family Room 4', 'Family Room 6', 'Family Room 12', 'Family Room 15'];
      if (idx >= 0 && cards[idx]) {
        cards[idx].classList.add('flash');
        setTimeout(() => cards[idx].classList.remove('flash'), 3500);
        if (hint) hint.textContent = `${names[idx]} fits ${g} — see options below. Dates saved to booking.`;
      } else if (hint) hint.textContent = 'For 15+ guests, see “Need something bigger?” below.';
      const target = document.querySelector('#rooms');
      if (target) {
        const nav = document.querySelector('nav');
        const off = (nav ? nav.offsetHeight : 70) + 12;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
      }
    });
  }

  function initFocusTrap() {
    // Keep Tab cycling inside the open modal (keyboard + screen readers).
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const open = Array.from(document.querySelectorAll('.modal-backdrop')).find(m => !m.hidden);
      if (!open) return;
      const items = Array.from(open.querySelectorAll('button, input, select, textarea, a[href]'))
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    markActiveNav();
    initMobileNav();
    initAuthNav();
    initFocusTrap();
    initLoginModal();
    initRegisterModal();
    initAvail();
    initFeedbackWall();
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
