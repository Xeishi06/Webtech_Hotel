<?php
/**
 * Admin panel - staff only (is_admin = 1).
 *
 * Server-rendered: dashboard counters, every reservation with a status
 * control, and the messages guests sent through the contact form.
 * Status changes are ordinary POSTs guarded by a CSRF token, so the panel
 * works even if JavaScript is unavailable.
 */

require __DIR__ . '/includes/bootstrap.php';

$staff = require_admin_page();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = (string) ($_POST['csrf'] ?? '');
    $action = (string) ($_POST['action'] ?? '');

    if (hash_equals(csrf_token(), $csrf)) {
        if ($action === 'status') {
            $status = (string) ($_POST['status'] ?? '');
            $code = (string) ($_POST['code'] ?? '');

            if ($code !== '' && array_key_exists($status, BOOKING_STATUS_LABELS)) {
                $find = db()->prepare('SELECT * FROM bookings WHERE booking_code = ? LIMIT 1');
                $find->execute([$code]);
                $booking = $find->fetch();

                if ($booking) {
                    $holdUntil = $status === 'hold'
                        ? date('Y-m-d H:i:s', time() + HOLD_HOURS * 3600)
                        : $booking['hold_until'];

                    $update = db()->prepare(
                        'UPDATE bookings SET status = ?, hold_until = ?, paid_at = ' . ($status === 'confirmed' ? 'NOW()' : 'paid_at') . ' WHERE id = ?'
                    );
                    $update->execute([$status, $holdUntil, (int) $booking['id']]);
                }
            }
            header('Location: admin.php' . ($status !== '' ? '?status=' . urlencode($status) : ''));
            exit;
        }

        if ($action === 'message-handled') {
            db()->prepare('UPDATE messages SET handled = 1 WHERE id = ?')->execute([(int) ($_POST['id'] ?? 0)]);
            header('Location: admin.php#messages');
            exit;
        }
    }
}

$filter = (string) ($_GET['status'] ?? '');
$filter = array_key_exists($filter, BOOKING_STATUS_LABELS) ? $filter : '';

$sql = 'SELECT b.*, u.name AS account_name, u.email AS account_email, u.contact AS account_contact
        FROM bookings b JOIN users u ON u.id = b.user_id';
$params = [];
if ($filter !== '') {
    $sql .= ' WHERE b.status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY b.created_at DESC, b.id DESC LIMIT 300';
$statement = db()->prepare($sql);
$statement->execute($params);
$bookings = $statement->fetchAll();

$messages = db()->query('SELECT * FROM messages ORDER BY handled ASC, created_at DESC LIMIT 50')->fetchAll();

$counters = db()->query(
    "SELECT
        COUNT(*) AS total,
        SUM(status = 'hold') AS on_hold,
        SUM(status = 'confirmed') AS confirmed,
        SUM(status IN ('expired','released','refund_pending')) AS cancelled,
        SUM(checkin >= CURDATE() AND status IN ('hold','confirmed')) AS upcoming,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total ELSE 0 END), 0) AS revenue
     FROM bookings"
)->fetch();

$guestCount = (int) db()->query('SELECT COUNT(*) AS c FROM users WHERE is_admin = 0')->fetch()['c'];

$pageTitle = 'Admin - ' . SITE_NAME;
$pageDescription = 'Staff dashboard';
$cssFile = 'landingpage.css';
$cssVersion = '16';
$extraCss = ['admin.css'];

require __DIR__ . '/includes/head.php';
require __DIR__ . '/includes/nav.php';
?>

<section class="admin">

    <p class="label">STAFF</p>

    <h2>Front Desk Dashboard</h2>

    <p class="section-description">Signed in as <?= e($staff['email']) ?>. Every reservation below is live &mdash; guests can see their changes straight away.</p>

    <div class="stat-grid">
        <div class="stat-card"><span class="stat-value"><?= (int) $counters['total'] ?></span><span class="stat-label">All reservations</span></div>
        <div class="stat-card on-hold"><span class="stat-value"><?= (int) $counters['on_hold'] ?></span><span class="stat-label">Waiting for payment</span></div>
        <div class="stat-card confirmed"><span class="stat-value"><?= (int) $counters['confirmed'] ?></span><span class="stat-label">Confirmed &amp; paid</span></div>
        <div class="stat-card upcoming"><span class="stat-value"><?= (int) $counters['upcoming'] ?></span><span class="stat-label">Arriving from today</span></div>
        <div class="stat-card"><span class="stat-value"><?= peso((float) $counters['revenue']) ?></span><span class="stat-label">Confirmed booking value</span></div>
        <div class="stat-card"><span class="stat-value"><?= $guestCount ?></span><span class="stat-label">Registered guests</span></div>
    </div>

    <div class="admin-filters">
        <a href="admin.php" class="<?= $filter === '' ? 'current' : '' ?>">All</a>
        <?php foreach (BOOKING_STATUS_LABELS as $key => $label): ?>
            <a href="admin.php?status=<?= e($key) ?>" class="<?= $filter === $key ? 'current' : '' ?>"><?= e($label) ?></a>
        <?php endforeach; ?>
    </div>

    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Booking</th>
                    <th>Guest</th>
                    <th>Stay</th>
                    <th>Money</th>
                    <th>Status</th>
                    <th>Update</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$bookings): ?>
                    <tr><td colspan="6" class="muted">No reservations yet<?= $filter !== '' ? ' with that status' : '' ?>.</td></tr>
                <?php endif; ?>

                <?php foreach ($bookings as $row):
                    $booking = booking_payload($row);
                ?>
                    <tr>
                        <td>
                            <strong><?= e($booking['id']) ?></strong><br />
                            <span class="muted"><?= e(format_date($booking['created'])) ?></span>
                        </td>
                        <td>
                            <strong><?= e($booking['name']) ?></strong><br />
                            <a href="mailto:<?= e($booking['email']) ?>"><?= e($booking['email']) ?></a><br />
                            <span class="muted"><?= e($booking['contact'] ?: 'No contact') ?></span>
                        </td>
                        <td>
                            <strong><?= e($booking['room']) ?></strong><br />
                            <span class="muted">
                                <?= e(format_date($booking['checkin'])) ?> &rarr; <?= e(format_date($booking['checkout'])) ?><br />
                                <?= $booking['nights'] ?> night<?= $booking['nights'] === 1 ? '' : 's' ?> &bull;
                                <?= e(guest_summary($booking['adults'], $booking['children'])) ?>
                            </span>
                        </td>
                        <td>
                            <strong><?= peso($booking['total']) ?></strong><br />
                            <span class="muted">
                                deposit <?= peso($booking['deposit']) ?><br />
                                <?= e($booking['payment'] ?: 'unpaid') ?><?= $booking['ref'] ? ' &bull; ' . e($booking['ref']) : '' ?>
                            </span>
                            <?php if ($booking['receiptImg']): ?>
                                <br /><a href="<?= e($booking['receiptImg']) ?>" target="_blank" rel="noopener">View receipt photo</a>
                            <?php endif; ?>
                        </td>
                        <td><span class="status-badge <?= $booking['statusKey'] ?>"><?= e($booking['status']) ?></span></td>
                        <td>
                            <form method="post" class="admin-status-form">
                                <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                                <input type="hidden" name="action" value="status">
                                <input type="hidden" name="code" value="<?= e($booking['id']) ?>">
                                <select name="status" data-status-picker>
                                    <?php foreach (BOOKING_STATUS_LABELS as $key => $label): ?>
                                        <option value="<?= e($key) ?>" <?= $key === $booking['statusKey'] ? 'selected' : '' ?>><?= e($label) ?></option>
                                    <?php endforeach; ?>
                                </select>
                                <button type="submit" class="main-button button-reset">Save</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

</section>

<section class="admin" id="messages">

    <p class="label">INBOX</p>

    <h2>Guest Messages</h2>

    <?php if (!$messages): ?>
        <div class="empty-state">
            <p class="empty-state-title">No messages yet</p>
            <p class="empty-state-text">Messages sent through the contact form land here.</p>
        </div>
    <?php else: ?>
        <div class="message-list">
            <?php foreach ($messages as $message): ?>
                <article class="message-card<?= (int) $message['handled'] ? ' handled' : '' ?>">
                    <header>
                        <strong><?= e($message['name']) ?></strong>
                        <a href="mailto:<?= e($message['email']) ?>"><?= e($message['email']) ?></a>
                        <span class="muted"><?= e(format_datetime($message['created_at'])) ?></span>
                    </header>
                    <p><?= nl2br(e($message['body'])) ?></p>
                    <?php if (!(int) $message['handled']): ?>
                        <form method="post">
                            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                            <input type="hidden" name="action" value="message-handled">
                            <input type="hidden" name="id" value="<?= (int) $message['id'] ?>">
                            <button type="submit" class="second-button button-reset">Mark as handled</button>
                        </form>
                    <?php else: ?>
                        <span class="muted">Handled</span>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
<?php require __DIR__ . '/includes/scripts.php'; ?>