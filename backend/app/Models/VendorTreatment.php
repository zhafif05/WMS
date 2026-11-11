<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VendorTreatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_id',
        'treatment_id',
    ];

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function treatment()
    {
        return $this->belongsTo(Treatment::class);
    }
}
