<?php

namespace App\Models;

use App\Traits\SearchTrait;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory, SearchTrait;

    public $timestamps = false;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'comment',
    ];
}
