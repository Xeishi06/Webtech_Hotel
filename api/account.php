<?php
/**
 * Account API (the signed-in guest's own profile).
 *
 * GET   action=me
 * POST  action=update  contact
 * POST  action=avatar  photo (file)
 * POST  action=avatar-remove
 * POST  action=delete  password
 *
 * Deleting an account also releases any unpaid 24-hour holds so the rooms
 * become bookable again. Paid bookings stay in the hotel's records.
 */

require_once dirname(__DIR__) . '/includes/functions.php';

sweep_expired_holds();

$action = $_GET['action'] ?? (request_payload()['action'] ?? '');
$payload = request_payload();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf($payload);
}

switch ($action) {
    case 'me':
        $user = require_login_json();
        json_ok(['user' => user_payload($user)]);
        break;

    case 'update':
        $user = require_login_json();

        $contact = post_string($payload, 'contact');
        if ($contact !== '' && !valid_contact($contact)) {
            json_fail('Contact must be 11 digits starting with 09.');
        }

        db()->prepare('UPDATE users SET contact = ? WHERE id = ?')->execute([$contact, (int) $user['id']]);

        $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $fresh->execute([(int) $user['id']]);

        json_ok(['user' => user_payload($fresh->fetch())], 'Account updated!');
        break;

    case 'avatar':
        $user = require_login_json();

        $file = save_image_upload($_FILES['photo'] ?? [], 'avatars');
        if ($file === null) {
            json_fail('Could not read that photo. Try a JPG or PNG under 4MB.', 422);
        }

        db()->prepare('UPDATE users SET avatar_file = ? WHERE id = ?')->execute([$file, (int) $user['id']]);
        delete_upload('avatars', $user['avatar_file']);

        $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $fresh->execute([(int) $user['id']]);

        json_ok(['user' => user_payload($fresh->fetch())], 'Profile photo updated!');
        break;

    case 'avatar-remove':
        $user = require_login_json();

        db()->prepare('UPDATE users SET avatar_file = NULL WHERE id = ?')->execute([(int) $user['id']]);
        delete_upload('avatars', $user['avatar_file']);

        $fresh = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $fresh->execute([(int) $user['id']]);

        json_ok(['user' => user_payload($fresh->fetch())], 'Profile photo removed.');
        break;

    case 'delete':
        $user = require_login_json();

        $password = post_string($payload, 'password');
        if (!password_verify($password, $user['password_hash'])) {
            json_fail('Wrong password. Your account was NOT deleted.', 403);
        }
        if ((int) $user['is_admin'] === 1) {
            json_fail('Staff accounts cannot be deleted from this page.', 403);
        }

        $release = db()->prepare(
            "UPDATE bookings SET status = 'released' WHERE user_id = ? AND status = 'hold'"
        );
        $release->execute([(int) $user['id']]);

        // Reviews stay up (the hotel keeps them), but lose the link to the account.
        db()->prepare('UPDATE reviews SET user_id = NULL WHERE user_id = ?')->execute([(int) $user['id']]);

        db()->prepare('DELETE FROM users WHERE id = ?')->execute([(int) $user['id']]);
        delete_upload('avatars', $user['avatar_file']);

        logout_user();

        json_ok(['deleted' => true], 'Your account has been deleted.');
        break;

    default:
        json_fail('Unknown action.', 404);
}