<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Treatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'treatment_name',
        'description',
        'estimated_duration',
    ];

    public function jobTreatments()
    {
        return $this->hasMany(JobTreatment::class);
    }

    /**
     * Worker yang memiliki kompetensi pada Treatment ini.
     */
    public function workers()
    {
        return $this->belongsToMany(
            User::class,
            'worker_treatment_skills',
            'treatment_id',
            'worker_id'
        )->withTimestamps();
    }

    /**
     * Vendor yang memiliki kompetensi pada Treatment ini.
     */
    public function vendors()
    {
        return $this->belongsToMany(
            Vendor::class,
            'vendor_treatments',
            'treatment_id',
            'vendor_id'
        )->withTimestamps();
    }
}
