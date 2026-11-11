<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTreatmentRework extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_treatment_id',
        'qc_inspection_id',
        'worker_id',
        'reason',
        'status',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    protected $appends = [
        'treatment_name',
        'worker_name',
        'job_number',
        'worker_is_competent',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';

    public function jobTreatment()
    {
        return $this->belongsTo(JobTreatment::class);
    }

    public function inspection()
    {
        return $this->belongsTo(QcInspection::class, 'qc_inspection_id');
    }

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeInProgress($query)
    {
        return $query->where('status', self::STATUS_IN_PROGRESS);
    }

    public function getTreatmentNameAttribute(): ?string
    {
        return $this->jobTreatment?->treatment?->treatment_name;
    }

    public function getWorkerNameAttribute(): ?string
    {
        return $this->worker?->name ?? $this->jobTreatment?->worker?->name;
    }

    public function getJobNumberAttribute(): ?string
    {
        return $this->jobTreatment?->job?->job_number;
    }

    /**
     * Dipakai Admin untuk meninjau apakah PIC saat ini masih kompeten.
     * Jika tidak, PIC tidak diganti otomatis; Admin harus menetapkan PIC baru.
     */
    public function getWorkerIsCompetentAttribute(): ?bool
    {
        $treatment = $this->jobTreatment;

        if (! $treatment) {
            return null;
        }

        $worker = $treatment->worker;

        if (! $worker) {
            return false;
        }

        return $worker->hasTreatmentSkill($treatment->treatment_id);
    }
}
