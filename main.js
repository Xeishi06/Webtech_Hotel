/* ==========================================================
   Stella's Beach House - front end
   All data (accounts, reservations, reviews, payments) lives in
   MySQL and is handled by the PHP files in /api. This script only
   drives the interface: modals, the booking steps, the gallery.
   ========================================================== */

(function () {
    'use strict';

    const APP = window.APP || { user: null, rooms: [], csrf: '', site: {} };
    const DEPOSIT_RATE = APP.site.deposit || 0.5;

    // ---- tiny DOM helpers -------------------------------------
    const $ = (selector, root) => (root || document).querySelector(selector);
    const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

    const peso = (amount) => '₱' + Number(amount || 0).toLocaleString('en-PH');

    function formatDate(isoDate) {
        const date = new Date(String(isoDate || '') + 'T00:00:00');
        if (isNaN(date)) return isoDate || '—';
        return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function formatDateTime(timestamp) {
        const date = new Date(Number(timestamp));
        if (isNaN(date)) return '—';
        return date.toLocaleString('en-PH', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    function toIsoDate(date) {
        const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return local.toISOString().split('T')[0];
    }

    // ---- talking to the PHP API ------------------------------
    // Sends JSON by default; pass { formData } when uploading a photo.
    async function api(endpoint, action, data, options) {
        const opts = options || {};
        const url = 'api/' + endpoint + '.php?action=' + encodeURIComponent(action);

        const init = {
            method: opts.method || (data || opts.formData ? 'POST' : 'GET'),
            headers: {
                'X-CSRF-Token': APP.csrf,
                'X-Requested-With': 'XMLHttpRequest'
            }
        };

        if (opts.formData) {
            init.body = opts.formData;
        } else if (data) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(Object.assign({ csrf: APP.csrf }, data));
        }

        const response = await fetch(url, init);
        let json = {};
        try {
            json = await response.json();
        } catch (error) {
            json = { ok: false, message: 'The server sent an unexpected reply.' };
        }

        if (!response.ok && typeof json.ok === 'undefined') {
            json.ok = false;
        }
        return json;
    }

    // ---- room catalogue (mirrors the rooms table) ------------
    const roomByKey = (key) => APP.rooms.find((room) => room.key === key) || null;

    const roomLabel = (room) => room.name + ' (' + room.category + ')';

    function roomsOfCategory(slug) {
        return APP.rooms.filter((room) => room.slug === slug);
    }

    // ---- messages / dialogs -----------------------------------
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
        const open = !!document.querySelector('.modal-backdrop:not([hidden])');
        document.body.style.overflow = open ? 'hidden' : '';
    }

    function openDialog(dialog) {
        dialog.hidden = false;
        syncScrollLock();
    }

    function closeDialog(dialog) {
        dialog.hidden = true;
        syncScrollLock();
    }

    // Yes/No confirmation, built the same way as before.
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

    function copyToClipboard(button, text) {
        const confirm = () => {
            button.textContent = 'Copied ✓';
            setTimeout(() => { button.textContent = 'Copy ID'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(confirm, confirm);
        } else {
            confirm();
        }
    }

    function initDialogFocusTrap() {
        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;

            const open = $$('.modal-backdrop').find((dialog) => !dialog.hidden);
            if (!open) return;

            const focusable = Array.from(
                open.querySelectorAll('button, input, select, textarea, a[href]')
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

    // ==========================================================
    // Navigation, session state and page chrome
    // ==========================================================

    let openLoginPopup = () => {};
    let openRegisterPopup = () => {};
    let afterLogin = null;

    function runAfterLogin() {
        const work = afterLogin;
        afterLogin = null;
        if (work) work();
    }

    function isLoggedIn() {
        return !!APP.user;
    }

    // The nav is rendered by PHP; after logging in we swap in the same
    // markup PHP would have produced, so the page keeps running smoothly.
    function applyUserToNav(user) {
        APP.user = user;
        const holder = $('.nav-auth');
        if (!holder) return;

        if (user) {
            holder.innerHTML =
                '<a href="account.php" class="login-button">Hi, ' + escapeHtml(String(user.name).split(' ')[0]) + '</a>' +
                '<form method="post" action="api/auth.php?action=logout" class="nav-logout-form">' +
                    '<input type="hidden" name="csrf" value="' + APP.csrf + '">' +
                    '<button type="submit" class="register-button">Logout</button>' +
                '</form>';
        } else {
            location.reload();
            return;
        }

        bindLogoutButtons();
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    }

    function askForAccount(thenDo, resume) {
        afterLogin = thenDo || null;

        if ($('#loginModal') && $('#registerModal')) {
            openLoginPopup();
            return;
        }
        // No popups on this page: send them to the home page and come back.
        const query = new URLSearchParams();
        query.set('login', '1');
        Object.keys(resume || {}).forEach((key) => {
            if (resume[key] !== undefined && resume[key] !== '') query.set(key, resume[key]);
        });
        location.href = 'landingpage.php?' + query.toString();
    }

    function bindLogoutButtons() {
        $$('form.nav-logout-form').forEach((form) => {
            if (form.dataset.bound) return;
            form.dataset.bound = '1';
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                askToConfirm(
                    {
                        title: 'Log out?',
                        body: 'Your bookings stay saved to your Stella Stay account. You just need to log in again to see them.',
                        stayLabel: 'Stay',
                        goLabel: 'Log out',
                        danger: false
                    },
                    () => { form.submit(); }
                );
            });
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

    // Landing-page photo strip: seamless auto-scrolling marquee.
    function initGalleryMarquee() {
        const gallery = document.querySelector('.gallery');
        if (!gallery || gallery.querySelector('.gallery-track')) return;
        const photos = Array.from(gallery.querySelectorAll('img'));
        if (photos.length < 2) return;

        const track = document.createElement('div');
        track.className = 'gallery-track';
        photos.forEach((photo) => track.appendChild(photo));
        photos.forEach((photo) => {
            const copy = photo.cloneNode();
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

    // ==========================================================
    // Log in / register modals
    // ==========================================================

    let pendingEmail = '';
    let verifyExpiry = 0;

    function initLoginDialog() {
        const dialog = $('#loginModal');
        if (!dialog) return;
        const form = $('#quickLoginForm');

        openLoginPopup = () => {
            openDialog(dialog);
            const emailBox = $('#qLoginEmail');
            if (emailBox) emailBox.focus();
        };
        const close = () => closeDialog(dialog);

        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-login]');
            if (link) {
                if (isLoggedIn()) return;
                event.preventDefault();
                openLoginPopup();
                return;
            }
            if (event.target.closest('[data-close-login]') || event.target === dialog) close();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) close();
        });

        if (!form) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;

            const result = await api('auth', 'login', {
                email: $('#qLoginEmail').value,
                password: $('#qLoginPassword').value
            });

            button.disabled = false;

            if (result.needsVerification) {
                close();
                showRegisterVerifyStep(result.email, result);
                return;
            }
            if (!result.ok) {
                return showMessage(form, result.message, false);
            }

            showMessage(form, 'Welcome, ' + result.user.name + '!', true);
            applyUserToNav(result.user);
            setTimeout(() => {
                close();
                form.reset();
                runAfterLogin();
            }, 600);
        });
    }

    function initRegisterDialog() {
        const dialog = $('#registerModal');
        if (!dialog) return;
        const form = $('#quickRegisterForm');
        const verifyForm = $('#quickVerifyForm');

        openRegisterPopup = () => {
            showRegisterFormStep();
            openDialog(dialog);
            const nameBox = $('#qRegName');
            if (nameBox) nameBox.focus();
        };
        const close = () => closeDialog(dialog);

        document.addEventListener('click', (event) => {
            const link = event.target.closest('[data-register]');
            if (link) {
                if (isLoggedIn()) return;
                event.preventDefault();
                openRegisterPopup();
                return;
            }
            if (event.target.closest('[data-close-register]') || event.target === dialog) close();

            if (event.target.closest('#changeEmailBtn') && !dialog.hidden) {
                showRegisterFormStep();
                const emailBox = $('#qRegEmail');
                if (emailBox) {
                    emailBox.value = pendingEmail || '';
                    emailBox.focus();
                }
            }

            if (event.target.closest('#resendCodeBtn') && !dialog.hidden) {
                resendCode(verifyForm);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) close();
        });

        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                const button = form.querySelector('button[type="submit"]');
                button.disabled = true;

                const result = await api('auth', 'register', {
                    name: $('#qRegName').value,
                    email: $('#qRegEmail').value,
                    password: $('#qRegPassword').value,
                    confirmPassword: $('#qRegPassword2').value
                });

                button.disabled = false;
                if (!result.ok) return showMessage(form, result.message, false);

                clearMessage(form);
                showRegisterVerifyStep(result.email, result);
                if (verifyForm) {
                    showMessage(verifyForm, 'Verification code sent to ' + result.email + '. Enter it below.', true);
                }
            });
        }

        if (verifyForm) {
            const codeInput = $('#qRegCode');
            if (codeInput) {
                codeInput.addEventListener('input', () => {
                    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
                    if (codeInput.value.length === 6) {
                        const button = verifyForm.querySelector('button[type="submit"]');
                        if (button) button.focus();
                    }
                });
            }

            verifyForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const result = await api('auth', 'verify', {
                    email: pendingEmail,
                    code: $('#qRegCode').value
                });

                if (!result.ok) return showMessage(verifyForm, result.message, false);

                showMessage(verifyForm, result.message, true);
                applyUserToNav(result.user);
                setTimeout(() => {
                    close();
                    showRegisterFormStep();
                    if (form) form.reset();
                    verifyForm.reset();
                    runAfterLogin();
                }, 800);
            });
        }
    }

    async function resendCode(verifyForm) {
        if (!pendingEmail) {
            if (verifyForm) showMessage(verifyForm, 'No pending verification. Please register again.', false);
            return;
        }

        const result = await api('auth', 'resend', { email: pendingEmail });
        if (!result.ok) {
            if (verifyForm) showMessage(verifyForm, result.message, false);
            return;
        }

        refreshDemoCodeBox(result);
        updateVerifyExpiryText();
        if (verifyForm) showMessage(verifyForm, result.message + ' Check your inbox (and spam).', true);
    }

    function showRegisterVerifyStep(email, result) {
        const dialog = $('#registerModal');
        if (!dialog) return;
        const stepForm = $('#registerStepForm');
        const stepVerify = $('#registerStepVerify');
        if (stepForm) stepForm.hidden = true;
        if (stepVerify) stepVerify.hidden = false;

        pendingEmail = email || '';
        const minutes = (result && result.expiresInMinutes) || 10;
        verifyExpiry = Date.now() + minutes * 60 * 1000;

        const label = $('#verifyEmailText');
        if (label) label.textContent = pendingEmail || 'your email';

        const title = $('#registerTitle');
        if (title) title.textContent = 'Verify Your Email';

        refreshDemoCodeBox(result);
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

    // Only shown when the host cannot send mail, so the code is still reachable.
    function refreshDemoCodeBox(result) {
        const box = $('#demoCodeBox');
        if (!box) return;
        const demo = result && result.demoCode;

        if (demo) {
            box.hidden = false;
            const text = $('#demoCodeText');
            if (text) text.textContent = demo;
            const hint = $('#demoCodeHint');
            if (hint) hint.textContent = 'Sent to ' + (result.email || pendingEmail) + ' (demo).';
        } else {
            box.hidden = true;
        }
    }

    function updateVerifyExpiryText() {
        const line = $('#verifyExpiryText');
        if (!line) return;

        const leftMinutes = Math.max(0, Math.ceil((verifyExpiry - Date.now()) / 60000));
        line.textContent = leftMinutes > 0
            ? 'Code expires in about ' + leftMinutes + ' minute' + (leftMinutes === 1 ? '' : 's') + '.'
            : 'This code has expired - tap Resend Code.';
    }

    // ==========================================================
    // Reviews (landing page modal)
    // ==========================================================

    function initReviewModal() {
        const dialog = $('#feedbackModal');
        const form = $('#quickFeedbackForm');
        if (!dialog || !form) return;

        let stars = 5;

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

            const trigger = event.target.closest('[data-feedback]');
            if (trigger) {
                event.preventDefault();
                if (!isLoggedIn()) {
                    askForAccount(() => openReview());
                    return;
                }
                openReview();
                return;
            }

            if (event.target.closest('[data-close-feedback]') || event.target === dialog) {
                closeDialog(dialog);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) closeDialog(dialog);
        });

        function openReview() {
            const nameBox = $('#qFbName');
            if (APP.user && nameBox && !nameBox.value) nameBox.value = APP.user.name || '';
            openDialog(dialog);
            paintStars();
        }

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;

            const result = await api('reviews', 'create', {
                name: $('#qFbName').value.trim(),
                text: $('#qFbText').value.trim(),
                rating: stars
            });

            button.disabled = false;
            if (!result.ok) return showMessage(form, result.message, false);

            // Reviews are rendered by PHP, so refresh to show the new one.
            form.reset();
            stars = 5;
            closeDialog(dialog);
            location.reload();
        });

        paintStars();
    }

    // ==========================================================
    // Booking modal
    // ==========================================================

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
                                    <label for="qEmail">Email (your Stella account)</label>
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
                                    <p class="muted">Not ready to pay? Hold this room for 24 hours &mdash; pay before the deadline or the hold is automatically cancelled.</p>
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
                                    <a href="my-reservations.php?booked=1" class="main-button modal-submit button-reset">View My Reservations</a>
                                    <button type="button" class="second-button modal-submit" data-close>Done</button>
                                </div>
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

        let payMethod = 'GCash';
        let galleryPhotos = ['scene.jpg'];
        let galleryIndex = 0;

        // ---- room selection ----------------------------------
        function selectedRoom() {
            return roomSelect && roomSelect.value ? roomByKey(roomSelect.value) : null;
        }

        function populateRoomSelect(onlySlug, preselectKey) {
            if (!roomSelect) return;
            roomSelect.innerHTML = '';

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select a room';
            roomSelect.appendChild(placeholder);

            const list = onlySlug ? roomsOfCategory(onlySlug) : APP.rooms;
            list.forEach((room) => {
                if (!room.available) return;
                const option = document.createElement('option');
                option.value = room.key;
                option.textContent = onlySlug
                    ? room.name + ' - ' + peso(room.price)
                    : room.category + ' — ' + room.name + ' - ' + peso(room.price);
                if (room.key === preselectKey) option.selected = true;
                roomSelect.appendChild(option);
            });

            if (!preselectKey) roomSelect.selectedIndex = 0;
        }

        function readGuests() {
            const adults = Math.floor(Number(($('#qAdults') || {}).value));
            const children = Math.floor(Number(($('#qChildren') || {}).value) || 0);
            return {
                adults: adults,
                children: isNaN(children) ? 0 : children,
                total: (isNaN(adults) ? 0 : adults) + (isNaN(children) ? 0 : children)
            };
        }

        function guestLabel(guests) {
            if (!guests) return '';
            return guests.total + ' guest' + (guests.total === 1 ? '' : 's')
                + ' (' + guests.adults + ' adult' + (guests.adults === 1 ? '' : 's')
                + ' + ' + guests.children + ' child' + (guests.children === 1 ? '' : 'ren') + ')';
        }

        function nightsBetween(from, to) {
            const start = new Date(from);
            const end = new Date(to);
            if (isNaN(start) || isNaN(end)) return 0;
            return Math.round((end - start) / 86400000);
        }

        function updateGuestHint() {
            const hint = $('#guestHint');
            if (!hint) return;
            const room = selectedRoom();
            if (!room) {
                hint.textContent = 'Select a room to see how many guests it fits.';
                return;
            }
            hint.textContent = roomLabel(room) + ' fits up to ' + room.capacity
                + ' guest' + (room.capacity === 1 ? '' : 's') + ' total (adults + children).';
        }

        // ---- photos -------------------------------------------
        function showPhoto(index) {
            if (!galleryPhotos.length) return;
            galleryIndex = (index + galleryPhotos.length) % galleryPhotos.length;

            const bigPhoto = $('#mRoomImg');
            const thumbs = $('#mThumbs');
            const room = selectedRoom();
            const label = room ? roomLabel(room) : 'Room';

            if (bigPhoto) {
                bigPhoto.style.opacity = '0';
                setTimeout(() => {
                    bigPhoto.src = galleryPhotos[galleryIndex];
                    bigPhoto.alt = label + ' photo ' + (galleryIndex + 1);
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

        function fillRoomPanel() {
            const room = selectedRoom();
            const bigPhoto = $('#mRoomImg');
            const thumbs = $('#mThumbs');

            galleryPhotos = room && room.photos.length ? room.photos.slice() : ['scene.jpg'];
            galleryIndex = 0;

            if (thumbs) {
                thumbs.innerHTML = '';
                galleryPhotos.forEach((src, i) => {
                    const thumb = document.createElement('img');
                    thumb.src = src;
                    thumb.alt = (room ? roomLabel(room) : 'Room') + ' photo ' + (i + 1);
                    thumb.loading = 'lazy';
                    thumb.className = i === 0 ? 'active' : '';
                    thumb.onerror = () => { thumb.src = 'scene.jpg'; };
                    thumb.addEventListener('click', () => showPhoto(i));
                    thumbs.appendChild(thumb);
                });
            }

            if (bigPhoto) bigPhoto.src = galleryPhotos[0];

            const badge = $('#mRoomBadge');
            if (badge) badge.textContent = room ? room.badge : "Stella's pick";

            const meta = $('#mRoomMeta');
            if (meta) meta.textContent = room ? room.meta : 'Pick a room to see details.';

            const price = $('#mRoomPrice');
            if (price) price.textContent = room ? peso(room.price) + ' per night' : '—';

            const counter = $('#photoCount');
            if (counter) counter.textContent = '1 / ' + galleryPhotos.length;
        }

        // ---- totals (client-side preview only; the server
        //      recalculates everything before saving) -----------
        function updateTotals() {
            fillRoomPanel();

            const room = selectedRoom();
            const count = nightsBetween(checkIn.value, checkOut.value);
            const full = room && count > 0 ? room.price * count : 0;
            const deposit = full ? Math.round(full * DEPOSIT_RATE) : 0;

            const gcashLine = $('#payTotalLine');
            if (gcashLine) {
                gcashLine.textContent = !full
                    ? 'Total: —'
                    : 'Total: ' + peso(full) + ' • Deposit due now (50%): ' + peso(deposit);
            }

            $$('.pay-total-val').forEach((box) => {
                box.textContent = !full ? '—' : peso(full) + ' total • ' + peso(deposit) + ' deposit';
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

        // ---- payment method ----------------------------------
        function clearBankReceipt() {
            const input = $('#qBankReceipt');
            if (input) input.value = '';
            const preview = $('#qBankReceiptPreview');
            if (preview) {
                preview.hidden = true;
                preview.removeAttribute('src');
            }
        }

        function bankReceiptFile() {
            const input = $('#qBankReceipt');
            return input && input.files && input.files[0] ? input.files[0] : null;
        }

        function bindBankReceiptInput() {
            const input = $('#qBankReceipt');
            if (!input || input.dataset.bound) return;
            input.dataset.bound = '1';
            input.addEventListener('change', () => {
                const file = input.files && input.files[0];
                const preview = $('#qBankReceiptPreview');

                if (!file) { clearBankReceipt(); return; }
                if (!String(file.type || '').startsWith('image/')) {
                    showMessage(form, 'Receipt must be a photo (JPG/PNG).', false);
                    clearBankReceipt();
                    return;
                }
                if (file.size > 4 * 1024 * 1024) {
                    showMessage(form, 'Receipt photo is too big (max 4MB).', false);
                    clearBankReceipt();
                    return;
                }
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

        function paymentFields() {
            if (payMethod === 'GCash') {
                return { payRef: ($('#qRef').value || '').replace(/\D/g, '') };
            }
            if (payMethod === 'Bank') {
                return { payRef: ($('#qRef').value || '').trim() };
            }
            return {
                cardNumber: ($('#qCardNum').value || '').replace(/\D/g, ''),
                cardExpiry: ($('#qCardExp').value || '').trim(),
                cardCvc: ($('#qCardCvc').value || '').replace(/\D/g, '')
            };
        }

        // ---- guest details -----------------------------------
        function fillInFromAccount() {
            const note = $('#quickSessionNote');
            const user = APP.user;

            if (!user) {
                if (note) {
                    note.hidden = false;
                    note.textContent = 'Booking needs a Stella Stay account — we will ask you to log in or sign up before you pay.';
                }
                return;
            }

            if ($('#qName') && !$('#qName').value) $('#qName').value = user.name || '';
            if ($('#qEmail')) {
                $('#qEmail').value = user.email || '';
                $('#qEmail').readOnly = true;
            }
            if ($('#qContact') && !$('#qContact').value && user.contact) $('#qContact').value = user.contact;

            if (note) {
                note.hidden = false;
                note.textContent = 'Booking as ' + user.email + ' — we filled this in for you.';
            }
        }

        function readGuestDetails() {
            const name = $('#qName').value.trim();
            const contact = $('#qContact').value.trim();

            if (!name) { showMessage(form, 'Please enter your full name.', false); return null; }
            if (!/^09\d{9}$/.test(contact)) { showMessage(form, 'Contact must be 11 digits starting with 09.', false); return null; }

            clearMessage(form);
            return { name: name, contact: contact };
        }

        function whatTheyChose() {
            const guests = readGuests();
            return {
                reserve: roomSelect ? roomSelect.value : '',
                cin: checkIn.value,
                cout: checkOut.value,
                adults: isNaN(guests.adults) ? '' : guests.adults,
                children: guests.children
            };
        }

        // ---- availability (asks the server) -------------------
        async function checkAvailabilityAndAdvance(checkButton) {
            const availBox = $('#availResult');

            if (!isLoggedIn()) {
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
                if ($('#loginModal') && $('#registerModal')) {
                    askForAccount(() => {
                        fillInFromAccount();
                        const retry = $('#checkAvail');
                        if (retry) retry.click();
                    }, whatTheyChose());
                }
                return;
            }

            const room = selectedRoom();
            if (!room) {
                return showMessage(form, 'Please select a room.', false);
            }

            const guests = readGuests();
            if (checkButton) {
                checkButton.disabled = true;
                checkButton.textContent = 'Checking…';
            }

            const result = await api('bookings', 'availability', {
                roomKey: room.key,
                checkin: checkIn.value,
                checkout: checkOut.value,
                adults: guests.adults,
                children: guests.children
            });

            if (checkButton) {
                checkButton.disabled = false;
                checkButton.textContent = 'Continue to Details';
            }

            if (!result.ok) {
                if (availBox) {
                    availBox.className = 'bad';
                    availBox.innerHTML =
                        (result.guestError ? '<strong>Too many guests.</strong><br />' : '<strong>Those dates are taken.</strong><br />') +
                        escapeHtml(result.message) +
                        (result.alternative
                            ? '<div class="alt-suggest"><span>Next free for ' + nightsBetween(checkIn.value, checkOut.value) +
                              ' night(s):<br /><strong>' + formatDate(result.alternative.start) + ' → ' +
                              formatDate(result.alternative.end) + '</strong></span>' +
                              '<button type="button" id="useAltDates" data-cin="' + result.alternative.start +
                              '" data-cout="' + result.alternative.end + '">Use these dates</button></div>'
                            : '');
                }
                if (checkButton) resetAvailabilityBox();
                clearMessage(form);
                return;
            }

            clearMessage(form);
            if (availBox) {
                availBox.className = 'ok';
                availBox.innerHTML = '✓ <strong>Available!</strong> ' + escapeHtml(result.roomLabel) + ' × ' + result.nights +
                    ' night' + (result.nights > 1 ? 's' : '') + ' = <strong>' + peso(result.total) +
                    '</strong> <span class="muted">(' + peso(result.deposit) + ' deposit due now)</span>';
            }
            if (checkButton) checkButton.dataset.checked = '1';

            $('#bookSummary').textContent = '✓ ' + result.roomLabel + ' available ' + formatDate(result.checkin) +
                ' → ' + formatDate(result.checkout) + ' — ' + result.nights +
                ' night' + (result.nights > 1 ? 's' : '') + ', ' + peso(result.total) +
                ' total (' + peso(result.deposit) + ' deposit) • ' + result.guests + '.';

            goToStep(1);
        }

        // ---- saving a booking ---------------------------------
        function showReceipt(booking, mail) {
            const set = (id, value) => {
                const cell = document.getElementById(id);
                if (cell) cell.textContent = value;
            };

            set('rId', booking.id);
            set('rName', booking.name);
            set('rEmail', booking.email);
            set('rRoom', booking.room);
            set('rGuests', guestLabel({ adults: booking.adults, children: booking.children, total: booking.guests }));
            set('rIn', formatDate(booking.checkin));
            set('rOut', formatDate(booking.checkout));
            set('rRate', peso(booking.rate) + ' / night');
            set('rNights', booking.nights + ' night' + (booking.nights > 1 ? 's' : ''));
            set('rPay', booking.payment || 'Unpaid (on hold)');
            set('rRef', booking.ref || '—');
            set('rDep', peso(booking.deposit));
            set('rBal', peso(booking.balance));
            set('rTotal', peso(booking.total));
            set('rStatus', booking.statusKey === 'hold'
                ? 'On hold ⏳ — pay before ' + formatDateTime(new Date(booking.holdUntil).getTime())
                : 'Confirmed ✓');

            const receiptWrap = $('#rReceiptWrap');
            const receiptImg = $('#rReceiptImg');
            if (receiptWrap && receiptImg) {
                if (booking.receiptImg) {
                    receiptImg.src = booking.receiptImg;
                    receiptWrap.hidden = false;
                } else {
                    receiptWrap.hidden = true;
                    receiptImg.removeAttribute('src');
                }
            }

            set('bookingMailTo', booking.email);
            set('bookingMailSubject', (mail && mail.subject) || ('Booking ' + booking.id));
            set('bookingMailBody', (mail && mail.body) || '');
            const preview = $('#bookingMailPreview');
            if (preview) preview.hidden = false;

            set('modalDoneText', booking.statusKey === 'hold'
                ? 'Hold details emailed to ' + booking.email + ' (your Stella account). Pay the ' + peso(booking.deposit) +
                  ' deposit within 24 hours or this hold is automatically cancelled.'
                : 'A confirmation email was sent to ' + booking.email + ' (your Stella account). Show this receipt at check-in.');
        }

        function bookingPayload() {
            const room = selectedRoom();
            const guests = readGuests();

            return {
                roomKey: room.key,
                checkin: checkIn.value,
                checkout: checkOut.value,
                adults: guests.adults,
                children: guests.children,
                name: $('#qName').value.trim(),
                contact: $('#qContact').value.trim(),
                payMethod: payMethod
            };
        }

        function buildBookingForm(mode) {
            const data = bookingPayload();
            data.mode = mode;
            Object.assign(data, paymentFields());

            const formData = new FormData();
            Object.keys(data).forEach((key) => formData.append(key, data[key]));

            if (payMethod === 'Bank') {
                const file = bankReceiptFile();
                if (file) formData.append('receipt', file);
            }
            return formData;
        }

        async function saveNewBooking(mode, submitButton) {
            if (!isLoggedIn()) return;

            submitButton.disabled = true;
            showMessage(form, mode === 'hold' ? 'Holding your room…' : 'Saving your reservation…', true);

            const result = await api('bookings', 'create', null, { formData: buildBookingForm(mode) });

            submitButton.disabled = false;
            if (!result.ok) {
                clearMessage(form);
                showMessage(form, result.message, false);
                // Dates may have been taken while they were on the payment step.
                if (/already booked|just booked/.test(result.message)) {
                    goToStep(0);
                    resetAvailabilityBox();
                }
                return;
            }

            clearMessage(form);
            formView.hidden = true;
            doneView.hidden = false;
            showReceipt(result.booking, result.mail);
            form.reset();
            clearBankReceipt();
            goToStep(1);
        }

        function readBookingBasics() {
            if (!isLoggedIn()) {
                goToStep(1);
                askForAccount(() => {
                    fillInFromAccount();
                    goToStep(2);
                }, whatTheyChose());
                return null;
            }

            const guest = readGuestDetails();
            if (!guest) {
                goToStep(1);
                return null;
            }
            return guest;
        }

        // ---- wiring -------------------------------------------
        function openBookingDialog(reserve) {
            formView.hidden = false;
            doneView.hidden = true;
            resetAvailabilityBox();

            const want = reserve ? decodeURIComponent(reserve) : '';
            const room = want ? roomByKey(want) : null;
            if (room) populateRoomSelect(room.slug, want);
            else populateRoomSelect(null, null);

            fillInFromAccount();
            bindBankReceiptInput();
            clearBankReceipt();
            updateGuestHint();
            updateTotals();
            goToStep(0);
            openDialog(dialog);
        }

        function goToPayment() {
            if (!isLoggedIn()) {
                askForAccount(() => {
                    fillInFromAccount();
                    if (!readGuestDetails()) return;
                    goToStep(2);
                    setPayMethod(payMethod);
                    updateTotals();
                }, whatTheyChose());
                return;
            }
            if (!readGuestDetails()) return;

            goToStep(2);
            setPayMethod(payMethod);
            updateTotals();
        }

        document.addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-reserve]');
            if (trigger) {
                event.preventDefault();
                openBookingDialog(trigger.getAttribute('data-reserve') || '');
                return;
            }
            if (event.target.closest('[data-close]') || event.target === dialog) {
                closeDialog(dialog);
            }

            if (event.target.closest('#availLoginBtn') && !dialog.hidden) {
                askForAccount(() => {
                    fillInFromAccount();
                    const retry = $('#checkAvail');
                    if (retry) retry.click();
                }, whatTheyChose());
                return;
            }
            if (event.target.closest('#availRegisterBtn') && !dialog.hidden) {
                if ($('#registerModal')) {
                    showRegisterFormStep();
                    openDialog($('#registerModal'));
                    afterLogin = () => {
                        fillInFromAccount();
                        const retry = $('#checkAvail');
                        if (retry) retry.click();
                    };
                } else {
                    location.href = 'landingpage.php?register=1';
                }
                return;
            }

            const methodButton = event.target.closest('.pay-method');
            if (methodButton && !dialog.hidden) setPayMethod(methodButton.dataset.pay);

            const useAlt = event.target.closest('#useAltDates');
            if (useAlt && !dialog.hidden) {
                checkIn.value = useAlt.dataset.cin;
                checkOut.value = useAlt.dataset.cout;
                resetAvailabilityBox();
                updateTotals();
                const retry = $('#checkAvail');
                if (retry) retry.click();
            }

            if (event.target.closest('#galPrev') && !dialog.hidden) showPhoto(galleryIndex - 1);
            if (event.target.closest('#galNext') && !dialog.hidden) showPhoto(galleryIndex + 1);
            if (event.target.closest('#printReceipt')) window.print();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !dialog.hidden) closeDialog(dialog);
        });

        [roomSelect, checkIn, checkOut, $('#qAdults'), $('#qChildren')].forEach((field) => {
            if (field) field.addEventListener('change', () => {
                resetAvailabilityBox();
                updateGuestHint();
                updateTotals();
            });
        });

        $('#checkAvail').addEventListener('click', function onCheckAvailability() {
            const button = this;

            if (button.dataset.checked) {
                // Already checked: just move on to the details step.
                const room = selectedRoom();
                if (!room) return showMessage(form, 'Please select a room.', false);

                api('bookings', 'availability', {
                    roomKey: room.key,
                    checkin: checkIn.value,
                    checkout: checkOut.value,
                    adults: readGuests().adults,
                    children: readGuests().children
                }).then((result) => {
                    if (!result.ok) {
                        resetAvailabilityBox();
                        return showMessage(form, result.message, false);
                    }
                    $('#bookSummary').textContent = '✓ ' + result.roomLabel + ' available ' + formatDate(result.checkin) +
                        ' → ' + formatDate(result.checkout) + ' — ' + result.nights +
                        ' night' + (result.nights > 1 ? 's' : '') + ', ' + peso(result.total) +
                        ' total (' + peso(result.deposit) + ' deposit) • ' + result.guests + '.';
                    goToStep(1);
                });
                return;
            }

            checkAvailabilityAndAdvance(button);
        });

        $('#toPayStep').addEventListener('click', goToPayment);
        $('#backToStep0').addEventListener('click', () => goToStep(0));
        $('#backToStep1').addEventListener('click', () => goToStep(1));

        const holdBtn = $('#holdBookingBtn');
        if (holdBtn) {
            holdBtn.addEventListener('click', () => {
                if (!readBookingBasics()) return;
                saveNewBooking('hold', holdBtn);
            });
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!readBookingBasics()) return;

            const button = form.querySelector('button[type="submit"]');
            if (payMethod === 'Bank' && !bankReceiptFile()) {
                return showMessage(form, 'Please upload a photo of your bank receipt.', false);
            }
            saveNewBooking('pay', button);
        });

        // Deep link: landingpage.php?reserve=<room key>&cin=...&cout=...
        const arrival = new URLSearchParams(location.search);
        const reserveRoom = arrival.get('reserve');
        if (reserveRoom !== null) {
            const mustLogInFirst = arrival.get('login') !== null && !isLoggedIn();

            const resumeBooking = () => {
                openBookingDialog(reserveRoom || '');
                if (arrival.get('cin')) checkIn.value = arrival.get('cin');
                if (arrival.get('cout')) checkOut.value = arrival.get('cout');
                if (arrival.get('adults') !== null && $('#qAdults')) $('#qAdults').value = arrival.get('adults');
                if (arrival.get('children') !== null && $('#qChildren')) $('#qChildren').value = arrival.get('children');
                updateGuestHint();
                updateTotals();
            };

            if (mustLogInFirst) {
                afterLogin = resumeBooking;
            } else {
                resumeBooking();
            }
        }
    }

    // ==========================================================
    // Pay-now dialog for 24-hour holds
    // ==========================================================

    function openPayNowDialog(bookingCode) {
        const previous = document.getElementById('payNowDialog');
        if (previous) previous.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'payNowDialog';
        backdrop.className = 'confirm-backdrop';
        backdrop.innerHTML =
            '<div class="confirm-box paynow-box">' +
                '<h3>Pay Deposit</h3>' +
                '<p>Booking ' + bookingCode + '<br />' +
                '<span class="muted">Enter your payment details - the booking is confirmed the moment it goes through.</span></p>' +
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
                    '<button type="button" class="confirm-btn confirm-btn-go" data-paygo>Pay Deposit</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(backdrop);

        let method = 'GCash';

        const showErr = (text) => {
            const box = backdrop.querySelector('[data-payerr]');
            if (!box) return;
            box.hidden = !text;
            box.textContent = text || '';
        };

        const payButton = backdrop.querySelector('[data-paygo]');
        const receiptInput = backdrop.querySelector('[data-payreceipt]');

        if (receiptInput) {
            receiptInput.addEventListener('change', () => {
                const file = receiptInput.files && receiptInput.files[0];
                const preview = backdrop.querySelector('[data-paypreview]');
                if (!file) {
                    if (preview) preview.hidden = true;
                    return;
                }
                if (!String(file.type || '').startsWith('image/')) {
                    showErr('Receipt must be a photo (JPG/PNG).');
                    receiptInput.value = '';
                    return;
                }
                if (file.size > 4 * 1024 * 1024) {
                    showErr('Receipt photo is too big (max 4MB).');
                    receiptInput.value = '';
                    return;
                }
                showErr('');
                if (preview) {
                    preview.src = URL.createObjectURL(file);
                    preview.hidden = false;
                }
            });
        }

        backdrop.addEventListener('click', async (event) => {
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

            if (!event.target.closest('[data-paygo]')) return;

            const formData = new FormData();
            formData.append('id', bookingCode);
            formData.append('payMethod', method);

            if (method === 'GCash') {
                formData.append('payRef', (backdrop.querySelector('[data-pane="GCash"] [data-payref]').value || '').replace(/\D/g, ''));
            } else if (method === 'Bank') {
                formData.append('payRef', (backdrop.querySelector('[data-pane="Bank"] [data-payref]').value || '').trim());
                const file = receiptInput && receiptInput.files && receiptInput.files[0];
                if (file) formData.append('receipt', file);
            } else {
                formData.append('cardNumber', (backdrop.querySelector('[data-cardnum]').value || '').replace(/\D/g, ''));
                formData.append('cardExpiry', (backdrop.querySelector('[data-cardexp]').value || '').trim());
                formData.append('cardCvc', (backdrop.querySelector('[data-cardcvc]').value || '').replace(/\D/g, ''));
            }

            payButton.disabled = true;
            showErr('Saving your payment…');

            const result = await api('bookings', 'pay', null, { formData });

            payButton.disabled = false;
            if (!result.ok) {
                return showErr(result.message);
            }

            backdrop.remove();
            location.href = 'my-reservations.php?booked=1';
        });
    }

    // ==========================================================
    // My Reservations page behaviours
    // ==========================================================

    function initReservationsPage() {
        const list = $('#reservationsList');
        if (!list) return;

        // Keep the 24-hour countdown ticking, and refresh once it runs out
        // (the server expires the hold on the next request).
        const tickers = $$('[data-hold-until]', list);
        if (!tickers.length) return;

        function render() {
            tickers.forEach((node) => {
                const until = Number(node.dataset.holdUntil) * 1000;
                const left = until - Date.now();

                if (left <= 0) {
                    node.textContent = 'expired';
                    if (!node.dataset.reloading) {
                        node.dataset.reloading = '1';
                        setTimeout(() => location.reload(), 1500);
                    }
                    return;
                }
                const hours = Math.floor(left / 3600000);
                const minutes = Math.floor((left % 3600000) / 60000);
                node.textContent = hours > 0
                    ? hours + 'h ' + minutes + 'm left'
                    : minutes + ' minute' + (minutes === 1 ? '' : 's') + ' left';
            });
        }

        render();
        setInterval(render, 30000);

        list.addEventListener('click', (event) => {
            const payButton = event.target.closest('[data-paynow]');
            if (payButton) {
                openPayNowDialog(payButton.getAttribute('data-paynow'));
                return;
            }
            const copyButton = event.target.closest('[data-copy]');
            if (copyButton) {
                copyToClipboard(copyButton, copyButton.getAttribute('data-copy'));
            }
        });

        $$('form[data-confirm-cancel]').forEach((form) => {
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                askToConfirm(
                    {
                        title: 'Cancel this booking?',
                        body: 'Your room is released right away. A paid booking is refunded to your original payment method.',
                        stayLabel: 'Keep Booking',
                        goLabel: 'Yes, Cancel',
                        danger: true
                    },
                    () => { form.submit(); }
                );
            });
        });
    }

    // ==========================================================
    // Account page behaviours
    // ==========================================================

    function initAccountPage() {
        const nameBox = $('#accName');
        if (!nameBox) return;

        const avatarHolder = $('#accAvatar');
        const contactText = $('#accContact');
        const form = $('#accountForm');

        function renderAvatar(user) {
            if (!avatarHolder) return;
            avatarHolder.innerHTML = '';
            const avatar = document.createElement('span');
            avatar.className = 'avatar-circle avatar-large';
            if (user && user.avatar) {
                const img = document.createElement('img');
                img.src = user.avatar;
                img.alt = '';
                avatar.appendChild(img);
            } else {
                const name = (user && user.name) || 'Guest';
                avatar.textContent = (name.trim().charAt(0) || 'G').toUpperCase();
                avatar.style.background = avatarHue(name);
            }
            avatarHolder.appendChild(avatar);
        }

        renderAvatar(APP.user);

        const avatarInput = $('#accAvatarInput');
        if (avatarInput) {
            avatarInput.addEventListener('change', async () => {
                const file = avatarInput.files && avatarInput.files[0];
                if (!file || !APP.user) { avatarInput.value = ''; return; }

                const formData = new FormData();
                formData.append('csrf', APP.csrf);
                formData.append('photo', file);

                const result = await api('account', 'avatar', null, { formData });
                avatarInput.value = '';

                if (!result.ok) return showMessage(form, result.message, false);

                APP.user = result.user;
                renderAvatar(result.user);
                showMessage(form, 'Profile photo updated! It now shows beside your name on reviews.', true);
            });
        }

        const avatarRemove = $('#accAvatarRemove');
        if (avatarRemove) {
            avatarRemove.addEventListener('click', async () => {
                if (!APP.user) return;
                const result = await api('account', 'avatar-remove', {});
                if (!result.ok) return showMessage(form, result.message, false);
                APP.user = result.user;
                renderAvatar(result.user);
            });
        }

        if (form) {
            form.addEventListener('submit', async (event) => {
                event.preventDefault();
                if (!APP.user) return showMessage(form, 'Log in first to update your account.', false);

                const contact = $('#accContactInput').value.trim();
                const result = await api('account', 'update', { contact });

                if (!result.ok) return showMessage(form, result.message, false);

                APP.user = result.user;
                if (contactText) contactText.textContent = contact || 'Not set yet';
                showMessage(form, 'Account updated!', true);
            });
        }

        const deleteBtn = $('#deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                askToDeleteAccount();
            });
        }
    }

    function avatarHue(name) {
        let hash = 0;
        const text = String(name || 'Guest');
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
        return 'hsl(' + hash + ', 35%, 52%)';
    }

    function askToDeleteAccount() {
        if (!APP.user) return;
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
        if (!APP.user) return;

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

        backdrop.querySelector('strong').textContent = APP.user.email;
        document.body.appendChild(backdrop);

        const input = backdrop.querySelector('[data-delpw]');
        const showErr = (text) => {
            const box = backdrop.querySelector('[data-delerr]');
            if (!box) return;
            box.hidden = !text;
            box.textContent = text || '';
        };
        const dismiss = () => backdrop.remove();
        setTimeout(() => input.focus(), 60);

        backdrop.addEventListener('click', async (event) => {
            if (event.target === backdrop || event.target.closest('[data-delcancel]')) {
                dismiss();
                return;
            }
            if (!event.target.closest('[data-delgo]')) return;

            const result = await api('account', 'delete', { password: input.value });
            if (!result.ok) {
                showErr(result.message);
                input.value = '';
                input.focus();
                return;
            }
            dismiss();
            location.href = 'landingpage.php';
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

    // ==========================================================
    // Boot
    // ==========================================================

    document.addEventListener('DOMContentLoaded', function () {
        initMobileMenu();
        initSmoothScroll();
        initGalleryMarquee();
        initRevealOnScroll();
        initDialogFocusTrap();
        bindLogoutButtons();

        initLoginDialog();
        initRegisterDialog();
        initReviewModal();
        initBookingDialog();
        initReservationsPage();
        initAccountPage();

        // Links that ask for the login / register popup straight away.
        const arrival = new URLSearchParams(location.search);
        if (!isLoggedIn()) {
            if (arrival.get('login') !== null) openLoginPopup();
            if (arrival.get('register') !== null && $('#registerModal')) {
                showRegisterFormStep();
                openDialog($('#registerModal'));
            }
        }

        // Keep the "code expires in..." line fresh while the dialog is open.
        setInterval(() => {
            if ($('#registerStepVerify') && !$('#registerStepVerify').hidden) updateVerifyExpiryText();
        }, 30000);
    });
}());