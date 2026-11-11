<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Riwayat siklus rework per Treatment.
     * Tabel ini bukan pengganti job_treatments: job_treatments tetap
     * menyimpan state pengerjaan terkini, sedangkan tabel ini menyimpan
     * setiap siklus rework yang dipicu oleh pemeriksaan QC.
     */
    public function up(): void
    {
        Schema::create('job_treatment_reworks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_treatment_id')->constrained('job_treatments')->cascadeOnDelete();
            $table->foreignId('qc_inspection_id')->nullable()->constrained('qc_inspections')->nullOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['job_treatment_id', 'status']);
            $table->index('qc_inspection_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_treatment_reworks');
    }
};
