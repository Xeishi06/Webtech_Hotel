<?php
/**
 * Shared helpers: sessions, JSON responses, room + booking logic,
 * validation and uploads. Used by every page and API endpoint.
 */

require_once __DIR__ . '/db.php';

// ---------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function peso(float|int|string $amount): string
{
    return '₱' . number_format((float) $amount, 0, '.', ',');
}

function format_date(?string $isoDate): string
{
    if (!$isoDate) {
        return '—';
    }
    $date = date_create($isoDate);
    return $date ? $date->format('F j, Y') : $isoDate;
}

function format_datetime(?string $timestamp): string
{
    if (!$timestamp) {
        return '—';
    }
    $date = date_create($timestamp);
    return $date ? $date->format('F j, Y g:i A') : $timestamp;
}

/** Compact ISO date (Y-m-d) used by the date inputs. */
function iso_today(): string
{
    return date('Y-m-d');
}

function nights_between(string $checkin, string $checkout): int
{
    $in  = date_create($checkin);
    $out = date_create($checkout);
    if (!$in || !$out) {
        return 0;
    }
    return (int) round(($out->getTimestamp() - $in->getTimestamp()) / 86400);
}

// ---------------------------------------------------------------
// JSON responses
// ---------------------------------------------------------------

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload);
    exit;
}

function json_ok(array $data = [], string $message = ''): void
{
    json_response(array_merge(['ok' => true, 'message' => $message], $data));
}

function json_fail(string $message, int $status = 400, array $extra = []): void
{
    json_response(array_merge(['ok' => false, 'message' => $message], $extra), $status);
}

/** Reads a JSON body, falling back to form fields for file uploads. */
function request_payload(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = [];
    if ($raw !== '' && $raw[0] === '{') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $data = $decoded;
        }
    }
    return array_merge($_POST, $data);
}

function post_string(array $payload, string $key, string $default = ''): string
{
    $value = $payload[$key] ?? $default;
    return is_scalar($value) ? trim((string) $value) : $default;
}

function post_int(array $payload, string $key, int $default = 0): int
{
    return isset($payload[$key]) && is_numeric($payload[$key]) ? (int) $payload[$key] : $default;
}

// ---------------------------------------------------------------
// Who is logged in
// ---------------------------------------------------------------

function current_user(): ?array
{
    static $cached = null;
    static $loaded = false;

    if ($loaded) {
        return $cached;
    }
    $loaded = true;

    $id = $_SESSION['user_id'] ?? null;
    if (!$id) {
        return $cached = null;
    }

    $user = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $user->execute([$id]);
    $row = $user->fetch();

    // Session pointed at an account that no longer exists (deleted elsewhere).
    if (!$row) {
        unset($_SESSION['user_id']);
        return $cached = null;
    }

    return $cached = $row;
}

function is_logged_in(): bool
{
    return current_user() !== null;
}

function is_admin(): bool
{
    $user = current_user();
    return $user !== null && (int) $user['is_admin'] === 1;
}

function login_user(array $user): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
}

function logout_user(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
}

function require_login_json(): array
{
    $user = current_user();
    if ($user === null) {
        json_fail('Please log in to continue.', 401, ['needsLogin' => true]);
    }
    return $user;
}

function require_admin_json(): array
{
    $user = current_user();
    if ($user === null) {
        json_fail('Please log in to continue.', 401, ['needsLogin' => true]);
    }
    if ((int) $user['is_admin'] !== 1) {
        json_fail('Staff access only.', 403);
    }
    return $user;
}

function require_login_page(string $redirectTo = 'landingpage.php'): array
{
    $user = current_user();
    if ($user === null) {
        header('Location: ' . $redirectTo . '?login=1');
        exit;
    }
    return $user;
}

function require_admin_page(): array
{
    // Logged-out visitors go to the home page's login popup. Redirecting to
    // admin.php here would loop, since this page would bounce them again.
    $user = require_login_page('landingpage.php');
    if ((int) $user['is_admin'] !== 1) {
        http_response_code(403);
        echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>Staff only</title></head><body style="font-family:system-ui,sans-serif;padding:60px">'
            . '<h1>Staff access only</h1>'
            . '<p>This page is for hotel staff. <a href="landingpage.php">Back to the site</a>.</p>'
            . '</body></html>';
        exit;
    }
    return $user;
}

// ---------------------------------------------------------------
// CSRF protection for the API
// ---------------------------------------------------------------

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function check_csrf(array $payload): void
{
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? post_string($payload, 'csrf');
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        json_fail('Your session expired. Please refresh the page and try again.', 419);
    }
}

// ---------------------------------------------------------------
// Validation
// ---------------------------------------------------------------

function valid_email(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL);
}

/** Philippine mobile number: 11 digits starting with 09. */
function valid_contact(string $contact): bool
{
    return (bool) preg_match('/^09\d{9}$/', $contact);
}

function normalise_email(string $email): string
{
    return strtolower(trim($email));
}

function valid_password(string $password): bool
{
    return strlen($password) >= 6;
}

// ---------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------

/** Every room row ordered for display, grouped by category later. */
function all_rooms(bool $onlyAvailable = false): array
{
    static $cache = [];
    $key = $onlyAvailable ? 'available' : 'all';
    if (isset($cache[$key])) {
        return $cache[$key];
    }

    $sql = 'SELECT * FROM rooms';
    if ($onlyAvailable) {
        $sql .= ' WHERE available = 1';
    }
    $sql .= ' ORDER BY sort_order, id';

    $cache[$key] = db()->query($sql)->fetchAll();
    return $cache[$key];
}

function rooms_in_category(string $slug): array
{
    $rooms = array_values(array_filter(all_rooms(), static fn(array $r): bool => $r['category_slug'] === $slug));
    return $rooms;
}

function room_by_key(string $key): ?array
{
    foreach (all_rooms() as $room) {
        if ($room['sub_key'] === $key) {
            return $room;
        }
    }
    return null;
}

/** "Garden View (Couples Room)" - how a booking names its room. */
function room_label(array $room): string
{
    return $room['name'] . ' (' . $room['category'] . ')';
}

/**
 * The photos for a room, taken from includes/room-images.php.
 * All options in a category share the same list.
 */
function room_photos(array $room): array
{
    static $images = null;

    if ($images === null) {
        $images = require __DIR__ . '/room-images.php';
    }

    return $images[$room['category_slug']] ?? [];
}

/** Category list used by the tab bar and the room cards. */
function room_categories(): array
{
    $categories = [];
    foreach (all_rooms() as $room) {
        $slug = $room['category_slug'];
        if (!isset($categories[$slug])) {
            $categories[$slug] = [
                'slug'      => $slug,
                'name'      => $room['category'],
                'tag'       => $room['tag'],
                'capacity'  => (int) $room['capacity'],
                'from'      => (float) $room['price'],
                'rooms'     => [],
            ];
        }
        $categories[$slug]['rooms'][] = $room;
        $price = (float) $room['price'];
        if ($price < $categories[$slug]['from']) {
            $categories[$slug]['from'] = $price;
        }
    }
    return $categories;
}

/** Shape a room for the browser (matches the old main.js objects). */
function room_payload(array $room): array
{
    return [
        'key'       => $room['sub_key'],
        'name'      => $room['name'],
        'category'  => $room['category'],
        'slug'      => $room['category_slug'],
        'capacity'  => (int) $room['capacity'],
        'price'     => (float) $room['price'],
        'badge'     => $room['badge'],
        'tag'       => $room['tag'],
        'blurb'     => $room['blurb'],
        'meta'      => $room['meta'],
        'photos'    => room_photos($room),
        'available' => (int) $room['available'] === 1,
    ];
}

// ---------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------

const BOOKING_STATUS_LABELS = [
    'hold'          => 'Pending payment (24h hold)',
    'confirmed'     => 'Confirmed (paid)',
    'expired'       => 'Cancelled — payment expired',
    'released'      => 'Cancelled — hold released (no charge)',
    'refund_pending' => 'Cancelled — refund pending',
];

/** Only live bookings (confirmed + unexpired holds) block the calendar. */
const LIVE_BOOKING_STATUSES = ['hold', 'confirmed'];

function status_label(string $status): string
{
    return BOOKING_STATUS_LABELS[$status] ?? ucfirst($status);
}

/** "6h 12m left" for a hold's payment deadline. */
function hold_remaining_text(?string $holdUntil): string
{
    $left = ($holdUntil ? strtotime($holdUntil) : 0) - time();

    if ($left <= 0) {
        return 'expired';
    }
    $hours = intdiv($left, 3600);
    $minutes = intdiv($left % 3600, 60);

    return $hours > 0
        ? $hours . 'h ' . $minutes . 'm left'
        : $minutes . ' minute' . ($minutes === 1 ? '' : 's') . ' left';
}

/**
 * Cancels every unpaid hold whose 24-hour deadline has passed.
 * Called once per request so the calendar is always accurate.
 */
function sweep_expired_holds(): int
{
    $statement = db()->prepare(
        "UPDATE bookings SET status = 'expired' WHERE status = 'hold' AND hold_until IS NOT NULL AND hold_until < NOW()"
    );
    $statement->execute();

    return $statement->rowCount();
}

/** Confirmed bookings and unexpired holds that clash with these dates. */
function booking_conflict(string $roomKey, string $checkin, string $checkout): ?array
{
    $sql = 'SELECT * FROM bookings
            WHERE room_key = :room
              AND status IN ("hold","confirmed")
              AND checkin < :checkout AND checkout > :checkin
            ORDER BY checkin LIMIT 1';
    $statement = db()->prepare($sql);
    $statement->execute([
        ':room'     => $roomKey,
        ':checkout' => $checkout,
        ':checkin'  => $checkin,
    ]);

    return $statement->fetch() ?: null;
}

/** Next stretch of `$nights` free after `$fromDate`, for the "try these dates" hint. */
function next_free_dates(string $roomKey, int $nights, string $fromDate): ?array
{
    $sql = 'SELECT checkin, checkout FROM bookings
            WHERE room_key = :room AND status IN ("hold","confirmed")
            ORDER BY checkin';
    $statement = db()->prepare($sql);
    $statement->execute([':room' => $roomKey]);

    $busy = $statement->fetchAll();
    $start = $fromDate;

    for ($attempt = 0; $attempt < 365; $attempt++) {
        $end = date('Y-m-d', strtotime($start . ' +' . $nights . ' days'));
        $clash = null;
        foreach ($busy as $booking) {
            if ($start < $booking['checkout'] && $booking['checkin'] < $end) {
                $clash = $booking;
                break;
            }
        }
        if (!$clash) {
            return ['start' => $start, 'end' => $end];
        }
        $start = $clash['checkout'];
    }

    return null;
}

function new_booking_code(): string
{
    return 'ST-' . strtoupper(base_convert((string) (int) (microtime(true) * 1000), 10, 36));
}

/** Shape a booking for the browser (same keys the old localStorage rows had). */
function booking_payload(array $booking): array
{
    return [
        'id'        => $booking['booking_code'],
        'rowId'     => (int) $booking['id'],
        'name'      => $booking['guest_name'],
        'email'     => $booking['guest_email'],
        'contact'   => $booking['guest_contact'],
        'roomKey'   => $booking['room_key'],
        'room'      => $booking['room_label'],
        'adults'    => (int) $booking['adults'],
        'children'  => (int) $booking['children'],
        'guests'    => (int) $booking['adults'] + (int) $booking['children'],
        'checkin'   => $booking['checkin'],
        'checkout'  => $booking['checkout'],
        'nights'    => (int) $booking['nights'],
        'rate'      => (float) $booking['rate'],
        'total'     => (float) $booking['total'],
        'deposit'   => (float) $booking['deposit'],
        'balance'   => (float) $booking['balance'],
        'payment'   => $booking['payment_method'] ?: null,
        'ref'       => $booking['payment_ref'] ?: null,
        'receiptImg' => $booking['receipt_file'] ? 'media.php?type=receipt&id=' . $booking['id'] : null,
        'statusKey' => $booking['status'],
        'status'    => status_label($booking['status']),
        'holdUntil' => $booking['hold_until'],
        'paidAt'    => $booking['paid_at'],
        'created'   => $booking['created_at'],
        'by'        => $booking['guest_email'],
    ];
}

// ---------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------

function latest_reviews(int $limit = 3): array
{
    $statement = db()->prepare(
        'SELECT r.*, u.avatar_file AS user_avatar FROM reviews r
         LEFT JOIN users u ON u.id = r.user_id
         ORDER BY r.created_at DESC, r.id DESC LIMIT ' . (int) $limit
    );
    $statement->execute();

    return array_map('review_payload', $statement->fetchAll());
}

function review_summary(): array
{
    $row = db()->query('SELECT COUNT(*) AS total, AVG(rating) AS average FROM reviews')->fetch();

    return [
        'total'   => (int) ($row['total'] ?? 0),
        'average' => round((float) ($row['average'] ?? 0), 1),
    ];
}

function review_payload(array $review): array
{
    $rating = (int) $review['rating'];

    return [
        'n' => $review['name'],
        'r' => $rating . ' - ' . rating_word($rating),
        'rating' => $rating,
        'stars' => str_repeat('★', $rating) . str_repeat('☆', 5 - $rating),
        't' => $review['text'],
        'a' => $review['avatar_file'] ? 'media.php?type=avatar&file=' . rawurlencode($review['avatar_file']) : null,
        'at' => $review['created_at'],
    ];
}

const RATING_WORDS = [1 => 'Poor', 2 => 'Fair', 3 => 'Good', 4 => 'Very Good', 5 => 'Excellent'];

function rating_word(int $rating): string
{
    return RATING_WORDS[$rating] ?? 'Good';
}

function guest_summary(int $adults, int $children): string
{
    $total = $adults + $children;

    return $total . ' guest' . ($total === 1 ? '' : 's')
        . ' (' . $adults . ' adult' . ($adults === 1 ? '' : 's')
        . ' + ' . $children . ' child' . ($children === 1 ? '' : 'ren') . ')';
}

// ---------------------------------------------------------------
// Uploads (profile photos + bank receipts)
// ---------------------------------------------------------------

/** Steady colour for a guest's initial avatar, so it never jumps around. */
function avatar_hue(string $name): string
{
    $hash = 0;
    for ($i = 0; $i < strlen($name); $i++) {
        $hash = ($hash * 31 + ord($name[$i])) % 360;
    }

    return 'hsl(' . $hash . ', 35%, 52%)';
}

/**
 * Validates an uploaded image and stores it under uploads/<kind>/.
 * Returns the generated file name, or null when the file is rejected.
 */
function save_image_upload(array $file, string $kind): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }
    if (!is_uploaded_file($file['tmp_name'])) {
        return null;
    }
    if (($file['size'] ?? 0) > MAX_UPLOAD_BYTES) {
        return null;
    }
    if (!function_exists('getimagesize') || @getimagesize($file['tmp_name']) === false) {
        return null; // not a real image
    }

    $directory = UPLOAD_DIR . DIRECTORY_SEPARATOR . $kind;
    if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
        return null;
    }

    $name = bin2hex(random_bytes(8)) . '.jpg';
    if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $name)) {
        return null;
    }

    return $name;
}

function delete_upload(?string $kind, ?string $file): void
{
    if (!$file) {
        return;
    }
    $path = UPLOAD_DIR . DIRECTORY_SEPARATOR . $kind . DIRECTORY_SEPARATOR . basename($file);
    if (is_file($path)) {
        @unlink($path);
    }
}

function user_payload(?array $user): ?array
{
    if (!$user) {
        return null;
    }

    return [
        'id'      => (int) $user['id'],
        'name'    => $user['name'],
        'email'   => $user['email'],
        'contact' => $user['contact'],
        'isAdmin' => (int) $user['is_admin'] === 1,
        'avatar'  => $user['avatar_file'] ? 'media.php?type=avatar&file=' . rawurlencode($user['avatar_file']) : null,
        'created' => $user['created_at'],
    ];
}

/** Inline script payload so pages know who they are without any localStorage. */
function app_bootstrap_payload(): string
{
    return json_encode([
        'user'    => user_payload(current_user()),
        'rooms'   => array_map('room_payload', all_rooms()),
        'csrf'    => csrf_token(),
        'site'    => [
            'name'      => SITE_NAME,
            'phone'     => SITE_PHONE,
            'address'   => SITE_ADDRESS,
            'deposit'   => DEPOSIT_RATE,
            'holdHours' => HOLD_HOURS,
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}