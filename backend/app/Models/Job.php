<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Job extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_number',
        'item_id',
        'created_by',
        'problem_description',
        'initial_condition',
        'analysis',
        'received_at',
        'status',
    ];

    protected $casts = [
        'received_at' => 'datetime',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function qrCode()
    {
        return $this->hasOne(QrCode::class);
    }

    public function jobTreatments()
    {
        return $this->hasMany(JobTreatment::class)->orderBy('sequence');
    }

    /**
     * Treatment yang sedang aktif pada Job ini.
     * Serial execution: maksimal satu treatment aktif per Job.
     */
    public function activeTreatment()
    {
        return $this->hasOne(JobTreatment::class)
            ->whereNotNull('started_at')
            ->whereNull('completed_at')
            ->latest('started_at');
    }

    public function qcInspections()
    {
        return $this->hasMany(QcInspection::class)->latest();
    }

    public function jobEvents()
    {
        return $this->hasMany(JobEvent::class)->latest();
    }

    public function jobDocuments()
    {
        return $this->hasMany(JobDocument::class)->latest();
    }

    /**
     * Riwayat siklus rework seluruh Treatment pada Job ini.
     */
    public function jobTreatmentReworks()
    {
        return $this->hasManyThrough(
            JobTreatmentRework::class,
            JobTreatment::class,
            'job_id',
            'job_treatment_id',
            'id',
            'id'
        )->latest('job_treatment_reworks.created_at');
    }
}
