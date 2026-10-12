<?php
/**
 * Closes the page and hands the browser what it needs:
 *  - window.APP  (signed-in user, room catalogue, CSRF token)
 *  - main.js     (modals, booking steps, gallery, mobile nav)
 *
 * Optional: $extraScripts = path to a page-specific .js file.
 */
?>
    <script>
        window.APP = <?= app_bootstrap_payload() ?>;
    </script>

    <script src="main.js?v=16" defer></script>

    <?php if (!empty($extraScripts)): ?>
    <script src="<?= e($extraScripts) ?>" defer></script>
    <?php endif; ?>

</body>

</html>