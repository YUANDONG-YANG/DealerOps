<?php

namespace App\Models;

use App\Traits\SearchTrait;
use EloquentFilter\Filterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model as EModel;

class Supply extends EModel
{
    use HasFactory, SearchTrait, Filterable;

    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'price',
        'equipment_id',
        'supplier_id',
        'created_at',
        'supplied_at',
    ];

    protected $dates = [
        'created_at',
        'supplied_at'
    ];

    public function supplier()
    {
        return $this->belongsTo('App\Models\Supplier');
    }

    public function equipment()
    {
        return $this->belongsTo('App\Models\Equipment');
    }

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    public function car()
    {
        return $this->hasOne('App\Models\Car');
    }
}
