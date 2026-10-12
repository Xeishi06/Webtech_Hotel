<?php
/**
 * <head> block shared by every page.
 *
 * Set before including:
 *   $pageTitle       (required)  browser tab title
 *   $pageDescription (optional)  meta description
 *   $cssFile         (optional)  stylesheet, defaults to landingpage.css
 *   $cssVersion      (optional)  cache-busting version
 */

$pageTitle = $pageTitle ?? SITE_NAME;
$pageDescription = $pageDescription ?? SITE_NAME . ' - a relaxing beach getaway in Patar, Bolinao, Pangasinan.';
$cssFile = $cssFile ?? 'landingpage.css';
$cssVersion = $cssVersion ?? '16';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Lato:wght@400;700;900&family=Pacifico&display=swap" rel="stylesheet" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="<?= e($pageDescription) ?>" />
    <title><?= e($pageTitle) ?></title>
    <link rel="stylesheet" href="<?= e($cssFile) ?>?v=<?= e($cssVersion) ?>">
    <?php foreach (($extraCss ?? []) as $sheet): ?>
    <link rel="stylesheet" href="<?= e($sheet) ?>">
    <?php endforeach; ?>
    <?php if (!empty($bootstrapCss)): ?>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <?php endif; ?>
</head>

<body>