<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'role',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isWorker(): bool
    {
        return $this->role === 'worker';
    }

    public function isQc(): bool
    {
        return $this->role === 'qc';
    }

    public function jobsCreated()
    {
        return $this->hasMany(Job::class, 'created_by');
    }

    public function jobTreatments()
    {
        return $this->hasMany(JobTreatment::class, 'worker_id');
    }

    /**
     * Kompetensi Treatment milik Worker (many-to-many).
     */
    public function treatmentSkills()
    {
        return $this->belongsToMany(
            Treatment::class,
            'worker_treatment_skills',
            'worker_id',
            'treatment_id'
        )->withTimestamps();
    }

    public function hasTreatmentSkill($treatmentId): bool
    {
        if (! $treatmentId) {
            return false;
        }

        if ($this->relationLoaded('treatmentSkills')) {
            return $this->treatmentSkills
                ->contains(fn ($treatment) => (int) $treatment->id === (int) $treatmentId);
        }

        return $this->treatmentSkills()
            ->where('treatments.id', $treatmentId)
            ->exists();
    }

    public function treatmentLogs()
    {
        return $this->hasMany(TreatmentLog::class, 'worker_id');
    }

    public function qcInspections()
    {
        return $this->hasMany(QcInspection::class, 'qc_id');
    }

    public function jobEvents()
    {
        return $this->hasMany(JobEvent::class, 'user_id');
    }

    public function jobDocuments()
    {
        return $this->hasMany(JobDocument::class, 'uploaded_by');
    }
}
