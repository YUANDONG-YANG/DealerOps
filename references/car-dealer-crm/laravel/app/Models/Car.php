<?php

namespace App\Models;

use App\Traits\SearchTrait;
use EloquentFilter\Filterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model as EModel;

class Car extends EModel
{
    use HasFactory, SearchTrait, Filterable;

    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'price',
        'status',
        'vin',
        'chassis_number',
        'body_number',
        'mileage',
        'color',
        'state_number',
        'pts_series',
        'pts_number',
        'pts_issued_by',
        'pts_issued_at',
        'sts_series',
        'sts_number',
        'sts_issued_by',
        'sts_issued_at',
        'supply_id',
        'release_date',
    ];

    protected $dates = [
        'release_date',
    ];

    public function supply()
    {
        return $this->belongsTo('App\Models\Supply');
    }

    public function photos()
    {
        return $this->hasMany('App\Models\CarPhoto');
    }
}
