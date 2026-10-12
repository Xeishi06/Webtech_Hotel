<?php
/**
 * A room category page (Couples, Family 4, Family 6, Family 12, Family 15).
 *
 * room-couples.php, room-family-4.php and friends are thin files that set
 * $categorySlug and include this template - so there is one place to edit
 * the layout instead of five copies.
 */

require __DIR__ . '/bootstrap.php';

$categorySlug = $categorySlug ?? '';
$categories = room_categories();

if (!isset($categories[$categorySlug])) {
    header('Location: rooms.php');
    exit;
}

$category = $categories[$categorySlug];
$tabs = $categories;

$pageTitle = $category['name'] . ' - ' . SITE_NAME;
$pageDescription = $category['name'] . ' options at ' . SITE_NAME . ' — '
    . implode(', ', array_column($category['rooms'], 'name')) . '.';
$cssFile = 'landingpage.css';
$cssVersion = '16';

require __DIR__ . '/head.php';
require __DIR__ . '/nav.php';
?>

<section class="rooms category">
    <div class="cat-tabs">
        <a href="rooms.php">All</a>
        <?php foreach ($tabs as $tab): ?>
            <a href="room-<?= e($tab['slug']) ?>.php" class="<?= $tab['slug'] === $categorySlug ? 'active' : '' ?>">
                <?= e(str_replace('Family Room', 'Family', $tab['name'])) ?>
            </a>
        <?php endforeach; ?>
    </div>

    <p class="label"><?= e(strtoupper($category['name'])) ?></p>
    <h2>Pick Your <?= e(str_replace(' Room', '', $category['name'])) ?> Stay</h2>

    <div class="room-container">
        <?php foreach ($category['rooms'] as $room):
            $photos = room_photos($room);
            $bookable = (int) $room['available'] === 1;
        ?>
            <div class="room-card">
                <img src="<?= e($photos[0] ?? 'scene.jpg') ?>" alt="<?= e($category['name'] . ' ' . $room['name']) ?>" loading="lazy"
                    onerror="this.onerror=null;this.src='scene.jpg';" />
                <span class="badge"><?= e($room['badge'] ?: 'Good for ' . (int) $room['capacity']) ?></span>
                <h3><?= e($room['name']) ?></h3>
                <p><?= e(str_replace(' - ', ' • ', $room['blurb'])) ?></p>
                <strong><?= peso((float) $room['price']) ?> per night</strong>
                <p class="card-links">
                    <?php if ($bookable): ?>
                        <button type="button" class="reserve-pill" data-reserve="<?= e($room['sub_key']) ?>">Check Availability</button>
                    <?php else: ?>
                        <span class="coming-soon-pill">Coming Soon</span>
                    <?php endif; ?>
                </p>
            </div>
        <?php endforeach; ?>
    </div>
</section>

<?php require __DIR__ . '/footer.php'; ?>
<?php require __DIR__ . '/scripts.php'; ?>