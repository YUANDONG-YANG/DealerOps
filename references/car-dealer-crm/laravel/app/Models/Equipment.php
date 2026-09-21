<?php

namespace App\Models;

use App\Traits\SearchTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model as EModel;

class Equipment extends EModel
{
    use HasFactory, SearchTrait;

    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'type',
        'max_speed',
        'acceleration_time',
        'doors_count',
        'seats_count',
        'length',
        'width',
        'height',
        'fuel_consumption_90',
        'fuel_consumption_120',
        'fuel_consumption_city',
        'body',
        'tires_name',
        'generation_id',
        'engine_id'
    ];

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'equipments';

    public function generation()
    {
        return $this->belongsTo('App\Models\Generation');
    }

    public function supplies()
    {
        return $this->hasMany('App\Models\Supply');
    }

    public function engine()
    {
        return $this->belongsTo('App\Models\Engine');
    }
}
