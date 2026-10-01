<?php

// Integration tests only run against an explicitly selected disposable app.
$fixture = getenv('UBIQ_EDITORIAL_TEST_ROOT');
if (!$fixture || !is_file($fixture . '/config/db.php') || !is_file($fixture . '/.editorial-test-fixture')) {
    throw new RuntimeException('Set UBIQ_EDITORIAL_TEST_ROOT to a disposable Craft app with an .editorial-test-fixture marker.');
}
define('CRAFT_BASE_PATH', realpath($fixture));
define('CRAFT_VENDOR_PATH', dirname(__DIR__, 3) . '/vendor');
$loader = require CRAFT_VENDOR_PATH . '/autoload.php';
// Test source, not a potentially stale Composer mirror.
$loader->addPsr4('ubiq\\editorialpermissions\\', dirname(__DIR__) . '/src', true);
$classMap = [];
$sourceDir = dirname(__DIR__) . '/src/';
foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceDir)) as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $relative = substr($file->getPathname(), strlen($sourceDir), -4);
        $classMap['ubiq\\editorialpermissions\\' . str_replace('/', '\\', $relative)] = $file->getPathname();
    }
}
$loader->addClassMap($classMap);
$dbConfig = require $fixture . '/config/db.php';
if (!str_contains($dbConfig['dsn'] ?? '', 'dbname=ubiq_editorial_test')) {
    throw new RuntimeException('The test database must be named ubiq_editorial_test.');
}
if (($testAppType ?? 'console') === 'web') {
    $_SERVER['SCRIPT_FILENAME'] = $fixture . '/web/index.php';
    $_SERVER['SCRIPT_NAME'] = '/index.php';
    $_SERVER['REQUEST_URI'] = '/admin';
    $_SERVER['SERVER_NAME'] = '127.0.0.1';
    $_SERVER['HTTP_HOST'] = '127.0.0.1:8098';
    $_SERVER['SERVER_PORT'] = 8098;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $app = require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/web.php';
    $app->getRequest()->setIsConsoleRequest(false);
    $app->getRequest()->setIsCpRequest(true);
    $app->getUser()->enableSession = false;
} else {
    $app = require CRAFT_VENDOR_PATH . '/craftcms/cms/bootstrap/console.php';
}
set_exception_handler(function(Throwable $error): void {
    fwrite(STDERR, $error::class . ': ' . $error->getMessage() . "\n" . $error->getTraceAsString() . "\n");
    exit(1);
});
return $app;
