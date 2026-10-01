<?php
/**
 * Shared bootstrap file
 */

// Define path constants
define('CRAFT_BASE_PATH', __DIR__);
define('CRAFT_VENDOR_PATH', CRAFT_BASE_PATH . '/vendor');
define('PROJECT_ROOT_PATH', dirname(CRAFT_BASE_PATH));

// Load Composer's autoloader
require_once CRAFT_VENDOR_PATH . '/autoload.php';

// Load the environment owned by the current runtime.
if (class_exists(Dotenv\Dotenv::class)) {
    if (is_file(CRAFT_BASE_PATH . '/.env')) {
        Dotenv\Dotenv::createUnsafeMutable(CRAFT_BASE_PATH, ['.env'])->safeLoad();
    } else {
        Dotenv\Dotenv::createUnsafeMutable(PROJECT_ROOT_PATH, ['.env'])->safeLoad();
    }
}

$craftLicenseKey = getenv('CRAFT_LICENSE_KEY');

if (!defined('CRAFT_LICENSE_KEY') && $craftLicenseKey !== false && $craftLicenseKey !== '') {
    define('CRAFT_LICENSE_KEY', $craftLicenseKey);
}
