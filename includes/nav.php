<?php
/**
 * Site navigation. Rendered on the server so the login/logout state is
 * decided by PHP's session, not by JavaScript.
 *
 * Optional: $navPage overrides the page used for the active highlight.
 */

$user = current_user();
$currentPage = $navPage ?? basename($_SERVER['SCRIPT_NAME'] ?? 'landingpage.php');

// "Rooms" counts for the rooms list and every room detail page.
$isRoomsPage = $currentPage === 'rooms.php' || str_starts_with($currentPage, 'room-');
?>

<nav>

    <h2><img class="brand-logo" src="stella-logo.png" alt="Stella Stay logo" /> Stella Stay</h2>

    <div class="nav-links">
        <a href="landingpage.php#home" class="<?= $currentPage === 'landingpage.php' ? 'active' : '' ?>">Home</a>
        <a href="landingpage.php#about">About</a>
        <a href="landingpage.php#rooms" class="<?= $isRoomsPage ? 'active' : '' ?>">Rooms</a>
        <a href="landingpage.php#reviews">Reviews</a>
        <a href="landingpage.php#contact">Contact</a>
        <a href="my-reservations.php" class="<?= $currentPage === 'my-reservations.php' ? 'active' : '' ?>">My Reservations</a>
        <?php if (is_admin()): ?>
        <a href="admin.php" class="<?= $currentPage === 'admin.php' ? 'active' : '' ?>">Admin</a>
        <?php endif; ?>
    </div>

    <div class="nav-auth">
        <?php if ($user): ?>
            <a href="account.php" class="login-button<?= $currentPage === 'account.php' ? ' active' : '' ?>">
                Hi, <?= e(strtok($user['name'], ' ')) ?>
            </a>
            <form method="post" action="api/auth.php?action=logout" class="nav-logout-form">
                <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                <button type="submit" class="register-button" data-logout>Logout</button>
            </form>
        <?php else: ?>
            <a href="landingpage.php?login=1" class="login-button" data-login>Login</a>
            <a href="landingpage.php?register=1" class="register-button" data-register>Register</a>
        <?php endif; ?>
    </div>

</nav>