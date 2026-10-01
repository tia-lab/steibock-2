<?php

// Loopback test server started only by retry-http.php.
$state = getenv('UBIQ_CACHE_HTTP_STATE');
if (!$state || !is_file($state)) { http_response_code(500); exit; }
$requests = json_decode(file_get_contents($state), true);
$requests[] = json_decode(file_get_contents('php://input'), true);
file_put_contents($state, json_encode($requests));
if ($_SERVER['REQUEST_URI'] === '/slow') usleep(2500000);
http_response_code(count($requests) === 1 ? 503 : 200);
header('Content-Type: application/json');
echo json_encode(['revalidated' => count($requests) > 1]);
