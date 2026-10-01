<?php

namespace modules\headless\cache_revalidation;

use Craft;
use craft\base\ElementInterface;
use craft\elements\Asset;
use craft\elements\Entry;
use craft\elements\GlobalSet;
use craft\helpers\ElementHelper;
use Throwable;

class CacheTagBuilder
{
    public static function before(ElementInterface $element): ?array
    {
        if (!$element instanceof Entry && !$element instanceof GlobalSet && !$element instanceof Asset) {
            return ['tags' => [], 'links' => null];
        }
        if (!$element->id) return ['tags' => [], 'links' => null];
        try {
            $stored = $element::find()->id($element->id)->siteId($element->siteId)
                ->status(null)->drafts(null)->provisionalDrafts(null)->revisions(null)->trashed(null)->one();
            return $stored ? self::snapshot($stored) : null;
        } catch (Throwable) {
            return null;
        }
    }

    public static function forChange(ElementInterface $element, ?array $before, bool $identityChange = false): array
    {
        $after = self::snapshot($element);
        if (!$after['tags'] && empty($before['tags'])) return [];
        if ($before === null) return self::fallback('Missing persisted change state.');
        $tags = [...$before['tags'], ...$after['tags']];
        if (($before['links'] !== null || $after['links'] !== null)
            && ($identityChange || $before['links'] !== $after['links'])) {
            $tags[] = 'craft:entry-links';
        }
        return self::normalize($tags);
    }

    public static function snapshot(ElementInterface $element): array
    {
        $tags = self::forElement($element);
        $links = null;
        if ($tags && $element instanceof Entry && !$element->fieldId) {
            $links = [
                $element->title, $element->uri, $element->sectionId, $element->typeId,
                $element->enabled, $element->getEnabledForSite(),
                $element->postDate?->getTimestamp(), $element->expiryDate?->getTimestamp(),
            ];
        }
        return ['tags' => $tags, 'links' => $links];
    }

    /** @return string[] */
    public static function forElement(ElementInterface $element, array $ancestors = []): array
    {
        if (ElementHelper::isDraftOrRevision($element)) return [];
        if (!$element instanceof Entry && !$element instanceof GlobalSet && !$element instanceof Asset) return [];
        // Existing URI tags are not site-qualified. Keep propagation conservative.
        if (Craft::$app->getIsMultiSite()) return self::fallback('Multi-site mutation.');
        if ($element instanceof Asset) return ['craft:assets'];
        if ($element instanceof GlobalSet) return ['craft:globals'];

        $identity = ($element->id ?: $element->uid) . ':' . $element->siteId;
        if (isset($ancestors[$identity])) return self::fallback('Cyclic nested ownership.');
        $ancestors[$identity] = true;
        if ($element->fieldId) {
            try {
                $owners = $element->getOwners();
                // Include the current owner even if Craft cached the ownership
                // collection before an entry was moved.
                if ($owner = $element->getOwner()) $owners[] = $owner;
                if (!$owners) return self::fallback('Unresolved nested ownership.');
                $tags = [];
                foreach ($owners as $owner) {
                    if (!$owner instanceof Entry && !$owner instanceof GlobalSet) {
                        return self::fallback('Unsupported nested owner.');
                    }
                    array_push($tags, ...self::forElement($owner, $ancestors));
                }
                return self::normalize($tags);
            } catch (Throwable) {
                return self::fallback('Could not resolve nested owners.');
            }
        }

        try {
            $section = $element->getSection()?->handle;
        } catch (Throwable) {
            return self::fallback('Could not resolve entry section.');
        }
        $tags = $element->uri ? ["craft:entry-uri:$element->uri"] : [];
        $family = match ($section) {
            'pages' => null,
            'news' => 'craft:news',
            'navigations' => 'craft:navigation',
            'reusableSections' => 'craft:section:reusablesections',
            default => 'craft',
        };
        if ($family) $tags[] = $family;
        // A page without a URI may still affect embedded links.
        if (!$tags) $tags[] = 'craft:entry-links';
        return self::normalize($tags);
    }

    /** @param string[] $tags */
    public static function normalize(array $tags): array
    {
        $normalized = [];
        foreach ($tags as $tag) {
            $tag = strtolower(trim($tag));
            $tag = preg_replace('/\s+/', '-', $tag) ?? '';
            $tag = preg_replace('/[^a-z0-9:_-]/', '-', $tag) ?? '';
            $tag = preg_replace('/-+/', '-', $tag) ?? '';
            $tag = trim($tag, '-:_');
            if ($tag === '' || strlen($tag) > 256) return self::fallback('Unrepresentable cache tag.');
            $normalized[$tag] = true;
        }
        if (count($normalized) > 128) return self::fallback('Cache tag limit exceeded.');
        return isset($normalized['craft']) ? ['craft'] : array_keys($normalized);
    }

    private static function fallback(string $reason): array
    {
        Craft::info('Full Craft cache invalidation: ' . $reason, __METHOD__);
        return ['craft'];
    }
}
