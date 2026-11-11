<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Revisi penugasan treatment:
     * - Menambahkan execution_type (internal/vendor).
     * - Menambahkan activity_source pada treatment_logs.
     * - Menyesuaikan data lama yang belum memiliki worker PIC secara aman.
     * - Menjadikan worker_id wajib (NOT NULL) setelah data aman.
     */
    public function up(): void
    {
        // ============================================================
        // 1. Penyesuaian data lama: isi worker_id hanya jika aman.
        //    Aturan: gunakan satu-satunya Worker PIC pada Job yang sama.
        //    Jika tetap ambigu, migration dihentikan agar Admin mengisi manual.
        // ============================================================
        $backfilledAssignments = [];

        $legacyTreatments = DB::table('job_treatments')
            ->whereNull('worker_id')
            ->orderBy('id')
            ->get();

        foreach ($legacyTreatments as $legacy) {
            $candidateWorkerIds = DB::table('job_treatments')
                ->where('job_id', $legacy->job_id)
                ->whereNotNull('worker_id')
                ->distinct()
                ->pluck('worker_id');

            // Hanya backfill jika Job tersebut sudah memiliki tepat satu PIC.
            if ($candidateWorkerIds->count() === 1) {
                $workerId = $candidateWorkerIds->first();

                DB::table('job_treatments')
                    ->where('id', $legacy->id)
                    ->update(['worker_id' => $workerId]);

                $backfilledAssignments[] = [
                    'job_treatment_id' => $legacy->id,
                    'job_id' => $legacy->job_id,
                    'worker_id' => $workerId,
                ];
            }
        }

        $remainingWithoutWorker = DB::table('job_treatments')
            ->whereNull('worker_id')
            ->count();

        if ($remainingWithoutWorker > 0) {
            throw new RuntimeException(
                "Migration dihentikan: terdapat {$remainingWithoutWorker} job_treatments tanpa worker_id. " .
                'Tetapkan Worker PIC secara manual terlebih dahulu. Sistem tidak akan mengisi penanggung jawab secara sembarangan.'
            );
        }

        // ============================================================
        // 2. Tambahkan execution_type dan backfill dari vendor_id.
        // ============================================================
        if (! Schema::hasColumn('job_treatments', 'execution_type')) {
            Schema::table('job_treatments', function (Blueprint $table) {
                $table->string('execution_type', 20)
                    ->default('internal')
                    ->after('vendor_id');
            });
        }

        DB::table('job_treatments')
            ->whereNotNull('vendor_id')
            ->update(['execution_type' => 'vendor']);

        DB::table('job_treatments')
            ->whereNull('vendor_id')
            ->update(['execution_type' => 'internal']);

        // ============================================================
        // 3. Tambahkan activity_source pada treatment_logs.
        // ============================================================
        if (! Schema::hasColumn('treatment_logs', 'activity_source')) {
            Schema::table('treatment_logs', function (Blueprint $table) {
                $table->string('activity_source', 40)
                    ->nullable()
                    ->after('action_type');
            });
        }

        $logs = DB::table('treatment_logs')
            ->join('job_treatments', 'job_treatments.id', '=', 'treatment_logs.job_treatment_id')
            ->select('treatment_logs.id', 'job_treatments.execution_type')
            ->get();

        foreach ($logs as $log) {
            DB::table('treatment_logs')
                ->where('id', $log->id)
                ->update([
                    'activity_source' => $log->execution_type === 'vendor'
                        ? 'vendor_progress'
                        : 'internal',
                ]);
        }

        // ============================================================
        // 4. worker_id menjadi NOT NULL.
        //    FK lama memakai ON DELETE SET NULL sehingga harus dibuat ulang.
        // ============================================================
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('job_treatments', function (Blueprint $table) {
                $table->dropForeign(['worker_id']);
            });

            DB::statement('ALTER TABLE `job_treatments` MODIFY `worker_id` BIGINT UNSIGNED NOT NULL');

            Schema::table('job_treatments', function (Blueprint $table) {
                $table->foreign('worker_id')
                    ->references('id')
                    ->on('users')
                    ->restrictOnDelete();
            });
        }

        // ============================================================
        // 5. Catat penyesuaian data ke audit trail job_events.
        // ============================================================
        foreach ($backfilledAssignments as $assignment) {
            $job = DB::table('jobs')->where('id', $assignment['job_id'])->first();
            $worker = DB::table('users')->where('id', $assignment['worker_id'])->first();

            if (! $job || ! $worker) {
                continue;
            }

            DB::table('job_events')->insert([
                'job_id' => $job->id,
                'user_id' => $job->created_by,
                'event_type' => 'treatment_pic_backfilled',
                'old_status' => null,
                'new_status' => $job->status,
                'description' => 'Penyesuaian data: Worker PIC untuk treatment #' .
                    $assignment['job_treatment_id'] .
                    ' diisi berdasarkan PIC treatment lain pada Job yang sama (' . $worker->name . ').',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            Schema::table('job_treatments', function (Blueprint $table) {
                $table->dropForeign(['worker_id']);
            });

            DB::statement('ALTER TABLE `job_treatments` MODIFY `worker_id` BIGINT UNSIGNED NULL');

            Schema::table('job_treatments', function (Blueprint $table) {
                $table->foreign('worker_id')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasColumn('treatment_logs', 'activity_source')) {
            Schema::table('treatment_logs', function (Blueprint $table) {
                $table->dropColumn('activity_source');
            });
        }

        if (Schema::hasColumn('job_treatments', 'execution_type')) {
            Schema::table('job_treatments', function (Blueprint $table) {
                $table->dropColumn('execution_type');
            });
        }
    }
};
