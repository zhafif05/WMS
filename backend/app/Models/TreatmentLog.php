<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TreatmentLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_treatment_id',
        'worker_id',
        'action_type',
        'activity_source',
        'notes',
    ];

    public const SOURCE_INTERNAL = 'internal';
    public const SOURCE_VENDOR_COORDINATION = 'vendor_coordination';
    public const SOURCE_VENDOR_PROGRESS = 'vendor_progress';
    public const SOURCE_VENDOR_DOCUMENTATION = 'vendor_documentation';
    public const SOURCE_VENDOR_VERIFICATION = 'vendor_verification';
    public const SOURCE_INTERNAL_DOCUMENTATION = 'internal_documentation';
    public const SOURCE_REWORK = 'rework';

    public function jobTreatment()
    {
        return $this->belongsTo(JobTreatment::class);
    }

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function documents()
    {
        return $this->hasMany(JobDocument::class);
    }
}
