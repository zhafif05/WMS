<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\JobTreatment;
use App\Models\JobTreatmentRework;
use App\Models\TreatmentLog;
use App\Models\JobEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WorkerController extends Controller
{
    /**
     * Ambil treatment dan pastikan treatment tersebut memang ditugaskan
     * kepada Worker yang sedang login. Admin tetap boleh mengakses.
     */
    private function findAssignedTreatment(Request $request, $id): JobTreatment
    {
        $treatment = JobTreatment::with(['job.item', 'treatment', 'worker', 'vendor'])
            ->findOrFail($id);

        $user = $request->user();

        if ($user->role !== 'admin' && (int) $treatment->worker_id !== (int) $user->id) {
            abort(403, 'Anda tidak memiliki akses untuk mengakses treatment ini.');
        }

        return $treatment;
    }

    /**
     * Cari treatment lain yang sedang aktif pada Job yang sama.
     * Dipakai untuk aturan serial execution per Job.
     */
    private function otherActiveTreatment(Job $job, int $excludeTreatmentId): ?JobTreatment
    {
        return $job->jobTreatments()
            ->with(['treatment', 'worker'])
            ->where('id', '!=', $excludeTreatmentId)
            ->active()
            ->orderBy('started_at')
            ->lockForUpdate()
            ->first();
    }

    private function conflictResponse(?JobTreatment $activeTreatment)
    {
        return response()->json([
            'message' => 'Belum dapat memulai Treatment ini. Job masih memiliki Treatment lain yang sedang dikerjakan. Silakan tunggu sampai pengerjaan sebelumnya selesai.',
            'active_treatment' => $activeTreatment ? [
                'id' => $activeTreatment->id,
                'treatment_name' => $activeTreatment->treatment->treatment_name ?? null,
                'worker_name' => $activeTreatment->worker->name ?? null,
                'execution_type' => $activeTreatment->execution_type,
                'started_at' => $activeTreatment->started_at,
            ] : null,
        ], 409);
    }

    private function invalidResponse(string $message, int $status = 422)
    {
        return response()->json(['message' => $message], $status);
    }

    /**
     * Pekerjaan Saya: seluruh treatment dengan worker_id milik user login,
     * termasuk treatment yang dikerjakan Vendor (Worker sebagai PIC).
     */
    public function jobs(Request $request)
    {
        $workerId = $request->user()->id;
        $executionType = $request->query('execution_type');

        $query = Job::query()
            ->whereHas('jobTreatments', function ($q) use ($workerId, $executionType) {
                $q->where('worker_id', $workerId);

                if (in_array($executionType, ['internal', 'vendor'], true)) {
                    $q->where('execution_type', $executionType);
                }
            })
            ->with([
                'item',
                'qrCode',
                'activeTreatment.treatment',
                'activeTreatment.worker',
                'activeTreatment.vendor',
                'jobTreatments' => function ($q) use ($workerId, $executionType) {
                    $q->where('worker_id', $workerId)
                        ->when(in_array($executionType, ['internal', 'vendor'], true), function ($qq) use ($executionType) {
                            $qq->where('execution_type', $executionType);
                        })
                        ->with([
                            'treatment',
                            'worker',
                            'vendor',
                            'reworks.worker',
                            'reworks.inspection.qc',
                        ])
                        ->orderBy('sequence');
                },
            ]);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $jobs = $query->latest()->get();

        return response()->json($jobs);
    }

    public function show(Request $request, $id)
    {
        $workerId = $request->user()->id;

        $job = Job::with([
            'item',
            'qrCode',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments' => function ($q) use ($workerId) {
                $q->where('worker_id', $workerId)
                    ->with([
                        'treatment',
                        'worker',
                        'vendor',
                        'treatmentLogs.worker',
                        'treatmentLogs.documents.uploader',
                        'failedInspections.qc',
                        'reworks.worker',
                        'reworks.inspection.qc',
                    ])
                    ->orderBy('sequence');
            },
            'jobTreatmentReworks.jobTreatment.treatment',
            'jobTreatmentReworks.jobTreatment.worker',
            'jobTreatmentReworks.jobTreatment.vendor',
            'jobTreatmentReworks.worker',
            'jobTreatmentReworks.inspection.qc',
            'qcInspections' => function ($q) {
                $q->latest()->with([
                    'failedJobTreatment.treatment',
                    'failedTreatments.jobTreatment.treatment',
                    'reworks.jobTreatment.treatment',
                ]);
            },
            'jobEvents' => function ($q) {
                $q->latest()->with('user');
            },
            'jobDocuments.uploader',
        ])
        ->whereHas('jobTreatments', function ($q) use ($workerId) {
            $q->where('worker_id', $workerId);
        })
        ->findOrFail($id);

        return response()->json($job);
    }

    /**
     * Detail satu treatment milik Worker (termasuk treatment Vendor).
     * Menyertakan active_treatment Job agar frontend dapat menampilkan
     * status terkunci / menunggu treatment lain.
     */
    public function treatment(Request $request, $id)
    {
        $treatment = $this->findAssignedTreatment($request, $id);

        $treatment->load([
            'job.item',
            'job.qrCode',
            'job.activeTreatment.treatment',
            'job.activeTreatment.worker',
            'job.activeTreatment.vendor',
            'job.jobDocuments.uploader',
            'treatment',
            'worker',
            'vendor',
            'treatmentLogs.worker',
            'treatmentLogs.documents.uploader',
            'failedInspections.qc',
            'reworks.worker',
            'reworks.inspection.qc',
            'activeRework',
        ]);

        return response()->json($treatment);
    }

    public function history(Request $request)
    {
        $workerId = $request->user()->id;

        $logs = TreatmentLog::with([
            'jobTreatment.job.item',
            'jobTreatment.treatment',
            'jobTreatment.worker',
            'jobTreatment.vendor',
            'documents',
        ])
            ->where('worker_id', $workerId)
            ->latest()
            ->get();

        return response()->json($logs);
    }

    /**
     * Daftar siklus rework milik Worker yang sedang login.
     * Worker melihat rework berdasarkan PIC treatment (job_treatments.worker_id),
     * sehingga tetap terlihat meskipun kolom worker_id pada siklus berbeda.
     */
    public function reworks(Request $request)
    {
        $workerId = $request->user()->id;

        $reworks = JobTreatmentRework::with([
            'jobTreatment.treatment',
            'jobTreatment.worker',
            'jobTreatment.vendor',
            'jobTreatment.job.item',
            'worker',
            'inspection.qc',
        ])
            ->where(function ($query) use ($workerId) {
                $query->where('worker_id', $workerId)
                    ->orWhereHas('jobTreatment', function ($q) use ($workerId) {
                        $q->where('worker_id', $workerId);
                    });
            })
            ->latest()
            ->get();

        return response()->json($reworks);
    }

    /**
     * Riwayat rework pada satu Job yang melibatkan Worker yang sedang login.
     */
    public function jobReworks(Request $request, $id)
    {
        $workerId = $request->user()->id;

        $job = Job::whereHas('jobTreatments', function ($q) use ($workerId) {
            $q->where('worker_id', $workerId);
        })->findOrFail($id);

        $reworks = $job->jobTreatmentReworks()
            ->with([
                'jobTreatment.treatment',
                'jobTreatment.worker',
                'jobTreatment.vendor',
                'worker',
                'inspection.qc',
            ])
            ->get();

        return response()->json([
            'job_id' => $job->id,
            'job_number' => $job->job_number,
            'status' => $job->status,
            'reworks' => $reworks,
        ]);
    }

    public function startTreatment(Request $request, $id)
    {
        // Cek keberadaan & hak akses awal sebelum masuk transaction.
        $this->findAssignedTreatment($request, $id);

        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $result = DB::transaction(function () use ($id, $request) {
            // Kunci baris Job terlebih dahulu. Semua proses start/finish/rework
            // pada Job yang sama harus melewati lock ini agar serial.
            $preview = JobTreatment::findOrFail($id);
            $job = Job::whereKey($preview->job_id)->lockForUpdate()->firstOrFail();
            $treatment = JobTreatment::with(['treatment', 'worker', 'vendor'])
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $user = $request->user();

            if ($user->role !== 'admin' && (int) $treatment->worker_id !== (int) $user->id) {
                return ['forbidden' => true];
            }

            if (in_array($job->status, ['qc', 'completed'], true)) {
                return ['invalid' => 'Job sudah berada pada tahap QC / selesai sehingga treatment tidak dapat dimulai.'];
            }

            if ($job->status === 'rework') {
                return ['invalid' => 'Job sedang dalam proses rework. Gunakan tombol Mulai Rework untuk treatment yang diperbaiki.'];
            }

            // Treatment yang memiliki siklus rework tertunda hanya boleh
            // dimulai melalui endpoint rework, bukan start biasa.
            $pendingRework = JobTreatmentRework::where('job_treatment_id', $treatment->id)
                ->pending()
                ->exists();

            if ($pendingRework) {
                return ['invalid' => 'Treatment ini menunggu rework. Gunakan tombol Mulai Rework untuk memulai perbaikan.'];
            }

            if ($treatment->completed_at) {
                return ['invalid' => 'Treatment ini sudah selesai dan tidak dapat dimulai ulang tanpa proses rework.'];
            }

            if ($treatment->started_at) {
                return ['invalid' => 'Treatment ini sudah dimulai sebelumnya.'];
            }

            $activeTreatment = $this->otherActiveTreatment($job, $treatment->id);

            if ($activeTreatment) {
                return ['conflict' => $activeTreatment];
            }

            $isVendor = $treatment->isVendor();

            $treatment->update([
                'started_at' => now(),
            ]);

            TreatmentLog::create([
                'job_treatment_id' => $treatment->id,
                'worker_id' => $user->id,
                'action_type' => 'start',
                'activity_source' => $isVendor
                    ? TreatmentLog::SOURCE_VENDOR_PROGRESS
                    : TreatmentLog::SOURCE_INTERNAL,
                'notes' => $request->notes ?? ($isVendor
                    ? 'PIC Vendor memulai pemantauan pekerjaan vendor.'
                    : 'Worker memulai pengerjaan treatment.'),
            ]);

            if (in_array($job->status, ['received', 'analysis'], true)) {
                $oldStatus = $job->status;
                $job->update(['status' => 'treatment']);

                JobEvent::create([
                    'job_id' => $job->id,
                    'user_id' => $user->id,
                    'event_type' => 'treatment_started',
                    'old_status' => $oldStatus,
                    'new_status' => 'treatment',
                    'description' => $isVendor
                        ? "Pemantauan pekerjaan vendor untuk treatment {$treatment->treatment->treatment_name} dimulai oleh PIC {$user->name}."
                        : "Treatment {$treatment->treatment->treatment_name} dimulai oleh {$user->name}.",
                ]);
            }

            return ['ok' => true, 'is_vendor' => $isVendor];
        });

        if (isset($result['forbidden'])) {
            return $this->invalidResponse('Anda tidak memiliki akses untuk memulai treatment ini.', 403);
        }

        if (isset($result['invalid'])) {
            return $this->invalidResponse($result['invalid']);
        }

        if (isset($result['conflict'])) {
            return $this->conflictResponse($result['conflict']);
        }

        return response()->json([
            'message' => $result['is_vendor']
                ? 'Pemantauan pekerjaan vendor berhasil dimulai.'
                : 'Pengerjaan treatment berhasil dimulai.',
            'treatment' => JobTreatment::with(['treatment', 'worker', 'vendor', 'treatmentLogs.worker'])
                ->findOrFail($id),
        ]);
    }

    public function progressTreatment(Request $request, $id)
    {
        $this->findAssignedTreatment($request, $id);

        $validated = $request->validate([
            'notes' => 'required|string',
            'activity_type' => ['nullable', Rule::in(['coordination', 'progress'])],
        ]);

        $activityType = $validated['activity_type'] ?? 'progress';

        $result = DB::transaction(function () use ($id, $request, $validated, $activityType) {
            $preview = JobTreatment::findOrFail($id);
            $job = Job::whereKey($preview->job_id)->lockForUpdate()->firstOrFail();
            $treatment = JobTreatment::with(['treatment', 'worker', 'vendor'])
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $user = $request->user();

            if ($user->role !== 'admin' && (int) $treatment->worker_id !== (int) $user->id) {
                return ['forbidden' => true];
            }

            if ($treatment->completed_at) {
                return ['invalid' => 'Treatment ini sudah selesai. Catatan aktivitas baru tidak dapat ditambahkan.'];
            }

            if (! $treatment->started_at) {
                return ['invalid' => 'Treatment harus dimulai terlebih dahulu sebelum mencatat progres.'];
            }

            if ($treatment->isVendor()) {
                $activitySource = $activityType === 'coordination'
                    ? TreatmentLog::SOURCE_VENDOR_COORDINATION
                    : TreatmentLog::SOURCE_VENDOR_PROGRESS;
            } else {
                $activitySource = TreatmentLog::SOURCE_INTERNAL;
            }

            $log = TreatmentLog::create([
                'job_treatment_id' => $treatment->id,
                'worker_id' => $user->id,
                'action_type' => 'progress',
                'activity_source' => $activitySource,
                'notes' => $validated['notes'],
            ]);

            $log->load('worker');

            return ['ok' => true, 'log' => $log];
        });

        if (isset($result['forbidden'])) {
            return $this->invalidResponse('Anda tidak memiliki akses untuk mencatat progres treatment ini.', 403);
        }

        if (isset($result['invalid'])) {
            return $this->invalidResponse($result['invalid']);
        }

        return response()->json([
            'message' => $activityType === 'coordination'
                ? 'Catatan koordinasi dengan vendor berhasil disimpan.'
                : 'Catatan progres pengerjaan berhasil disimpan.',
            'log' => $result['log'],
        ]);
    }

    public function finishTreatment(Request $request, $id)
    {
        $preview = JobTreatment::with(['treatment', 'worker', 'vendor'])->findOrFail($id);
        $user = $request->user();

        if ($user->role !== 'admin' && (int) $preview->worker_id !== (int) $user->id) {
            return $this->invalidResponse('Anda tidak memiliki akses untuk menyelesaikan treatment ini.', 403);
        }

        $isVendor = $preview->isVendor();

        $validated = $request->validate([
            'notes' => $isVendor ? 'required|string' : 'nullable|string',
            'verified' => 'nullable|boolean',
        ]);

        if ($isVendor && ! $request->boolean('verified')) {
            return $this->invalidResponse('PIC Vendor wajib mengonfirmasi verifikasi hasil pekerjaan vendor sebelum menandai treatment selesai.');
        }

        $result = DB::transaction(function () use ($id, $request, $validated, $isVendor) {
            $preview = JobTreatment::findOrFail($id);
            $job = Job::whereKey($preview->job_id)->lockForUpdate()->firstOrFail();
            $treatment = JobTreatment::with(['treatment', 'worker', 'vendor'])
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $user = $request->user();

            if ($user->role !== 'admin' && (int) $treatment->worker_id !== (int) $user->id) {
                return ['forbidden' => true];
            }

            if (! $treatment->started_at) {
                return ['invalid' => 'Treatment harus dimulai terlebih dahulu sebelum diselesaikan.'];
            }

            if ($treatment->completed_at) {
                return ['invalid' => 'Treatment ini sudah ditandai selesai.'];
            }

            $treatment->update([
                'completed_at' => now(),
            ]);

            // Tutup siklus rework yang sedang berjalan (jika ada).
            $activeRework = JobTreatmentRework::where('job_treatment_id', $treatment->id)
                ->inProgress()
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if ($activeRework) {
                $activeRework->update([
                    'status' => JobTreatmentRework::STATUS_COMPLETED,
                    'completed_at' => now(),
                ]);
            }

            TreatmentLog::create([
                'job_treatment_id' => $treatment->id,
                'worker_id' => $user->id,
                'action_type' => 'finish',
                'activity_source' => $isVendor
                    ? TreatmentLog::SOURCE_VENDOR_VERIFICATION
                    : TreatmentLog::SOURCE_INTERNAL,
                'notes' => $validated['notes'] ?? ($isVendor
                    ? 'Hasil pekerjaan vendor telah diverifikasi dan dinyatakan selesai oleh PIC internal.'
                    : 'Treatment diselesaikan oleh Worker.'),
            ]);

            $incompleteCount = $job->jobTreatments()
                ->whereNull('completed_at')
                ->count();

            if ($incompleteCount === 0) {
                $oldStatus = $job->status;
                $job->update(['status' => 'qc']);

                JobEvent::create([
                    'job_id' => $job->id,
                    'user_id' => $user->id,
                    'event_type' => 'status_changed',
                    'old_status' => $oldStatus,
                    'new_status' => 'qc',
                    'description' => 'Seluruh treatment telah diselesaikan. Job diteruskan ke Quality Control (QC).',
                ]);
            } else {
                $pendingReworkExists = JobTreatmentRework::whereHas('jobTreatment', function ($q) use ($job) {
                    $q->where('job_id', $job->id);
                })->pending()->exists();

                if ($pendingReworkExists) {
                    $oldStatus = $job->status;
                    $job->update(['status' => 'rework']);

                    JobEvent::create([
                        'job_id' => $job->id,
                        'user_id' => $user->id,
                        'event_type' => 'rework_completed',
                        'old_status' => $oldStatus,
                        'new_status' => 'rework',
                        'description' => $isVendor
                            ? "Rework vendor pada treatment {$treatment->treatment->treatment_name} selesai diverifikasi oleh PIC {$user->name}. Masih ada treatment rework lain yang menunggu."
                            : "Rework treatment {$treatment->treatment->treatment_name} selesai. Masih ada treatment rework lain yang menunggu.",
                    ]);
                } else {
                    JobEvent::create([
                        'job_id' => $job->id,
                        'user_id' => $user->id,
                        'event_type' => 'treatment_completed',
                        'old_status' => $job->status,
                        'new_status' => $job->status,
                        'description' => $isVendor
                            ? "Pekerjaan vendor pada treatment {$treatment->treatment->treatment_name} telah diverifikasi dan diselesaikan oleh PIC {$user->name}."
                            : "Treatment {$treatment->treatment->treatment_name} selesai dikerjakan.",
                    ]);
                }
            }

            return ['ok' => true];
        });

        if (isset($result['forbidden'])) {
            return $this->invalidResponse('Anda tidak memiliki akses untuk menyelesaikan treatment ini.', 403);
        }

        if (isset($result['invalid'])) {
            return $this->invalidResponse($result['invalid']);
        }

        return response()->json([
            'message' => $isVendor
                ? 'Hasil pekerjaan vendor berhasil diverifikasi dan treatment ditandai selesai.'
                : 'Treatment berhasil diselesaikan.',
            'treatment' => JobTreatment::with(['treatment', 'worker', 'vendor', 'treatmentLogs.worker'])
                ->findOrFail($id),
        ]);
    }

    public function reworkTreatment(Request $request, $id)
    {
        $this->findAssignedTreatment($request, $id);

        $validated = $request->validate([
            'notes' => 'required|string',
        ]);

        $result = DB::transaction(function () use ($id, $request, $validated) {
            $preview = JobTreatment::findOrFail($id);
            $job = Job::whereKey($preview->job_id)->lockForUpdate()->firstOrFail();
            $treatment = JobTreatment::with(['treatment', 'worker', 'vendor'])
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            $user = $request->user();

            if ($user->role !== 'admin' && (int) $treatment->worker_id !== (int) $user->id) {
                return ['forbidden' => true];
            }

            if (! in_array($job->status, ['rework', 'treatment'], true)) {
                return ['invalid' => 'Job tidak sedang berada dalam proses rework.'];
            }

            $pendingRework = JobTreatmentRework::where('job_treatment_id', $treatment->id)
                ->pending()
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $pendingRework) {
                return ['invalid' => 'Treatment ini tidak sedang menunggu rework.'];
            }

            if ($treatment->completed_at) {
                return ['invalid' => 'Treatment ini sudah selesai dan tidak sedang menunggu rework.'];
            }

            if ($treatment->started_at) {
                return ['invalid' => 'Rework pada treatment ini sudah dimulai.'];
            }

            $activeTreatment = $this->otherActiveTreatment($job, $treatment->id);

            if ($activeTreatment) {
                return ['conflict' => $activeTreatment];
            }

            $isVendor = $treatment->isVendor();

            $treatment->update([
                'completed_at' => null,
                'started_at' => now(),
            ]);

            $pendingRework->update([
                'status' => JobTreatmentRework::STATUS_IN_PROGRESS,
                'started_at' => now(),
            ]);

            TreatmentLog::create([
                'job_treatment_id' => $treatment->id,
                'worker_id' => $user->id,
                'action_type' => 'rework',
                'activity_source' => $isVendor
                    ? TreatmentLog::SOURCE_VENDOR_COORDINATION
                    : TreatmentLog::SOURCE_REWORK,
                'notes' => $validated['notes'],
            ]);

            $oldStatus = $job->status;
            $job->update(['status' => 'treatment']);

            JobEvent::create([
                'job_id' => $job->id,
                'user_id' => $user->id,
                'event_type' => 'rework_started',
                'old_status' => $oldStatus,
                'new_status' => 'treatment',
                'description' => $isVendor
                    ? "Koordinasi perbaikan ulang (rework) vendor dimulai oleh PIC {$user->name} pada treatment {$treatment->treatment->treatment_name}."
                    : "Perbaikan ulang (rework) dimulai oleh {$user->name} pada treatment {$treatment->treatment->treatment_name}.",
            ]);

            return ['ok' => true];
        });

        if (isset($result['forbidden'])) {
            return $this->invalidResponse('Anda tidak memiliki akses untuk memulai rework treatment ini.', 403);
        }

        if (isset($result['invalid'])) {
            return $this->invalidResponse($result['invalid']);
        }

        if (isset($result['conflict'])) {
            return $this->conflictResponse($result['conflict']);
        }

        return response()->json([
            'message' => 'Pengerjaan ulang (rework) dimulai.',
            'treatment' => JobTreatment::with([
                'treatment',
                'worker',
                'vendor',
                'treatmentLogs.worker',
                'reworks.worker',
            ])->findOrFail($id),
        ]);
    }
}
