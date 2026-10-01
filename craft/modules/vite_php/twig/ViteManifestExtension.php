<?php

namespace modules\vite_php\twig;

use craft\Craft;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Exposes Vite manifest-backed asset URLs to Twig templates.
 */
class ViteManifestExtension extends AbstractExtension
{
    private static ?array $manifestCache = null;
    private static bool $manifestLoaded = false;

    public function getFunctions(): array
    {
        return [
            new TwigFunction('viteAsset', [$this, 'viteAsset']),
            new TwigFunction('viteCssUrls', [$this, 'viteCssUrls']),
            new TwigFunction('viteBarbaCssEntries', [$this, 'viteBarbaCssEntries']),
            new TwigFunction('viteIsDev', [$this, 'viteIsDev']),
            new TwigFunction('useBarba', [$this, 'useBarba']),
            new TwigFunction('viteDevEntry', [$this, 'viteDevEntry']),
            new TwigFunction('viteDevCss', [$this, 'viteDevCss']),
            new TwigFunction('viteDevHmrClient', [$this, 'viteDevHmrClient']),
        ];
    }

    public function viteIsDev(): bool
    {
        $devMode = getenv('CRAFT_DEV_MODE');
        if ($devMode === false) {
            return false;
        }

        $normalized = strtolower(trim((string)$devMode));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * Frontend config: src/frontend/config.ts -> config.barba.enabled.
     */
    public function useBarba(): bool
    {
        $configPath = dirname(__DIR__, 3) . '/src/frontend/config.ts';
        if (!is_file($configPath)) {
            return false;
        }

        $source = file_get_contents($configPath);
        if ($source === false) {
            return false;
        }

        if (!preg_match('/barba\s*:\s*\{[^}]*enabled\s*:\s*(true|false)\b/s', $source, $matches)) {
            return false;
        }

        return $matches[1] === 'true';
    }

    private function viteDevBaseUrl(): string
    {
        $base = getenv('vite_DEV_SERVER_URL');
        if ($base === false) {
            return 'http://localhost:5173';
        }

        return rtrim((string)$base, '/');
    }

    public function viteDevEntry(?string $jsPath): string
    {
        if (!$jsPath) {
            return '';
        }

        $logical = pathinfo($jsPath, PATHINFO_FILENAME);
        if (!$logical) {
            $logical = $jsPath;
        }

        return $this->viteDevBaseUrl() . '/src/frontend/entries/' . $logical . '.entry.ts';
    }

    public function viteDevHmrClient(): string
    {
        return $this->viteDevBaseUrl() . '/@vite/client';
    }

    public function viteDevCss(?string $cssPath): string
    {
        if (!$cssPath) {
            return '';
        }

        $logical = pathinfo($cssPath, PATHINFO_FILENAME);
        if (!$logical) {
            $logical = $cssPath;
        }

        return $this->viteDevBaseUrl() . '/src/frontend/pages/' . $logical . '/styles.scss?direct';
    }

    /**
     * Logical CSS bundle names to preload when Barba keeps <head> persistent.
     *
     * @return list<string>
     */
    public function viteBarbaCssEntries(?string $fallbackCssPath = null): array
    {
        $entries = [];
        $manifest = $this->getManifest();

        if ($manifest) {
            foreach ($manifest as $manifestItem) {
                if (!is_array($manifestItem) || empty($manifestItem['isEntry'])) {
                    continue;
                }

                $name = $manifestItem['name'] ?? null;
                if (!is_string($name) || $name === '') {
                    continue;
                }

                $logicalCss = $name . '.css';
                if ($this->viteCssUrls($logicalCss) !== []) {
                    $entries[] = $logicalCss;
                }
            }
        }

        if ($entries === []) {
            $projectRoot = dirname(__DIR__, 3);
            $viteEntries = glob($projectRoot . '/src/frontend/entries/*.entry.ts') ?: [];

            foreach ($viteEntries as $entryFile) {
                if (!is_string($entryFile) || $entryFile === '') {
                    continue;
                }

                $basename = preg_replace('/\.entry\.(ts|js)$/', '', basename($entryFile));
                if ($basename === '') {
                    continue;
                }

                if (!file_exists($projectRoot . '/src/frontend/pages/' . $basename . '/styles.scss')) {
                    continue;
                }

                $entries[] = $basename . '.css';
            }
        }

        $entries = array_values(array_unique($entries));
        if ($entries !== []) {
            sort($entries);
            return $entries;
        }

        if (is_string($fallbackCssPath) && $fallbackCssPath !== '') {
            return [$fallbackCssPath];
        }

        return [];
    }

    /**
     * All CSS URLs for a logical page bundle (e.g. home.css), in cascade order.
     *
     * Vite splits shared SCSS (globals) into a separate chunk from page SCSS. The manifest’s
     * `css` array on the entry only lists the page chunk — shared `globals-*.css` lives on
     * imported JS chunks and must be collected recursively or most styles never load.
     *
     * @return list<string>
     */
    public function viteCssUrls(?string $logicalAsset): array
    {
        if (!$logicalAsset) {
            return [];
        }

        $logicalAsset = ltrim($logicalAsset, '/');
        $ext = strtolower(pathinfo($logicalAsset, PATHINFO_EXTENSION));
        if ($ext !== 'css') {
            return [];
        }

        $entryName = pathinfo($logicalAsset, PATHINFO_FILENAME);
        if (!$entryName) {
            $entryName = $logicalAsset;
        }

        $manifest = $this->getManifest();
        if (!$manifest) {
            $fallback = '/css/' . $logicalAsset;

            return file_exists($this->webrootPath($fallback)) ? [$fallback] : [];
        }

        $entryKey = $this->findViteEntryKey($manifest, $entryName);
        if ($entryKey !== null) {
            $visited = [];
            $urls = $this->collectCssUrlsForChunk($manifest, $entryKey, $visited);

            return array_values(array_unique($urls));
        }

        return $this->viteLegacySingleCssUrl($manifest, $logicalAsset, $entryName);
    }

    public function viteAsset(?string $logicalAsset): string
    {
        if (!$logicalAsset) {
            return '';
        }

        $logicalAsset = ltrim($logicalAsset, '/');
        $ext = strtolower(pathinfo($logicalAsset, PATHINFO_EXTENSION));
        $entryName = pathinfo($logicalAsset, PATHINFO_FILENAME);

        if (!$entryName) {
            $entryName = $logicalAsset;
        }

        $manifest = $this->getManifest();

        if ($ext === 'css') {
            $urls = $this->viteCssUrls($logicalAsset);

            return $urls[0] ?? '';
        }

        if ($manifest && $ext === 'js') {
            // Prefer Rollup `isEntry` chunks. Vite can emit multiple chunks with the same `name`
            // (e.g. `portfolio.entry.ts` vs dynamic `pages/portfolio/index.ts`); the first match
            // would otherwise be the wrong file and skip the main bundle.
            $fallback = null;
            foreach ($manifest as $manifestItem) {
                if (!is_array($manifestItem)) {
                    continue;
                }
                $name = $manifestItem['name'] ?? null;
                if ($name !== $entryName) {
                    continue;
                }
                if (!isset($manifestItem['file'])) {
                    continue;
                }
                $url = '/assets/' . ltrim((string) $manifestItem['file'], '/');
                if (!empty($manifestItem['isEntry'])) {
                    return $url;
                }
                if ($fallback === null) {
                    $fallback = $url;
                }
            }
            if ($fallback !== null) {
                return $fallback;
            }
        }

        if ($ext === 'js') {
            return '/js/' . $logicalAsset;
        }

        return '/' . $logicalAsset;
    }

    /**
     * @param  array<string, array<string, mixed>>  $manifest
     */
    private function findViteEntryKey(array $manifest, string $entryName): ?string
    {
        foreach ($manifest as $key => $item) {
            if (!is_array($item)) {
                continue;
            }
            if (($item['name'] ?? null) !== $entryName) {
                continue;
            }
            if (empty($item['isEntry'])) {
                continue;
            }

            return is_string($key) ? $key : null;
        }

        return null;
    }

    /**
     * @param  array<string, array<string, mixed>>  $manifest
     * @param  array<string, true>  $visited
     * @return list<string>
     */
    private function collectCssUrlsForChunk(array $manifest, string $chunkKey, array &$visited): array
    {
        if (isset($visited[$chunkKey])) {
            return [];
        }
        $visited[$chunkKey] = true;

        $item = $manifest[$chunkKey] ?? null;
        if (!is_array($item)) {
            return [];
        }

        $urls = [];
        foreach ($item['imports'] ?? [] as $importKey) {
            if (!is_string($importKey)) {
                continue;
            }
            $urls = array_merge($urls, $this->collectCssUrlsForChunk($manifest, $importKey, $visited));
        }
        foreach ($item['css'] ?? [] as $file) {
            if (!is_string($file) || $file === '') {
                continue;
            }
            $urls[] = '/assets/' . ltrim($file, '/');
        }

        return $urls;
    }

    /**
     * Fallback when no `isEntry` row matches (older manifests / misconfiguration).
     *
     * @param  array<string, array<string, mixed>>  $manifest
     * @return list<string>
     */
    private function viteLegacySingleCssUrl(array $manifest, string $logicalAsset, string $entryName): array
    {
        foreach ($manifest as $manifestItem) {
            if (!is_array($manifestItem)) {
                continue;
            }
            if (($manifestItem['name'] ?? null) !== $entryName) {
                continue;
            }
            $css = $manifestItem['css'] ?? null;
            if (is_array($css) && $css !== [] && is_string($css[0])) {
                return ['/assets/' . ltrim($css[0], '/')];
            }
        }

        $fallback = '/css/' . $logicalAsset;

        return file_exists($this->webrootPath($fallback)) ? [$fallback] : [];
    }

    private function webrootPath(string $webPath): string
    {
        $trim = ltrim($webPath, '/');
        if (class_exists(Craft::class, false)) {
            try {
                return Craft::getAlias('@webroot') . '/' . $trim;
            } catch (\Throwable) {
                // fall through
            }
        }

        return dirname(__DIR__, 3) . '/web/' . $trim;
    }

    private function getManifest(): ?array
    {
        if (self::$manifestLoaded) {
            return self::$manifestCache;
        }

        self::$manifestLoaded = true;
        self::$manifestCache = null;

        $candidatePaths = [];

        $envPath = getenv('vite_MANIFEST_PATH');
        if (is_string($envPath) && $envPath !== '') {
            $candidatePaths[] = $envPath;
        }

        if (class_exists(Craft::class, false)) {
            $candidatePaths[] = Craft::getAlias('@webroot/assets/.vite/manifest.json');
            $candidatePaths[] = Craft::getAlias('@webroot/.vite/manifest.json');
        }

        $projectRootFallback = dirname(__DIR__, 3); // modules/vite_php/twig -> project root
        $candidatePaths[] = $projectRootFallback . '/web/assets/.vite/manifest.json';

        foreach ($candidatePaths as $path) {
            if (!is_string($path) || !file_exists($path)) {
                continue;
            }

            $raw = file_get_contents($path);
            if (!is_string($raw)) {
                continue;
            }

            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                self::$manifestCache = $decoded;
                return self::$manifestCache;
            }
        }

        return null;
    }
}
