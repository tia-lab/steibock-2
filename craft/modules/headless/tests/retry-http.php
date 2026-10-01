<?php

use modules\headless\cache_revalidation\NextRevalidator;

$app = require dirname(__DIR__, 3) . '/plugins/ubiq-editorial-permissions/tests/bootstrap.php';
$socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
if (!$socket) throw new RuntimeException('Could not reserve loopback port.');
$address = stream_socket_get_name($socket, false);
fclose($socket);
$state = tempnam(CRAFT_BASE_PATH . '/storage', 'retry-');
file_put_contents($state, '[]');
$server = proc_open([PHP_BINARY, '-S', $address, __DIR__ . '/http-router.php'],
    [['pipe', 'r'], ['file', '/dev/null', 'a'], ['file', '/dev/null', 'a']], $pipes,
    null, array_replace(getenv(), ['UBIQ_CACHE_HTTP_STATE' => $state]));
if (!is_resource($server)) throw new RuntimeException('Could not start loopback fixture.');
try {
    $ready = false;
    for ($i = 0; $i < 100; $i++) {
        $probe = @stream_socket_client('tcp://' . $address, $errno, $error, 0.05);
        if ($probe) { fclose($probe); $ready = true; break; }
        usleep(20000);
    }
    if (!$ready) throw new RuntimeException('Loopback fixture did not start.');
    putenv('CRAFT_REVALIDATE_URL=http://' . $address . '/retry');
    putenv('REVALIDATE_SECRET=disposable-http-test');
    NextRevalidator::send(['craft:news']);
    $requests = json_decode(file_get_contents($state), true);
    if (count($requests) !== 2 || $requests[0] !== $requests[1]) {
        throw new RuntimeException('Expected two identical HTTP payloads after a 503.');
    }
    file_put_contents($state, '[]');
    putenv('CRAFT_REVALIDATE_URL=http://' . $address . '/slow');
    $start = hrtime(true);
    NextRevalidator::send(['craft:news']);
    $elapsed = (hrtime(true) - $start) / 1e9;
    if ($elapsed > 2.2 || $elapsed < 1.2) throw new RuntimeException("Unexpected timeout budget: $elapsed");
    echo sprintf("HTTP retry recovered; timeout exhaustion returned in %.3fs.\n", $elapsed);
} finally {
    proc_terminate($server);
    if (is_resource($pipes[0])) fclose($pipes[0]);
    proc_close($server);
    unlink($state);
}
