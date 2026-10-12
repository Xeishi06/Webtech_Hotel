<?php
/**
 * Page footer. Two sizes: the full landing-page footer, or the compact
 * one used by the inner pages.
 *
 * Optional: $footerStyle = 'full' | 'compact'
 */

$footerStyle = $footerStyle ?? 'compact';
?>

<?php if ($footerStyle === 'full'): ?>

<footer>

    <h3>Stella's Beach House</h3>

    <p>
        Relax. Enjoy. Make Memories.
    </p>

    <p class="footer-stay">
        Check-in 2:00 PM &bull; Check-out 12:00 NN &bull; <?= (int) (DEPOSIT_RATE * 100) ?>% deposit reserves your dates
    </p>
    <p class="footer-stay muted-light">
        No smoking indoors &bull; Pets on request &bull; Quiet hours 10 PM &ndash; 6 AM
    </p>

    <p>
        &copy; <?= date('Y') ?> Stella's Beach House
    </p>

</footer>

<?php else: ?>

<footer class="footer-compact">

    <h3>Stella's Beach House</h3>

    <p>
        Relax. Enjoy. Make Memories.
    </p>

    <p>
        &copy; <?= date('Y') ?> Stella's Beach House
    </p>

</footer>

<?php endif; ?>