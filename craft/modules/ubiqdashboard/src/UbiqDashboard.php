<?php

/**
 *
 * UBIQ Dashboard 
 *
 * @link      https://ubiq.swiss
 * @copyright Copyright (c) 2021 UBIQ AG
 */

namespace ubiq;

use Craft;
use craft\services\Dashboard;
use craft\events\RegisterComponentTypesEvent;
use yii\base\Event;
use yii\base\Module;
use ubiq\widgets\UbiqWidget;

class UbiqDashboard extends Module
{

    /**
     * Initialize module components, etc.
     */
    public function init()
    {
        Craft::setAlias('@ubiq', __DIR__);

        parent::init();
        
        $this->_registerWidgets();

    }

    private function _registerWidgets()
    {
        
        Event::on(
            Dashboard::class,
            Dashboard::EVENT_REGISTER_WIDGET_TYPES,
            function(RegisterComponentTypesEvent $event) {
                $event->types[] = UbiqWidget::class;
            }
        );
        
    }


}
