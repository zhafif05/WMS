<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill data lama secara aman:
     * - Kolom lama qc_inspections.failed_job_treatment_id tetap dipertahankan.
     * - Setiap nilai lama disalin ke qc_inspection_failed_treatments.
     * - Riwayat rework lama dibuat sebagai siklus historis agar tetap terlihat
     *   di daftar Rework Admin/Worker.
     */
    public function up(): void
    {
        $inspections = DB::table('qc_inspections')
            ->whereNotNull('failed_job_treatment_id')
            ->orderBy('id')
            ->get();

        foreach ($inspections as $inspection) {
            $treatment = DB::table('job_treatments')
                ->where('id', $inspection->failed_job_treatment_id)
                ->first();

            if (! $treatment) {
                continue;
            }

            $alreadyBackfilled = DB::table('qc_inspection_failed_treatments')
                ->where('qc_inspection_id', $inspection->id)
                ->where('job_treatment_id', $treatment->id)
                ->exists();

            if (! $alreadyBackfilled) {
                DB::table('qc_inspection_failed_treatments')->insert([
                    'qc_inspection_id' => $inspection->id,
                    'job_treatment_id' => $treatment->id,
                    'failure_notes' => $inspection->notes,
                    'created_at' => $inspection->created_at ?? now(),
                    'updated_at' => $inspection->updated_at ?? now(),
                ]);
            }

            $job = DB::table('jobs')->where('id', $inspection->job_id)->first();
            $jobIsInRework = $job && in_array($job->status, ['rework', 'treatment'], true);

            if ($treatment->completed_at) {
                $status = 'completed';
                $startedAt = $treatment->started_at ?? $inspection->inspected_at;
                $completedAt = $treatment->completed_at ?? $inspection->inspected_at;
            } elseif ($jobIsInRework && $treatment->started_at) {
                $status = 'in_progress';
                $startedAt = $treatment->started_at;
                $completedAt = null;
            } elseif ($jobIsInRework) {
                $status = 'pending';
                $startedAt = null;
                $completedAt = null;
            } else {
                $status = 'completed';
                $startedAt = $inspection->inspected_at;
                $completedAt = $inspection->inspected_at;
            }

            $reworkExists = DB::table('job_treatment_reworks')
                ->where('job_treatment_id', $treatment->id)
                ->where('qc_inspection_id', $inspection->id)
                ->exists();

            if (! $reworkExists) {
                DB::table('job_treatment_reworks')->insert([
                    'job_treatment_id' => $treatment->id,
                    'qc_inspection_id' => $inspection->id,
                    'worker_id' => $treatment->worker_id,
                    'reason' => $inspection->notes,
                    'status' => $status,
                    'started_at' => $startedAt,
                    'completed_at' => $completedAt,
                    'created_at' => $inspection->created_at ?? now(),
                    'updated_at' => $inspection->updated_at ?? now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Backfill tidak dihapus otomatis agar riwayat data lama tetap aman.
    }
};
