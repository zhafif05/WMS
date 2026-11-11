<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Satu pemeriksaan QC dapat menandai banyak Treatment gagal,
     * masing-masing dengan alasan ketidaksesuaian sendiri.
     */
    public function up(): void
    {
        Schema::create('qc_inspection_failed_treatments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('qc_inspection_id')->constrained('qc_inspections')->cascadeOnDelete();
            $table->foreignId('job_treatment_id')->constrained('job_treatments')->cascadeOnDelete();
            $table->text('failure_notes')->nullable();
            $table->timestamps();

            $table->unique(['qc_inspection_id', 'job_treatment_id'], 'qc_failed_treatment_unique');
            $table->index('job_treatment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_inspection_failed_treatments');
    }
};
