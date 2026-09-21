<?php

namespace App\Models\Filters;

use EloquentFilter\ModelFilter;

class OrderFilter extends ModelFilter
{
    public function status($statuses)
    {
        $this->where(function ($query) use ($statuses) {
            foreach ($statuses as $status) {
                switch ($status) {
                    case 'CONTRACT':
                        $query->orWhere(function ($query) {
                            $query->whereNull('contract_signed_at')
                                ->whereNull('car_transferred_at')
                                ->whereNull('payment_received_at');
                        });
                        break;
                    case 'CAR':
                        $query->orWhere(function ($query) {
                            $query->whereNull('car_transferred_at')
                                ->whereNotNull('contract_signed_at');
                        });
                        break;
                    case 'PAYMENT':
                        $query->orWhere(function ($query) {
                            $query->whereNull('payment_received_at')
                                ->whereNotNull('contract_signed_at');
                        });
                        break;
                    case 'DONE':
                        $query->orWhereNotNull('contract_signed_at')
                            ->whereNotNull('car_transferred_at')
                            ->whereNotNull('payment_received_at');
                        break;
                }
            }
        });
    }
}
