<?php

namespace App\Observers;

use App\Models\Order;

class OrderObserver
{
    public function created(Order $order): void
    {
        if ($order->getOriginal('contract_signed_at') != $order->contract_signed_at && $order->contract_signed_at !== null) {
            $order->car()->update(['status' => 'SOLD']);
        }
    }
    public function updated(Order $order): void
    {
        if ($order->getOriginal('contract_signed_at') != $order->contract_signed_at && $order->contract_signed_at !== null) {
            $order->car()->update(['status' => 'SOLD']);
        }
    }
}
