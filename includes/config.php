<?php
/**
 * Stella's Beach House - site configuration.
 *
 * Everything you may need to change is in this one file:
 * database credentials, site details, deposit rate and hold policy.
 */

// ---- Database (XAMPP defaults) -------------------------------
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'stella_stay');
define('DB_USER', 'root');
define('DB_PASS', '');

// ---- Site details --------------------------------------------
define('SITE_NAME',    "Stella's Beach House");
define('SITE_TAGLINE', 'Relax. Enjoy. Make Memories.');
define('SITE_ADDRESS', 'Purok 1, Barangay Patar, Bolinao, Pangasinan');
define('SITE_PHONE',   '0912 345 6789');
define('SITE_EMAIL',   'stellasbeachhouse@email.com');

// Address verification / confirmation emails are sent from here.
define('MAIL_FROM',      'stellasbeachhouse@email.com');
define('MAIL_FROM_NAME', "Stella's Beach House");

// ---- Booking policy ------------------------------------------
// Deposit taken now; the rest is paid at check-in.
define('DEPOSIT_RATE', 0.5);

// An unpaid booking holds a room for this long, then auto-cancels.
define('HOLD_HOURS', 24);

// Email verification code lifetime and allowed wrong tries.
define('VERIFY_MINUTES',    10);
define('VERIFY_MAX_ATTEMPTS', 5);

// ---- Uploads -------------------------------------------------
define('MAX_UPLOAD_BYTES', 4 * 1024 * 1024); // 4 MB
define('UPLOAD_DIR', dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads');

// ---- Session -------------------------------------------------
// Lets the API tell whether a request comes from our own pages.
define('SESSION_NAME', 'stellastay');

// Show errors while you are developing; turn this off for a public site.
define('DEBUG_MODE', true);

if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(0);
    ini_set('display_errors', '0');
}

date_default_timezone_set('Asia/Manila');

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_name(SESSION_NAME);
    session_start();
}