<?php

// Creates only a new disposable app. It never reads the repository's private env.
$root = getenv('UBIQ_EDITORIAL_TEST_ROOT');
$dsn = getenv('UBIQ_EDITORIAL_TEST_DSN');
if (!$root || !str_starts_with($root, '/') || !$dsn
    || !preg_match('/^mysql:host=(127\.0\.0\.1|localhost|host\.docker\.internal);port=\d+;dbname=ubiq_editorial_test$/', $dsn)) {
    throw new RuntimeException('Set an absolute UBIQ_EDITORIAL_TEST_ROOT and a loopback MySQL UBIQ_EDITORIAL_TEST_DSN for ubiq_editorial_test.');
}
if (is_dir($root) && count(scandir($root)) > 2) {
    throw new RuntimeException('The fixture directory must be new or empty.');
}
$vendor = realpath(dirname(__DIR__, 3) . '/vendor');
if (!$vendor) throw new RuntimeException('Install Craft Composer dependencies first.');
foreach (['config', 'web', 'storage'] as $directory) {
    if (!is_dir("$root/$directory")) mkdir("$root/$directory", 0700, true);
}
file_put_contents("$root/.editorial-test-fixture", 'Disposable editorial permissions tests');
$db = [
    'dsn' => $dsn, 'user' => getenv('UBIQ_EDITORIAL_TEST_DB_USER') ?: 'root',
    'password' => getenv('UBIQ_EDITORIAL_TEST_DB_PASSWORD') ?: 'root',
    'charset' => 'utf8mb4', 'collation' => 'utf8mb4_unicode_ci',
];
file_put_contents("$root/config/db.php", "<?php\n\$config = " . var_export($db, true)
    . ";\n\$config['dsn'] = getenv('UBIQ_EDITORIAL_TEST_DSN') ?: \$config['dsn'];\nreturn \$config;\n");
file_put_contents("$root/config/general.php", "<?php\nreturn " . var_export([
    'devMode' => true, 'allowAdminChanges' => true, 'usePathInfo' => true,
    'securityKey' => bin2hex(random_bytes(24)),
], true) . ";\n");
$constants = "define('CRAFT_BASE_PATH', " . var_export($root, true) . ");\n"
    . "define('CRAFT_VENDOR_PATH', " . var_export($vendor, true) . ");\n"
    . "require CRAFT_VENDOR_PATH . '/autoload.php';\n";
file_put_contents("$root/craft", "<?php\n$constants\$app = require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';\nexit(\$app->run());\n");
file_put_contents("$root/web/index.php", "<?php\n$constants\$app = require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/web.php';\nexit(\$app->run());\n");
file_put_contents("$root/router.php", <<<'PHP'
<?php
if (is_file(__DIR__ . '/web' . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) return false;
require __DIR__ . '/web/index.php';
PHP);
$run = function(array $args): void {
    $process = proc_open([PHP_BINARY, ...$args], [STDIN, STDOUT, STDERR], $pipes);
    if (!is_resource($process) || proc_close($process) !== 0) {
        throw new RuntimeException('Fixture setup command failed. Inspect its output.');
    }
};
$run(["$root/craft", 'install', '--interactive=0', '--email=admin@example.test', '--username=admin',
    '--password=EditorialFixture123!', '--siteName=Editorial fixture', '--siteUrl=http://127.0.0.1:8098', '--language=en']);
$run(["$root/craft", 'plugin/install', 'ubiq-editorial-permissions', '--interactive=0']);
$run([__DIR__ . '/seed.php']);
