<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kompetensi Worker terhadap jenis Treatment (many-to-many).
     * Hanya Admin yang mengelola tabel ini melalui API.
     */
    public function up(): void
    {
        Schema::create('worker_treatment_skills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('treatment_id')->constrained('treatments')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['worker_id', 'treatment_id'], 'worker_treatment_unique');
            $table->index('treatment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('worker_treatment_skills');
    }
};
