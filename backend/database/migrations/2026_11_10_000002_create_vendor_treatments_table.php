<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kompetensi Vendor terhadap jenis Treatment (many-to-many).
     */
    public function up(): void
    {
        Schema::create('vendor_treatments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
            $table->foreignId('treatment_id')->constrained('treatments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['vendor_id', 'treatment_id'], 'vendor_treatment_unique');
            $table->index('treatment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendor_treatments');
    }
};
