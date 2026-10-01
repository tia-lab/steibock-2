<?php

namespace ubiq\editorialpermissions\assetbundles;

use craft\web\AssetBundle;
use craft\web\assets\matrix\MatrixAsset;

final class EditorAsset extends AssetBundle
{
    public function init(): void
    {
        $this->sourcePath = __DIR__ . '/resources';
        $this->depends = [MatrixAsset::class];
        $this->js = ['editor.js'];
        parent::init();
    }
}
