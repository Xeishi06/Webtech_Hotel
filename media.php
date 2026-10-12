<?php
/**
 * Serves uploaded images that live outside the web root's public area.
 *
 *   media.php?type=avatar&file=<name>   profile photos (public - shown on reviews)
 *   media.php?type=receipt&id=<rowId>  bank receipts (guest who booked it, or staff)
 *
 * Files are stored under uploads/ with random names and are only reachable
 * through here, so payment proofs are never public.
 */

require_once __DIR__ . '/includes/functions.php';

$type = $_GET['type'] ?? '';

function send_image(string $path): void
{
    if (!is_file($path)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Image not found.';
        exit;
    }

    $info = @getimagesize($path);
    $mime = is_array($info) && !empty($info['mime']) ? $info['mime'] : 'application/octet-stream';

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=3600');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

if ($type === 'avatar') {
    $file = basename((string) ($_GET['file'] ?? ''));
    if (!preg_match('/^[a-f0-9]{16}\.jpg$/', $file)) {
        http_response_code(400);
        exit('Bad file name.');
    }
    send_image(UPLOAD_DIR . DIRECTORY_SEPARATOR . 'avatars' . DIRECTORY_SEPARATOR . $file);
}

if ($type === 'receipt') {
    $user = current_user();
    if ($user === null) {
        header('Location: landingpage.php?login=1');
        exit;
    }

    $id = (int) ($_GET['id'] ?? 0);
    $statement = db()->prepare('SELECT * FROM bookings WHERE id = ? LIMIT 1');
    $statement->execute([$id]);
    $booking = $statement->fetch();

    if (!$booking || !$booking['receipt_file']) {
        http_response_code(404);
        exit('Receipt not found.');
    }
    if ((int) $booking['user_id'] !== (int) $user['id'] && (int) $user['is_admin'] !== 1) {
        http_response_code(403);
        exit('That receipt belongs to another guest.');
    }

    send_image(UPLOAD_DIR . DIRECTORY_SEPARATOR . 'receipts' . DIRECTORY_SEPARATOR . basename($booking['receipt_file']));
}

http_response_code(404);
exit('Unknown media type.');