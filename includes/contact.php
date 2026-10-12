<?php
/**
 * Contact form handling.
 * Included at the top of landingpage.php - any POST to this page that is
 * not handled elsewhere is treated as a message from the contact form.
 */

require_once __DIR__ . '/mailer.php';

/**
 * @return array{ok: bool, message: string}
 */
function handle_contact_form(): array
{
    $payload = request_payload();

    if (!hash_equals(csrf_token(), (string) ($payload['csrf'] ?? ''))) {
        return ['ok' => false, 'message' => 'Your session expired. Please try again.'];
    }

    $name = post_string($payload, 'name');
    $email = normalise_email(post_string($payload, 'email'));
    $body = post_string($payload, 'message');

    if ($name === '' || $email === '' || $body === '') {
        return ['ok' => false, 'message' => 'Please fill in your name, email and message.'];
    }
    if (!valid_email($email)) {
        return ['ok' => false, 'message' => 'Enter a valid email address so we can reply.'];
    }
    if (mb_strlen($body) > 2000) {
        return ['ok' => false, 'message' => 'Please keep your message under 2000 characters.'];
    }

    $statement = db()->prepare('INSERT INTO messages (name, email, body) VALUES (?, ?, ?)');
    $statement->execute([$name, $email, $body]);

    $delivery = send_mail(
        SITE_EMAIL,
        'Website message from ' . $name,
        $body . "\n\n— " . $name . ' (' . $email . ')'
    );

    return [
        'ok'      => true,
        'message' => $delivery['sent']
            ? 'Thanks ' . $name . '! Your message is with our front desk - we usually reply within a day.'
            : 'Thanks ' . $name . '! Your message reached our inbox. We usually reply within a day.',
    ];
}