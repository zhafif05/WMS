<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QrCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'token',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class);
    }
}
