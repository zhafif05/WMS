<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_code',
        'item_name',
        'brand',
        'model',
        'serial_number',
        'description',
    ];

    public function jobs()
    {
        return $this->hasMany(Job::class);
    }
}
