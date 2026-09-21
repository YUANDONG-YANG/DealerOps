<?php

namespace App\Models;

use App\Traits\SearchTrait;
use EloquentFilter\Filterable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model as EModel;

class Order extends EModel
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
        'car_id',
        'customer_id',
        'user_id',
        'created_at',
        'contract_signed_at',
        'car_transferred_at',
        'payment_received_at',
        'comment'
    ];

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    public function car()
    {
        return $this->belongsTo('App\Models\Car');
    }

    public function customer()
    {
        return $this->belongsTo('App\Models\Customer');
    }
}
