<?php
/**
 * Loaded at the top of every page: configuration, database, helpers.
 * Also frees any hold whose 24-hour payment deadline has passed, so the
 * room calendar is accurate on every page load.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/functions.php';

sweep_expired_holds();