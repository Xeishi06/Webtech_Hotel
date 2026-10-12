<?php
/**
 * Home page: hero, about, rooms, reviews, contact form and the
 * login / register / review modals.
 */

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/contact.php';

$contactResult = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contactResult = handle_contact_form();
    // Redirect so a refresh does not send the message twice.
    header('Location: landingpage.php#contact' . ($contactResult['ok'] ? '?sent=1' : ''), $contactResult['ok'] ? 303 : 200);
    if ($contactResult['ok']) {
        exit;
    }
}

$pageTitle = "Stella's Beach House";
$pageDescription = 'Stella\'s Beach House - relaxing beach getaway in Patar, Bolinao, Pangasinan. Couples and family rooms.';
$cssFile = 'landingpage.css';
$cssVersion = '16';
$bootstrapCss = true;
$footerStyle = 'full';

$categories = room_categories();
$reviews = latest_reviews(3);
$summary = review_summary();

// A few room photos for the scrolling strip, de-duplicated by URL.
$galleryPhotos = [];
foreach (all_rooms() as $room) {
    foreach (room_photos($room) as $photo) {
        $galleryPhotos[$photo] = $photo;
    }
}
$galleryPhotos = array_values($galleryPhotos);

require __DIR__ . '/includes/head.php';
require __DIR__ . '/includes/nav.php';
?>

<section class="hero" id="home">

    <div class="hero-content">

        <p class="welcome">WELCOME TO</p>

        <h1>Stella's Beach House</h1>

        <p class="hero-location">
            <span class="pin-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10.5c0 5.2-5.6 10.6-7.5 12.2a1.1 1.1 0 0 1-1.3 0C9.2 21.1 3.5 15.7 3.5 10.5a8.5 8.5 0 0 1 17 0z" />
                    <circle cx="12" cy="10.3" r="2.8" />
                </svg>
            </span>
            Patar, Bolinao, Pangasinan &bull; Couples &amp; families up to 15
        </p>

        <p>
            Relax, enjoy the beach, and make unforgettable
            memories with your family and loved ones.
        </p>

        <p class="hero-deposit">Reserve with just a 50% deposit &mdash; balance at check-in.</p>

        <div class="hero-buttons">

            <a href="#rooms" class="second-button">
                View Rooms
            </a>

        </div>

    </div>

</section>



<section class="about" id="about">

    <p class="label">ABOUT US</p>

    <h2>Your Relaxing Beach Getaway</h2>

    <p>
        Stella's Beach House is a comfortable place where
        guests can relax, spend time with family and friends,
        and enjoy a peaceful beach vacation.
    </p>

    <p>
        Whether you are planning a family trip or a relaxing
        getaway, we provide comfortable rooms and an easy
        reservation experience.
    </p>

    <div class="about-points">
        <div><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6.5 9.8 17.2 4 11.6" /></svg>Rooms for 2 to 15 guests</div>
        <div><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6.5 9.8 17.2 4 11.6" /></svg>Easy online reservation</div>
        <div><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6.5 9.8 17.2 4 11.6" /></svg>Peaceful, family-friendly stay</div>
    </div>

    <p><a href="#why-us" class="second-button">See why guests stay with us</a></p>

</section>



<section class="gallery" aria-label="Beach house photos">
    <img src="scene.jpg" alt="Stella's Beach House beachfront" loading="lazy" />
    <?php foreach (array_slice($galleryPhotos, 0, 3) as $photo): ?>
        <img src="<?= e($photo) ?>" alt="Stella's Beach House" loading="lazy"
            onerror="this.onerror=null;this.src='scene.jpg';" />
    <?php endforeach; ?>
</section>



<section class="rooms" id="rooms">

    <p class="label">OUR ROOMS</p>

    <h2>Choose Your Perfect Room</h2>

    <p class="section-description">
        Find a room that fits your group and enjoy a
        comfortable stay at Stella's Beach House.
    </p>

    <div class="room-container">

        <?php foreach ($categories as $category) {
            require __DIR__ . '/includes/parts/category-card.php';
        } ?>

        <div class="room-card cta-card">
            <h3>Need something bigger?</h3>
            <p>Traveling with 15+ guests or planning an event? Message us and we'll arrange the perfect setup.</p>
            <p class="push-down"><a href="#contact" class="main-button">Contact Us</a></p>
        </div>

    </div>

</section>



<section class="features" id="why-us">

    <p class="label">WHY STAY WITH US?</p>

    <h2>Enjoy a Simple and Comfortable Stay</h2>

    <div class="feature-container">

        <div class="feature-card">

            <div class="icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2c1.3 0 1.9-.5 2.5-1" />
                    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2c1.3 0 1.9-.5 2.5-1" />
                </svg>
            </div>
            <h3>Beach Relaxation</h3>

            <p>
                Enjoy a peaceful place away from the
                busy city.
            </p>

        </div>


        <div class="feature-card">

            <div class="icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="7" r="3.5" />
                    <path d="M2.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h4a4.5 4.5 0 0 1 4.5 4.5v1" />
                    <circle cx="17.5" cy="8.5" r="2.5" />
                    <path d="M17.5 14.2h1.2a3.8 3.8 0 0 1 3.8 3.8v1" />
                </svg>
            </div>
            <h3>Family Friendly</h3>

            <p>
                Our rooms are available for couples
                and families of different sizes.
            </p>

        </div>


        <div class="feature-card">

            <div class="icon-circle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                    <path d="M3 9.5h18" />
                    <path d="M8 2.5v4" />
                    <path d="M16 2.5v4" />
                    <path d="M9 14.5l2 2 4-4" />
                </svg>
            </div>
            <h3>Easy Reservation</h3>

            <p>
                One Stella Stay account keeps every booking,
                receipt and cancellation in one place.
            </p>

        </div>

    </div>

</section>



<section class="reviews" id="reviews">

    <p class="label">GUEST REVIEWS</p>

    <h2>What Guests Say</h2>

    <?php if ($summary['total'] > 0): ?>
        <p class="section-description" id="ratingSummary">
            &#9733; <?= number_format($summary['average'], 1) ?> from
            <?= $summary['total'] ?> review<?= $summary['total'] === 1 ? '' : 's' ?>
        </p>
    <?php else: ?>
        <p class="section-description" id="ratingSummary">No reviews yet &mdash; share the first one!</p>
    <?php endif; ?>

    <div class="review-wall" id="reviewWall">
        <?php if (!$reviews): ?>
            <div class="empty-state">
                <span class="empty-state-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9L12 2.6z"/></svg>
                </span>
                <p class="empty-state-title">Be the first to review</p>
                <p class="empty-state-text">Stayed with us? Tell future guests what to expect &mdash; the room, the view, breakfast, and the little things that mattered.</p>
                <p class="empty-state-note">Every review helps the next guest decide.</p>
            </div>
        <?php else: ?>
            <?php foreach ($reviews as $review): ?>
                <div class="review-card">
                    <div class="stars"><?= e($review['stars']) ?></div>
                    <div class="review-head">
                        <?php if ($review['a']): ?>
                            <span class="avatar-circle"><img src="<?= e($review['a']) ?>" alt="" /></span>
                        <?php else: ?>
                            <span class="avatar-circle" style="background: <?= e(avatar_hue($review['n'])) ?>"><?= e(mb_strtoupper(mb_substr($review['n'], 0, 1))) ?></span>
                        <?php endif; ?>
                        <h3><?= e($review['n']) ?></h3>
                    </div>
                    <p><?= nl2br(e($review['t'])) ?></p>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>

    <button type="button" class="main-button button-reset review-cta" data-feedback <?= is_logged_in() ? '' : 'data-needs-login' ?>>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" fill="currentColor"/></svg>
        Write a Review
    </button>

</section>



<section class="contact" id="contact">

    <p class="label">CONTACT US</p>

    <h2>Plan Your Perfect Beach Stay</h2>

    <p class="contact-description">
        Have questions about our rooms or reservations?
        Feel free to get in touch with us.
    </p>

    <div class="contact-split">

        <div class="contact-rows">

            <div class="contact-row">
                <span class="card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10.5c0 5.2-5.6 10.6-7.5 12.2a1.1 1.1 0 0 1-1.3 0C9.2 21.1 3.5 15.7 3.5 10.5a8.5 8.5 0 0 1 17 0z" />
                        <circle cx="12" cy="10.3" r="2.8" />
                    </svg>
                </span>
                <div>
                    <h3>Visit Us</h3>
                    <p><?= e(SITE_ADDRESS) ?></p>
                    <p><a href="https://www.google.com/maps/search/?api=1&amp;query=Stellas+Beach+House+Patar+Bolinao+Pangasinan" target="_blank" rel="noopener">View map &rarr;</a></p>
                </div>
            </div>

            <div class="contact-row">
                <span class="card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21.5 16.9v2.6a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.5-3 19.3 19.3 0 0 1-6-6 19.6 19.6 0 0 1-3-8.6 2 2 0 0 1 2-2.2h2.6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1l-1.1 1.1a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a1.9 1.9 0 0 1 1.9 2.3z" />
                    </svg>
                </span>
                <div>
                    <h3>Call Us</h3>
                    <p><a href="tel:+639123456789"><?= e(SITE_PHONE) ?></a> <span class="muted">&bull; 8am&ndash;8pm</span></p>
                </div>
            </div>

            <div class="contact-row">
                <span class="card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                        <path d="M3 6.8l8.1 5.5a1.6 1.6 0 0 0 1.8 0L21 6.8" />
                    </svg>
                </span>
                <div>
                    <h3>Email Us</h3>
                    <p><a href="mailto:<?= e(SITE_EMAIL) ?>"><?= e(SITE_EMAIL) ?></a></p>
                </div>
            </div>

            <div class="contact-row">
                <span class="card-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.5 2.5h-2.2A4.8 4.8 0 0 0 10.5 7.3v2.9H7.8v4.2h2.7v7.1a1 1 0 0 0 1 1h4.1v-8.1h2.9l.6-4.2h-3.5V7.6a1.3 1.3 0 0 1 1.3-1.3h1.6z" />
                    </svg>
                </span>
                <div>
                    <h3>Follow Us</h3>
                    <p><a href="https://www.facebook.com/stellamariebeachresort" target="_blank" rel="noopener">Stella Marie Beach Resort</a> <span class="muted">&bull; updates &amp; promos</span></p>
                </div>
            </div>

        </div>

        <form class="contact-form" method="post" action="landingpage.php#contact" novalidate>
            <h3>Send Us a Message</h3>
            <p class="muted">We usually reply within a day.</p>
            <?php if (!empty($contactResult)): ?>
                <p class="form-msg <?= $contactResult['ok'] ? 'success' : 'error' ?>"><?= e($contactResult['message']) ?></p>
            <?php elseif (isset($_GET['sent'])): ?>
                <p class="form-msg success">Thanks! Your message reached our front desk &mdash; we usually reply within a day.</p>
            <?php endif; ?>
            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
            <label for="cfName">Your Name</label>
            <input id="cfName" name="name" type="text" placeholder="Enter your name" autocomplete="name" required />
            <label for="cfEmail">Your Email</label>
            <input id="cfEmail" name="email" type="email" placeholder="you@gmail.com" autocomplete="email" required />
            <label for="cfText">Message</label>
            <textarea id="cfText" name="message" placeholder="Hi! I have a question about..." required></textarea>
            <button type="submit" class="main-button button-reset contact-submit">Send Message</button>
            <p class="muted">Goes straight to our front desk inbox &mdash; no account needed.</p>
        </form>

    </div>

</section>



<?php require __DIR__ . '/includes/footer.php'; ?>



<div class="modal-backdrop" id="loginModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
        <button type="button" class="modal-close" data-close-login aria-label="Close">&times;</button>
        <div class="modal-beach" aria-hidden="true"></div>
        <p class="label">WELCOME</p>
        <h2 id="loginTitle">Customer Login</h2>
        <form id="quickLoginForm" novalidate>
            <label for="qLoginEmail">Email</label>
            <input id="qLoginEmail" type="email" placeholder="Enter your email" required autocomplete="email" />
            <label for="qLoginPassword">Password</label>
            <input id="qLoginPassword" type="password" placeholder="Enter your password" required autocomplete="current-password" />
            <button type="submit" class="main-button modal-submit">Login</button>
        </form>
        <p>Don't have an account? <a href="landingpage.php?register=1" data-register data-close-login>Create an account</a></p>
    </div>
</div>

<div class="modal-backdrop" id="registerModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="registerTitle">
        <button type="button" class="modal-close" data-close-register aria-label="Close">&times;</button>
        <div class="modal-beach" aria-hidden="true"></div>
        <p class="label">JOIN US</p>
        <h2 id="registerTitle">Create Account</h2>
        <div id="registerStepForm">
            <form id="quickRegisterForm" novalidate>
                <label for="qRegName">Full Name</label>
                <input id="qRegName" type="text" placeholder="Enter your full name" required autocomplete="name" />
                <label for="qRegEmail">Email</label>
                <input id="qRegEmail" type="email" placeholder="Enter your email" required autocomplete="email" />
                <label for="qRegPassword">Password</label>
                <input id="qRegPassword" type="password" placeholder="Min 6 characters" required minlength="6" autocomplete="new-password" />
                <label for="qRegPassword2">Confirm Password</label>
                <input id="qRegPassword2" type="password" placeholder="Confirm your password" required autocomplete="new-password" />
                <button type="submit" class="main-button modal-submit">Send Verification Code</button>
                <p class="muted">We will send a 6-digit verification code to your email.</p>
            </form>
            <p>Already have an account? <a href="landingpage.php?login=1" data-login data-close-register>Login here</a></p>
        </div>
        <div id="registerStepVerify" hidden>
            <div class="verify-box">
                <p class="verify-title">Check your email &#9993;</p>
                <p class="muted">We sent a 6-digit verification code to<br /><strong id="verifyEmailText">your email</strong></p>
                <form id="quickVerifyForm" novalidate>
                    <label for="qRegCode">Verification Code</label>
                    <input id="qRegCode" type="text" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit code" required autocomplete="one-time-code" class="code-input" />
                    <p class="muted" id="verifyExpiryText">Code expires in <?= VERIFY_MINUTES ?> minutes.</p>
                    <button type="submit" class="main-button modal-submit">Verify &amp; Create Account</button>
                </form>
                <div class="demo-code" id="demoCodeBox" hidden>
                    <span class="label">DEMO INBOX &mdash; mail server not available</span>
                    <p>Your code is: <strong id="demoCodeText">------</strong></p>
                    <p class="muted">Your hosting can't send mail yet, so we show the code here. <span id="demoCodeHint"></span></p>
                </div>
                <div class="verify-actions">
                    <button type="button" class="second-button button-reset" id="resendCodeBtn">Resend Code</button>
                    <button type="button" class="details-link" id="changeEmailBtn">Change email</button>
                </div>
                <p class="muted">Didn't get it? Check spam, or <a href="https://mail.google.com/" target="_blank" rel="noopener">open Gmail</a> / <a href="https://outlook.live.com/" target="_blank" rel="noopener">open Outlook</a>.</p>
            </div>
        </div>
    </div>
</div>

<div class="modal-backdrop" id="feedbackModal" hidden>
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="feedbackTitle">
        <button type="button" class="modal-close" data-close-feedback aria-label="Close">&times;</button>
        <div class="modal-beach" aria-hidden="true"></div>
        <p class="label">SHARE YOUR STAY</p>
        <h2 id="feedbackTitle">Write a Review</h2>
        <form id="quickFeedbackForm" novalidate>
            <label for="qFbName">Your Name</label>
            <input id="qFbName" type="text" placeholder="Enter your name" required autocomplete="name" />
            <label>Your Rating <span class="muted" id="starCount">5/5</span></label>
            <div class="star-pick" id="starPick" role="radiogroup" aria-label="Rating">
                <button type="button" data-star="1" aria-label="1 star">&#9733;</button>
                <button type="button" data-star="2" aria-label="2 stars">&#9733;</button>
                <button type="button" data-star="3" aria-label="3 stars">&#9733;</button>
                <button type="button" data-star="4" aria-label="4 stars">&#9733;</button>
                <button type="button" data-star="5" aria-label="5 stars">&#9733;</button>
            </div>
            <label for="qFbText">Your Feedback</label>
            <textarea id="qFbText" placeholder="How was your stay?" required></textarea>
            <button type="submit" class="main-button modal-submit">Submit Review</button>
        </form>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

<?php require __DIR__ . '/includes/scripts.php'; ?>