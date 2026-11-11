<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qc_inspections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_id')->constrained('jobs')->cascadeOnDelete();
            $table->foreignId('qc_id')->constrained('users')->cascadeOnDelete();
            $table->enum('result', ['sesuai', 'tidak_sesuai'])->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('failed_job_treatment_id')->nullable()->constrained('job_treatments')->nullOnDelete();
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_inspections');
    }
};
