(function () {

    const ROOM_PRICES = {
        'Couples Room': 2000,
        'Family Room 4': 2500,
        'Family Room 6': 3000,
        'Family Room 12': 4500,
        'Family Room 15': 7000
    };

    const ROOM_CAPACITY = {
        'Couples Room': 2,
        'Family Room 4': 4,
        'Family Room 6': 6,
        'Family Room 12': 12,
        'Family Room 15': 15
    };

    // Bookable sub-options under each room category (mirrors the room pages).
    // The Quick Reserve Room Type dropdown only lists the options of the
    // category the guest came from (e.g. couples page -> couples options only).
    const ROOM_OPTIONS = {
        'Couples Room': [
            { key: 'couples-garden', name: 'Garden View', price: 2000, available: true },
            { key: 'couples-pool', name: 'Pool Access', price: 2800 },
            { key: 'couples-beachfront', name: 'Beachfront Suite', price: 3500 }
        ],
        'Family Room 4': [
            { key: 'fam4-standard', name: 'Standard', price: 2500, available: true },
            { key: 'fam4-pool', name: 'Pool View', price: 3200 },
            { key: 'fam4-beachfront', name: 'Beachfront', price: 3900 }
        ],
        'Family Room 6': [
            { key: 'fam6-standard', name: 'Standard', price: 3000, available: true },
            { key: 'fam6-pool', name: 'Pool Access', price: 3800 },
            { key: 'fam6-villa', name: 'Beachfront Villa', price: 4800 }
        ],
        'Family Room 12': [
            { key: 'fam12-standard', name: 'Standard', price: 4500, available: true },
            { key: 'fam12-pavilion', name: 'Pool Pavilion', price: 5800 },
            { key: 'fam12-hall', name: 'Beachfront Hall', price: 7500 }
        ],
        'Family Room 15': [
            { key: 'fam15-standard', name: 'Standard', price: 7000, available: true },
            { key: 'fam15-villa', name: 'Grand Pool Villa', price: 9000 },
            { key: 'fam15-estate', name: 'Beachfront Estate', price: 12000 }
        ]
    };

    const SUBROOM_BY_KEY = {};
    Object.keys(ROOM_OPTIONS).forEach((category) => {
        ROOM_OPTIONS[category].forEach((opt) => {
            SUBROOM_BY_KEY[opt.key] = { category: category, name: opt.name, price: opt.price, available: !!opt.available };
        });
    });

    const subRoomByKey = (key) => SUBROOM_BY_KEY[key] || null;

    const subRoomDisplay = (sub) => sub.name + ' (' + sub.category + ')';

    const capacityForKey = (key) => {
        const sub = subRoomByKey(key);
        return sub ? (ROOM_CAPACITY[sub.category] || 0) : 0;
    };

    function bookingRate(booking) {
        if (booking && booking.rate) return Number(booking.rate);
        if (booking && ROOM_PRICES[booking.room]) return ROOM_PRICES[booking.room];
        if (booking && booking.total && booking.nights) return Math.round(booking.total / booking.nights);
        return 0;
    }

    function photoUrl(photoId) {
        return 'https://images.unsplash.com/' + photoId + '?auto=format&fit=crop&w=600&q=80';
    }

    const ROOM_DETAILS = {
        'Couples Room': {
            badge: 'Best for couples',
            meta: 'Good for 2 persons • Queen bed • Garden terrace',
            photos: [
                photoUrl('photo-1611892440504-42a792e24d32'),
                photoUrl('photo-1571896349842-33c89424de2d'),
                photoUrl('photo-1520250497591-112f2f40a3f4')
            ]
        },
        'Family Room 4': {
            badge: 'Popular',
            meta: 'Good for 4 persons • 2 queen beds • Breakfast for 4',
            photos: [
                photoUrl('photo-1590490360182-c33d57733427'),
                photoUrl('photo-1596394516093-501ba68a0ba6'),
                photoUrl('photo-1615874959474-d609969a20ed')
            ]
        },
        'Family Room 6': {
            badge: 'Popular',
            meta: 'Good for 6 persons • 3 queen beds • Breakfast for 6',
            photos: [
                photoUrl('photo-1618773928121-c32242e63f39'),
                photoUrl('photo-1560185127-6ed189bf02f4'),
                photoUrl('photo-1598928506319-c55ded91a20c')
            ]
        },
        'Family Room 12': {
            badge: 'Big groups',
            meta: 'Good for 12 persons • Bunk + queen setup',
            photos: [
                photoUrl('photo-1591088398332-8a7791972843'),
                photoUrl('photo-1616594039964-ae9021a400a0'),
                photoUrl('photo-1560185893-a55cbc8c57e8')
            ]
        },
        'Family Room 15': {
            badge: 'Big groups',
            meta: 'Good for 15 persons • Whole-floor setup',
            photos: [
                photoUrl('photo-1566665797739-1674de7a421a'),
                photoUrl('photo-1602002418082-a4443e081dd1'),
                photoUrl('photo-1595576508898-0ad5c879a061')
            ]
        }
    };

    const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

    const DEPOSIT_RATE = 0.5;

    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => Array.from(document.querySelectorAll(selector));

    const peso = (amount) => '₱' + Number(amount).toLocaleString('en-PH');

    function formatDate(isoDate) {
        const date = new Date(String(isoDate) + 'T00:00:00');
        if (isNaN(date)) return isoDate;
        return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function nightsBetween(checkIn, checkOut) {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (isNaN(start) || isNaN(end)) return 0;
        return Math.round((end - start) / 86400000);
    }

    function datesOverlap(startA, endA, startB, endB) {
        return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA);
    }

    function toIsoDate(date) {
        return date.toISOString().split('T')[0];
    }

    function addDays(isoDate, days) {
        const date = new Date(isoDate);
        date.setDate(date.getDate() + days);
        return toIsoDate(date);
    }

    function roomNameFromOption(optionText) {
        return (optionText || '').split(' - ')[0].trim();
    }

    function formatGuests(adults, children) {
        const a = Math.floor(Number(adults));
        const c = Math.floor(Number(children));
        if (isNaN(a) || a < 1 || isNaN(c) || c < 0) return '';
        const total = a + c;
        return total + ' guest' + (total === 1 ? '' : 's') +
            ' (' + a + ' adult' + (a === 1 ? '' : 's') +
            ' + ' + c + ' child' + (c === 1 ? '' : 'ren') + ')';
    }

    // Steady color per name, used for default initial-avatars.
    function avatarColorFor(name) {
        const s = String(name || 'Guest');
        let h = 0;
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
        return 'hsl(' + h + ', 35%, 52%)';
    }

    // Builds an avatar node: the user's uploaded photo, or their initial
    // on a steady color when they never customized one (fully optional).
    function buildAvatarNode(name, imgDataUrl, large) {
        const av = document.createElement('span');
        av.className = 'avatar-circle' + (large ? ' avatar-large' : '');
        if (imgDataUrl) {
            const img = document.createElement('img');
            img.src = imgDataUrl;
            img.alt = '';
            av.appendChild(img);
        } else {
            av.textContent = (String(name || 'G').trim().charAt(0) || 'G').toUpperCase();
            av.style.background = avatarColorFor(name);
        }
        return av;
    }

    // Small square avatar version of an uploaded photo (max 256px, JPEG).
    function fileToAvatarImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !String(file.type || '').startsWith('image/')) {
                reject(new Error('not-image'));
                return;
            }
            if (file.size > 8 * 1024 * 1024) {
                reject(new Error('too-big'));
                return;
            }
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                try {
                    const side = Math.min(img.width, img.height);
                    const sx = (img.width - side) / 2;
                    const sy = (img.height - side) / 2;
                    const out = Math.min(256, side);
                    const canvas = document.createElement('canvas');
                    canvas.width = out;
                    canvas.height = out;
                    canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, out, out);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch (error) {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('bad-image'));
            };
            img.src = url;
        });
    }

    // Reads an uploaded receipt photo and shrinks it (max 800px, JPEG)
    // so it fits safely in localStorage alongside the booking.
    // Resolves with a data-URL string. Rejects on bad file / bad image.
    function fileToReceiptImage(file) {
        return new Promise((resolve, reject) => {
            if (!file || !String(file.type || '').startsWith('image/')) {
                reject(new Error('not-image'));
                return;
            }
            if (file.size > 8 * 1024 * 1024) {
                reject(new Error('too-big'));
                return;
            }
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                try {
                    const maxSide = 800;
                    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                    const width = Math.max(1, Math.round(img.width * scale));
                    const height = Math.max(1, Math.round(img.height * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                } catch (error) {
                    URL.revokeObjectURL(url);
                    reject(error);
                }
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('bad-image'));
            };
            img.src = url;
        });
    }

    function showMessage(form, text, isOk) {
        let box = form.querySelector('.form-msg');
        if (!box) {
            box = document.createElement('p');
            box.className = 'form-msg';
            form.prepend(box);
        }
        box.textContent = text;
        box.classList.toggle('error', !isOk);
        box.classList.toggle('success', !!isOk);
    }

    function clearMessage(form) {
        const box = form.querySelector('.form-msg');
        if (box) box.remove();
    }

    function syncScrollLock() {
        const aDialogIsOpen = !!document.querySelector('.modal-backdrop:not([hidden])');
        document.body.style.overflow = aDialogIsOpen ? 'hidden' : '';
    }

    function openDialog(dialog) {
        dialog.hidden = false;
        syncScrollLock();
    }

    function closeDialog(dialog) {
        dialog.hidden = true;
        syncScrollLock();
    }

    const KEYS = {
        users: 'stella_users',
        session: 'stella_session',
        reservations: 'stella_reservations',
        reviews: 'stella_feedback',
        pending: 'stella_pending_verification'
    };

    // ---- Email verification settings ----
    // This is a front-end-only demo (no backend), so a real SMTP email
    // cannot be sent from the browser alone. The flow below:
    //   1. generates a 6-digit code,
    //   2. calls sendVerificationEmail() — plug your backend / EmailJS /
    //      API Gateway URL into window.STELLA_VERIFY_API_URL to send a REAL email,
    //   3. falls back to an on-screen demo inbox so the feature is testable now.
    // To go live: set window.STELLA_VERIFY_API_URL = 'https://your-api/send-code'
    // and have it POST { name, email, code } -> send the email server-side.
    const VERIFY = {
        CODE_DIGITS: 6,
        EXPIRY_MINUTES: 10,
        MAX_ATTEMPTS: 5
    };

    function readList(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (error) {
            return [];
        }
    }

    function writeList(key, list) {
        localStorage.setItem(key, JSON.stringify(list));
    }

    const getUsers = () => readList(KEYS.users);
    const saveUsers = (users) => writeList(KEYS.users, users);

    const getReservations = () => readList(KEYS.reservations);
    const saveReservations = (bookings) => writeList(KEYS.reservations, bookings);

    const getReviews = () => readList(KEYS.reviews);
    const saveReviews = (reviews) => writeList(KEYS.reviews, reviews);

    function getPendingVerification() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.pending) || 'null');
        } catch (error) {
            return null;
        }
    }

    function savePendingVerification(pending) {
        localStorage.setItem(KEYS.pending, JSON.stringify(pending));
    }

    function clearPendingVerification() {
        localStorage.removeItem(KEYS.pending);
    }

    function makeVerificationCode() {
        const min = Math.pow(10, VERIFY.CODE_DIGITS - 1);
        const max = Math.pow(10, VERIFY.CODE_DIGITS) - 1;
        return String(Math.floor(min + Math.random() * (max - min + 1)));
    }

    function buildVerificationEmail(name, code) {
        const subject = "Your Stella Stay verification code: " + code;
        const text =
            "Hi " + name + ",\n\n" +
            "Thanks for creating a Stella Stay account!\n\n" +
            "Your verification code is: " + code + "\n\n" +
            "Enter this code within " + VERIFY.EXPIRY_MINUTES + " minutes to activate your account.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "— Stella's Beach House, Patar, Bolinao, Pangasinan";
        return { subject: subject, text: text };
    }

    // Sends the verification code to the user's email.
    // - If window.STELLA_VERIFY_API_URL is set, POSTs { name, email, code }
    //   to that endpoint so a backend can send a REAL email.
    // - Otherwise resolves immediately (demo mode: code is shown on screen).
    // Returns a Promise so callers can swap in EmailJS / fetch easily.
    function sendVerificationEmail(details) {
        const mail = buildVerificationEmail(details.name, details.code);
        // Demo: visible in console + on-screen demo inbox.
        // eslint-disable-next-line no-console
        console.log('[Stella Stay] Verification email to ' + details.email + ': ' + details.code, mail);

        const apiUrl = window.STELLA_VERIFY_API_URL || '';
        if (!apiUrl) return Promise.resolve({ sent: false, demo: true });

        return fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: details.name, email: details.email, code: details.code, subject: mail.subject, text: mail.text })
        }).then(
            () => ({ sent: true, demo: false }),
            () => ({ sent: false, demo: true })
        );
    }

    function buildBookingConfirmationEmail(booking) {
        const guestsText = formatGuests(booking.adults, booking.children);
        const pending = isPendingHold(booking);
        const subject = pending
            ? 'Booking ' + booking.id + ' on hold (24h) — ' + booking.room + " at Stella's Beach House"
            : 'Booking ' + booking.id + ' confirmed — ' + booking.room + " at Stella's Beach House";
        const text =
            'Hi ' + booking.name + ',\n\n' +
            (pending
                ? 'Your Stella Stay booking is ON HOLD for 24 hours.\n\n' +
                  'Please pay the ' + peso(booking.deposit) + ' deposit before ' + formatDateTime(booking.holdUntil) +
                  ', or this hold will be automatically cancelled.\n\n'
                : 'Your Stella Stay booking is confirmed!\n\n') +
            'Booking ID: ' + booking.id + '\n' +
            'Room: ' + booking.room + '\n' +
            (guestsText ? 'Guests: ' + guestsText + '\n' : '') +
            'Check-in: ' + formatDate(booking.checkin) + '\n' +
            'Check-out: ' + formatDate(booking.checkout) + '\n' +
            'Nights: ' + booking.nights + '\n' +
            (pending
                ? 'Total: ' + peso(booking.total) + ' (deposit ' + peso(booking.deposit) + ' due within 24h)\n' +
                  'Balance at check-in: ' + peso(booking.balance) + '\n\n'
                : 'Total: ' + peso(booking.total) + ' (deposit ' + peso(booking.deposit) + ' paid via ' + booking.payment + ')\n' +
                  'Balance at check-in: ' + peso(booking.balance) + '\n\n') +
            'Show this receipt at check-in. Questions? Message 0912 345 6789 with your booking ID.\n\n' +
            "— Stella's Beach House, Purok 1, Barangay Patar, Bolinao, Pangasinan";
        return { subject: subject, text: text };
    }

    // Sends the booking confirmation to the Stella account email.
    // Same pattern as verification: POSTs to window.STELLA_VERIFY_API_URL when
    // configured (real email via backend), otherwise demo mode (console + receipt preview).
    function sendBookingConfirmationEmail(booking) {
        const mail = buildBookingConfirmationEmail(booking);
        // eslint-disable-next-line no-console
        console.log('[Stella Stay] Booking confirmation to ' + booking.email + ':', mail);

        const apiUrl = window.STELLA_VERIFY_API_URL || '';
        if (!apiUrl) return Promise.resolve({ sent: false, demo: true });

        return fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'booking-confirmation', name: booking.name, email: booking.email, booking: booking, subject: mail.subject, text: mail.text })
        }).then(
            () => ({ sent: true, demo: false }),
            () => ({ sent: false, demo: true })
        );
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(KEYS.session) || 'null');
        } catch (error) {
            return null;
        }
    }

    function startSession(user) {
        localStorage.setItem(KEYS.session, JSON.stringify({ name: user.name, email: user.email }));
    }

    function endSession() {
        localStorage.removeItem(KEYS.session);
    }

    function currentUser() {
        const session = getSession();
        return session ? getUsers().find((user) => user.email === session.email) || null : null;
    }

    function newBookingId() {
        return 'ST-' + Date.now().toString(36).toUpperCase();
    }

    const isValidContact = (number) => /^09\d{9}$/.test(number);

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const isCancelled = (booking) => String(booking.status || '').toLowerCase().startsWith('cancelled');

    // ---- 24-hour payment hold policy ----
    // A booking can be held (reserved without payment) for 24 hours.
    // If the guest does not pay within 24h, the hold expires and the
    // booking is automatically cancelled, freeing the room calendar.
    const HOLD_MS = 24 * 60 * 60 * 1000;
    const HOLD_STATUS = 'Pending payment (24h hold)';
    const HOLD_EXPIRED_STATUS = 'Cancelled — payment expired';
    const HOLD_RELEASED_STATUS = 'Cancelled — hold released (no charge)';

    const isPendingHold = (booking) => String(booking.status || '') === HOLD_STATUS;
    const isHoldExpired = (booking) => isPendingHold(booking) && Date.now() > Number(booking.holdUntil || 0);

    // Only live bookings occupy the room: confirmed ones, plus pending holds
    // that have NOT expired yet. Cancelled / expired holds never block dates.
    function blocksCalendar(booking) {
        if (!booking || isCancelled(booking)) return false;
        if (isPendingHold(booking)) return !isHoldExpired(booking);
        return true;
    }

    function formatDateTime(ts) {
        const date = new Date(Number(ts));
        if (isNaN(date)) return '—';
        return date.toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function holdRemainingText(holdUntil) {
        const left = Number(holdUntil || 0) - Date.now();
        if (left <= 0) return 'expired';
        const hours = Math.floor(left / 3600000);
        const mins = Math.floor((left % 3600000) / 60000);
        if (hours <= 0) return mins + ' minute' + (mins === 1 ? '' : 's') + ' left';
        return hours + 'h ' + mins + 'm left';
    }

    // Marks every unpaid hold past its 24h deadline as cancelled.
    // Returns how many bookings expired. Runs on every page load + timer.
    function sweepExpiredHolds() {
        const bookings = getReservations();
        let changed = 0;
        bookings.forEach((booking) => {
            if (isHoldExpired(booking)) {
                booking.status = HOLD_EXPIRED_STATUS;
                changed += 1;
            }
        });
        if (changed) saveReservations(bookings);
        return changed;
    }

    function askToConfirm(options, onYes) {

        const previous = document.getElementById('confirmDialog');
        if (previous) previous.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'confirmDialog';
        backdrop.className = 'confirm-backdrop';
        backdrop.innerHTML =
            '<div class="confirm-box">' +
                '<h3></h3>' +
                '<p></p>' +
                '<div class="confirm-actions">' +
                    '<button type="button" class="confirm-btn confirm-btn-stay"></button>' +
                    '<button type="button" class="confirm-btn confirm-btn-go"></button>' +
                '</div>' +
            '</div>';

        backdrop.querySelector('h3').textContent = options.title;
        backdrop.querySelector('p').textContent = options.body;
        const stayButton = backdrop.querySelector('.confirm-btn-stay');
        const goButton = backdrop.querySelector('.confirm-btn-go');
        stayButton.textContent = options.stayLabel;
        goButton.textContent = options.goLabel;
        goButton.classList.toggle('danger', !!options.danger);

        document.body.appendChild(backdrop);

        const dismiss = () => backdrop.remove();

        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) dismiss();
        });
        stayButton.addEventListener('click', dismiss);
        goButton.addEventListener('click', () => {
            dismiss();
            onYes();
        });
        document.addEventListener('keydown', function onEscape(event) {
            if (event.key === 'Escape') {
                dismiss();
                document.removeEventListener('keydown', onEscape);
            }
        });
    }

    function markActiveNavLink() {
        const thisPage = (location.pathname.split('/').pop() || 'landingpage.html').toLowerCase();
        const isRoomPage = thisPage === 'rooms.html' || thisPage.startsWith('room-');
        const wanted = isRoomPage ? '#rooms' : (thisPage === 'landingpage.html' ? '#home' : thisPage);

        $$('nav a').forEach((link) => {
            if (link.classList.contains('navbar-brand')) return;
            const href = (link.getAttribute('href') || '').toLowerCase();
            const matches = wanted.startsWith('#') ? href.endsWith(wanted) : href === wanted;
            if (matches) link.classList.add('active');
        });
    }

    function initMobileMenu() {
        const nav = $('nav');
        if (!nav || $('.nav-toggle') || nav.querySelector('.navbar-toggler')) return;

        if (!$('nav a')) return;

        const button = document.createElement('button');
        button.className = 'nav-toggle';
        button.type = 'button';
        button.setAttribute('aria-label', 'Toggle menu');
        button.setAttribute('aria-expanded', 'false');
        button.textContent = '☰';
        nav.insertBefore(button, nav.children[1] || null);

        function setOpen(isOpen) {
            nav.classList.toggle('open', isOpen);
            button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }

        button.addEventListener('click', () => setOpen(!nav.classList.contains('open')));

        nav.addEventListener('click', (event) => {
            if (event.target.tagName === 'A') setOpen(false);
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setOpen(false);
        });
    }

    function initSmoothScroll() {
        document.addEventListener('click', (event) => {
            const link = event.target.closest('a[href^="#"]');
            if (!link) return;

            const targetId = link.getAttribute('href');
            if (targetId.length < 2) return;

            const target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            const nav = $('nav');
            const offset = (nav ? nav.offsetHeight : 70) + 12;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: top, behavior: 'smooth' });
            if (nav && nav.classList.contains('open')) nav.classList.remove('open');
            history.replaceState(null, '', targetId);
        });
    }

    // Turns the landing-page photo strip into a seamless auto-scrolling
    // marquee: photos move into a track, duplicated once so the -50% loop
    // has no visible jump. Pauses on hover via CSS.
    function initGalleryMarquee() {
        const gallery = document.querySelector('.gallery');
        if (!gallery || gallery.querySelector('.gallery-track')) return;
        const photos = Array.from(gallery.querySelectorAll('img'));
        if (photos.length < 2) return;

        const track = document.createElement('div');
        track.className = 'gallery-track';
        photos.forEach((img) => track.appendChild(img));
        photos.forEach((img) => {
            const copy = img.cloneNode();
            copy.setAttribute('aria-hidden', 'true');
            copy.alt = '';
            track.appendChild(copy);
        });
        gallery.appendChild(track);
    }

    function initRevealOnScroll() {
        const parts = document.querySelectorAll(
            '.about, .room-card, .feature-card, .contact-row, .contact-form, ' +
            '.rooms h2, .features h2, .contact h2'
        );
        if (!('IntersectionObserver' in window) || !parts.length) return;

        parts.forEach((part) => part.classList.add('reveal'));
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        parts.forEach((part) => observer.observe(part));
    }

    function initDialogFocusTrap() {
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;

            const openDialogElement = $$('.modal-backdrop').find((dialog) => !dialog.hidden);
            if (!openDialogElement) return;

            const focusable = Array.from(
                openDialogElement.querySelectorAll('button, input, select, textarea, a[href]')
            ).filter((element) => !element.disabled && element.offsetParent !== null);
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        });
    }

    function validateRegistration(details) {
        const name = (details.name || '').trim();
        const email = (details.email || '').trim().toLowerCase();
        const password = details.password || '';
        const confirmPassword = details.confirmPassword || '';

        if (!name || !email || !password) {
            return { ok: false, message: 'Please fill in all fields.' };
        }
        if (!isValidEmail(email)) {
            return { ok: false, message: 'Enter a valid email address so we can send your code.' };
        }
        if (password.length < 6) {
            return { ok: false, message: 'Password must be at least 6 characters.' };
        }
        if (password !== confirmPassword) {
            return { ok: false, message: 'Passwords do not match.' };
        }

        if (getUsers().some((user) => user.email === email)) {
            return { ok: false, message: 'That email is already registered. Try logging in.' };
        }

        return { ok: true, name: name, email: email, password: password };
    }

    // Step 1 of signup: validate + generate a code + "send" verification email.
    // The account is NOT created yet — it is stored as pending until verified.
    function beginEmailVerification(details) {
        const checked = validateRegistration(details);
        if (!checked.ok) return checked;

        const code = makeVerificationCode();
        const pending = {
            name: checked.name,
            email: checked.email,
            pw: checked.password,
            code: code,
            expiresAt: Date.now() + VERIFY.EXPIRY_MINUTES * 60 * 1000,
            attempts: 0,
            created: new Date().toISOString()
        };
        savePendingVerification(pending);
        sendVerificationEmail(pending);
        return { ok: true, email: checked.email, message: 'Verification code sent to ' + checked.email + '.' };
    }

    // Step 2 of signup: user types the 6-digit code from their email.
    function confirmEmailVerification(email, inputCode) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const code = (inputCode || '').replace(/\D/g, '');
        const pending = getPendingVerification();

        if (!pending || pending.email !== cleanEmail) {
            return { ok: false, message: 'No pending verification for this email. Please register again.' };
        }
        if (Date.now() > pending.expiresAt) {
            clearPendingVerification();
            return { ok: false, expired: true, message: 'Code expired. Please resend a new code.' };
        }
        if (pending.attempts >= VERIFY.MAX_ATTEMPTS) {
            clearPendingVerification();
            return { ok: false, message: 'Too many wrong attempts. Please register again.' };
        }
        if (code.length !== VERIFY.CODE_DIGITS || code !== pending.code) {
            pending.attempts += 1;
            savePendingVerification(pending);
            const left = VERIFY.MAX_ATTEMPTS - pending.attempts;
            return { ok: false, message: 'Wrong code. ' + left + ' attempt' + (left === 1 ? '' : 's') + ' left.' };
        }

        // Code correct — create the real account now.
        const users = getUsers();
        if (users.some((user) => user.email === cleanEmail)) {
            clearPendingVerification();
            return { ok: false, message: 'That email is already registered. Try logging in.' };
        }
        const user = { name: pending.name, email: pending.email, pw: pending.pw, contact: '', verified: true, created: new Date().toISOString() };
        users.push(user);
        saveUsers(users);
        clearPendingVerification();
        startSession(user);
        return { ok: true, message: 'Email verified! Welcome, ' + user.name + '!', user: user };
    }

    function resendVerificationCode(email) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const pending = getPendingVerification();
        if (!pending || pending.email !== cleanEmail) {
            return { ok: false, message: 'No pending verification for this email. Please register again.' };
        }
        pending.code = makeVerificationCode();
        pending.expiresAt = Date.now() + VERIFY.EXPIRY_MINUTES * 60 * 1000;
        pending.attempts = 0;
        savePendingVerification(pending);
        sendVerificationEmail(pending);
        return { ok: true, email: pending.email, code: pending.code, message: 'New code sent to ' + pending.email + '.' };
    }

    // Back-compat wrapper: creates a verified account directly
    // (used only after verification, or for legacy seeded accounts).
    function createAccount(details) {
        const checked = validateRegistration(details);
        if (!checked.ok) return checked;
        const users = getUsers();
        const user = { name: checked.name, email: checked.email, pw: checked.password, contact: '', verified: true, created: new Date().toISOString() };
        users.push(user);
        saveUsers(users);
        startSession(user);
        return { ok: true, message: 'Welcome, ' + checked.name + '! Your account is ready.' };
    }

    function findUserByLogin(email, password) {
        const cleanEmail = (email || '').trim().toLowerCase();
        return getUsers().find((user) => user.email === cleanEmail && user.pw === password) || null;
    }

    function logOut() {
        endSession();
        location.href = 'landingpage.html';
    }

    function askToLogOut() {
        askToConfirm(
            {
                title: 'Log out?',
                body: 'Your bookings stay saved to your account, but the account perks (your details filled in for you, your private list) turn off until you log in again.',
                stayLabel: 'Stay',
                goLabel: 'Log out',
                danger: false
            },
            logOut
        );
    }

    // Step 1: confirmation carrying what deletion does. Step 2 (password
    // dialog) proves it is really the account owner clicking.
    function askToDeleteAccount() {
        if (!currentUser()) return;
        askToConfirm(
            {
                title: 'Delete your account?',
                body: 'Deleting removes your account and releases any unpaid 24-hour holds. Paid bookings stay with the hotel as records. This cannot be undone.',
                stayLabel: 'Keep Account',
                goLabel: 'Continue',
                danger: true
            },
            openDeletePasswordDialog
        );
    }

    function openDeletePasswordDialog() {
        const user = currentUser();
        if (!user) return;

        const previous = document.getElementById('deleteAccountDialog');
        if (previous) previous.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'deleteAccountDialog';
        backdrop.className = 'confirm-backdrop';
        backdrop.innerHTML =
            '<div class="confirm-box">' +
                '<h3>Confirm deletion</h3>' +
                '<p>Enter your password to permanently delete <strong></strong>.</p>' +
                '<input type="password" data-delpw placeholder="Your password" autocomplete="current-password" />' +
                '<p class="form-msg error" data-delerr hidden></p>' +
                '<div class="confirm-actions">' +
                    '<button type="button" class="confirm-btn confirm-btn-stay" data-delcancel>Cancel</button>' +
                    '<button type="button" class="confirm-btn confirm-btn-go danger" data-delgo>Delete Account</button>' +
                '</div>' +
            '</div>';
        backdrop.querySelector('strong').textContent = user.email;
        document.body.appendChild(backdrop);

        const input = backdrop.querySelector('[data-delpw]');
        const showErr = (text) => {
            const box = backdrop.querySelector('[data-delerr]');
            if (box) {
                box.hidden = !text;
                box.textContent = text || '';
            }
        };
        const dismiss = () => backdrop.remove();
        setTimeout(() => input.focus(), 60);

        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop || event.target.closest('[data-delcancel]')) {
                dismiss();
                return;
            }
            if (!event.target.closest('[data-delgo]')) return;
            const me = currentUser();
            if (!me) {
                dismiss();
                return;
            }
            if ((input.value || '') !== me.pw) {
                showErr('Wrong password. Your account was NOT deleted.');
                input.value = '';
                input.focus();
                return;
            }
            dismiss();
            deleteCurrentAccount();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                backdrop.querySelector('[data-delgo]').click();
            }
        });
        document.addEventListener('keydown', function onEscape(event) {
            if (event.key === 'Escape') {
                dismiss();
                document.removeEventListener('keydown', onEscape);
            }
        });
    }

    function deleteCurrentAccount() {
        const user = currentUser();
        if (!user) return;

        // Release their unpaid holds so the rooms free up for others.
        // Paid bookings stay in storage as hotel records.
        const bookings = getReservations();
        bookings.forEach((booking) => {
            const owner = (booking.by || booking.email || '').toLowerCase();
            if (owner === user.email.toLowerCase() && isPendingHold(booking)) {
                booking.status = HOLD_RELEASED_STATUS;
            }
        });
        saveReservations(bookings);

        saveUsers(getUsers().filter((one) => one.email !== user.email));
        endSession();
        location.href = 'landingpage.html';
    }

    let openLoginPopup = () => {};
    let afterLogin = null;

    const canPopupHere = () => Boolean($('#loginModal'));

    function runAfterLogin() {
        const work = afterLogin;
        afterLogin = null;
        if (work) work();
    }

    function askForAccount(thenDo, resume) {
        afterLogin = thenDo || null;

        if (canPopupHere()) {
            openLoginPopup();
            return;
        }

        location.href = buildLoginLink(resume);
    }

    function buildLoginLink(resume) {
        const query = new URLSearchParams();
        query.set('login', '1');

        if (resume && resume.room) query.set('reserve', resume.room);
        if (resume && resume.checkin) query.set('cin', resume.checkin);
        if (resume && resume.checkout) query.set('cout', resume.checkout);
        if (resume && resume.adults !== undefined && resume.adults !== '') query.set('adults', resume.adults);
        if (resume && resume.children !== undefined && resume.children !== '') query.set('children', resume.children);

        return 'landingpage.html?' + query.toString();
    }

    function initAccountNav() {
        $$('nav a[data-logout-link], nav button[data-logout-link]').forEach((link) => {
            link.hidden = true;
        });

        if (!getSession()) return;

        const session = getSession();
        const firstName = (session.name || session.email || 'Guest').split(' ')[0];
        $$('nav a[data-login]').forEach((link) => {
            link.textContent = 'Hi, ' + firstName;
            link.setAttribute('href', 'account.html');
            link.removeAttribute('data-login');
            link.setAttribute('data-account-link', '');
        });

        $$('nav a[href="account.html"]').forEach((link) => {
            if (!link.hasAttribute('data-account-link')) link.hidden = true;
        });

        markActiveNavLink();

        $$('nav a[data-logout-link], nav button[data-logout-link]').forEach((link) => {
            link.hidden = false;
            link.addEventListener('click', (event) => {
                event.preventDefault();
                askToLogOut();
            });
        });
    }

    function initLogoutLinks() {
        $$('[data-logout]').forEach((link) => {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                askToLogOut();
            });
        });
    }

    function initLoginDialog() {
        const dialog = $('#loginModal');
        if (!dialog) return;
        const form = $('#quickLoginForm');

        const open = () => {
            openDialog(dialog);
            const emailBox = $('#qLoginEmail');
            if (emailBox) emailBox.focus();
        };
        const close = () => closeDialog(dialog);

        openLoginPopup = open;

        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-login]');
            if (link) {
                if (getSession()) return;
                event.preventDefault();
                open();
                return;
            }
            if (event.target.closest('[data-close-login]') || event.target === dialog) close();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) close();
        });

        if (new URLSearchParams(location.search).get('login') !== null && !getSession()) open();

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const email = $('#qLoginEmail').value;
                const user = findUserByLogin(email, $('#qLoginPassword').value);
                if (!user) {
                    // Maybe they registered but never verified? Point them to the code.
                    const pending = getPendingVerification();
                    const cleanEmail = (email || '').trim().toLowerCase();
                    if (pending && pending.email === cleanEmail) {
                        close();
                        showRegisterVerifyStep(pending.email);
                        return;
                    }
                    return showMessage(form, 'Invalid email or password. Register first if you are new.', false);
                }
                if (user.verified === false) {
                    // Re-issue a fresh code for this existing (unverified) account.
                    const fresh = {
                        name: user.name,
                        email: user.email,
                        pw: user.pw,
                        code: makeVerificationCode(),
                        expiresAt: Date.now() + VERIFY.EXPIRY_MINUTES * 60 * 1000,
                        attempts: 0,
                        created: new Date().toISOString()
                    };
                    savePendingVerification(fresh);
                    sendVerificationEmail(fresh);
                    close();
                    showRegisterVerifyStep(fresh.email);
                    return;
                }
                startSession(user);
                showMessage(form, 'Welcome, ' + user.name + '!', true);
                initAccountNav();
                setTimeout(() => {
                    close();
                    runAfterLogin();
                }, 700);
            });
        }
    }

    // Shows the "enter the code we emailed you" step inside #registerModal.
    // Works even if called from the login dialog (unverified account).
    function showRegisterVerifyStep(email) {
        const dialog = $('#registerModal');
        if (!dialog) return;
        const stepForm = $('#registerStepForm');
        const stepVerify = $('#registerStepVerify');
        if (stepForm) stepForm.hidden = true;
        if (stepVerify) stepVerify.hidden = false;

        const label = $('#verifyEmailText');
        if (label) label.textContent = email || 'your email';

        refreshDemoCodeBox();

        const title = $('#registerTitle');
        if (title) title.textContent = 'Verify Your Email';

        openDialog(dialog);
        const codeBox = $('#qRegCode');
        if (codeBox) {
            codeBox.value = '';
            setTimeout(() => codeBox.focus(), 60);
        }
        updateVerifyExpiryText();
    }

    function showRegisterFormStep() {
        const stepForm = $('#registerStepForm');
        const stepVerify = $('#registerStepVerify');
        if (stepForm) stepForm.hidden = false;
        if (stepVerify) stepVerify.hidden = true;
        const title = $('#registerTitle');
        if (title) title.textContent = 'Create Account';
    }

    function refreshDemoCodeBox() {
        const pending = getPendingVerification();
        const box = $('#demoCodeBox');
        if (!box) return;
        // Demo mode only: reveal the code on screen so the feature is testable
        // without a backend. When window.STELLA_VERIFY_API_URL is set (real
        // email sending), hide this box.
        if (pending && !window.STELLA_VERIFY_API_URL) {
            box.hidden = false;
            const text = $('#demoCodeText');
            if (text) text.textContent = pending.code;
            const hint = $('#demoCodeHint');
            if (hint) hint.textContent = 'Sent to ' + pending.email + ' (demo).';
        } else {
            box.hidden = true;
        }
    }

    function updateVerifyExpiryText() {
        const pending = getPendingVerification();
        const line = $('#verifyExpiryText');
        if (!line) return;
        if (!pending) {
            line.textContent = 'Code expires in ' + VERIFY.EXPIRY_MINUTES + ' minutes.';
            return;
        }
        const minsLeft = Math.max(0, Math.ceil((pending.expiresAt - Date.now()) / 60000));
        line.textContent = minsLeft > 0
            ? 'Code expires in about ' + minsLeft + ' minute' + (minsLeft === 1 ? '' : 's') + '.'
            : 'This code has expired — tap Resend Code.';
    }

    function initRegisterDialog() {
        const dialog = $('#registerModal');
        if (!dialog) return;
        const form = $('#quickRegisterForm');
        const verifyForm = $('#quickVerifyForm');

        const open = () => {
            // If they started registering before, drop them on the verify step.
            const pending = getPendingVerification();
            if (pending && Date.now() <= pending.expiresAt) {
                showRegisterVerifyStep(pending.email);
                return;
            }
            showRegisterFormStep();
            openDialog(dialog);
            const nameBox = $('#qRegName');
            if (nameBox) nameBox.focus();
        };
        const close = () => closeDialog(dialog);

        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-register]');
            if (link) {
                if (getSession()) return;
                event.preventDefault();
                open();
                return;
            }
            if (event.target.closest('[data-close-register]') || event.target === dialog) close();

            if (event.target.closest('#changeEmailBtn') && !dialog.hidden) {
                showRegisterFormStep();
                const emailBox = $('#qRegEmail');
                const pending = getPendingVerification();
                if (emailBox && pending) emailBox.value = pending.email;
                if (emailBox) emailBox.focus();
            }

            if (event.target.closest('#resendCodeBtn') && !dialog.hidden) {
                const pending = getPendingVerification();
                if (!pending) {
                    if (verifyForm) showMessage(verifyForm, 'No pending verification. Please register again.', false);
                    return;
                }
                const result = resendVerificationCode(pending.email);
                if (!result.ok) {
                    if (verifyForm) showMessage(verifyForm, result.message, false);
                    return;
                }
                refreshDemoCodeBox();
                updateVerifyExpiryText();
                if (verifyForm) showMessage(verifyForm, result.message + ' Check your inbox (and spam).', true);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) close();
        });

        if (new URLSearchParams(location.search).get('register') !== null && !getSession()) open();

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                // STEP 1: validate + send verification code to email.
                const result = beginEmailVerification({
                    name: $('#qRegName').value,
                    email: $('#qRegEmail').value,
                    password: $('#qRegPassword').value,
                    confirmPassword: $('#qRegPassword2').value
                });
                if (!result.ok) return showMessage(form, result.message, false);

                clearMessage(form);
                showRegisterVerifyStep(result.email);
                if (verifyForm) showMessage(verifyForm, 'Verification code sent to ' + result.email + '. Enter it below.', true);
            });
        }

        if (verifyForm) {
            // Auto-uppercase/numeric only + auto-submit at 6 digits for nicer UX.
            const codeInput = $('#qRegCode');
            if (codeInput) {
                codeInput.addEventListener('input', () => {
                    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, VERIFY.CODE_DIGITS);
                    if (codeInput.value.length === VERIFY.CODE_DIGITS) {
                        const btn = verifyForm.querySelector('button[type="submit"]');
                        if (btn) btn.focus();
                    }
                });
            }

            verifyForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const pending = getPendingVerification();
                const email = pending ? pending.email : ($('#qRegEmail').value || '');
                // STEP 2: verify the emailed code -> account is created + logged in.
                const result = confirmEmailVerification(email, $('#qRegCode').value);
                if (!result.ok) {
                    if (result.expired) updateVerifyExpiryText();
                    return showMessage(verifyForm, result.message, false);
                }

                showMessage(verifyForm, result.message, true);
                initAccountNav();
                setTimeout(() => {
                    close();
                    showRegisterFormStep();
                    if (form) form.reset();
                    verifyForm.reset();
                    runAfterLogin();
                }, 900);
            });
        }
    }

    function initAccountPage() {
        const nameBox = $('#accName');
        if (!nameBox) return;

        const user = currentUser();
        const session = getSession();

        nameBox.textContent = user ? user.name : (session ? session.name : 'Guest');
        const emailEl = $('#accEmail');
        if (emailEl) {
            emailEl.textContent = user ? user.email : (session ? session.email : '-');
            // Show email-verified badge (legacy accounts without the flag count as verified).
            const prev = document.getElementById('emailVerifiedBadge');
            if (prev) prev.remove();
            if (user && user.verified !== false) {
                const badge = document.createElement('span');
                badge.id = 'emailVerifiedBadge';
                badge.className = 'status-badge';
                badge.style.marginLeft = '8px';
                badge.textContent = 'Email verified ✓';
                emailEl.after(badge);
            }
        }

        const contactText = $('#accContact');
        if (contactText) contactText.textContent = (user && user.contact) || 'Not set yet';

        function renderAccountAvatar() {
            const holder = $('#accAvatar');
            if (!holder) return;
            const me = currentUser();
            holder.innerHTML = '';
            holder.appendChild(buildAvatarNode(
                me ? me.name : 'Guest',
                me && me.avatar ? me.avatar : null,
                true
            ));
        }
        renderAccountAvatar();

        const avatarInput = $('#accAvatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', () => {
                const me = currentUser();
                if (!me) {
                    avatarInput.value = '';
                    return;
                }
                const file = avatarInput.files && avatarInput.files[0];
                if (!file) return;
                fileToAvatarImage(file).then(
                    (img) => {
                        const users = getUsers();
                        const saved = users.find((one) => one.email === me.email);
                        if (!saved) return;
                        try {
                            saved.avatar = img;
                            saveUsers(users);
                        } catch (error) {
                            if (form) showMessage(form, 'Photo is too large to save. Try a smaller one.', false);
                            return;
                        }
                        avatarInput.value = '';
                        renderAccountAvatar();
                        if (form) showMessage(form, 'Profile photo updated! It now shows beside your name on reviews.', true);
                    },
                    () => {
                        avatarInput.value = '';
                        if (form) showMessage(form, 'Could not read that photo. Try another image (JPG/PNG, max 8MB).', false);
                    }
                );
            });
        }

        const avatarRemove = $('#accAvatarRemove');
        if (avatarRemove) {
            avatarRemove.addEventListener('click', () => {
                const me = currentUser();
                if (!me) return;
                const users = getUsers();
                const saved = users.find((one) => one.email === me.email);
                if (saved) {
                    saved.avatar = null;
                    saveUsers(users);
                }
                renderAccountAvatar();
            });
        }

        const deleteBtn = $('#deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (!currentUser()) return;
                askToDeleteAccount();
            });
        }

        const form = $('#accountForm');
        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!user) return showMessage(form, 'Log in first to update your account.', false);

            const contact = $('#accContactInput').value.trim();
            if (contact && !isValidContact(contact)) {
                return showMessage(form, 'Contact must be 11 digits starting with 09.', false);
            }

            const users = getUsers();
            const saved = users.find((one) => one.email === user.email);
            saved.contact = contact;
            saveUsers(users);
            if (contactText) contactText.textContent = contact || 'Not set yet';
            showMessage(form, 'Account updated!', true);
        });
    }

    function addBookingDialog() {
        if (document.getElementById('reserveModal')) return;

        const holder = document.createElement('div');
        holder.innerHTML = `
        <div class="modal-backdrop" id="reserveModal" hidden>
            <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
                <button type="button" class="modal-close" data-close aria-label="Close">&times;</button>
                <div class="modal-grid">

                    <aside class="modal-room">
                        <div class="gallery-main">
                            <img id="mRoomImg" src="scene.jpg" alt="Selected room" />
                            <span class="photo-count" id="photoCount">1 / 3</span>
                            <button type="button" class="gal-arrow left" id="galPrev" aria-label="Previous photo">&lsaquo;</button>
                            <button type="button" class="gal-arrow right" id="galNext" aria-label="Next photo">&rsaquo;</button>
                        </div>
                        <div class="modal-thumbs" id="mThumbs" role="tablist" aria-label="Room photos"></div>
                        <span class="badge" id="mRoomBadge">Best for couples</span>
                        <h2 id="modalTitle">Book Your Stay</h2>
                        <p class="muted" id="mRoomMeta">Good for 2 persons</p>
                        <p><strong id="mRoomPrice">&#8369;2,000 per night</strong></p>
                        <p class="muted">A Stella Stay account is needed to book, so we will ask you to log in or sign up before payment. Pay-first: only paid bookings occupy the room.</p>
                    </aside>

                    <div class="modal-form">
                        <div id="modalFormView">
                            <p class="label">QUICK RESERVE</p>
                            <p class="muted" id="quickSessionNote" hidden></p>
                            <form id="quickReserveForm" novalidate>

                                <p class="steps">
                                    <span id="stepDot0" class="step-dot current">1 Check</span> &rarr;
                                    <span id="stepDot1" class="step-dot">2 Details</span> &rarr;
                                    <span id="stepDot2" class="step-dot">3 Payment</span>
                                </p>

                                <div id="payStep0">
                                    <label for="qRoom">Room Type</label>
                                    <select id="qRoom" required>
                                        <option value="">Select a room</option>
                                    </select>
                                    <div class="modal-row">
                                        <div>
                                            <label for="qAdults">Adults</label>
                                            <input id="qAdults" type="number" min="1" max="15" step="1" value="2" required />
                                        </div>
                                        <div>
                                            <label for="qChildren">Children</label>
                                            <input id="qChildren" type="number" min="0" max="14" step="1" value="0" required />
                                        </div>
                                    </div>
                                    <p class="muted" id="guestHint">Select a room to see how many guests it fits.</p>
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
                                    <div id="availResult" aria-live="polite">Pick a room and dates, then check availability.</div>
                                    <button type="button" class="main-button modal-submit" id="checkAvail">Check Availability</button>
                                </div>

                                <div id="payStep1" hidden>
                                    <p class="success-line" id="bookSummary" aria-live="polite"></p>
                                    <label for="qName">Full Name</label>
                                    <input id="qName" type="text" placeholder="Enter your name" required autocomplete="name" />
                                    <label for="qEmail">Gmail / Email (your Stella account)</label>
                                    <input id="qEmail" type="email" placeholder="you@gmail.com" required autocomplete="email" readonly />
                                    <p class="muted" id="bookEmailNote">Booking confirmation will be sent to your Stella account email.</p>
                                    <label for="qContact">Contact Number</label>
                                    <input id="qContact" type="tel" pattern="09[0-9]{9}" maxlength="11" placeholder="09XXXXXXXXX" required />
                                    <div class="modal-row">
                                        <button type="button" class="pay-nav pay-nav-red" id="backToStep0">Dates</button>
                                        <button type="button" class="pay-nav main-button" id="toPayStep">Continue to Payment</button>
                                    </div>
                                </div>

                                <div id="payStep2" hidden>
                                    <p class="muted no-top-margin">Only <strong>50% deposit</strong> reserves your room today &mdash; balance due at check-in.</p>

                                    <div class="pay-methods" role="tablist" aria-label="Payment method">
                                        <button type="button" class="pay-method current" data-pay="GCash">GCash</button>
                                        <button type="button" class="pay-method" data-pay="Card">Card</button>
                                        <button type="button" class="pay-method" data-pay="Bank">Bank</button>
                                    </div>

                                    <div class="pay-box" id="payBoxGcash">
                                        <p class="label">PAY WITH GCASH</p>
                                        <p class="pay-total" id="payTotalLine">Total: &mdash;</p>
                                        <p>Send payment to <strong>0912 345 6789</strong><br /><span class="muted">Stella's Beach House &bull; QR code coming soon</span></p>
                                    </div>

                                    <div class="pay-box" id="payBoxCard" hidden>
                                        <p class="label">PAY WITH CARD</p>
                                        <p class="pay-total">Total: <span class="pay-total-val">&mdash;</span></p>
                                        <p class="muted">Demo only &mdash; no real charge. Enter card details as printed.</p>
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
                                        <p class="pay-total">Total: <span class="pay-total-val">&mdash;</span></p>
                                        <p>Transfer to <strong>Stella's Beach House &bull; BDO &bull;&bull; 1234</strong><br /><span class="muted">Full account details sent with confirmation email.</span></p>
                                        <label for="qBankReceipt">Photo of Bank Receipt (required)</label>
                                        <input id="qBankReceipt" type="file" accept="image/*" />
                                        <p class="muted">Take a photo of your deposit slip / transfer confirmation and upload it here.</p>
                                        <img id="qBankReceiptPreview" class="receipt-upload-preview" alt="Bank receipt preview" hidden />
                                    </div>

                                    <label for="qRef" id="qRefLabel">GCash Reference Number</label>
                                    <input id="qRef" type="text" inputmode="numeric" maxlength="13" placeholder="e.g. 1234567890123" required />
                                    <p class="muted">No ref = no reservation. Unpaid holds never block the calendar.</p>
                                    <div class="modal-row">
                                        <button type="button" class="pay-nav pay-nav-red" id="backToStep1">Back</button>
                                        <button type="submit" class="pay-nav main-button">Confirm &amp; Pay Now</button>
                                    </div>
                                    <button type="button" class="second-button modal-submit" id="holdBookingBtn">Hold My Booking for 24 Hours (Pay Later)</button>
                                    <p class="muted">Not ready to pay? Hold this room for 24 hours — pay before the deadline or the hold is automatically cancelled.</p>
                                </div>
                            </form>
                        </div>

                        <div id="modalDoneView" hidden>
                            <div class="receipt">
                                <p class="label">BOOKING RECEIPT &#10003;</p>
                                <h2>Stella's Beach House</h2>
                                <p class="muted">Purok 1, Barangay Patar, Bolinao, Pangasinan &bull; 0912 345 6789</p>
                                <hr />
                                <dl>
                                    <div><dt>Booking ID</dt><dd id="rId">&mdash;</dd></div>
                                    <div><dt>Guest</dt><dd id="rName">&mdash;</dd></div>
                                    <div><dt>Email</dt><dd id="rEmail">&mdash;</dd></div>
                                    <div><dt>Room</dt><dd id="rRoom">&mdash;</dd></div>
                                    <div><dt>Guests</dt><dd id="rGuests">&mdash;</dd></div>
                                    <div><dt>Check-in</dt><dd id="rIn">&mdash;</dd></div>
                                    <div><dt>Check-out</dt><dd id="rOut">&mdash;</dd></div>
                                    <div><dt>Rate</dt><dd id="rRate">&mdash;</dd></div>
                                    <div><dt>Nights</dt><dd id="rNights">&mdash;</dd></div>
                                    <div><dt>Payment</dt><dd id="rPay">&mdash;</dd></div>
                                    <div><dt>Reference</dt><dd id="rRef">&mdash;</dd></div>
                                    <div><dt>Deposit Paid (50%)</dt><dd id="rDep">&mdash;</dd></div>
                                    <div><dt>Balance at Check-in</dt><dd id="rBal">&mdash;</dd></div>
                                    <div class="total"><dt>Total</dt><dd id="rTotal">&mdash;</dd></div>
                                    <div><dt>Status</dt><dd id="rStatus">Confirmed &#10003;</dd></div>
                                </dl>
                                <div class="receipt-photo" id="rReceiptWrap" hidden>
                                    <p class="label">BANK RECEIPT PHOTO</p>
                                    <img id="rReceiptImg" alt="Bank receipt photo" />
                                </div>
                                <hr />
                                <p class="muted" id="modalDoneText">Show this receipt at check-in.</p>
                                <div class="mail-preview" id="bookingMailPreview" hidden>
                                    <p class="label">EMAIL CONFIRMATION SENT &#10003;</p>
                                    <p><strong>To:</strong> <span id="bookingMailTo">&mdash;</span></p>
                                    <p><strong>Subject:</strong> <span id="bookingMailSubject">&mdash;</span></p>
                                    <p class="muted" id="bookingMailBody"></p>
                                </div>
                                <div class="modal-row">
                                    <button type="button" class="second-button modal-submit" id="printReceipt">&#128424; Print</button>
                                    <button type="button" class="main-button modal-submit" data-close>Done</button>
                                </div>
                                <p><a href="my-reservations.html">View My Reservations &rarr;</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.appendChild(holder.firstElementChild);
    }

    function initBookingDialog() {
        addBookingDialog();

        const dialog = $('#reserveModal');
        if (!dialog) return;

        const form = $('#quickReserveForm');
        const roomSelect = $('#qRoom');
        const checkIn = $('#qCheckin');
        const checkOut = $('#qCheckout');
        const formView = $('#modalFormView');
        const doneView = $('#modalDoneView');

        const today = toIsoDate(new Date());
        if (checkIn) checkIn.min = today;
        if (checkOut) checkOut.min = today;

        // The select value is a sub-room key (e.g. 'couples-garden').
        // Legacy category names ('Couples Room') still resolve for old links.
        function selectedRoom() {
            if (!roomSelect || !roomSelect.value) return '';
            return roomSelect.value;
        }

        function selectedSubRoom() {
            return subRoomByKey(selectedRoom());
        }

        function selectedDisplay() {
            const sub = selectedSubRoom();
            return sub ? subRoomDisplay(sub) : '';
        }

        function populateRoomSelect(onlyCategory, preselectKey) {
            if (!roomSelect) return;
            roomSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select a room';
            roomSelect.appendChild(placeholder);
            // Flat list, no category headers — the list is already filtered to
            // one category, so the header row would just be clutter.
            Object.keys(ROOM_OPTIONS).forEach((category) => {
                if (onlyCategory && category !== onlyCategory) return;
                ROOM_OPTIONS[category].forEach((opt) => {
                    if (!opt.available) return;
                    const el = document.createElement('option');
                    el.value = opt.key;
                    el.textContent = onlyCategory
                        ? opt.name + ' - ' + peso(opt.price)
                        : category + ' — ' + opt.name + ' - ' + peso(opt.price);
                    if (opt.key === preselectKey) el.selected = true;
                    roomSelect.appendChild(el);
                });
            });
            if (!preselectKey) roomSelect.selectedIndex = 0;
        }

        function nights() {
            return nightsBetween(checkIn.value, checkOut.value);
        }

        function roomCapacity(roomKey) {
            return capacityForKey(roomKey);
        }

        function readGuests() {
            const adultsEl = $('#qAdults');
            const childrenEl = $('#qChildren');
            const adults = adultsEl ? Math.floor(Number(adultsEl.value)) : NaN;
            const children = childrenEl ? Math.floor(Number(childrenEl.value)) : 0;
            return { adults: adults, children: children, total: (isNaN(adults) ? NaN : adults + (isNaN(children) ? 0 : children)) };
        }

        function guestError(roomKey) {
            const capacity = roomCapacity(roomKey);
            const guests = readGuests();
            if (!roomKey) return null;
            if (isNaN(guests.adults) || guests.adults < 1) return 'Enter how many adults (at least 1).';
            if (isNaN(guests.children) || guests.children < 0) return 'Enter how many children (0 or more).';
            if (capacity && guests.total > capacity) {
                const sub = subRoomByKey(roomKey);
                const label = sub ? subRoomDisplay(sub) : roomKey;
                return label + ' fits up to ' + capacity + ' guest' + (capacity === 1 ? '' : 's') +
                    ' — you entered ' + guestLabel(guests) + '. Please pick a bigger room or fewer guests.';
            }
            return null;
        }

        function guestLabel(guests) {
            if (!guests || isNaN(guests.total)) return '';
            return guests.total + ' guest' + (guests.total === 1 ? '' : 's') +
                ' (' + guests.adults + ' adult' + (guests.adults === 1 ? '' : 's') +
                ' + ' + guests.children + ' child' + (guests.children === 1 ? '' : 'ren') + ')';
        }

        function updateGuestHint() {
            const hint = $('#guestHint');
            if (!hint) return;
            const key = selectedRoom();
            const capacity = roomCapacity(key);
            if (!key) {
                hint.textContent = 'Select a room to see how many guests it fits.';
                return;
            }
            const sub = subRoomByKey(key);
            const label = sub ? subRoomDisplay(sub) : key;
            hint.textContent = label + ' fits up to ' + capacity + ' guest' + (capacity === 1 ? '' : 's') + ' total (adults + children).';
        }

        function checkTheDates() {
            const key = selectedRoom();
            const sub = subRoomByKey(key);
            const price = sub ? sub.price : 0;
            const count = nights();

            if (!sub || !price) return { err: 'Please select a room.' };
            if (!sub.available) return { err: 'That room is coming soon and cannot be booked yet.' };
            const room = subRoomDisplay(sub);
            const gErr = guestError(key);
            if (gErr) return { err: gErr, guest: true };
            if (count <= 0) return { err: 'Check-out must be after check-in.' };

            const clash = getReservations().find((booking) =>
                booking.room === room && booking.checkin && booking.checkout && blocksCalendar(booking) &&
                datesOverlap(checkIn.value, checkOut.value, booking.checkin, booking.checkout));

            if (clash) {
                return {
                    err: room + ' is already booked ' + formatDate(clash.checkin) + ' \u2192 ' + formatDate(clash.checkout) + '.',
                    alt: findNextFreeDates(room, count, checkIn.value)
                };
            }

            const full = price * count;
            return { key: key, room: room, price: price, category: sub.category, n: count, full: full, dep: Math.round(full * DEPOSIT_RATE) };
        }

        function findNextFreeDates(room, count, fromDate) {
            const booked = getReservations()
                .filter((booking) => booking.room === room && booking.checkin && booking.checkout && blocksCalendar(booking))
                .sort((a, b) => new Date(a.checkin) - new Date(b.checkin));

            let start = fromDate;
            for (let attempt = 0; attempt < 365; attempt++) {
                const end = addDays(start, count);
                const clash = booked.find((booking) =>
                    datesOverlap(start, end, booking.checkin, booking.checkout));
                if (!clash) return { start: start, end: end };
                start = clash.checkout;
            }
            return null;
        }

        function readGuestDetails() {
            const name = $('#qName').value.trim();
            const sessionUser = currentUser();
            // Email confirmation is based on the Stella account — always use it.
            const email = sessionUser ? sessionUser.email : $('#qEmail').value.trim();
            const contact = $('#qContact').value.trim();

            if (!name) { showMessage(form, 'Please enter your full name.', false); return null; }
            if (!sessionUser) { showMessage(form, 'Please log in first so we can send confirmation to your Stella account email.', false); return null; }
            if (!isValidEmail(email)) { showMessage(form, 'Your Stella account email looks invalid. Please update it and try again.', false); return null; }
            if (!isValidContact(contact)) { showMessage(form, 'Contact must be 11 digits starting with 09.', false); return null; }

            clearMessage(form);
            return { name: name, email: email, contact: contact };
        }

        let galleryPhotos = ['scene.jpg'];
        let galleryIndex = 0;

        function showPhoto(index) {
            const bigPhoto = $('#mRoomImg');
            const thumbs = $('#mThumbs');
            if (!galleryPhotos.length) return;

            galleryIndex = (index + galleryPhotos.length) % galleryPhotos.length;

            if (bigPhoto) {
                bigPhoto.style.opacity = '0';
                setTimeout(() => {
                    bigPhoto.src = galleryPhotos[galleryIndex];
                    bigPhoto.alt = (selectedDisplay() || 'Room') + ' photo ' + (galleryIndex + 1);
                    bigPhoto.style.opacity = '1';
                }, 150);
                bigPhoto.onerror = () => { bigPhoto.src = 'scene.jpg'; };
            }

            if (thumbs) {
                thumbs.querySelectorAll('img').forEach((thumb, i) => {
                    thumb.classList.toggle('active', i === galleryIndex);
                });
            }

            const counter = $('#photoCount');
            if (counter) counter.textContent = (galleryIndex + 1) + ' / ' + galleryPhotos.length;
        }

        function fillRoomPanel(roomKey) {
            const sub = subRoomByKey(roomKey);
            const category = sub ? sub.category : '';
            const details = ROOM_DETAILS[category];
            const bigPhoto = $('#mRoomImg');
            const thumbs = $('#mThumbs');
            const label = sub ? subRoomDisplay(sub) : 'Room';

            galleryPhotos = details ? details.photos.slice() : ['scene.jpg'];
            galleryIndex = 0;

            if (thumbs) {
                thumbs.innerHTML = '';
                galleryPhotos.forEach((src, i) => {
                    const thumb = document.createElement('img');
                    thumb.src = src;
                    thumb.alt = label + ' photo ' + (i + 1);
                    thumb.loading = 'lazy';
                    thumb.className = i === 0 ? 'active' : '';
                    thumb.onerror = () => { thumb.src = 'scene.jpg'; };
                    thumb.addEventListener('click', () => showPhoto(i));
                    thumbs.appendChild(thumb);
                });
            }

            if (bigPhoto && details) {
                bigPhoto.src = details.photos[0];
                bigPhoto.alt = label + " at Stella's Beach House";
            }

            const badge = $('#mRoomBadge');
            if (badge) badge.textContent = details ? details.badge : "Stella's pick";

            const meta = $('#mRoomMeta');
            if (meta) meta.textContent = details ? details.meta : 'Pick a room to see details.';

            const price = $('#mRoomPrice');
            if (price) price.textContent = sub ? peso(sub.price) + ' per night' : '\u2014';
        }

        function updateTotals() {
            const key = selectedRoom();
            fillRoomPanel(key);

            const sub = subRoomByKey(key);
            const price = sub ? sub.price : 0;
            const count = nights();
            const full = price && count > 0 ? price * count : 0;
            const deposit = full ? Math.round(full * DEPOSIT_RATE) : 0;

            const gcashLine = $('#payTotalLine');
            if (gcashLine) {
                gcashLine.textContent = !full
                    ? 'Total: \u2014'
                    : 'Total: ' + peso(full) + ' \u2022 Deposit due now (50%): ' + peso(deposit);
            }

            $$('.pay-total-val').forEach((box) => {
                box.textContent = !full ? '\u2014' : peso(full) + ' total \u2022 ' + peso(deposit) + ' deposit';
            });
        }

        function resetAvailabilityBox() {
            const button = $('#checkAvail');
            if (button) {
                button.textContent = 'Check Availability';
                button.dataset.checked = '';
            }
            const result = $('#availResult');
            if (result) {
                result.className = '';
                result.textContent = 'Pick a room and dates, then check availability.';
            }
        }

        function goToStep(number) {
            $('#payStep0').hidden = number !== 0;
            $('#payStep1').hidden = number !== 1;
            $('#payStep2').hidden = number !== 2;
            $('#stepDot0').classList.toggle('current', number === 0);
            $('#stepDot1').classList.toggle('current', number === 1);
            $('#stepDot2').classList.toggle('current', number === 2);
        }

        let payMethod = 'GCash';
        let bankReceiptFile = null;

        function clearBankReceipt() {
            bankReceiptFile = null;
            const input = $('#qBankReceipt');
            if (input) input.value = '';
            const preview = $('#qBankReceiptPreview');
            if (preview) {
                preview.hidden = true;
                preview.removeAttribute('src');
            }
        }

        function bindBankReceiptInput() {
            const input = $('#qBankReceipt');
            if (!input || input.dataset.bound) return;
            input.dataset.bound = '1';
            input.addEventListener('change', () => {
                const file = input.files && input.files[0];
                const preview = $('#qBankReceiptPreview');
                if (!file) {
                    clearBankReceipt();
                    return;
                }
                if (!String(file.type || '').startsWith('image/')) {
                    showMessage(form, 'Receipt must be a photo (JPG/PNG).', false);
                    clearBankReceipt();
                    return;
                }
                if (file.size > 8 * 1024 * 1024) {
                    showMessage(form, 'Receipt photo is too big (max 8MB).', false);
                    clearBankReceipt();
                    return;
                }
                bankReceiptFile = file;
                clearMessage(form);
                if (preview) {
                    preview.src = URL.createObjectURL(file);
                    preview.hidden = false;
                }
            });
        }

        function setPayMethod(method) {
            payMethod = method;

            $$('.pay-method').forEach((button) => {
                button.classList.toggle('current', button.dataset.pay === method);
            });

            const boxes = { GCash: $('#payBoxGcash'), Card: $('#payBoxCard'), Bank: $('#payBoxBank') };
            Object.keys(boxes).forEach((key) => {
                if (boxes[key]) boxes[key].hidden = key !== method;
            });

            const refLabel = $('#qRefLabel');
            const refInput = $('#qRef');
            if (!refLabel || !refInput) return;

            refLabel.style.display = '';
            refInput.style.display = '';
            if (method === 'Bank') {
                refLabel.textContent = 'Bank Transaction Reference';
                refInput.placeholder = 'e.g. TXN987654';
            } else {
                refLabel.textContent = 'GCash Reference Number';
                refInput.placeholder = 'e.g. 1234567890123';
            }
            if (method === 'Card') {
                refLabel.style.display = 'none';
                refInput.style.display = 'none';
            }
        }

        function readPaymentProof() {
            if (payMethod === 'GCash') {
                const ref = ($('#qRef').value || '').replace(/\D/g, '');
                if (ref.length < 10 || ref.length > 13) {
                    return { error: 'Enter your 10\u201313 digit GCash reference number.' };
                }
                return { ref: ref };
            }

            if (payMethod === 'Bank') {
                const ref = ($('#qRef').value || '').trim();
                if (!/^[A-Za-z0-9]{6,20}$/.test(ref)) {
                    return { error: 'Enter your bank transaction reference (6\u201320 letters/numbers).' };
                }
                if (!bankReceiptFile) {
                    return { error: 'Please upload a photo of your bank receipt.' };
                }
                return { ref: ref };
            }

            const number = ($('#qCardNum').value || '').replace(/\D/g, '');
            const expiry = ($('#qCardExp').value || '').trim();
            const cvc = ($('#qCardCvc').value || '').replace(/\D/g, '');
            if (number.length !== 16) return { error: 'Enter the 16-digit card number.' };
            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return { error: 'Enter card expiry as MM/YY.' };
            if (cvc.length < 3 || cvc.length > 4) return { error: 'Enter the 3\u20134 digit CVC.' };
            return { ref: 'CARD\u2022\u2022' + number.slice(-4) };
        }

        function showReceipt(booking, email) {
            const set = (id, value) => {
                const cell = document.getElementById(id);
                if (cell) cell.textContent = value;
            };

            set('rId', booking.id);
            set('rName', booking.name);
            set('rEmail', booking.email);
            set('rRoom', booking.room);
            set('rGuests', guestLabel({ adults: booking.adults, children: booking.children, total: booking.guests }) || '—');
            set('bookingMailTo', booking.email);
            const mail = buildBookingConfirmationEmail(booking);
            set('bookingMailSubject', mail.subject);
            set('bookingMailBody', mail.text);
            const preview = document.getElementById('bookingMailPreview');
            if (preview) preview.hidden = false;
            sendBookingConfirmationEmail(booking);
            set('rIn', formatDate(booking.checkin));
            set('rOut', formatDate(booking.checkout));
            set('rRate', peso(bookingRate(booking)) + ' / night');
            set('rNights', booking.nights + ' night' + (booking.nights > 1 ? 's' : ''));
            set('rPay', booking.payment);
            set('rRef', booking.ref);
            const receiptWrap = document.getElementById('rReceiptWrap');
            const receiptImg = document.getElementById('rReceiptImg');
            if (receiptWrap && receiptImg) {
                if (booking.receiptImg) {
                    receiptImg.src = booking.receiptImg;
                    receiptWrap.hidden = false;
                } else {
                    receiptWrap.hidden = true;
                    receiptImg.removeAttribute('src');
                }
            }
            set('rDep', peso(booking.deposit));
            set('rBal', peso(booking.balance));
            set('rTotal', peso(booking.total));
            set('rStatus', isPendingHold(booking)
                ? 'On hold \u23F3 — pay before ' + formatDateTime(booking.holdUntil)
                : 'Confirmed \u2713');

            const note = $('#modalDoneText');
            if (note) note.textContent = isPendingHold(booking)
                ? 'Hold details emailed to ' + booking.email + ' (your Stella account). Pay the ' + peso(booking.deposit) + ' deposit within 24 hours or this hold is automatically cancelled.'
                : 'A confirmation email was sent to ' + booking.email + ' (your Stella account). Show this receipt at check-in.';
        }

        function openBookingDialog(reserve) {
            formView.hidden = false;
            doneView.hidden = true;
            resetAvailabilityBox();

            // reserve is a sub-room key ('couples-garden') or a legacy
            // category name ('Couples Room'): only that category is listed.
            const want = reserve ? decodeURIComponent(reserve) : '';
            const sub = subRoomByKey(want);
            if (sub) populateRoomSelect(sub.category, want);
            else if (want && ROOM_OPTIONS[want]) populateRoomSelect(want, null);
            else populateRoomSelect(null, null);

            fillInFromAccount();

            bindBankReceiptInput();
            clearBankReceipt();
            updateGuestHint();
            updateTotals();
            goToStep(0);
            openDialog(dialog);
        }

        function fillInFromAccount() {
            const user = currentUser();
            const sessionNote = $('#quickSessionNote');

            if (!user) {
                if (sessionNote) {
                    sessionNote.hidden = false;
                    sessionNote.textContent =
                        'Booking needs a Stella Stay account \u2014 we will ask you to log in or sign up before you pay.';
                }
                return;
            }

            if ($('#qName') && !$('#qName').value) $('#qName').value = user.name || '';
            // Email is locked to the Stella account so confirmation always goes there.
            if ($('#qEmail')) {
                $('#qEmail').value = user.email || '';
                $('#qEmail').readOnly = true;
            }
            if ($('#qContact') && !$('#qContact').value && user.contact) $('#qContact').value = user.contact;

            if (sessionNote) {
                sessionNote.hidden = false;
                sessionNote.textContent = 'Booking as ' + user.email + ' \u2014 we filled this in for you.';
            }
        }

        function goToPayment() {
            const checkGuests = () => {
                const room = selectedRoom();
                const gErr = guestError(room);
                if (gErr) {
                    showMessage(form, gErr, false);
                    goToStep(0);
                    return false;
                }
                return true;
            };
            if (!currentUser()) {
                askForAccount(() => {
                    fillInFromAccount();

                    if (!checkGuests()) return;
                    if (!readGuestDetails()) return;
                    goToStep(2);
                    setPayMethod(payMethod);
                    updateTotals();
                }, whatTheyChose());
                return;
            }

            if (!checkGuests()) return;
            if (!readGuestDetails()) return;

            goToStep(2);
            setPayMethod(payMethod);
            updateTotals();
        }

        function whatTheyChose() {
            const guests = readGuests();
            return {
                room: roomSelect.value,
                checkin: checkIn.value,
                checkout: checkOut.value,
                adults: isNaN(guests.adults) ? '' : guests.adults,
                children: isNaN(guests.children) ? '' : guests.children
            };
        }

        function closeBookingDialog() {
            closeDialog(dialog);
        }

        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-reserve]');
            if (trigger) {
                openBookingDialog(trigger.getAttribute('data-reserve') || '');
                return;
            }
            if (event.target.closest('[data-close]') || event.target === dialog) closeBookingDialog();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) closeBookingDialog();
        });

        [roomSelect, checkIn, checkOut, $('#qAdults'), $('#qChildren')].forEach((field) => {
            if (field) field.addEventListener('change', () => {
                resetAvailabilityBox();
                updateGuestHint();
                updateTotals();
            });
        });

        document.addEventListener('click', (event) => {
            // Login / Create buttons shown inside the "Account required" availability box.
            // Works on every page (popup if available, otherwise redirect with resume data).
            if (event.target.closest('#availLoginBtn') && !dialog.hidden) {
                askForAccount(() => {
                    fillInFromAccount();
                    const retry = $('#checkAvail');
                    if (retry) retry.click();
                }, whatTheyChose());
                return;
            }
            if (event.target.closest('#availRegisterBtn') && !dialog.hidden) {
                if (canPopupHere()) {
                    // Open the register popup (with email verification) on this page.
                    const regDialog = $('#registerModal');
                    if (regDialog) {
                        const pending = getPendingVerification();
                        if (pending && Date.now() <= pending.expiresAt) showRegisterVerifyStep(pending.email);
                        else {
                            showRegisterFormStep();
                            openDialog(regDialog);
                        }
                        afterLogin = () => {
                            fillInFromAccount();
                            const retry = $('#checkAvail');
                            if (retry) retry.click();
                        };
                    }
                } else {
                    location.href = 'landingpage.html?register=1';
                }
                return;
            }

            const methodButton = event.target.closest('.pay-method');
            if (methodButton && !dialog.hidden) setPayMethod(methodButton.dataset.pay);

            const useAltDates = event.target.closest('#useAltDates');
            if (useAltDates && !dialog.hidden) {
                checkIn.value = useAltDates.dataset.cin;
                checkOut.value = useAltDates.dataset.cout;
                resetAvailabilityBox();
                updateTotals();
                $('#checkAvail').click();
            }
        });

        document.addEventListener('click', (event) => {
            if (event.target.closest('#galPrev') && !dialog.hidden) showPhoto(galleryIndex - 1);
            if (event.target.closest('#galNext') && !dialog.hidden) showPhoto(galleryIndex + 1);
        });

        document.addEventListener('click', (event) => {
            if (event.target.closest('#printReceipt')) window.print();
        });

        const arrival = new URLSearchParams(location.search);
        const reserveRoom = arrival.get('reserve');

        function restoreGuestsFromArrival() {
            if (arrival.get('adults') !== null && $('#qAdults')) $('#qAdults').value = arrival.get('adults');
            if (arrival.get('children') !== null && $('#qChildren')) $('#qChildren').value = arrival.get('children');
            updateGuestHint();
        }

        if (reserveRoom !== null) {
            const mustLogInFirst = arrival.get('login') !== null && !currentUser();

            if (mustLogInFirst) {

                afterLogin = () => {
                    openBookingDialog(reserveRoom || '');
                    if (arrival.get('cin')) checkIn.value = arrival.get('cin');
                    if (arrival.get('cout')) checkOut.value = arrival.get('cout');
                    restoreGuestsFromArrival();
                    updateTotals();
                };
            } else {
                openBookingDialog(reserveRoom || '');
                if (arrival.get('cin')) checkIn.value = arrival.get('cin');
                if (arrival.get('cout')) checkOut.value = arrival.get('cout');
                restoreGuestsFromArrival();
                updateTotals();
            }
        }

        $('#checkAvail').addEventListener('click', function onCheckAvailability() {
            const checkButton = this;
            const availBox = $('#availResult');

            // Account gate: availability check requires a Stella Stay account first.
            if (!currentUser()) {
                if (availBox) {
                    availBox.className = 'bad';
                    availBox.innerHTML =
                        '<strong>Account required.</strong><br />' +
                        'Please create an account or log in first to check availability.<br />' +
                        '<div class="alt-suggest"><span>Checking dates is for members only.</span>' +
                        '<span><button type="button" class="second-button button-reset" id="availLoginBtn">Log in</button> ' +
                        '<button type="button" class="main-button button-reset" id="availRegisterBtn">Create Account</button></span></div>';
                }
                showMessage(form, 'You need a Stella Stay account first — please log in or create an account, then check availability again.', false);
                // Auto-open the login popup where available; on room pages without
                // a popup, leave the Log in / Create Account buttons above for the user.
                if (canPopupHere()) {
                    askForAccount(() => {
                        fillInFromAccount();
                        // Re-run the availability check automatically after they log in.
                        const retry = $('#checkAvail');
                        if (retry) retry.click();
                    }, whatTheyChose());
                }
                return;
            }

            const selection = checkTheDates();

            if (checkButton.dataset.checked) {
                if (selection.err) {
                    resetAvailabilityBox();
                    return showMessage(form, selection.err, false);
                }
                $('#bookSummary').textContent =
                    '\u2713 ' + selection.room + ' available ' + formatDate(checkIn.value) +
                    ' \u2192 ' + formatDate(checkOut.value) + ' \u2014 ' + selection.n +
                    ' night' + (selection.n > 1 ? 's' : '') + ', ' + peso(selection.full) +
                    ' total (' + peso(selection.dep) + ' deposit) \u2022 ' + guestLabel(readGuests()) + '.';
                goToStep(1);
                return;
            }

            if (selection.err) {
                if (availBox) {
                    availBox.className = 'bad';
                    availBox.innerHTML =
                        (selection.guest ? '<strong>Too many guests.</strong><br />' : '<strong>Those dates are taken.</strong><br />') + selection.err +
                        (selection.alt
                            ? '<div class="alt-suggest"><span>Next free for ' + nights() +
                            ' night(s):<br /><strong>' + formatDate(selection.alt.start) + ' \u2192 ' +
                            formatDate(selection.alt.end) + '</strong></span>' +
                            '<button type="button" id="useAltDates" data-cin="' + selection.alt.start +
                            '" data-cout="' + selection.alt.end + '">Use these dates</button></div>'
                            : '');
                }
                clearMessage(form);
                return;
            }

            clearMessage(form);
            if (availBox) {
                availBox.className = 'ok';
                availBox.innerHTML =
                    '\u2713 <strong>Available!</strong> ' + selection.room + ' \u00d7 ' + selection.n +
                    ' night' + (selection.n > 1 ? 's' : '') + ' = <strong>' + peso(selection.full) +
                    '</strong> <span class="muted">(' + peso(selection.dep) + ' deposit due now)</span>';
            }
            checkButton.textContent = 'Continue to Details';
            checkButton.dataset.checked = '1';
            updateTotals();
        });

        $('#toPayStep').addEventListener('click', () => goToPayment());

        $('#backToStep0').addEventListener('click', () => goToStep(0));
        $('#backToStep1').addEventListener('click', () => goToStep(1));

        // Shared booking saver: paymentOrNull == null means 24h hold (pay later).
        // receiptImgOrNull is the shrunk bank-receipt photo data URL (Bank only).
        function saveNewBooking(selection, guest, paymentOrNull, receiptImgOrNull) {
            const owner = currentUser().email;
            const party = readGuests();
            const hold = !paymentOrNull;

            const booking = {
                id: newBookingId(),
                name: guest.name,
                email: guest.email,
                contact: guest.contact,
                room: selection.room,
                adults: party.adults,
                children: party.children,
                guests: party.total,
                checkin: checkIn.value,
                checkout: checkOut.value,
                nights: selection.n,
                rate: selection.price,
                total: selection.full,
                deposit: selection.dep,
                balance: selection.full - selection.dep,
                payment: hold ? 'Unpaid (on hold)' : payMethod,
                ref: hold ? '—' : paymentOrNull.ref,
                receiptImg: receiptImgOrNull || null,
                status: hold ? HOLD_STATUS : 'Confirmed (paid)',
                holdUntil: hold ? Date.now() + HOLD_MS : null,
                by: owner,
                created: new Date().toISOString()
            };

            const allBookings = getReservations();
            allBookings.push(booking);
            try {
                saveReservations(allBookings);
            } catch (error) {
                return { error: 'Photo is too large to save. Try a smaller photo.' };
            }

            formView.hidden = true;
            doneView.hidden = false;
            showReceipt(booking, guest.email);
            form.reset();
            clearBankReceipt();
            goToStep(1);
            return booking;
        }

        function readBookingBasics() {
            if (!currentUser()) {
                goToStep(1);
                askForAccount(() => {
                    fillInFromAccount();
                    goToStep(2);
                }, whatTheyChose());
                return null;
            }

            const selection = checkTheDates();
            if (selection.err) {
                goToStep(0);
                resetAvailabilityBox();
                showMessage(form, selection.err, false);
                return null;
            }

            const guest = readGuestDetails();
            if (!guest) {
                goToStep(1);
                return null;
            }
            return { selection: selection, guest: guest };
        }

        const holdBtn = $('#holdBookingBtn');
        if (holdBtn) {
            holdBtn.addEventListener('click', () => {
                const basics = readBookingBasics();
                if (!basics) return;
                saveNewBooking(basics.selection, basics.guest, null);
            });
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const basics = readBookingBasics();
            if (!basics) return;

            const payment = readPaymentProof();
            if (payment.error) return showMessage(form, payment.error, false);

            // Bank needs its receipt photo processed first (async shrink).
            if (payMethod === 'Bank') {
                showMessage(form, 'Uploading receipt photo…', true);
                fileToReceiptImage(bankReceiptFile).then(
                    (img) => {
                        const saved = saveNewBooking(basics.selection, basics.guest, payment, img);
                        if (saved && saved.error) showMessage(form, saved.error, false);
                    },
                    () => showMessage(form, 'Could not read that photo. Try another image.', false)
                );
                return;
            }

            saveNewBooking(basics.selection, basics.guest, payment, null);
        });
    }

    function buildLogInPrompt() {
        const box = document.createElement('div');
        box.className = 'empty-state';
        box.innerHTML =
            '<span class="empty-state-badge" aria-hidden="true">' + LOGIN_SVG + '</span>' +
            '<p class="empty-state-title">Log in to see your bookings</p>' +
            '<p class="empty-state-text">Every reservation is kept with your Stella Stay account, ' +
            'so you need to log in before we can show it to you.</p>' +
            '<p class="empty-state-actions">' +
                '<a href="landingpage.html?login=1" class="main-button button-reset">Log in</a>' +
                '<a href="landingpage.html?register=1" class="second-button button-reset">Create Account</a>' +
            '</p>' +
            '<p class="empty-state-note">Bookings stay saved to your account between visits.</p>';
        return box;
    }

    // Pay-now dialog for 24h holds: same payment rules as the booking modal.
    function openPayNowDialog(bookingId) {
        const bookings = getReservations();
        const booking = bookings.find((one) => one.id === bookingId);
        if (!booking) return;
        if (!isPendingHold(booking)) return;
        if (isHoldExpired(booking)) {
            sweepExpiredHolds();
            location.reload();
            return;
        }

        const previous = document.getElementById('payNowDialog');
        if (previous) previous.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'payNowDialog';
        backdrop.className = 'confirm-backdrop';
        backdrop.innerHTML =
            '<div class="confirm-box paynow-box">' +
                '<h3>Pay Deposit — ' + peso(booking.deposit) + '</h3>' +
                '<p>Booking ' + booking.id + ' &bull; ' + booking.room + '<br />' +
                '<span class="muted">Pay before ' + formatDateTime(booking.holdUntil) +
                ' (' + holdRemainingText(booking.holdUntil) + ') or this hold is cancelled.</span></p>' +
                '<div class="pay-methods">' +
                    '<button type="button" class="pay-method current" data-pay="GCash">GCash</button>' +
                    '<button type="button" class="pay-method" data-pay="Card">Card</button>' +
                    '<button type="button" class="pay-method" data-pay="Bank">Bank</button>' +
                '</div>' +
                '<div class="paynow-fields" data-pane="GCash">' +
                    '<label>GCash Reference Number</label>' +
                    '<input data-payref type="text" inputmode="numeric" maxlength="13" placeholder="e.g. 1234567890123" />' +
                '</div>' +
                '<div class="paynow-fields" data-pane="Bank" hidden>' +
                    '<label>Bank Transaction Reference</label>' +
                    '<input data-payref type="text" maxlength="20" placeholder="e.g. TXN987654" />' +
                    '<label>Photo of Bank Receipt (required)</label>' +
                    '<input data-payreceipt type="file" accept="image/*" />' +
                    '<img data-paypreview class="receipt-upload-preview" alt="Bank receipt preview" hidden />' +
                '</div>' +
                '<div class="paynow-fields" data-pane="Card" hidden>' +
                    '<label>Card Number</label>' +
                    '<input data-cardnum type="text" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" />' +
                    '<div class="modal-row">' +
                        '<div><label>Expiry (MM/YY)</label><input data-cardexp type="text" maxlength="5" placeholder="MM/YY" /></div>' +
                        '<div><label>CVC</label><input data-cardcvc type="text" inputmode="numeric" maxlength="4" placeholder="123" /></div>' +
                    '</div>' +
                '</div>' +
                '<p class="form-msg error" data-payerr hidden></p>' +
                '<div class="confirm-actions">' +
                    '<button type="button" class="confirm-btn confirm-btn-stay" data-payclose>Later</button>' +
                    '<button type="button" class="confirm-btn confirm-btn-go" data-paygo>Pay ' + peso(booking.deposit) + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(backdrop);
        let method = 'GCash';
        let payReceiptFile = null;

        const showErr = (text) => {
            const box = backdrop.querySelector('[data-payerr]');
            if (box) {
                box.hidden = !text;
                box.textContent = text || '';
            }
        };

        const payReceiptInput = backdrop.querySelector('[data-payreceipt]');
        if (payReceiptInput) {
            payReceiptInput.addEventListener('change', () => {
                const file = payReceiptInput.files && payReceiptInput.files[0];
                const preview = backdrop.querySelector('[data-paypreview]');
                if (!file) {
                    payReceiptFile = null;
                    if (preview) preview.hidden = true;
                    return;
                }
                if (!String(file.type || '').startsWith('image/')) {
                    showErr('Receipt must be a photo (JPG/PNG).');
                    payReceiptInput.value = '';
                    payReceiptFile = null;
                    return;
                }
                if (file.size > 8 * 1024 * 1024) {
                    showErr('Receipt photo is too big (max 8MB).');
                    payReceiptInput.value = '';
                    payReceiptFile = null;
                    return;
                }
                payReceiptFile = file;
                showErr('');
                if (preview) {
                    preview.src = URL.createObjectURL(file);
                    preview.hidden = false;
                }
            });
        }

        const completeBankPayment = (ref) => {
            showErr('Uploading receipt photo…');
            fileToReceiptImage(payReceiptFile).then(
                (img) => confirmPaidBooking(ref, img),
                () => showErr('Could not read that photo. Try another image.')
            );
        };

        const confirmPaidBooking = (ref, receiptImgOrNull) => {
            const all = getReservations();
            const saved = all.find((one) => one.id === bookingId);
            if (!saved) {
                showErr('Booking not found.');
                return;
            }
            if (isHoldExpired(saved)) {
                sweepExpiredHolds();
                location.reload();
                return;
            }
            saved.payment = method;
            saved.ref = ref;
            if (receiptImgOrNull) saved.receiptImg = receiptImgOrNull;
            saved.status = 'Confirmed (paid)';
            saved.holdUntil = null;
            saved.paidAt = new Date().toISOString();
            try {
                saveReservations(all);
            } catch (error) {
                showErr('Photo is too large to save. Try a smaller photo.');
                return;
            }
            sendBookingConfirmationEmail(saved);
            backdrop.remove();
            location.reload();
        };

        backdrop.addEventListener('click', (event) => {
            const methodButton = event.target.closest('.pay-method');
            if (methodButton) {
                method = methodButton.dataset.pay;
                backdrop.querySelectorAll('.pay-method').forEach((button) => {
                    button.classList.toggle('current', button === methodButton);
                });
                backdrop.querySelectorAll('.paynow-fields').forEach((pane) => {
                    pane.hidden = pane.dataset.pane !== method;
                });
                showErr('');
                return;
            }
            if (event.target.closest('[data-payclose]') || event.target === backdrop) {
                backdrop.remove();
                return;
            }
            if (event.target.closest('[data-paygo]')) {
                let ref = '';
                if (method === 'GCash') {
                    ref = (backdrop.querySelector('[data-pane="GCash"] [data-payref]').value || '').replace(/\D/g, '');
                    if (ref.length < 10 || ref.length > 13) return showErr('Enter your 10–13 digit GCash reference number.');
                } else if (method === 'Bank') {
                    ref = (backdrop.querySelector('[data-pane="Bank"] [data-payref]').value || '').trim();
                    if (!/^[A-Za-z0-9]{6,20}$/.test(ref)) return showErr('Enter your bank transaction reference (6–20 letters/numbers).');
                    if (!payReceiptFile) return showErr('Please upload a photo of your bank receipt.');
                    completeBankPayment(ref);
                    return;
                } else {
                    const number = (backdrop.querySelector('[data-cardnum]').value || '').replace(/\D/g, '');
                    const expiry = (backdrop.querySelector('[data-cardexp]').value || '').trim();
                    const cvc = (backdrop.querySelector('[data-cardcvc]').value || '').replace(/\D/g, '');
                    if (number.length !== 16) return showErr('Enter the 16-digit card number.');
                    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return showErr('Enter card expiry as MM/YY.');
                    if (cvc.length < 3 || cvc.length > 4) return showErr('Enter the 3–4 digit CVC.');
                    ref = 'CARD••' + number.slice(-4);
                }
                confirmPaidBooking(ref, null);
            }
        });
    }

    function initReservationsPage() {
        const list = $('#reservationsList');
        if (!list) return;

        sweepExpiredHolds();

        const emptyState = list.innerHTML;
        const session = getSession();

        if (!session || !session.email) {
            list.innerHTML = '';
            list.appendChild(buildLogInPrompt());
            return;
        }

        const allBookings = getReservations();
        const bookings = allBookings.filter((booking) =>
            (booking.by || booking.email || '').toLowerCase() === session.email.toLowerCase());

        if (new URLSearchParams(location.search).get('booked') === '1') {
            const saved = document.createElement('p');
            saved.className = 'form-msg success';
            saved.textContent = 'Reservation saved! See it below.';
            list.before(saved);
        }

        if (!bookings.length) {

            if (allBookings.length) {
                const note = document.createElement('p');
                note.className = 'form-msg';
                note.textContent = 'Any bookings on this device that were made without an account are not shown here.';
                list.before(note);
            }
            list.innerHTML = emptyState;
            return;
        }

        list.innerHTML = '';
        bookings.slice().reverse().forEach((booking) => drawBookingCard(list, booking));

        list.addEventListener('click', (event) => {
            const receiptThumb = event.target.closest('[data-receiptview]');
            if (receiptThumb) {
                openReceiptLightbox(receiptThumb.getAttribute('data-receiptview'));
                return;
            }

            const payButton = event.target.closest('[data-paynow]');
            if (payButton) {
                openPayNowDialog(payButton.getAttribute('data-paynow'));
                return;
            }

            const copyButton = event.target.closest('[data-copy]');
            if (copyButton) {
                copyToClipboard(copyButton, copyButton.getAttribute('data-copy'));
                return;
            }

            const cancelButton = event.target.closest('[data-cancel]');
            if (cancelButton) askToCancelBooking(cancelButton.getAttribute('data-cancel'));
        });
    }

    function drawBookingCard(list, booking) {
        const cancelled = isCancelled(booking);
        const pending = !cancelled && isPendingHold(booking);
        const guestsText = formatGuests(booking.adults, booking.children);
        const badgeClass = cancelled ? ' cancelled' : (pending ? ' pending' : '');

        const card = document.createElement('div');
        card.className = 'reservation-card' + (cancelled ? ' cancelled' : '');
        card.innerHTML =
            '<h2>' + booking.room +
                '<span class="status-badge' + badgeClass + '">' +
                (booking.status || 'Confirmed') + '</span></h2>' +
            '<p class="id-row"><strong>ID:</strong> ' + booking.id +
                ' <button type="button" class="copy-btn" data-copy="' + booking.id + '">Copy ID</button></p>' +
            '<p><strong>Check-in:</strong> ' + formatDate(booking.checkin) +
                ' &nbsp; <strong>Check-out:</strong> ' + formatDate(booking.checkout) + '</p>' +
            (guestsText ? '<p><strong>Guests:</strong> ' + guestsText + '</p>' : '') +
            '<p><strong>Nights:</strong> ' + booking.nights +
                ' &nbsp; <strong>Total:</strong> ' + peso(booking.total) +
                (booking.deposit ? (pending ? ' (deposit ' + peso(booking.deposit) + ' due)' : ' (deposit ' + peso(booking.deposit) + ' paid)') : '') + '</p>' +
            '<p><strong>Payment:</strong> ' + (booking.payment || '-') +
                (booking.ref && booking.ref !== '—' ? ' &bull; Ref ' + booking.ref : '') + '</p>' +
            (booking.receiptImg
                ? '<p><strong>Bank Receipt:</strong><br /><img class="receipt-thumb" data-receiptview="' + booking.id + '" src="' + booking.receiptImg + '" alt="Bank receipt photo — tap to enlarge" /></p>'
                : '') +
            (pending
                ? '<p class="hold-countdown"><strong>Time left to pay:</strong> ' + holdRemainingText(booking.holdUntil) +
                  ' <span class="muted">(pay before ' + formatDateTime(booking.holdUntil) + ' or this hold is automatically cancelled)</span></p>' : '') +
            (cancelled
                ? (booking.status === HOLD_EXPIRED_STATUS
                    ? '<p class="muted">This hold expired unpaid after 24 hours and the room was released. Rebook to try again.</p>'
                    : '<p class="muted">Refund will be sent to your original payment method. ' +
                      'Questions? Message 0912 345 6789 with your booking ID.</p>')
                : '<div class="card-actions">' +
                      (pending ? '<button type="button" class="paynow-btn" data-paynow="' + booking.id + '">Pay Now — ' + peso(booking.deposit) + '</button>' : '') +
                      (pending ? '<button type="button" class="cancel-btn" data-cancel="' + booking.id + '">Cancel Reservation</button>' : '') +
                  '</div>' +
                  (!pending ? '<p class="muted">This booking is locked. To request any changes, message 0912 345 6789 with your booking ID.</p>' : ''));

        list.appendChild(card);
    }

    // Full-size viewer for bank receipt photos (My Reservations thumbnails).
    function openReceiptLightbox(bookingId) {
        const booking = getReservations().find((one) => one.id === bookingId);
        if (!booking || !booking.receiptImg) return;
        const previous = document.getElementById('receiptLightbox');
        if (previous) previous.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'receiptLightbox';
        backdrop.className = 'confirm-backdrop';
        backdrop.innerHTML =
            '<div class="confirm-box receipt-lightbox">' +
                '<h3>Bank Receipt — ' + booking.id + '</h3>' +
                '<img src="' + booking.receiptImg + '" alt="Bank receipt photo" />' +
                '<div class="confirm-actions">' +
                    '<button type="button" class="confirm-btn confirm-btn-go" data-receiptclose>Close</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(backdrop);
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop || event.target.closest('[data-receiptclose]')) backdrop.remove();
        });
        document.addEventListener('keydown', function onEscape(event) {
            if (event.key === 'Escape') {
                backdrop.remove();
                document.removeEventListener('keydown', onEscape);
            }
        });
    }

    function copyToClipboard(button, text) {
        const confirm = () => {
            button.textContent = 'Copied \u2713';
            setTimeout(() => { button.textContent = 'Copy ID'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(confirm).catch(confirm);
        } else {
            confirm();
        }
    }

    function askToCancelBooking(bookingId) {
        const target = getReservations().find((one) => one.id === bookingId);
        const holding = target && isPendingHold(target);
        askToConfirm(
            {
                title: holding ? 'Release this hold?' : 'Cancel this booking?',
                body: holding
                    ? 'Your 24-hour hold ends now, the room is released, and nothing is charged.'
                    : 'Your room is released and a refund goes to your original payment method.',
                stayLabel: holding ? 'Keep Hold' : 'Keep Booking',
                goLabel: holding ? 'Yes, Release' : 'Yes, Cancel',
                danger: true
            },
            () => {
                const bookings = getReservations();
                const booking = bookings.find((one) => one.id === bookingId);
                if (booking) booking.status = holding ? HOLD_RELEASED_STATUS : 'Cancelled \u2014 refund pending';
                saveReservations(bookings);
                location.reload();
            }
        );
    }

    function ratingNumber(rating) {
        const match = String(rating || '').match(/^[1-5]/);
        return match ? Number(match[0]) : 5;
    }

    const REVIEW_STAR_SVG = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" focusable="false"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" fill="currentColor"/></svg>';

    const LOGIN_SVG = '<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10v11H4V10"/><path d="M2 21h20"/><path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3"/><path d="M12 14v3"/></svg>';

    const BOOKING_SVG = '<svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M8.5 14.5l2 2 4-4"/></svg>';

    function initReviewWall() {
        const wall = $('#reviewWall');
        const dialog = $('#feedbackModal');
        const form = $('#quickFeedbackForm');
        let stars = 5;

        function renderWall() {
            if (!wall) return;

            const all = getReviews();
            const newest = all.slice().reverse().slice(0, 3);
            const summary = $('#ratingSummary');

            if (!all.length) {
                if (summary) {
                    summary.textContent = '';
                    summary.classList.add('is-hidden');
                }
                wall.innerHTML = '<div class="empty-state">' +
                    '<span class="empty-state-badge" aria-hidden="true">' + REVIEW_STAR_SVG + '</span>' +
                    '<p class="empty-state-title">Be the first to review</p>' +
                    '<p class="empty-state-text">Stayed with us? Tell future guests what to expect ' +
                    '&#8212; the room, the view, breakfast, and the little things that mattered.</p>' +
                    '<p class="empty-state-note">Every review helps the next guest decide.</p>' +
                    '</div>';
                return;
            }

            const average = all.reduce((sum, review) => sum + ratingNumber(review.r), 0) / all.length;
            if (summary) {
                summary.classList.remove('is-hidden');
                summary.textContent = '\u2605 ' + average.toFixed(1) + ' from ' +
                    all.length + ' review' + (all.length > 1 ? 's' : '');
            }

            wall.innerHTML = '';
            newest.forEach((review) => {
                const count = ratingNumber(review.r);
                const card = document.createElement('div');
                card.className = 'review-card';
                const stars = document.createElement('div');
                stars.className = 'stars';
                stars.textContent = '\u2605'.repeat(count) + '\u2606'.repeat(5 - count);
                const head = document.createElement('div');
                head.className = 'review-head';
                head.appendChild(buildAvatarNode(review.n || 'Guest', review.a || null, false));
                const who = document.createElement('h3');
                who.textContent = review.n || 'Guest';
                head.appendChild(who);
                const text = document.createElement('p');
                text.textContent = review.t || '';
                card.appendChild(stars);
                card.appendChild(head);
                card.appendChild(text);
                wall.appendChild(card);
            });
        }

        function paintStars() {
            $$('#starPick button').forEach((button) => {
                button.classList.toggle('lit', Number(button.dataset.star) <= stars);
                button.setAttribute('aria-checked', Number(button.dataset.star) === stars ? 'true' : 'false');
            });
            const counter = $('#starCount');
            if (counter) counter.textContent = stars + '/5';
        }

        document.addEventListener('click', (event) => {
            const starButton = event.target.closest('#starPick button');
            if (starButton) {
                stars = Number(starButton.dataset.star);
                paintStars();
                return;
            }

            if (event.target.closest('[data-feedback]')) {
                if (!dialog) return;
                // Logged-in guests review as themselves, with their avatar attached.
                const me = currentUser();
                const nameBox = $('#qFbName');
                if (me && nameBox && !nameBox.value) nameBox.value = me.name || '';
                openDialog(dialog);
                paintStars();
                return;
            }

            if (dialog && (event.target.closest('[data-close-feedback]') || event.target === dialog)) {
                closeDialog(dialog);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && dialog && !dialog.hidden) closeDialog(dialog);
        });

        if (form) {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                const name = $('#qFbName').value.trim();
                const text = $('#qFbText').value.trim();
                if (!name || !text) return showMessage(form, 'Please add your name and review.', false);

                const reviews = getReviews();
                const author = currentUser();
                reviews.push({
                    n: name,
                    r: stars + ' - ' + RATING_WORDS[stars],
                    t: text,
                    // Snapshot of the author's profile photo (if they set one).
                    a: author && author.avatar ? author.avatar : null,
                    at: new Date().toISOString()
                });
                saveReviews(reviews);

                form.reset();
                stars = 5;
                paintStars();
                renderWall();
                showMessage(form, 'Thanks! Your review is live below.', true);
                setTimeout(() => { if (dialog) closeDialog(dialog); }, 900);
            });
        }

        renderWall();
        paintStars();
    }

    function initReserveForm() {
        const form = $('#reserveForm');
        if (!form) return;

        const roomSelect = $('#resRoom');
        const checkIn = $('#resCheckin');
        const checkOut = $('#resCheckout');
        const summary = $('#priceSummary');

        const wanted = new URLSearchParams(location.search).get('room');
        if (wanted && roomSelect) {
            Array.from(roomSelect.options).forEach((option) => {
                if (roomNameFromOption(option.text) === wanted) roomSelect.value = option.value || option.text;
            });
            if (roomSelect.selectedIndex <= 0) {
                Array.from(roomSelect.options).forEach((option, i) => {
                    if (option.text.includes(wanted)) roomSelect.selectedIndex = i;
                });
            }
        }

        const today = toIsoDate(new Date());
        if (checkIn) checkIn.min = today;
        if (checkOut) checkOut.min = today;

        function updateSummary() {
            if (!summary) return;
            const room = roomNameFromOption(roomSelect.options[roomSelect.selectedIndex].text);
            const price = ROOM_PRICES[room] || 0;
            const count = nightsBetween(checkIn.value, checkOut.value);
            if (!price || count <= 0) {
                summary.innerHTML = 'Select a room and valid dates to see your total.';
                return;
            }
            summary.innerHTML = '<strong>' + room + '</strong> \u00d7 ' + count + ' night' +
                (count > 1 ? 's' : '') + ' = <strong>' + peso(price * count) + '</strong> ' +
                '<span class="muted">(' + peso(price) + '/night)</span>';
        }

        [roomSelect, checkIn, checkOut].forEach((field) => {
            if (field) field.addEventListener('change', updateSummary);
        });
        updateSummary();

        form.addEventListener('submit', (event) => {
            event.preventDefault();

            const name = $('#resName').value.trim();
            const contact = $('#resContact').value.trim();
            const room = roomNameFromOption(roomSelect.options[roomSelect.selectedIndex].text);
            const count = nightsBetween(checkIn.value, checkOut.value);

            if (!name) return showMessage(form, 'Please enter your full name.', false);
            if (!isValidContact(contact)) return showMessage(form, 'Contact must be 11 digits starting with 09.', false);
            if (!ROOM_PRICES[room]) return showMessage(form, 'Please select a room.', false);
            if (count <= 0) return showMessage(form, 'Check-out must be after check-in.', false);

            const bookings = getReservations();
            bookings.push({
                id: newBookingId(),
                name: name,
                contact: contact,
                room: room,
                checkin: checkIn.value,
                checkout: checkOut.value,
                nights: count,
                total: ROOM_PRICES[room] * count,
                payment: ($('#resPay') || {}).value || '',
                status: 'Confirmed',
                by: currentSessionEmail(),
                created: new Date().toISOString()
            });
            saveReservations(bookings);
            location.href = 'my-reservations.html?booked=1';
        });
    }

    function currentSessionEmail() {
        const session = getSession();
        return session ? session.email : 'guest';
    }

    function initRegisterForm() {
        const form = $('#registerForm');
        if (!form) return;

        // Standalone (non-modal) register page: same 2-step email verification.
        // After the code is sent, we inject a code field inline.
        let pendingEmail = '';
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!pendingEmail) {
                const result = beginEmailVerification({
                    name: $('#regName').value,
                    email: $('#regEmail').value,
                    password: $('#regPassword').value,
                    confirmPassword: $('#regPassword2').value
                });
                if (!result.ok) return showMessage(form, result.message, false);
                pendingEmail = result.email;
                const info = getPendingVerification();
                showMessage(form, 'Verification code sent to ' + result.email + '.' + (!window.STELLA_VERIFY_API_URL && info ? ' (Demo code: ' + info.code + ')' : ' Check your inbox.'), true);
                let codeInput = $('#regCode');
                if (!codeInput) {
                    const label = document.createElement('label');
                    label.setAttribute('for', 'regCode');
                    label.textContent = 'Email Verification Code';
                    const input = document.createElement('input');
                    input.id = 'regCode';
                    input.type = 'text';
                    input.maxLength = 6;
                    input.placeholder = 'Enter 6-digit code';
                    input.autocomplete = 'one-time-code';
                    const submitBtn = form.querySelector('button[type="submit"]');
                    form.insertBefore(input, submitBtn);
                    form.insertBefore(label, input);
                    if (submitBtn) submitBtn.textContent = 'Verify & Create Account';
                }
                const btn = form.querySelector('button[type="submit"]');
                if (btn) btn.textContent = 'Verify & Create Account';
                return;
            }
            const codeVal = ($('#regCode') || {}).value || '';
            const result = confirmEmailVerification(pendingEmail, codeVal);
            if (!result.ok) return showMessage(form, result.message, false);
            showMessage(form, result.message + ' Taking you to rooms...', true);
            setTimeout(() => { location.href = 'rooms.html'; }, 900);
        });
    }

    function initLoginForm() {
        const form = $('#loginForm');
        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const user = findUserByLogin($('#loginEmail').value, $('#loginPassword').value);
            if (!user) {
                return showMessage(form, 'Invalid email or password. Register first if you are new.', false);
            }
            if (user.verified === false) {
                const fresh = {
                    name: user.name,
                    email: user.email,
                    pw: user.pw,
                    code: makeVerificationCode(),
                    expiresAt: Date.now() + VERIFY.EXPIRY_MINUTES * 60 * 1000,
                    attempts: 0,
                    created: new Date().toISOString()
                };
                savePendingVerification(fresh);
                sendVerificationEmail(fresh);
                return showMessage(form, 'Please verify your email first. A new code was sent to ' + user.email + '.' + (!window.STELLA_VERIFY_API_URL ? ' (Demo code: ' + fresh.code + ')' : ''), false);
            }
            startSession(user);
            showMessage(form, 'Welcome, ' + user.name + '!', true);
            setTimeout(() => { location.href = 'landingpage.html'; }, 700);
        });
    }

    // "Send Us a Message" form: no backend, so it composes an email to the
    // hotel in the visitor's own email app (mailto), prefilled and ready.
    function initContactForm() {
        const form = $('#contactForm');
        if (!form) return;

        const me = currentUser();
        if (me) {
            if ($('#cfName') && !$('#cfName').value) $('#cfName').value = me.name || '';
            if ($('#cfEmail') && !$('#cfEmail').value) $('#cfEmail').value = me.email || '';
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = ($('#cfName').value || '').trim();
            const email = ($('#cfEmail').value || '').trim();
            const text = ($('#cfText').value || '').trim();
            if (!name || !email || !text) {
                return showMessage(form, 'Please complete your name, email, and message.', false);
            }
            if (!isValidEmail(email)) {
                return showMessage(form, 'Enter a valid email so we can reply to you.', false);
            }
            const subject = 'Website inquiry from ' + name;
            const body = text + '\n\n— ' + name + ' (' + email + ')';
            location.href = 'mailto:stellasbeachhouse@email.com?subject=' +
                encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
            showMessage(form, 'Opening your email app with your message ready to send!', true);
        });
    }

    function initFeedbackForm() {
        const form = $('#feedbackForm');
        if (!form) return;

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = $('#fbName').value.trim();
            const rating = $('#fbRating').value;
            const text = $('#fbText').value.trim();
            if (!name || !rating || !text) {
                return showMessage(form, 'Please complete name, rating, and feedback.', false);
            }

            const reviews = getReviews();
            reviews.push({ n: name, r: rating, t: text, at: new Date().toISOString() });
            saveReviews(reviews);

            form.reset();
            showMessage(form, 'Thanks, ' + name + '! Your feedback was saved.', true);
        });
    }

    function start() {

        markActiveNavLink();
        initMobileMenu();
        initSmoothScroll();
        initGalleryMarquee();
        initRevealOnScroll();
        initDialogFocusTrap();

        // Expire unpaid 24h holds on every page load, then re-check each minute
        // so holds left open in a tab still auto-cancel on time.
        sweepExpiredHolds();
        setInterval(() => {
            if (sweepExpiredHolds() && $('#reservationsList')) location.reload();
        }, 60000);

        initAccountNav();
        initLogoutLinks();
        initLoginDialog();
        initRegisterDialog();
        initAccountPage();

        initBookingDialog();

        initReservationsPage();
        initReviewWall();

        initReserveForm();
        initContactForm();
        initRegisterForm();
        initLoginForm();
        initFeedbackForm();
    }

    document.addEventListener('DOMContentLoaded', start);

})();
