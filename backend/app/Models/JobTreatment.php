<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobTreatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'treatment_id',
        'worker_id',
        'vendor_id',
        'execution_type',
        'sequence',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Status pengerjaan treatment diturunkan dari started_at/completed_at.
     * Tidak ada kolom status tambahan agar tidak ada data redundan.
     *
     * treatment_name/worker_name disertakan sebagai alias datar agar payload
     * active_treatment konsisten dipakai frontend tanpa harus menelusuri
     * relasi bertingkat.
     */
    protected $appends = ['status', 'treatment_name', 'worker_name'];

    public const EXECUTION_INTERNAL = 'internal';
    public const EXECUTION_VENDOR = 'vendor';

    public const STATUS_PENDING = 'pending';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_COMPLETED = 'completed';

    public function getStatusAttribute(): string
    {
        if ($this->completed_at) {
            return self::STATUS_COMPLETED;
        }

        if ($this->started_at) {
            return self::STATUS_IN_PROGRESS;
        }

        return self::STATUS_PENDING;
    }

    public function isInProgress(): bool
    {
        return $this->started_at !== null && $this->completed_at === null;
    }

    public function getTreatmentNameAttribute(): ?string
    {
        return $this->treatment?->treatment_name;
    }

    public function getWorkerNameAttribute(): ?string
    {
        return $this->worker?->name;
    }

    public function scopeActive($query)
    {
        return $query->whereNotNull('started_at')->whereNull('completed_at');
    }

    public function scopeInternal($query)
    {
        return $query->where('execution_type', self::EXECUTION_INTERNAL);
    }

    public function scopeVendor($query)
    {
        return $query->where('execution_type', self::EXECUTION_VENDOR);
    }

    public function isVendor(): bool
    {
        return $this->execution_type === self::EXECUTION_VENDOR;
    }

    public function isInternal(): bool
    {
        return $this->execution_type === self::EXECUTION_INTERNAL;
    }

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function treatmentLogs()
    {
        return $this->hasMany(TreatmentLog::class)->latest();
    }

    public function failedInspections()
    {
        return $this->hasMany(QcInspection::class, 'failed_job_treatment_id');
    }

    public function failedTreatmentRecords()
    {
        return $this->hasMany(QcInspectionFailedTreatment::class, 'job_treatment_id');
    }

    /**
     * Seluruh siklus rework untuk treatment ini.
     */
    public function reworks()
    {
        return $this->hasMany(JobTreatmentRework::class)->latest();
    }

    public function activeRework()
    {
        return $this->hasOne(JobTreatmentRework::class)
            ->whereIn('status', [
                JobTreatmentRework::STATUS_PENDING,
                JobTreatmentRework::STATUS_IN_PROGRESS,
            ])
            ->latest('id');
    }
}
