<?php

namespace App\Models\Filters;

use EloquentFilter\ModelFilter;

class SupplyFilter extends ModelFilter
{
    public function status($status)
    {
        switch ($status) {
            case 'OPEN':
                $this->whereNull('supplier_id');
                break;
            case 'WAITING':
                $this->whereNotNull('supplier_id')
                    ->whereNull('supplied_at');
                break;
            case 'DONE':
                $this->whereNotNull('supplied_at');
                break;
        }
    }
}
