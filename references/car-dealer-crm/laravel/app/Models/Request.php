<?php

namespace App\Models;

use App\Traits\SearchTrait;
use EloquentFilter\Filterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Request extends Model
{
    use HasFactory, SearchTrait, Filterable;

    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'phone',
        'status',
        'user_id',
        'car_id',
        'comment'
    ];

    public function car()
    {
        return $this->belongsTo('App\Models\Car');
    }

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }
}
