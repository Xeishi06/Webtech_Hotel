<?php
/**
 * A single category card used on the landing page ("Couples Room",
 * "Family Room 4", ...). Prices and options come from the rooms table.
 *
 * Expected: $category  (one entry from room_categories())
 */

$options = $category['rooms'];
$fromPrice = $category['from'];
$photos = room_photos($options[0]);
$count = count($options);
?>
<div class="room-card">
    <img src="<?= e($photos[0] ?? 'scene.jpg') ?>" alt="<?= e($category['name']) ?> at Stella's Beach House" loading="lazy" />
    <span class="badge"><?= e($category['tag'] ?: 'Stella Stay') ?></span>
    <h3><?= e($category['name']) ?></h3>
    <p>Good for <?= (int) $category['capacity'] ?> persons &bull; <?= $count ?> options from <?= peso($fromPrice) ?></p>
    <strong><?= peso($fromPrice) ?> per night</strong>
    <p class="card-links">
        <a class="reserve-pill" href="room-<?= e($category['slug']) ?>.php">View Details</a>
    </p>
</div>