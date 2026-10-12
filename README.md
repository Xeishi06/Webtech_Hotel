# Stella's Beach House — reservation system

A PHP + MySQL hotel booking site. Accounts, email verification, reservations,
24-hour payment holds, reviews and the staff dashboard are all handled by PHP
against a MySQL database (there is no `localStorage` any more — the data is
shared between every visitor and survives a cache clear).

---

## 1. What you need

* [XAMPP](https://www.apachefriends.org/) (PHP 8.0+ and MySQL/MariaDB)
* This project folder copied into `C:\xampp\htdocs\stella`

```
C:\xampp\htdocs\stella\      <- this folder
    index.php                <- start here
    landingpage.php
    account.php
    my-reservations.php
    admin.php
    api/                     <- JSON endpoints used by the browser
    includes/                <- config, database, helpers, page parts
    uploads/                 <- profile photos + bank receipts (not public)
    storage/                 <- mail.log (only used when mail() is unavailable)
    schema.sql               <- the database
```

## 2. Set it up (about 3 minutes)

1. Open the **XAMPP Control Panel** and press **Start** next to **Apache** and
   **MySQL**.
2. Import the database. Either:
   * open <http://localhost/phpmyadmin>, click **Import**, choose `schema.sql`, **Go**; or
   * run this in a terminal:
     ```
     C:\xampp\mysql\bin\mysql.exe -u root < C:\xampp\htdocs\stella\schema.sql
     ```
3. Open <http://localhost/stella/> — the site loads.

The import creates the `stella_stay` database with the rooms, and one staff
account.

### Staff login

| | |
|---|---|
| URL | <http://localhost/stella/admin.php> |
| Email | `admin@stella.local` |
| Password | `StellaAdmin123` |

Change that password before you present the project. To add another staff
member, set `is_admin = 1` for their row in the `users` table.

## 3. If the page says "Can't reach the database"

Check, in this order:

* MySQL is running in the XAMPP Control Panel.
* The password in `includes/config.php` (`DB_PASS`) matches your MySQL root
  password. XAMPP's default is an empty password.
* You imported `schema.sql` (phpMyAdmin → `stella_stay` should exist).

---

## How the pieces fit together

### Rooms come from the database

Prices, capacity, photos and "Coming Soon" status live in the **`rooms`** table.
Edit a row in phpMyAdmin and the room pages, the booking modal and the price
totals all follow — no PHP or JavaScript edits needed.

To make a "Coming Soon" room bookable, set its `available` column to `1`.

### Money is decided by the server

The browser only sends *what the guest chose* (room key, dates, guest counts).
`api/bookings.php` then loads the price from MySQL and recalculates the night
count, total, deposit and balance before saving. A guest editing the price in
devtools changes nothing.

Creating a booking runs inside a transaction that locks the overlapping rows, so
two people clicking "Reserve" at the same moment cannot take the same dates.

### The 24-hour hold

`mode=hold` saves a booking as `hold` with `hold_until = now() + 24h`. It blocks
the calendar exactly like a paid booking. Every page load runs
`sweep_expired_holds()`, which flips overdue holds to `expired` and frees the
room. Paying a hold later (from My Reservations) confirms it.

### Email

`includes/mailer.php` sends the verification code and booking receipt with
PHP's `mail()`. If the mail server refuses the message — common on XAMPP —
the code is written to `storage/mail.log` **and** shown on screen in the
"DEMO INBOX" box, so the flow is still testable. On a host with working
`mail()` the box never appears.

### Security

* Passwords are hashed with `password_hash()` / `password_verify()`.
* Every write goes through a CSRF token (`X-CSRF-Token`).
* Prepared statements everywhere; no user input is concatenated into SQL.
* All POST input is escaped with `e()` on the way out.
* Uploads are checked with `getimagesize()`, capped at 4 MB, stored under random
  names in `uploads/`, and served through `media.php` — bank receipts are only
  visible to the guest who paid and to staff.
* `uploads/`, `includes/` and `storage/` each have an `.htaccess` denying
  direct web access.

---

## Pages

| File | What it does |
|---|---|
| `index.php` | Redirects to the home page |
| `landingpage.php` | Home: rooms, reviews, contact form, login/register modals |
| `rooms.php` | All room categories |
| `room-*.php` | One category per file, all rendered by `includes/room-category-page.php` |
| `account.php` | Profile, contact number, photo, delete account |
| `my-reservations.php` | Bookings, receipts, pay a hold, cancel |
| `admin.php` | Staff dashboard: reservations, status changes, guest messages |

### API endpoints (used by `main.js`)

| Endpoint | Actions |
|---|---|
| `api/auth.php` | `register`, `verify`, `resend`, `login`, `logout`, `me` |
| `api/bookings.php` | `availability`, `create`, `list`, `pay`, `cancel` |
| `api/account.php` | `me`, `update`, `avatar`, `avatar-remove`, `delete` |
| `api/reviews.php` | `list`, `create` |

---

## Things you can change in `includes/config.php`

```php
DEPOSIT_RATE    = 0.5;   // 50% now, the rest at check-in
HOLD_HOURS      = 24;    // how long an unpaid booking holds a room
VERIFY_MINUTES  = 10;    // lifetime of the email code
DEBUG_MODE      = true;  // set to false before putting this online
```

## Troubleshooting

**"Please log in to continue" straight after logging in.** Your browser is
dropping the session cookie — check that cookies are enabled for `localhost`.

**A code never arrives.** It is in `storage/mail.log`, and the demo box on
screen. Both mean `mail()` is not configured on your machine.

**"Your session expired" on a form.** The PHP session timed out; refresh the
page and try again.

**Styles look old.** The CSS is cached hard (`?v=16`); hard-refresh with
Ctrl+F5.