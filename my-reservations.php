<?php
/**
 * My Reservations: the signed-in guest's bookings, rendered by PHP straight
 * from the bookings table (status, totals, payment proof and 24h countdown).
 */

require __DIR__ . '/includes/bootstrap.php';

$user = current_user();

$pageTitle = 'My Reservations - ' . SITE_NAME;
$pageDescription = 'Your bookings at ' . SITE_NAME;
$cssFile = 'landingpage.css';
$cssVersion = '16';

// Cancelling is a normal POST from this page - no JavaScript required.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'cancel' && $user) {
    if (hash_equals(csrf_token(), (string) ($_POST['csrf'] ?? '')) && ($_POST['code'] ?? '') !== '') {
        $find = db()->prepare('SELECT * FROM bookings WHERE booking_code = ? AND user_id = ? LIMIT 1');
        $find->execute([(string) $_POST['code'], (int) $user['id']]);
        $booking = $find->fetch();

        if ($booking && in_array($booking['status'], ['hold', 'confirmed'], true)) {
            db()->prepare('UPDATE bookings SET status = ? WHERE id = ?')->execute([
                $booking['status'] === 'hold' ? 'released' : 'refund_pending',
                (int) $booking['id'],
            ]);
        }
    }
    header('Location: my-reservations.php');
    exit;
}

$bookings = [];
if ($user) {
    $statement = db()->prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC, id DESC');
    $statement->execute([(int) $user['id']]);
    $bookings = $statement->fetchAll();
}

require __DIR__ . '/includes/head.php';
require __DIR__ . '/includes/nav.php';
?>

<section class="rooms bookings">

    <p class="label">MY BOOKINGS</p>

    <h2>My Reservations</h2>

    <p class="section-description">Paid bookings, receipts, and cancellations for your Stella Stay account.</p>

    <?php if (isset($_GET['booked'])): ?>
        <p class="form-msg success">Reservation saved! See it below.</p>
    <?php endif; ?>

    <div id="reservationsList" class="booking-list">

        <?php if (!$user): ?>

            <div class="empty-state">
                <span class="empty-state-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10v11H4V10" /><path d="M2 21h20" /><path d="M7.5 10V7a4.5 4.5 0 0 1 9 0v3" /><path d="M12 14v3" /></svg>
                </span>
                <p class="empty-state-title">Log in to see your bookings</p>
                <p class="empty-state-text">Every reservation is kept with your Stella Stay account,
                    so you need to log in before we can show it to you.</p>
                <p class="empty-state-actions">
                    <a href="landingpage.php?login=1" class="main-button button-reset">Log in</a>
                    <a href="landingpage.php?register=1" class="second-button button-reset">Create Account</a>
                </p>
                <p class="empty-state-note">Bookings stay saved to your account between visits.</p>
            </div>

        <?php elseif (!$bookings): ?>

            <div class="empty-state">
                <span class="empty-state-badge" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M8.5 14.5l2 2 4-4" /></svg>
                </span>
                <p class="empty-state-title">No bookings yet</p>
                <p class="empty-state-text">When you reserve a room, it will show up here with its receipt and booking ID.</p>
                <p class="empty-state-actions">
                    <a href="landingpage.php#rooms" class="main-button button-reset">Browse rooms</a>
                </p>
                <p class="empty-state-note">Your bookings are kept with your Stella Stay account.</p>
            </div>

        <?php else: ?>

            <?php foreach ($bookings as $row):
                $booking = booking_payload($row);
                $pending = $booking['statusKey'] === 'hold';
                $cancelled = in_array($booking['statusKey'], ['expired', 'released', 'refund_pending'], true);
                $badgeClass = $cancelled ? ' cancelled' : ($pending ? ' pending' : '');
            ?>
                <div class="reservation-card<?= $cancelled ? ' cancelled' : '' ?>">
                    <h2><?= e($booking['room']) ?>
                        <span class="status-badge<?= $badgeClass ?>"><?= e($booking['status']) ?></span>
                    </h2>
                    <p class="id-row"><strong>ID:</strong> <?= e($booking['id']) ?>
                        <button type="button" class="copy-btn" data-copy="<?= e($booking['id']) ?>">Copy ID</button>
                    </p>
                    <p><strong>Check-in:</strong> <?= e(format_date($booking['checkin'])) ?>
                        &nbsp; <strong>Check-out:</strong> <?= e(format_date($booking['checkout'])) ?>
                    </p>
                    <p><strong>Guests:</strong> <?= e(guest_summary($booking['adults'], $booking['children'])) ?></p>
                    <p><strong>Nights:</strong> <?= $booking['nights'] ?>
                        &nbsp; <strong>Total:</strong> <?= peso($booking['total']) ?>
                        (deposit <?= peso($booking['deposit']) ?> <?= $pending ? 'due' : 'paid' ?>)
                    </p>
                    <?php if ($booking['payment']): ?>
                        <p><strong>Payment:</strong> <?= e($booking['payment']) ?>
                            <?php if ($booking['ref']): ?> &bull; Ref <?= e($booking['ref']) ?><?php endif; ?>
                        </p>
                    <?php endif; ?>
                    <?php if ($booking['receiptImg']): ?>
                        <p><strong>Bank Receipt:</strong><br />
                            <a href="<?= e($booking['receiptImg']) ?>" target="_blank" rel="noopener">
                                <img class="receipt-thumb" src="<?= e($booking['receiptImg']) ?>" alt="Bank receipt photo &mdash; tap to enlarge" />
                            </a>
                        </p>
                    <?php endif; ?>
                    <?php if ($pending): ?>
                        <p class="hold-countdown">
                            <strong>Time left to pay:</strong>
                            <span data-hold-until="<?= e((string) strtotime((string) $booking['holdUntil'])) ?>"><?= e(hold_remaining_text($booking['holdUntil'])) ?></span>
                            <span class="muted">(pay before <?= e(format_datetime($booking['holdUntil'])) ?> or this hold is automatically cancelled)</span>
                        </p>
                    <?php endif; ?>
                    <?php if ($cancelled): ?>
                        <p class="muted">
                            <?php if ($booking['statusKey'] === 'expired'): ?>
                                This hold expired unpaid after <?= HOLD_HOURS ?> hours and the room was released. Rebook to try again.
                            <?php else: ?>
                                Refund will be sent to your original payment method.
                                Questions? Message <?= e(SITE_PHONE) ?> with your booking ID.
                            <?php endif; ?>
                        </p>
                    <?php else: ?>
                        <div class="card-actions">
                            <?php if ($pending): ?>
                                <button type="button" class="paynow-btn" data-paynow="<?= e($booking['id']) ?>">Pay Now &mdash; <?= peso($booking['deposit']) ?></button>
                                <form method="post" class="cancel-form" data-confirm-cancel>
                                    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                                    <input type="hidden" name="action" value="cancel">
                                    <input type="hidden" name="code" value="<?= e($booking['id']) ?>">
                                    <button type="submit" class="cancel-btn">Cancel Reservation</button>
                                </form>
                            <?php endif; ?>
                        </div>
                        <?php if (!$pending): ?>
                            <p class="muted">This booking is locked. To request any changes, message <?= e(SITE_PHONE) ?> with your booking ID.</p>
                        <?php endif; ?>
                    <?php endif; ?>
                </div>
            <?php endforeach; ?>

        <?php endif; ?>

    </div>

</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
<?php require __DIR__ . '/includes/scripts.php'; ?>