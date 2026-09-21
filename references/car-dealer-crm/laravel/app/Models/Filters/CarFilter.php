<?php

namespace App\Models\Filters;

use EloquentFilter\ModelFilter;

class CarFilter extends ModelFilter
{
    public function generation($id)
    {
        $this->whereHas('supply', function ($q) use ($id) {
            $q->whereHas('equipment', function ($q) use ($id) {
                $q->where('generation_id', '=', $id);
            });
        });
    }

    public function model($id)
    {
        $this->whereHas('supply', function ($q) use ($id) {
            $q->whereHas('equipment', function ($q) use ($id) {
                $q->whereHas('generation', function ($q) use ($id) {
                    $q->where('model_id', '=', $id);
                });
            });
        });
    }

    public function brand($id)
    {
        $this->whereHas('supply', function ($q) use ($id) {
            $q->whereHas('equipment', function ($q) use ($id) {
                $q->whereHas('generation', function ($q) use ($id) {
                    $q->whereHas('model', function ($q) use ($id) {
                        $q->where('brand_id', '=', $id);
                    });
                });
            });
        });
    }

    public function yearFrom($year)
    {
        $this->where('release_date', '>=', $year);
    }

    public function yearTo($year)
    {
        $this->where('release_date', '<=', $year);
    }

    public function priceFrom($price)
    {
        $this->where('price', '>=', $price);
    }

    public function priceTo($price)
    {
        $this->where('price', '<=', $price);
    }

    public function status($status)
    {
        $this->where('status', '=', $status);
    }
}
