<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QcInspection extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'qc_id',
        'result',
        'notes',
        'failed_job_treatment_id',
        'inspected_at',
    ];

    protected $casts = [
        'inspected_at' => 'datetime',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function qc()
    {
        return $this->belongsTo(User::class, 'qc_id');
    }

    public function failedJobTreatment()
    {
        return $this->belongsTo(JobTreatment::class, 'failed_job_treatment_id');
    }

    /**
     * Treatment yang gagal pada pemeriksaan ini (multi-treatment).
     */
    public function failedTreatments()
    {
        return $this->hasMany(QcInspectionFailedTreatment::class, 'qc_inspection_id');
    }

    public function reworks()
    {
        return $this->hasMany(JobTreatmentRework::class, 'qc_inspection_id');
    }

    public function documents()
    {
        return $this->hasMany(JobDocument::class);
    }
}
