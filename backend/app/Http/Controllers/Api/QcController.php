<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\JobTreatment;
use App\Models\JobTreatmentRework;
use App\Models\QcInspection;
use App\Models\QcInspectionFailedTreatment;
use App\Models\JobEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QcController extends Controller
{
    private function jobRelations(): array
    {
        return [
            'item',
            'qrCode',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
            'jobTreatments.treatmentLogs.worker',
            'jobTreatments.treatmentLogs.documents.uploader',
            'jobTreatments.failedInspections.qc',
            'jobTreatments.reworks.worker',
            'jobTreatments.reworks.inspection.qc',
            'jobTreatmentReworks.jobTreatment.treatment',
            'jobTreatmentReworks.jobTreatment.worker',
            'jobTreatmentReworks.jobTreatment.vendor',
            'jobTreatmentReworks.worker',
            'jobTreatmentReworks.inspection.qc',
            'qcInspections.qc',
            'qcInspections.failedJobTreatment.treatment',
            'qcInspections.failedTreatments.jobTreatment.treatment',
            'qcInspections.reworks',
            'qcInspections.documents.uploader',
            'jobEvents.user',
            'jobDocuments.uploader',
        ];
    }

    public function jobs(Request $request)
    {
        $jobs = Job::whereIn('status', ['qc', 'rework', 'treatment', 'completed'])
            ->with([
                'item',
                'qrCode',
                'activeTreatment.treatment',
                'activeTreatment.worker',
                'activeTreatment.vendor',
                'jobTreatments.treatment',
                'jobTreatments.worker',
                'jobTreatments.vendor',
                'jobTreatments.reworks',
                'jobTreatmentReworks',
                'qcInspections.qc',
                'qcInspections.failedTreatments.jobTreatment.treatment',
            ])
            ->latest()
            ->get();

        return response()->json($jobs);
    }

    public function show($id)
    {
        $job = Job::with($this->jobRelations())->findOrFail($id);

        return response()->json($job);
    }

    public function history(Request $request)
    {
        $qcId = $request->user()->id;

        $inspections = QcInspection::with([
            'job.item',
            'failedJobTreatment.treatment',
            'failedTreatments.jobTreatment.treatment',
            'reworks.jobTreatment.treatment',
            'documents',
        ])
        ->where('qc_id', $qcId)
        ->latest()
        ->get();

        return response()->json($inspections);
    }

    public function inspections($jobId)
    {
        $job = Job::findOrFail($jobId);

        $inspections = QcInspection::with([
            'qc',
            'failedJobTreatment.treatment',
            'failedTreatments.jobTreatment.treatment',
            'reworks.jobTreatment.treatment',
            'documents',
        ])
            ->where('job_id', $job->id)
            ->latest()
            ->get();

        return response()->json($inspections);
    }

    /**
     * Opsi Treatment yang dapat dipilih QC saat memilih Rework.
     */
    public function reworkOptions($jobId)
    {
        $job = Job::with([
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
            'jobTreatments.reworks.inspection.qc',
        ])->findOrFail($jobId);

        return response()->json([
            'job_id' => $job->id,
            'job_number' => $job->job_number,
            'status' => $job->status,
            'can_inspect' => in_array($job->status, ['qc', 'rework'], true)
                && ! $job->jobTreatments()->active()->exists(),
            'treatments' => $job->jobTreatments->map(function (JobTreatment $treatment) {
                return [
                    'id' => $treatment->id,
                    'treatment_id' => $treatment->treatment_id,
                    'treatment_name' => $treatment->treatment?->treatment_name,
                    'execution_type' => $treatment->execution_type,
                    'worker' => $treatment->worker,
                    'vendor' => $treatment->vendor,
                    'status' => $treatment->status,
                    'started_at' => $treatment->started_at,
                    'completed_at' => $treatment->completed_at,
                    'rework_history' => $treatment->reworks,
                ];
            })->values(),
        ]);
    }

    public function submitInspection(Request $request, $id)
    {
        $qcId = $request->user()->id;

        $validated = $request->validate([
            'result' => ['required', Rule::in(['sesuai', 'tidak_sesuai'])],
            'notes' => 'required|string',
            'failed_job_treatment_id' => [
                'nullable',
                Rule::exists('job_treatments', 'id')->where(function ($query) use ($id) {
                    $query->where('job_id', $id);
                }),
            ],
            'failed_treatments' => 'nullable|array',
            'failed_treatments.*.job_treatment_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('job_treatments', 'id')->where(function ($query) use ($id) {
                    $query->where('job_id', $id);
                }),
            ],
            'failed_treatments.*.failure_notes' => 'required|string',
        ]);

        $failedInputs = $this->normalizeFailedTreatments($validated);

        if ($validated['result'] === 'tidak_sesuai' && $failedInputs->isEmpty()) {
            throw ValidationException::withMessages([
                'failed_treatments' => 'Pilih minimal satu Treatment yang perlu diperbaiki (rework).',
            ]);
        }

        $result = DB::transaction(function () use ($id, $qcId, $validated, $request, $failedInputs) {
            // Kunci Job agar pemeriksaan QC tidak berjalan bersamaan dengan
            // proses start/finish/rework treatment pada Job yang sama.
            $job = Job::whereKey($id)->lockForUpdate()->firstOrFail();

            // QC hanya boleh memeriksa Job yang memang berada pada tahap QC/rework.
            if (! in_array($job->status, ['qc', 'rework'], true)) {
                return ['invalid' => 'Job ini belum berada pada tahap pemeriksaan QC atau tidak dapat diperiksa saat ini.'];
            }

            // Serial execution: QC menunggu sampai tidak ada treatment aktif.
            $activeTreatment = $job->jobTreatments()->active()->with(['treatment', 'worker'])->first();

            if ($activeTreatment) {
                return [
                    'invalid' => 'Masih ada treatment yang sedang dikerjakan pada Job ini. Tunggu sampai treatment tersebut selesai sebelum melakukan pemeriksaan QC.',
                    'active_treatment' => [
                        'id' => $activeTreatment->id,
                        'treatment_name' => $activeTreatment->treatment->treatment_name ?? null,
                        'worker_name' => $activeTreatment->worker->name ?? null,
                        'execution_type' => $activeTreatment->execution_type,
                    ],
                ];
            }

            // Saat Job masih rework, tunggu Worker menyelesaikan seluruh rework.
            if ($job->status === 'rework' && $job->jobTreatments()->whereNull('completed_at')->exists()) {
                return ['invalid' => 'Job masih berada dalam proses rework. Tunggu sampai Worker menyelesaikan seluruh rework sebelum melakukan pemeriksaan QC.'];
            }

            $inspectionResult = $validated['result'];

            if ($inspectionResult === 'sesuai') {
                $incompleteCount = $job->jobTreatments()->whereNull('completed_at')->count();

                if ($incompleteCount > 0) {
                    return ['invalid' => 'Masih ada treatment yang belum diselesaikan. Job belum dapat dinyatakan sesuai.'];
                }
            }

            $jobTreatments = $job->jobTreatments()
                ->with(['treatment', 'worker'])
                ->whereIn('id', $failedInputs->pluck('job_treatment_id'))
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            // Pastikan seluruh Treatment yang dipilih benar-benar milik Job ini
            // dan tidak ada Treatment yang sama dua kali dalam satu pemeriksaan.
            foreach ($failedInputs as $failedInput) {
                if (! $jobTreatments->has($failedInput['job_treatment_id'])) {
                    throw ValidationException::withMessages([
                        'failed_treatments' => 'Terdapat Treatment yang bukan bagian dari Job ini.',
                    ]);
                }
            }

            if ($failedInputs->pluck('job_treatment_id')->duplicates()->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'failed_treatments' => 'Treatment yang sama tidak boleh dipilih dua kali dalam satu pemeriksaan.',
                ]);
            }

            $oldStatus = $job->status;
            $newStatus = ($inspectionResult === 'sesuai') ? 'completed' : 'rework';

            // 1. Create new inspection record (Audit Trail preserved).
            //    failed_job_treatment_id tetap diisi Treatment pertama agar
            //    kompatibilitas data/frontend lama tetap terjaga.
            $inspection = QcInspection::create([
                'job_id' => $job->id,
                'qc_id' => $qcId,
                'result' => $inspectionResult,
                'notes' => $validated['notes'],
                'failed_job_treatment_id' => $failedInputs->first()['job_treatment_id'] ?? null,
                'inspected_at' => now(),
            ]);

            $failedTreatmentNames = [];

            if ($inspectionResult === 'tidak_sesuai') {
                foreach ($failedInputs as $failedInput) {
                    $failedTreatment = $jobTreatments->get($failedInput['job_treatment_id']);
                    $failedTreatmentNames[] = $failedTreatment->treatment->treatment_name ?? ('#' . $failedTreatment->id);

                    // Simpan relasi multi-treatment beserta alasan masing-masing.
                    QcInspectionFailedTreatment::create([
                        'qc_inspection_id' => $inspection->id,
                        'job_treatment_id' => $failedTreatment->id,
                        'failure_notes' => $failedInput['failure_notes'],
                    ]);

                    // Reopen treatment: started_at & completed_at dikosongkan agar
                    // treatment kembali pending dan Worker harus memulai rework
                    // secara eksplisit. PIC internal dan vendor TIDAK diubah.
                    $failedTreatment->update([
                        'completed_at' => null,
                        'started_at' => null,
                    ]);

                    // Catat siklus rework baru. Siklus sebelumnya tidak ditimpa.
                    JobTreatmentRework::create([
                        'job_treatment_id' => $failedTreatment->id,
                        'qc_inspection_id' => $inspection->id,
                        'worker_id' => $failedTreatment->worker_id,
                        'reason' => $failedInput['failure_notes'],
                        'status' => JobTreatmentRework::STATUS_PENDING,
                    ]);
                }
            }

            // 3. Update main Job status
            $job->update(['status' => $newStatus]);

            // 4. Record event in job_events
            $description = ($inspectionResult === 'sesuai')
                ? "Hasil QC: SESUAI. Pemeriksaan diselesaikan oleh {$request->user()->name}."
                : "Hasil QC: TIDAK SESUAI pada treatment '" . implode("', '", $failedTreatmentNames) .
                    "'. Status dikembalikan ke REWORK oleh {$request->user()->name}.";

            JobEvent::create([
                'job_id' => $job->id,
                'user_id' => $qcId,
                'event_type' => 'qc_inspected',
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'description' => $description,
            ]);

            return ['inspection' => $inspection];
        });

        if (isset($result['invalid'])) {
            return response()->json(array_filter([
                'message' => $result['invalid'],
                'active_treatment' => $result['active_treatment'] ?? null,
            ], fn ($value) => $value !== null), 422);
        }

        $inspection = $result['inspection'];
        $inspection->load([
            'qc',
            'failedJobTreatment.treatment',
            'failedTreatments.jobTreatment.treatment',
            'reworks.jobTreatment.treatment',
            'documents.uploader',
        ]);

        $job = Job::with([
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
            'jobTreatments.reworks.worker',
            'jobTreatmentReworks.jobTreatment.treatment',
            'jobTreatmentReworks.jobTreatment.worker',
            'jobTreatmentReworks.jobTreatment.vendor',
            'item',
        ])->find($id);

        return response()->json([
            'message' => ($validated['result'] === 'sesuai')
                ? 'Inspeksi QC Selesai: Hasil Sesuai.'
                : 'Inspeksi QC Selesai: Hasil Tidak Sesuai, Job dikembalikan untuk Rework.',
            'inspection' => $inspection,
            'job' => $job,
        ], 201);
    }

    /**
     * Mendukung payload baru (failed_treatments[]) sekaligus payload lama
     * (failed_job_treatment_id) agar data/frontend lama tetap berjalan.
     */
    private function normalizeFailedTreatments(array $validated): Collection
    {
        $items = collect($validated['failed_treatments'] ?? [])
            ->map(function ($item) {
                return [
                    'job_treatment_id' => (int) $item['job_treatment_id'],
                    'failure_notes' => $item['failure_notes'],
                ];
            });

        if ($items->isEmpty() && ! empty($validated['failed_job_treatment_id'])) {
            $items = collect([[
                'job_treatment_id' => (int) $validated['failed_job_treatment_id'],
                'failure_notes' => $validated['notes'],
            ]]);
        }

        return $items->unique('job_treatment_id')->values();
    }
}
