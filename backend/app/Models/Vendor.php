<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_name',
        'contact_person',
        'phone',
        'email',
        'address',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function jobTreatments()
    {
        return $this->hasMany(JobTreatment::class);
    }

    /**
     * Jenis Treatment yang dapat ditangani Vendor ini.
     */
    public function treatments()
    {
        return $this->belongsToMany(
            Treatment::class,
            'vendor_treatments',
            'vendor_id',
            'treatment_id'
        )->withTimestamps();
    }

    public function hasTreatment($treatmentId): bool
    {
        if (! $treatmentId) {
            return false;
        }

        if ($this->relationLoaded('treatments')) {
            return $this->treatments
                ->contains(fn ($treatment) => (int) $treatment->id === (int) $treatmentId);
        }

        return $this->treatments()
            ->where('treatments.id', $treatmentId)
            ->exists();
    }
}
