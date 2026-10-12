<?php
/**
 * Database connection (PDO + MySQL).
 * Every query in the project runs through this one connection.
 */

require_once __DIR__ . '/config.php';

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $error) {
        db_connection_failed($error);
    }

    return $pdo;
}

/**
 * Friendly page when MySQL is not running, instead of a blank fatal error.
 */
function db_connection_failed(PDOException $error): void
{
    $detail = DEBUG_MODE ? $error->getMessage() : '';
    http_response_code(500);

    if (strtolower((string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '')) === 'xmlhttprequest'
        || str_starts_with($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok'      => false,
            'message' => 'Cannot reach the database. Start Apache and MySQL in the XAMPP Control Panel.',
            'detail'  => $detail,
        ]);
        exit;
    }

    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>Database offline</title>'
        . '<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:80px auto;padding:0 20px;'
        . 'line-height:1.6;color:#22303c}h1{color:#b3543f}code{background:#f1f4f6;padding:2px 6px;border-radius:4px}'
        . '</style></head><body>'
        . '<h1>Can\'t reach the database</h1>'
        . '<p>Stella\'s Beach House stores accounts and reservations in MySQL, which does not answer right now.</p>'
        . '<ol>'
        . '<li>Open the <strong>XAMPP Control Panel</strong> and press <strong>Start</strong> next to <strong>MySQL</strong>.</li>'
        . '<li>Confirm the password in <code>includes/config.php</code> matches your MySQL root password.</li>'
        . '<li>Import <code>schema.sql</code> in phpMyAdmin if you haven\'t already.</li>'
        . '</ol>';
    if ($detail !== '') {
        echo '<p><strong>Driver message:</strong> <code>' . htmlspecialchars($detail, ENT_QUOTES) . '</code></p>';
    }
    echo '</body></html>';
    exit;
}