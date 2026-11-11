<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QcInspectionFailedTreatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'qc_inspection_id',
        'job_treatment_id',
        'failure_notes',
    ];

    public function inspection()
    {
        return $this->belongsTo(QcInspection::class, 'qc_inspection_id');
    }

    public function jobTreatment()
    {
        return $this->belongsTo(JobTreatment::class, 'job_treatment_id');
    }
}
