<?php
/**
 * Guest reviews API.
 *
 * GET  action=list  -> newest reviews + average (used by landingpage.php)
 * POST action=create name, rating, text
 *
 * Signed-in guests post under their own account; their profile photo is
 * attached automatically so it shows beside the review.
 */

require_once dirname(__DIR__) . '/includes/functions.php';

$action = $_GET['action'] ?? (request_payload()['action'] ?? '');
$payload = request_payload();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_csrf($payload);
}

switch ($action) {
    case 'list':
        $summary = review_summary();
        json_ok([
            'reviews' => latest_reviews(6),
            'total'   => $summary['total'],
            'average' => $summary['average'],
        ]);
        break;

    case 'create':
        $user = require_login_json();

        $name = post_string($payload, 'name');
        $text = post_string($payload, 'text');
        $rating = post_int($payload, 'rating', 5);

        if ($name === '' || $text === '') {
            json_fail('Please add your name and review.');
        }
        if ($rating < 1 || $rating > 5) {
            json_fail('Please choose a rating from 1 to 5 stars.');
        }
        if (mb_strlen($text) > 1000) {
            json_fail('Please keep your review under 1000 characters.');
        }

        $statement = db()->prepare(
            'INSERT INTO reviews (user_id, name, rating, text, avatar_file)
             VALUES (?, ?, ?, ?, ?)'
        );
        $statement->execute([(int) $user['id'], $name, $rating, $text, $user['avatar_file']]);

        $summary = review_summary();

        json_ok([
            'reviews' => latest_reviews(6),
            'total'   => $summary['total'],
            'average' => $summary['average'],
        ], 'Thanks! Your review is live.');
        break;

    default:
        json_fail('Unknown action.', 404);
}