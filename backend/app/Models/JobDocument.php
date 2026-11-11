<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_id',
        'treatment_log_id',
        'qc_inspection_id',
        'uploaded_by',
        'file_name',
        'file_path',
        'file_type',
        'file_size',
        'description',
    ];

    public function job()
    {
        return $this->belongsTo(Job::class);
    }

    public function treatmentLog()
    {
        return $this->belongsTo(TreatmentLog::class);
    }

    public function qcInspection()
    {
        return $this->belongsTo(QcInspection::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
