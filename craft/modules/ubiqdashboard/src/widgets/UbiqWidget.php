<?php

namespace ubiq\widgets;

use Craft;
use craft\base\Widget;

class UbiqWidget extends Widget
{

    /**
     * @var string|null The template
     */
    public $template;

    /**
     * @var string|null The title
     */
    public $title;


    /**
     * @inheritdoc
     */
    public function init(): void {
        parent::init();
    }

    /**
     * @inheritdoc
     */
    protected function defineRules(): array
    {
        $rules = parent::defineRules();
        $rules[] = [['template', 'title'], 'required'];
        return $rules;
    }

    /**
     * @inheritdoc
     */
    public function getSettingsHtml(): ?string {
        return '
        <div class="field">
            <div class="heading">
                <label class="required" for="title">Titel</label>
            </div>
            <div class="input ltr">
                <input type="text" id="title" class="text fullwidth" name="title" autocomplete="off" dir="ltr" aria-required="true">
            </div>    
        </div>
        <div class="field">
            <div class="heading">
                <label class="required" for="template">Template</label>
            </div>
            <div class="input ltr">
                <input type="text" id="template" class="text fullwidth" name="template" autocomplete="off" dir="ltr" aria-required="true">
            </div>    
        </div>
        ';
    }

    public static function displayName(): string {
        return "UBIQ";
    }

    public function getTitle(): string {
        return $this->title;
    }

    public static function ClassName(): string {
        return "test";
    }

    public function getBodyHtml(): string {
        if (file_exists(__DIR__ . '/_templates/'.$this->template)) {
            return file_get_contents(__DIR__ . '/_templates/'.$this->template);
        }

        return "";
    }
}

?>