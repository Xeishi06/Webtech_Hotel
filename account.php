<?php
/**
 * My Account: profile details, contact number, photo and account deletion.
 * Everything on this page is server-rendered from the users table and saved
 * through api/account.php.
 */

require __DIR__ . '/includes/bootstrap.php';

// Logged-out visitors are sent to the home page, which opens the login popup.
// Redirecting to account.php here would loop, since this page bounces again.
$user = require_login_page('landingpage.php');

$pageTitle = 'My Account - ' . SITE_NAME;
$pageDescription = 'Your account at ' . SITE_NAME;
$cssFile = 'landingpage.css';
$cssVersion = '16';

require __DIR__ . '/includes/head.php';
require __DIR__ . '/includes/nav.php';
?>

<section class="rooms account-page">

    <p class="label">MY ACCOUNT</p>

    <h2>Account Information</h2>

    <div class="account-card">
        <div class="profile-row">
            <span id="accAvatar">
                <?php if ($user['avatar_file']): ?>
                    <span class="avatar-circle avatar-large"><img src="media.php?type=avatar&file=<?= e(rawurlencode($user['avatar_file'])) ?>" alt="" /></span>
                <?php else: ?>
                    <span class="avatar-circle avatar-large" style="background: <?= e(avatar_hue($user['name'])) ?>">
                        <?= e(mb_strtoupper(mb_substr($user['name'], 0, 1))) ?>
                    </span>
                <?php endif; ?>
            </span>
            <div>
                <p class="profile-title">Profile Photo</p>
                <p class="muted">Optional &mdash; shows beside your name on reviews.</p>
                <p class="profile-actions">
                    <label for="accAvatarInput" class="file-btn">Choose Photo</label>
                    <input id="accAvatarInput" type="file" accept="image/*" hidden />
                    <button type="button" class="details-link" id="accAvatarRemove">Remove</button>
                </p>
            </div>
        </div>

        <hr />
        <p><strong>Name:</strong> <span id="accName"><?= e($user['name']) ?></span></p>
        <p><strong>Email:</strong> <span id="accEmail"><?= e($user['email']) ?></span>
            <span class="status-badge" id="emailVerifiedBadge" <?= $user['verified_at'] ? '' : 'hidden' ?>>Email verified &#10003;</span>
        </p>
        <p><strong>Contact Number:</strong> <span id="accContact"><?= e($user['contact'] ?: 'Not set yet') ?></span></p>

        <hr />
        <form id="accountForm" novalidate>
            <label for="accContactInput">Update Contact Number</label>
            <input id="accContactInput" type="tel" pattern="09[0-9]{9}" maxlength="11" placeholder="09XXXXXXXXX" value="<?= e($user['contact']) ?>" />
            <button type="submit" class="main-button button-reset">Update Account</button>
        </form>

        <p class="delete-account-row"><button type="button" class="delete-link" id="deleteAccountBtn">Delete my account</button></p>
    </div>

</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
<?php require __DIR__ . '/includes/scripts.php'; ?>