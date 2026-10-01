<?php

namespace modules\headless\cache_revalidation;

use Craft;
use craft\helpers\App;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\ConnectException;
use Throwable;

class NextRevalidator
{
    /** @param string[] $tags */
    public static function send(array $tags): void
    {
        $url = App::env('CRAFT_REVALIDATE_URL');
        $secret = App::env('REVALIDATE_SECRET');
        if (!$url || !$secret) {
            Craft::info('Headless cache revalidation skipped; URL or secret is missing.', __METHOD__);
            return;
        }
        $tags = array_values(array_unique(array_filter($tags)));
        if (!$tags) return;

        $deadline = hrtime(true) / 1e9 + 2.0;
        $attempt = 0;
        $failure = 'request budget exhausted';
        try {
            $client = Craft::createGuzzleClient();
            while ($attempt < 2) {
                $remaining = $deadline - hrtime(true) / 1e9;
                if ($remaining <= 0.05) break;
                $timeout = min($attempt === 0 ? 1.2 : $remaining, $remaining);
                $attempt++;
                $retry = false;
                $delay = 0.1;
                try {
                    $response = $client->post($url, [
                        'json' => ['secret' => $secret, 'tags' => $tags],
                        'http_errors' => false,
                        'allow_redirects' => false,
                        'connect_timeout' => min(1.0, $timeout),
                        'timeout' => $timeout,
                    ]);
                    $status = $response->getStatusCode();
                    if ($status >= 200 && $status < 300) {
                        if (Craft::$app->getConfig()->getGeneral()->devMode) {
                            Craft::info(sprintf('Headless cache revalidation sent (attempt %d): %s', $attempt, implode(', ', $tags)), __METHOD__);
                        }
                        return;
                    }
                    $failure = "HTTP $status";
                    $retry = in_array($status, [408, 429, 500, 502, 503, 504], true);
                    if (in_array($status, [429, 503], true)) {
                        $retryAfter = trim($response->getHeaderLine('Retry-After'));
                        if ($retryAfter !== '') {
                            $seconds = ctype_digit($retryAfter) ? (float)$retryAfter
                                : (($date = strtotime($retryAfter)) !== false ? max(0, $date - time()) : null);
                            if ($seconds !== null) $delay = max($delay, $seconds);
                        }
                    }
                } catch (ConnectException | RequestException $error) {
                    $errno = $error->getHandlerContext()['errno'] ?? null;
                    $failure = 'transport error' . ($errno !== null ? " ($errno)" : '');
                    $retry = in_array($errno, [5, 6, 7, 18, 28, 52, 55, 56], true);
                }
                if (!$retry || $attempt === 2 || $delay + 0.05 >= $deadline - hrtime(true) / 1e9) break;
                usleep((int)($delay * 1e6));
            }
        } catch (Throwable $error) {
            // Never log request bodies, secrets, or credential-bearing URLs.
            $failure = 'request error (' . $error::class . ')';
        }
        Craft::warning(sprintf('Headless cache revalidation failed after %d attempt(s): %s.', $attempt, $failure), __METHOD__);
    }
}
