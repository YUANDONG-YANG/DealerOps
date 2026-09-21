<?php

namespace App\Models\Filters;

use EloquentFilter\ModelFilter;

class RequestFilter extends ModelFilter
{
    public function status($status)
    {
        $this->where('status', '=', $status);
    }
}
