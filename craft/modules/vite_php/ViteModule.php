<?php

namespace modules\vite_php;

use modules\vite_php\twig\ViteManifestExtension;
use yii\base\Event;
use yii\base\Module;

class ViteModule extends Module
{
    public function init()
    {
        parent::init();

        Event::on(
            'craft\web\View',
            'afterCreateTwig',
            static function ($event) {
                /** @var \craft\events\CreateTwigEvent $event */
                $event->twig->addExtension(new ViteManifestExtension());
            }
        );
    }
}

