-- ============================================================
--  Stella's Beach House - database schema
--  Import with:  C:\xampp\mysql\bin\mysql -u root < schema.sql
--  or phpMyAdmin -> Import -> choose this file
-- ============================================================

CREATE DATABASE IF NOT EXISTS stella_stay
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE stella_stay;

-- ------------------------------------------------------------
-- Guests who created an account (and hotel staff)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    contact       VARCHAR(20)  NOT NULL DEFAULT '',
    avatar_file   VARCHAR(255) NULL,
    verified_at   DATETIME     NULL,
    is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Signups waiting for the 6-digit email code
-- (one row per email; a new code replaces the old one)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_verifications (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(190) NOT NULL UNIQUE,
    name          VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    code          CHAR(6)     NOT NULL,
    attempts      TINYINT     NOT NULL DEFAULT 0,
    expires_at    DATETIME    NOT NULL,
    created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Bookable rooms (one row per bookable option, e.g. "couples-garden")
-- Prices and availability live here, so staff can change them
-- without touching any PHP or JavaScript.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    sub_key       VARCHAR(60)  NOT NULL UNIQUE,
    category      VARCHAR(60)  NOT NULL,
    category_slug VARCHAR(40)  NOT NULL,
    name          VARCHAR(80)  NOT NULL,
    capacity      INT          NOT NULL,
    price         DECIMAL(10,2) NOT NULL,
    badge         VARCHAR(60)  NOT NULL DEFAULT '',
    tag           VARCHAR(60)  NOT NULL DEFAULT '',
    blurb         VARCHAR(200) NOT NULL DEFAULT '',
    meta          VARCHAR(160) NOT NULL DEFAULT '',
    available     TINYINT(1)   NOT NULL DEFAULT 1,
    sort_order    INT          NOT NULL DEFAULT 0,
    INDEX (category_slug)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Reservations
-- status: hold | confirmed | expired | released | refund_pending
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    booking_code   VARCHAR(20)  NOT NULL UNIQUE,
    user_id        INT          NOT NULL,
    room_key       VARCHAR(60)  NOT NULL,
    room_label     VARCHAR(160) NOT NULL,
    guest_name     VARCHAR(120) NOT NULL,
    guest_email    VARCHAR(190) NOT NULL,
    guest_contact  VARCHAR(20)  NOT NULL DEFAULT '',
    adults         INT          NOT NULL DEFAULT 1,
    children       INT          NOT NULL DEFAULT 0,
    checkin        DATE         NOT NULL,
    checkout       DATE         NOT NULL,
    nights         INT          NOT NULL,
    rate           DECIMAL(10,2) NOT NULL,
    total          DECIMAL(10,2) NOT NULL,
    deposit        DECIMAL(10,2) NOT NULL,
    balance        DECIMAL(10,2) NOT NULL,
    status         ENUM('hold','confirmed','expired','released','refund_pending') NOT NULL DEFAULT 'hold',
    payment_method VARCHAR(20)  NOT NULL DEFAULT '',
    payment_ref    VARCHAR(60)  NOT NULL DEFAULT '',
    receipt_file   VARCHAR(255) NULL,
    hold_until     DATETIME     NULL,
    paid_at        DATETIME     NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX room_dates (room_key, checkin, checkout),
    INDEX user_id (user_id),
    INDEX status (status)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Guest reviews shown on the landing page
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT         NULL,
    name        VARCHAR(120) NOT NULL,
    rating      TINYINT     NOT NULL,
    text        VARCHAR(1000) NOT NULL,
    avatar_file VARCHAR(255) NULL,
    created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX user_id (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Messages sent through the contact form (staff reads them in admin.php)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(190) NOT NULL,
    body       VARCHAR(2000) NOT NULL,
    handled    TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Room catalogue
-- ------------------------------------------------------------
-- Photos are NOT stored here on purpose - they live in
-- includes/room-images.php so you can swap them without touching the DB.

INSERT INTO rooms (sub_key, category, category_slug, name, capacity, price, badge, tag, blurb, meta, available, sort_order) VALUES
('couples-garden',     'Couples Room',  'couples',  'Garden View',      2,  2000, 'Good for 2',   'Best for couples',
 'Queen bed - Garden terrace - Breakfast for 2',
 'Good for 2 persons - Queen bed - Garden terrace', 1, 1),

('couples-pool',       'Couples Room',  'couples',  'Pool Access',      2,  2800, 'Most picked',  'Best for couples',
 'King bed - Direct pool access - Sunset deck',
 'Good for 2 persons - Queen bed - Garden terrace', 0, 2),

('couples-beachfront', 'Couples Room',  'couples',  'Beachfront Suite', 2,  3500, 'Beachfront',   'Best for couples',
 'King bed - Private veranda - Breakfast + dinner for 2',
 'Good for 2 persons - Queen bed - Garden terrace', 0, 3),

('fam4-standard',   'Family Room 4',  'family-4',  'Standard',   4, 2500, 'Good for 4',  'Popular',
 '2 queen beds - Garden view - Breakfast for 4',
 'Good for 4 persons - 2 queen beds - Breakfast for 4', 1, 1),

('fam4-pool',       'Family Room 4',  'family-4',  'Pool View',  4, 3200, 'Most picked', 'Popular',
 '2 queen beds - Pool view balcony - Breakfast for 4',
 'Good for 4 persons - 2 queen beds - Breakfast for 4', 0, 2),

('fam4-beachfront','Family Room 4',  'family-4',  'Beachfront', 4, 3900, 'Beachfront',  'Popular',
 '2 queen beds - Steps from the sand - Breakfast + snacks for 4',
 'Good for 4 persons - 2 queen beds - Breakfast for 4', 0, 3),

('fam6-standard', 'Family Room 6',  'family-6',  'Standard',        6, 3000, 'Good for 6',  'Popular',
 '3 queen beds - Garden view - Breakfast for 6',
 'Good for 6 persons - 3 queen beds - Breakfast for 6', 1, 1),

('fam6-pool',     'Family Room 6',  'family-6',  'Pool Access',     6, 3800, 'Most picked', 'Popular',
 '3 queen beds - Direct pool access - Breakfast for 6',
 'Good for 6 persons - 3 queen beds - Breakfast for 6', 0, 2),

('fam6-villa',    'Family Room 6',  'family-6',  'Beachfront Villa', 6, 4800, 'Beachfront',  'Popular',
 '3 queen beds - Private lounge - Breakfast + dinner for 6',
 'Good for 6 persons - 3 queen beds - Breakfast for 6', 0, 3),

('fam12-standard', 'Family Room 12', 'family-12', 'Standard',         12, 4500, 'Good for 12', 'Big groups',
 'Bunk + queen setup - Garden view - Breakfast for 12',
 'Good for 12 persons - Bunk + queen setup', 1, 1),

('fam12-pavilion', 'Family Room 12', 'family-12', 'Pool Pavilion',    12, 5800, 'Most picked', 'Big groups',
 'Poolside pavilion - Lounge area - Breakfast for 12',
 'Good for 12 persons - Bunk + queen setup', 0, 2),

('fam12-hall',     'Family Room 12', 'family-12', 'Beachfront Hall',  12, 7500, 'Beachfront',  'Big groups',
 'Open hall - Steps from the sand - Breakfast + dinner for 12',
 'Good for 12 persons - Bunk + queen setup', 0, 3),

('fam15-standard', 'Family Room 15', 'family-15', 'Standard',            15, 7000, 'Good for 15', 'Big groups',
 'Bunk + queen setup - Garden view - Breakfast for 15',
 'Good for 15 persons - Whole-floor setup', 1, 1),

('fam15-villa',    'Family Room 15', 'family-15', 'Grand Pool Villa',    15, 9000, 'Most picked', 'Big groups',
 'Private villa - Pool + lounge - Breakfast for 15',
 'Good for 15 persons - Whole-floor setup', 0, 2),

('fam15-estate',   'Family Room 15', 'family-15', 'Beachfront Estate',   15, 12000, 'Beachfront',  'Big groups',
 'Whole estate - Private sand access - Full board for 15',
 'Good for 15 persons - Whole-floor setup', 0, 3)
ON DUPLICATE KEY UPDATE
    category = VALUES(category),
    category_slug = VALUES(category_slug),
    name = VALUES(name),
    capacity = VALUES(capacity),
    price = VALUES(price),
    badge = VALUES(badge),
    tag = VALUES(tag),
    blurb = VALUES(blurb),
    meta = VALUES(meta),
    available = VALUES(available),
    sort_order = VALUES(sort_order);

-- ------------------------------------------------------------
-- Staff account for admin.php
--   email:    admin@stella.local
--   password: StellaAdmin123
-- Change the password after your first login.
-- ------------------------------------------------------------
INSERT INTO users (name, email, password_hash, verified_at, is_admin)
VALUES ('Front Desk', 'admin@stella.local', '$2y$10$9sUhV5KubGu0TfjYZVZNweFlobb9gscBiBSLPHqkWpg90Sq5xkhs2', NOW(), 1)
ON DUPLICATE KEY UPDATE is_admin = 1;