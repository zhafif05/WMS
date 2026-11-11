<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkerTreatmentSkill extends Model
{
    use HasFactory;

    protected $fillable = [
        'worker_id',
        'treatment_id',
    ];

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }
}
