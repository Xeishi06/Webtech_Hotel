<?php
/**
 * Account API: register, email verification, log in, log out.
 *
 * POST  action=register  name, email, password, confirmPassword
 * POST  action=verify    email, code
 * POST  action=resend    email
 * POST  action=login     email, password
 * POST  action=logout
 * GET   action=me
 */

require_once dirname(__DIR__) . '/includes/mailer.php';

$action = $_GET['action'] ?? (request_payload()['action'] ?? '');
$payload = request_payload();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf($payload);
}

switch ($action) {
    case 'register':
        handle_register($payload);
        break;
    case 'verify':
        handle_verify($payload);
        break;
    case 'resend':
        handle_resend($payload);
        break;
    case 'login':
        handle_login($payload);
        break;
    case 'logout':
        logout_user();
        json_ok(['user' => null], 'Logged out.');
        break;
    case 'me':
        json_ok(['user' => user_payload(current_user())]);
        break;
    default:
        json_fail('Unknown action.', 404);
}

// ---------------------------------------------------------------

function handle_register(array $payload): void
{
    $name  = post_string($payload, 'name');
    $email = normalise_email(post_string($payload, 'email'));
    $password = post_string($payload, 'password');
    $confirm  = post_string($payload, 'confirmPassword');

    if ($name === '' || $email === '' || $password === '') {
        json_fail('Please fill in all fields.');
    }
    if (!valid_email($email)) {
        json_fail('Enter a valid email address so we can send your code.');
    }
    if (!valid_password($password)) {
        json_fail('Password must be at least 6 characters.');
    }
    if ($password !== $confirm) {
        json_fail('Passwords do not match.');
    }

    $exists = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $exists->execute([$email]);
    if ($exists->fetch()) {
        json_fail('That email is already registered. Try logging in.');
    }

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', time() + VERIFY_MINUTES * 60);

    // One pending signup per email: a resend replaces the stored code.
    $statement = db()->prepare(
        'INSERT INTO pending_verifications (email, name, password_hash, code, attempts, expires_at)
         VALUES (:email, :name, :hash, :code, 0, :expires)
         ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            password_hash = VALUES(password_hash),
            code = VALUES(code),
            attempts = 0,
            expires_at = VALUES(expires_at)'
    );
    $statement->execute([
        ':email'   => $email,
        ':name'    => $name,
        ':hash'    => password_hash($password, PASSWORD_DEFAULT),
        ':code'    => $code,
        ':expires' => $expiresAt,
    ]);

    $delivery = send_mail($email, 'Your ' . SITE_NAME . ' verification code: ' . $code, verification_email_text($name, $code));

    json_ok([
        'email' => $email,
        'mail'  => ['sent' => $delivery['sent'], 'demo' => $delivery['demo']],
        // Only handed back when mail() is unavailable, so the code can be
        // shown on screen instead of being lost.
        'demoCode' => $delivery['demo'] ? $code : null,
        'expiresInMinutes' => VERIFY_MINUTES,
    ], 'Verification code sent to ' . $email . '.');
}

function handle_verify(array $payload): void
{
    $email = normalise_email(post_string($payload, 'email'));
    $code  = preg_replace('/\D/', '', post_string($payload, 'code')) ?? '';

    $statement = db()->prepare('SELECT * FROM pending_verifications WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $pending = $statement->fetch();

    if (!$pending) {
        json_fail('No pending verification for this email. Please register again.');
    }
    if (strtotime($pending['expires_at']) < time()) {
        db()->prepare('DELETE FROM pending_verifications WHERE id = ?')->execute([$pending['id']]);
        json_fail('Code expired. Please resend a new code.', 410, ['expired' => true]);
    }
    if ((int) $pending['attempts'] >= VERIFY_MAX_ATTEMPTS) {
        db()->prepare('DELETE FROM pending_verifications WHERE id = ?')->execute([$pending['id']]);
        json_fail('Too many wrong attempts. Please register again.');
    }
    if (strlen($code) !== 6 || !hash_equals($pending['code'], $code)) {
        $attempts = (int) $pending['attempts'] + 1;
        db()->prepare('UPDATE pending_verifications SET attempts = ? WHERE id = ?')->execute([$attempts, $pending['id']]);
        $left = VERIFY_MAX_ATTEMPTS - $attempts;
        json_fail('Wrong code. ' . $left . ' attempt' . ($left === 1 ? '' : 's') . ' left.');
    }

    $taken = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $taken->execute([$pending['email']]);
    if ($taken->fetch()) {
        db()->prepare('DELETE FROM pending_verifications WHERE id = ?')->execute([$pending['id']]);
        json_fail('That email is already registered. Try logging in.');
    }

    $insert = db()->prepare(
        'INSERT INTO users (name, email, password_hash, verified_at) VALUES (?, ?, ?, NOW())'
    );
    $insert->execute([$pending['name'], $pending['email'], $pending['password_hash']]);
    $userId = (int) db()->lastInsertId();

    db()->prepare('DELETE FROM pending_verifications WHERE id = ?')->execute([$pending['id']]);

    $user = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $user->execute([$userId]);
    $created = $user->fetch();

    login_user($created);

    json_ok(['user' => user_payload($created)], 'Email verified! Welcome, ' . $created['name'] . '!');
}

function handle_resend(array $payload): void
{
    $email = normalise_email(post_string($payload, 'email'));

    $statement = db()->prepare('SELECT * FROM pending_verifications WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $pending = $statement->fetch();

    if (!$pending) {
        json_fail('No pending verification for this email. Please register again.');
    }

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', time() + VERIFY_MINUTES * 60);

    $update = db()->prepare('UPDATE pending_verifications SET code = ?, attempts = 0, expires_at = ? WHERE id = ?');
    $update->execute([$code, $expiresAt, $pending['id']]);

    $delivery = send_mail($email, 'Your ' . SITE_NAME . ' verification code: ' . $code, verification_email_text($pending['name'], $code));

    json_ok([
        'email' => $email,
        'mail'  => ['sent' => $delivery['sent'], 'demo' => $delivery['demo']],
        'demoCode' => $delivery['demo'] ? $code : null,
        'expiresInMinutes' => VERIFY_MINUTES,
    ], 'New code sent to ' . $email . '.');
}

function handle_login(array $payload): void
{
    $email = normalise_email(post_string($payload, 'email'));
    $password = post_string($payload, 'password');

    if ($email === '' || $password === '') {
        json_fail('Please enter your email and password.');
    }

    $statement = db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $statement->execute([$email]);
    $user = $statement->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        // Same message either way so the form can't be used to discover
        // which emails have accounts.
        json_fail('Invalid email or password. Register first if you are new.', 401);
    }

    if ($user['verified_at'] === null) {
        // Registered but never verified: re-issue a code instead of logging in.
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = date('Y-m-d H:i:s', time() + VERIFY_MINUTES * 60);
        $save = db()->prepare(
            'INSERT INTO pending_verifications (email, name, password_hash, code, attempts, expires_at)
             VALUES (:email, :name, :hash, :code, 0, :expires)
             ON DUPLICATE KEY UPDATE code = VALUES(code), attempts = 0, expires_at = VALUES(expires_at)'
        );
        $save->execute([
            ':email'   => $user['email'],
            ':name'    => $user['name'],
            ':hash'    => $user['password_hash'],
            ':code'    => $code,
            ':expires' => $expiresAt,
        ]);
        $delivery = send_mail($user['email'], 'Your ' . SITE_NAME . ' verification code: ' . $code, verification_email_text($user['name'], $code));

        json_ok([
            'needsVerification' => true,
            'email' => $user['email'],
            'mail'  => ['sent' => $delivery['sent'], 'demo' => $delivery['demo']],
            'demoCode' => $delivery['demo'] ? $code : null,
        ], 'Please enter your verification code to finish activating your account.');
    }

    login_user($user);

    json_ok(['user' => user_payload($user)], 'Welcome, ' . $user['name'] . '!');
}