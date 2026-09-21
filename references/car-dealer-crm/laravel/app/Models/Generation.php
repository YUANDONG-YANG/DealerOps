<?php

namespace App\Models;

use App\Traits\SearchTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Generation extends Model
{
    use HasFactory, SearchTrait;

    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'from',
        'to',
        'number',
        'restyling',
        'model_id',
    ];

    protected $dates = [
        'from',
        'to'
    ];

    public function model()
    {
        return $this->belongsTo('App\Models\Model');
    }
}
