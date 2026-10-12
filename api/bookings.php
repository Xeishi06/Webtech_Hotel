<?php
/**
 * Reservations API.
 *
 * POST action=availability  roomKey, checkin, checkout, adults, children
 * POST action=create        ... + name, contact, mode=hold|pay,
 *                           payMethod, payRef, receipt (file for Bank)
 * POST action=pay           id, payMethod, payRef, receipt (file for Bank)
 * POST action=cancel        id
 * GET  action=list
 *
 * Prices, night counts, deposits and availability are always recalculated
 * here - the browser only ever sends what the guest picked.
 */

require_once dirname(__DIR__) . '/includes/mailer.php';

sweep_expired_holds();

$action = $_GET['action'] ?? (request_payload()['action'] ?? '');
$payload = request_payload();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf($payload);
}

switch ($action) {
    case 'availability':
        handle_availability($payload);
        break;
    case 'create':
        handle_create($payload);
        break;
    case 'list':
        handle_list();
        break;
    case 'pay':
        handle_pay($payload);
        break;
    case 'cancel':
        handle_cancel($payload);
        break;
    default:
        json_fail('Unknown action.', 404);
}

// ---------------------------------------------------------------
// Shared checks
// ---------------------------------------------------------------

/**
 * Validates a room + dates + guest count and returns the money side
 * of things (nights, rate, total, deposit, balance).
 */
function check_booking_window(array $payload, bool $requireAvailability = true): array
{
    $roomKey = post_string($payload, 'roomKey');
    $room = room_by_key($roomKey);

    if (!$room) {
        return ['error' => 'Please select a room.'];
    }
    if ((int) $room['available'] !== 1) {
        return ['error' => 'That room is coming soon and cannot be booked yet.'];
    }

    $checkin = post_string($payload, 'checkin');
    $checkout = post_string($payload, 'checkout');

    $in = date_create($checkin);
    $out = date_create($checkout);
    if (!$in || !$out) {
        return ['error' => 'Please choose your check-in and check-out dates.'];
    }
    if ($checkin < iso_today()) {
        return ['error' => 'Check-in cannot be in the past.'];
    }
    if ($checkout <= $checkin) {
        return ['error' => 'Check-out must be after check-in.'];
    }

    $nights = nights_between($checkin, $checkout);
    if ($nights < 1 || $nights > 365) {
        return ['error' => 'Please choose valid dates (1–365 nights).'];
    }

    $adults = post_int($payload, 'adults', 0);
    $children = post_int($payload, 'children', 0);
    if ($adults < 1) {
        return ['error' => 'Enter how many adults (at least 1).'];
    }
    if ($children < 0) {
        return ['error' => 'Enter how many children (0 or more).'];
    }
    $capacity = (int) $room['capacity'];
    if ($adults + $children > $capacity) {
        return [
            'error' => room_label($room) . ' fits up to ' . $capacity . ' guest' . ($capacity === 1 ? '' : 's')
                . ' — you entered ' . guest_summary($adults, $children) . '. Please pick a bigger room or fewer guests.',
            'guestError' => true,
        ];
    }

    if ($requireAvailability) {
        $clash = booking_conflict($room['sub_key'], $checkin, $checkout);
        if ($clash) {
            return [
                'error' => room_label($room) . ' is already booked '
                    . format_date($clash['checkin']) . ' → ' . format_date($clash['checkout']) . '.',
                'taken' => true,
                'alternative' => next_free_dates($room['sub_key'], $nights, $checkin),
            ];
        }
    }

    $rate = (float) $room['price'];
    $total = $rate * $nights;
    $deposit = (int) round($total * DEPOSIT_RATE);

    return [
        'room'      => $room,
        'roomLabel' => room_label($room),
        'checkin'   => $checkin,
        'checkout'  => $checkout,
        'nights'    => $nights,
        'adults'    => $adults,
        'children'  => $children,
        'rate'      => $rate,
        'total'     => $total,
        'deposit'   => $deposit,
        'balance'   => $total - $deposit,
    ];
}

/**
 * Checks the payment proof fields. Returns ['ref' => ..., 'receipt' => fileName|null].
 */
function read_payment_proof(array $payload, bool $receiptRequired): array
{
    $method = post_string($payload, 'payMethod');
    $ref = post_string($payload, 'payRef');

    if ($method === 'GCash') {
        $digits = preg_replace('/\D/', '', $ref) ?? '';
        if (strlen($digits) < 10 || strlen($digits) > 13) {
            return ['error' => 'Enter your 10–13 digit GCash reference number.'];
        }
        return ['ref' => $digits, 'receipt' => null];
    }

    if ($method === 'Bank') {
        if (!preg_match('/^[A-Za-z0-9]{6,20}$/', $ref)) {
            return ['error' => 'Enter your bank transaction reference (6–20 letters/numbers).'];
        }
        $file = save_image_upload($_FILES['receipt'] ?? [], 'receipts');
        if ($receiptRequired && $file === null) {
            return ['error' => 'Please upload a photo of your bank receipt (JPG/PNG, max 4MB).'];
        }
        return ['ref' => $ref, 'receipt' => $file];
    }

    if ($method === 'Card') {
        $number = preg_replace('/\D/', '', post_string($payload, 'cardNumber')) ?? '';
        $expiry = post_string($payload, 'cardExpiry');
        $cvc = preg_replace('/\D/', '', post_string($payload, 'cardCvc')) ?? '';

        if (strlen($number) !== 16) {
            return ['error' => 'Enter the 16-digit card number.'];
        }
        if (!preg_match('/^(0[1-9]|1[0-2])\/\d{2}$/', $expiry)) {
            return ['error' => 'Enter card expiry as MM/YY.'];
        }
        if (strlen($cvc) < 3 || strlen($cvc) > 4) {
            return ['error' => 'Enter the 3–4 digit CVC.'];
        }
        // Only the last four digits are ever kept - full card numbers are
        // never stored or logged.
        return ['ref' => 'CARD••' . substr($number, -4), 'receipt' => null];
    }

    return ['error' => 'Choose a payment method.'];
}

// ---------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------

function handle_availability(array $payload): void
{
    require_login_json();

    $check = check_booking_window($payload);
    if (isset($check['error'])) {
        json_response([
            'ok'           => false,
            'message'      => $check['error'],
            'guestError'   => (bool) ($check['guestError'] ?? false),
            'taken'        => (bool) ($check['taken'] ?? false),
            'alternative'  => $check['alternative'] ?? null,
        ]);
    }

    json_ok([
        'room'     => room_payload($check['room']),
        'roomLabel' => $check['roomLabel'],
        'checkin'  => $check['checkin'],
        'checkout' => $check['checkout'],
        'nights'   => $check['nights'],
        'guests'   => guest_summary($check['adults'], $check['children']),
        'rate'     => $check['rate'],
        'total'    => $check['total'],
        'deposit'  => $check['deposit'],
        'balance'  => $check['balance'],
    ]);
}

function handle_create(array $payload): void
{
    $user = require_login_json();

    $check = check_booking_window($payload);
    if (isset($check['error'])) {
        json_fail($check['error']);
    }

    $name = post_string($payload, 'name');
    $contact = post_string($payload, 'contact');

    if ($name === '') {
        json_fail('Please enter your full name.');
    }
    if (!valid_contact($contact)) {
        json_fail('Contact must be 11 digits starting with 09.');
    }

    $hold = post_string($payload, 'mode') === 'hold';

    $method = '';
    $ref = '';
    $receiptFile = null;

    if (!$hold) {
        $proof = read_payment_proof($payload, true);
        if (isset($proof['error'])) {
            json_fail($proof['error']);
        }
        $method = post_string($payload, 'payMethod');
        $ref = $proof['ref'];
        $receiptFile = $proof['receipt'];
    }

    $pdo = db();
    $pdo->beginTransaction();

    try {
        // Re-check the calendar with the rows locked so two guests cannot
        // grab the same dates at the same moment.
        $lock = $pdo->prepare(
            "SELECT id FROM bookings WHERE room_key = ? AND status IN ('hold','confirmed')
             AND checkin < ? AND checkout > ? FOR UPDATE"
        );
        $lock->execute([$check['room']['sub_key'], $check['checkout'], $check['checkin']]);
        if ($lock->fetch()) {
            $pdo->rollBack();
            if ($receiptFile) {
                delete_upload('receipts', $receiptFile);
            }
            json_fail(room_label($check['room']) . ' was just booked for those dates. Please pick new ones.');
        }

        $status = $hold ? 'hold' : 'confirmed';
        $holdUntil = $hold ? date('Y-m-d H:i:s', time() + HOLD_HOURS * 3600) : null;
        $code = new_booking_code();

        $insert = $pdo->prepare(
            'INSERT INTO bookings
                (booking_code, user_id, room_key, room_label, guest_name, guest_email, guest_contact,
                 adults, children, checkin, checkout, nights, rate, total, deposit, balance,
                 status, payment_method, payment_ref, receipt_file, hold_until, paid_at)
             VALUES
                (:code, :user, :roomKey, :roomLabel, :name, :email, :contact,
                 :adults, :children, :checkin, :checkout, :nights, :rate, :total, :deposit, :balance,
                 :status, :method, :ref, :receipt, :holdUntil, :paidAt)'
        );
        $insert->execute([
            ':code'      => $code,
            ':user'      => (int) $user['id'],
            ':roomKey'   => $check['room']['sub_key'],
            ':roomLabel' => $check['roomLabel'],
            ':name'      => $name,
            ':email'     => $user['email'], // always the signed-in account email
            ':contact'   => $contact,
            ':adults'    => $check['adults'],
            ':children'  => $check['children'],
            ':checkin'   => $check['checkin'],
            ':checkout'  => $check['checkout'],
            ':nights'    => $check['nights'],
            ':rate'      => $check['rate'],
            ':total'     => $check['total'],
            ':deposit'   => $check['deposit'],
            ':balance'   => $check['balance'],
            ':status'    => $status,
            ':method'    => $hold ? 'Unpaid (on hold)' : $method,
            ':ref'       => $hold ? '' : $ref,
            ':receipt'   => $receiptFile,
            ':holdUntil' => $holdUntil,
            ':paidAt'    => $hold ? null : date('Y-m-d H:i:s'),
        ]);

        $bookingId = (int) $pdo->lastInsertId();
        $pdo->commit();
    } catch (Throwable $error) {
        $pdo->rollBack();
        if (!empty($receiptFile)) {
            delete_upload('receipts', $receiptFile);
        }
        json_fail(DEBUG_MODE ? $error->getMessage() : 'We could not save your reservation. Please try again.', 500);
    }

    $booking = booking_payload(fetch_booking_by_id($bookingId));
    $mail = send_booking_confirmation($booking);

    json_ok([
        'booking' => $booking,
        'mail'    => ['sent' => $mail['sent'], 'demo' => $mail['demo'], 'subject' => $mail['subject'], 'body' => $mail['body']],
    ], $hold
        ? 'Room held for ' . HOLD_HOURS . ' hours.'
        : 'Reservation confirmed!');
}

function handle_list(): void
{
    $user = require_login_json();

    $statement = db()->prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC, id DESC');
    $statement->execute([(int) $user['id']]);

    json_ok(['bookings' => array_map('booking_payload', $statement->fetchAll())]);
}

function handle_pay(array $payload): void
{
    $user = require_login_json();

    $booking = find_own_booking(post_string($payload, 'id'), $user);
    if (!$booking) {
        json_fail('Booking not found.', 404);
    }
    if ($booking['status'] !== 'hold') {
        json_fail('This booking is already settled.');
    }
    if (strtotime((string) $booking['hold_until']) < time()) {
        db()->prepare('UPDATE bookings SET status = "expired" WHERE id = ?')->execute([(int) $booking['id']]);
        json_fail('This hold expired unpaid after ' . HOLD_HOURS . ' hours and the room was released.', 409);
    }

    $proof = read_payment_proof($payload, true);
    if (isset($proof['error'])) {
        json_fail($proof['error']);
    }

    $update = db()->prepare(
        'UPDATE bookings
         SET status = "confirmed", payment_method = ?, payment_ref = ?,
             receipt_file = COALESCE(?, receipt_file), hold_until = NULL, paid_at = NOW()
         WHERE id = ?'
    );
    $update->execute([post_string($payload, 'payMethod'), $proof['ref'], $proof['receipt'], (int) $booking['id']]);

    if ($proof['receipt']) {
        delete_upload('receipts', $booking['receipt_file']);
    }

    $paid = booking_payload(fetch_booking_by_id((int) $booking['id']));
    $mail = send_booking_confirmation($paid);

    json_ok([
        'booking' => $paid,
        'mail'    => ['sent' => $mail['sent'], 'demo' => $mail['demo']],
    ], 'Deposit received — your booking is confirmed.');
}

function handle_cancel(array $payload): void
{
    $user = require_login_json();

    $booking = find_own_booking(post_string($payload, 'id'), $user);
    if (!$booking) {
        json_fail('Booking not found.', 404);
    }
    if ($booking['status'] !== 'hold' && $booking['status'] !== 'confirmed') {
        json_fail('This booking is already cancelled.');
    }

    // A hold is simply released; a paid booking goes to refund_pending.
    $status = $booking['status'] === 'hold' ? 'released' : 'refund_pending';
    db()->prepare('UPDATE bookings SET status = ? WHERE id = ?')->execute([$status, (int) $booking['id']]);

    json_ok(['status' => status_label($status)], $status === 'released'
        ? 'Hold released — nothing was charged.'
        : 'Cancelled. Your refund is on its way to your original payment method.');
}

// ---------------------------------------------------------------

function fetch_booking_by_id(int $id): array
{
    $statement = db()->prepare('SELECT * FROM bookings WHERE id = ? LIMIT 1');
    $statement->execute([$id]);

    return $statement->fetch();
}

function find_own_booking(string $code, array $user): ?array
{
    if ($code === '') {
        return null;
    }
    $statement = db()->prepare('SELECT * FROM bookings WHERE booking_code = ? AND user_id = ? LIMIT 1');
    $statement->execute([$code, (int) $user['id']]);

    return $statement->fetch() ?: null;
}