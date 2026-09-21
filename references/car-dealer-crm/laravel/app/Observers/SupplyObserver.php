<?php

namespace App\Observers;

use App\Models\Supply;

class SupplyObserver
{
    public function updated(Supply $supply): void
    {
        if ($supply->getOriginal('supplied_at') != $supply->supplied_at && $supply->supplied_at !== null) {
            $supply->car()->update(['status' => 'present']);
        }
    }
}
