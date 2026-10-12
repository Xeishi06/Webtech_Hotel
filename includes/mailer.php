<?php
/**
 * Email delivery.
 *
 * Tries PHP's mail() first (works on XAMPP once you drop a sendmail config
 * in, and on most live hosts out of the box). If the mail server refuses the
 * message we still keep it in storage/mail.log and tell the caller it fell
 * back to "demo mode", so the verification code / confirmation can be shown
 * on screen instead of vanishing.
 */

require_once __DIR__ . '/functions.php';

function mail_log_path(): string
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'mail.log';
}

function write_mail_log(string $to, string $subject, string $body): void
{
    $path = mail_log_path();
    $directory = dirname($path);
    if (!is_dir($directory)) {
        @mkdir($directory, 0755, true);
    }

    $entry = sprintf(
        "===== %s =====\nTo: %s\nSubject: %s\n\n%s\n\n",
        date('Y-m-d H:i:s'),
        $to,
        $subject,
        $body
    );
    @file_put_contents($path, $entry, FILE_APPEND | LOCK_EX);
}

/**
 * @return array{sent: bool, demo: bool, error: string}
 */
function send_mail(string $to, string $subject, string $body): array
{
    $headers = [
        'From: ' . MAIL_FROM_NAME . ' <' . MAIL_FROM . '>',
        'Reply-To: ' . MAIL_FROM,
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: PHP/' . PHP_VERSION,
    ];

    $sent = false;
    if (function_exists('mail')) {
        // The 5th parameter keeps envelope senders happy on stricter hosts.
        $sent = @mail($to, $subject, $body, implode("\r\n", $headers), '-f' . MAIL_FROM);
    }

    if (!$sent) {
        write_mail_log($to, $subject, $body);

        return [
            'sent'  => false,
            'demo'  => true,
            'error' => 'The mail server did not accept the message.',
        ];
    }

    return ['sent' => true, 'demo' => false, 'error' => ''];
}

// ---------------------------------------------------------------
// The two emails the site sends
// ---------------------------------------------------------------

function verification_email_text(string $name, string $code): string
{
    return "Hi {$name},\n\n"
        . "Thanks for creating a Stella Stay account!\n\n"
        . 'Your verification code is: ' . $code . "\n\n"
        . 'Enter this code within ' . VERIFY_MINUTES . ' minutes to activate your account.\n\n'
        . "If you did not request this, please ignore this email.\n\n"
        . "-- " . SITE_NAME . ', ' . SITE_ADDRESS;
}

function booking_email_text(array $booking): string
{
    $pending = $booking['statusKey'] === 'hold';
    $guests = guest_summary((int) $booking['adults'], (int) $booking['children']);

    $lines = [
        'Hi ' . $booking['name'] . ',',
        '',
        $pending
            ? 'Your Stella Stay booking is ON HOLD for ' . HOLD_HOURS . " hours.\n\n"
                . 'Please pay the ' . peso($booking['deposit']) . ' deposit before '
                . format_datetime($booking['holdUntil']) . ", or this hold is automatically cancelled.\n\n"
            : "Your Stella Stay booking is confirmed!\n\n",
        'Booking ID: ' . $booking['id'],
        'Room: ' . $booking['room'],
        'Guests: ' . $guests,
        'Check-in: ' . format_date($booking['checkin']),
        'Check-out: ' . format_date($booking['checkout']),
        'Nights: ' . $booking['nights'],
        $pending
            ? 'Total: ' . peso($booking['total']) . ' (deposit ' . peso($booking['deposit']) . ' due within ' . HOLD_HOURS . "h)\n"
                . 'Balance at check-in: ' . peso($booking['balance']) . "\n\n"
            : 'Total: ' . peso($booking['total']) . ' (deposit ' . peso($booking['deposit']) . ' paid via ' . $booking['payment'] . ")\n"
                . 'Balance at check-in: ' . peso($booking['balance']) . "\n\n",
        'Show this receipt at check-in. Questions? Message ' . SITE_PHONE . ' with your booking ID.',
        '',
        '-- ' . SITE_NAME . ', ' . SITE_ADDRESS,
    ];

    return implode("\n", $lines);
}

/**
 * Sends the booking receipt. Returns delivery info so the page can show
 * what was actually emailed (or fall back to an on-screen preview).
 */
function send_booking_confirmation(array $bookingPayload): array
{
    $subject = ($bookingPayload['statusKey'] === 'hold'
        ? 'Booking ' . $bookingPayload['id'] . ' on hold (' . HOLD_HOURS . 'h) — '
        : 'Booking ' . $bookingPayload['id'] . ' confirmed — ')
        . $bookingPayload['room'] . ' at ' . SITE_NAME;

    $result = send_mail($bookingPayload['email'], $subject, booking_email_text($bookingPayload));
    $result['subject'] = $subject;
    $result['body'] = booking_email_text($bookingPayload);
    $result['to'] = $bookingPayload['email'];

    return $result;
}