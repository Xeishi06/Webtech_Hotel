<?php
/**
 * Rooms overview: every category with its options and nightly rates,
 * all read from the rooms table.
 */

require __DIR__ . '/includes/bootstrap.php';

$pageTitle = 'Rooms - ' . SITE_NAME;
$pageDescription = 'Available rooms at ' . SITE_NAME;
$cssFile = 'landingpage.css';
$cssVersion = '16';

$categories = room_categories();

require __DIR__ . '/includes/head.php';
require __DIR__ . '/includes/nav.php';
?>

<section class="rooms category">
    <p class="label">OUR ROOMS</p>
    <h2>Available Rooms</h2>
    <p class="section-description">Pick a room, choose your dates, and reserve in three quick steps.</p>

    <div class="room-container">

        <?php foreach ($categories as $category):
            $photos = room_photos($category['rooms'][0]);
        ?>
            <div class="room-card">
                <img src="<?= e($photos[0] ?? 'scene.jpg') ?>" alt="<?= e($category['name']) ?>" loading="lazy"
                    onerror="this.onerror=null;this.src='scene.jpg';" />
                <span class="badge"><?= e($category['tag'] ?: 'Stella Stay') ?></span>
                <h3><?= e($category['name']) ?></h3>
                <p>Good for <?= (int) $category['capacity'] ?> persons &bull;
                    <?= count($category['rooms']) ?> options from <?= peso($category['from']) ?></p>
                <strong><?= peso($category['from']) ?> per night</strong>
                <p class="card-links">
                    <a class="reserve-pill" href="room-<?= e($category['slug']) ?>.php">View Details</a>
                    <?php $first = $category['rooms'][0]; if ((int) $first['available'] === 1): ?>
                        <button type="button" class="reserve-pill" data-reserve="<?= e($first['sub_key']) ?>">Check Availability</button>
                    <?php endif; ?>
                </p>
            </div>
        <?php endforeach; ?>

    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
<?php require __DIR__ . '/includes/scripts.php'; ?>