<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\Item;
use App\Models\JobTreatment;
use App\Models\QrCode;
use App\Models\JobEvent;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class JobController extends Controller
{
    /**
     * Aturan validasi penugasan treatment.
     * Worker selalu wajib dan harus pengguna aktif dengan role worker.
     */
    private function treatmentRules(): array
    {
        return [
            'treatments' => 'nullable|array',
            'treatments.*.id' => 'nullable|integer|exists:job_treatments,id',
            'treatments.*.treatment_id' => 'required|exists:treatments,id',
            'treatments.*.worker_id' => [
                'required',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->where('role', 'worker')->where('is_active', true);
                }),
            ],
            'treatments.*.execution_type' => ['required', Rule::in(['internal', 'vendor'])],
            'treatments.*.vendor_id' => 'nullable|exists:vendors,id',
            'treatments.*.sequence' => 'nullable|integer|min:1',
        ];
    }

    private function validateTreatmentAssignments(array $treatments): void
    {
        foreach ($treatments as $index => $treatment) {
            $executionType = $treatment['execution_type'] ?? null;
            $treatmentId = $treatment['treatment_id'] ?? null;

            if ($executionType === 'internal' && ! empty($treatment['vendor_id'])) {
                throw ValidationException::withMessages([
                    "treatments.{$index}.vendor_id" => 'Vendor harus dikosongkan untuk treatment internal.',
                ]);
            }

            if ($executionType === 'vendor' && empty($treatment['vendor_id'])) {
                throw ValidationException::withMessages([
                    "treatments.{$index}.vendor_id" => 'Vendor wajib dipilih untuk treatment vendor.',
                ]);
            }

            // Validasi kompetensi Worker terhadap Treatment terkait.
            $worker = User::with('treatmentSkills')->find($treatment['worker_id'] ?? null);

            if (! $worker || $worker->role !== 'worker' || ! $worker->is_active) {
                throw ValidationException::withMessages([
                    "treatments.{$index}.worker_id" => 'Worker PIC harus pengguna aktif dengan role worker.',
                ]);
            }

            if (! $worker->hasTreatmentSkill($treatmentId)) {
                throw ValidationException::withMessages([
                    "treatments.{$index}.worker_id" => 'Worker yang dipilih tidak memiliki kompetensi untuk Treatment ini.',
                ]);
            }

            if ($executionType === 'vendor') {
                $vendor = Vendor::with('treatments')->find($treatment['vendor_id']);

                if (! $vendor) {
                    throw ValidationException::withMessages([
                        "treatments.{$index}.vendor_id" => 'Vendor yang dipilih tidak ditemukan.',
                    ]);
                }

                if (! $vendor->is_active) {
                    throw ValidationException::withMessages([
                        "treatments.{$index}.vendor_id" => 'Vendor yang dipilih sedang nonaktif dan tidak dapat ditugaskan.',
                    ]);
                }

                if (! $vendor->hasTreatment($treatmentId)) {
                    throw ValidationException::withMessages([
                        "treatments.{$index}.vendor_id" => 'Vendor yang dipilih tidak memiliki kompetensi untuk Treatment ini.',
                    ]);
                }
            }
        }
    }

    private function normalizeTreatmentData(array $treatment, int $jobId, int $index): array
    {
        $executionType = $treatment['execution_type'] ?? 'internal';

        return [
            'job_id' => $jobId,
            'treatment_id' => $treatment['treatment_id'],
            'worker_id' => $treatment['worker_id'],
            'vendor_id' => $executionType === 'vendor' ? ($treatment['vendor_id'] ?? null) : null,
            'execution_type' => $executionType,
            'sequence' => $treatment['sequence'] ?? ($index + 1),
        ];
    }

    private function recordAssignmentChange(Request $request, Job $job, JobTreatment $treatment, array $old): void
    {
        $changes = [];

        if ($old['execution_type'] !== $treatment->execution_type) {
            $changes[] = "jenis pengerjaan {$old['execution_type']} menjadi {$treatment->execution_type}";
        }

        if ((int) $old['worker_id'] !== (int) $treatment->worker_id) {
            $changes[] = 'PIC internal ' . ($old['worker_name'] ?: '-') . ' menjadi ' . ($treatment->worker->name ?? '-');
        }

        if ((int) $old['vendor_id'] !== (int) $treatment->vendor_id) {
            $changes[] = 'vendor ' . ($old['vendor_name'] ?: '-') . ' menjadi ' . ($treatment->vendor->vendor_name ?? '-');
        }

        if ((int) $old['sequence'] !== (int) $treatment->sequence) {
            $changes[] = "urutan {$old['sequence']} menjadi {$treatment->sequence}";
        }

        if (empty($changes)) {
            return;
        }

        JobEvent::create([
            'job_id' => $job->id,
            'user_id' => $request->user()->id,
            'event_type' => 'treatment_assignment_changed',
            'old_status' => $job->status,
            'new_status' => $job->status,
            'description' => 'Penugasan treatment ' . ($treatment->treatment->treatment_name ?? ('#' . $treatment->id)) .
                ' diubah oleh Admin: ' . implode('; ', $changes) . '.',
        ]);
    }

    public function index(Request $request)
    {
        $query = Job::with([
            'item',
            'creator',
            'qrCode',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
        ]);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('job_number', 'like', "%{$search}%")
                  ->orWhere('problem_description', 'like', "%{$search}%")
                  ->orWhereHas('item', function ($iq) use ($search) {
                      $iq->where('item_name', 'like', "%{$search}%")
                        ->orWhere('item_code', 'like', "%{$search}%")
                        ->orWhere('serial_number', 'like', "%{$search}%");
                  });
            });
        }

        $jobs = $query->latest()->get();

        return response()->json($jobs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate(array_merge([
            'item_id' => 'nullable|exists:items,id',
            'new_item' => 'nullable|array',
            'new_item.item_code' => 'required_with:new_item|string|unique:items,item_code',
            'new_item.item_name' => 'required_with:new_item|string',
            'new_item.brand' => 'nullable|string',
            'new_item.model' => 'nullable|string',
            'new_item.serial_number' => 'nullable|string',
            'new_item.description' => 'nullable|string',
            'problem_description' => 'required|string',
            'initial_condition' => 'nullable|string',
            'analysis' => 'nullable|string',
            'received_at' => 'nullable|date',
        ], $this->treatmentRules()));

        $this->validateTreatmentAssignments($validated['treatments'] ?? []);

        if (empty($validated['item_id']) && empty($validated['new_item'])) {
            return response()->json([
                'message' => 'Pilih barang yang sudah ada atau masukkan data barang baru.',
            ], 422);
        }

        $job = DB::transaction(function () use ($validated, $request) {
            // 1. Resolve Item
            $itemId = $validated['item_id'] ?? null;
            if (! $itemId && ! empty($validated['new_item'])) {
                $newItem = Item::create($validated['new_item']);
                $itemId = $newItem->id;
            }

            // 2. Generate unique job number
            $year = date('Y');
            $latestJob = Job::whereYear('created_at', $year)->latest('id')->first();
            $nextSequence = $latestJob ? ($latestJob->id + 1) : 1;
            $jobNumber = sprintf('JOB-%s-%04d', $year, $nextSequence);

            // Determine initial status based on provided treatments
            $initialStatus = 'received';
            if (! empty($validated['analysis'])) {
                $initialStatus = ! empty($validated['treatments']) ? 'treatment' : 'analysis';
            }

            // 3. Create Job
            $job = Job::create([
                'job_number' => $jobNumber,
                'item_id' => $itemId,
                'created_by' => $request->user()->id,
                'problem_description' => $validated['problem_description'],
                'initial_condition' => $validated['initial_condition'] ?? null,
                'analysis' => $validated['analysis'] ?? null,
                'received_at' => $validated['received_at'] ?? now(),
                'status' => $initialStatus,
            ]);

            // 4. Create single unique QR Code
            $qrToken = 'QR-' . $jobNumber . '-' . Str::upper(Str::random(12));
            QrCode::create([
                'job_id' => $job->id,
                'token' => $qrToken,
            ]);

            // 5. Create Job Treatments if provided
            if (! empty($validated['treatments'])) {
                foreach ($validated['treatments'] as $idx => $trt) {
                    $jobTreatment = JobTreatment::create(
                        $this->normalizeTreatmentData($trt, $job->id, $idx)
                    );

                    $jobTreatment->load(['treatment', 'worker', 'vendor']);

                    JobEvent::create([
                        'job_id' => $job->id,
                        'user_id' => $request->user()->id,
                        'event_type' => 'treatment_assigned',
                        'old_status' => $job->status,
                        'new_status' => $job->status,
                        'description' => 'Treatment ' . ($jobTreatment->treatment->treatment_name ?? '-') .
                            ' ditugaskan ke PIC ' . ($jobTreatment->worker->name ?? '-') .
                            ($jobTreatment->execution_type === 'vendor'
                                ? ' dengan pelaksana vendor ' . ($jobTreatment->vendor->vendor_name ?? '-')
                                : ' sebagai pekerjaan internal') . '.',
                    ]);
                }
            }

            // 6. Record audit trail in job_events
            JobEvent::create([
                'job_id' => $job->id,
                'user_id' => $request->user()->id,
                'event_type' => 'job_created',
                'old_status' => null,
                'new_status' => $job->status,
                'description' => 'Pekerjaan dibuat oleh Admin: ' . $request->user()->name,
            ]);

            return $job;
        });

        $job->load([
            'item',
            'creator',
            'qrCode',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
        ]);

        return response()->json([
            'message' => 'Job berhasil dibuat.',
            'job' => $job,
        ], 201);
    }

    public function show($id)
    {
        $job = Job::with([
            'item',
            'creator',
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
            'qcInspections.documents',
            'jobEvents.user',
            'jobDocuments.uploader',
        ])->findOrFail($id);

        return response()->json($job);
    }

    public function update(Request $request, Job $job)
    {
        $validated = $request->validate(array_merge([
            'problem_description' => 'sometimes|required|string',
            'initial_condition' => 'nullable|string',
            'analysis' => 'nullable|string',
            'status' => ['sometimes', 'required', Rule::in(['received', 'analysis', 'treatment', 'qc', 'rework', 'completed'])],
            'deleted_treatment_ids' => 'nullable|array',
            'deleted_treatment_ids.*' => 'integer|exists:job_treatments,id',
        ], $this->treatmentRules()));

        $this->validateTreatmentAssignments($validated['treatments'] ?? []);

        DB::transaction(function () use ($validated, $job, $request) {
            $oldStatus = $job->status;
            $newStatus = $validated['status'] ?? $oldStatus;

            $job->update([
                'problem_description' => $validated['problem_description'] ?? $job->problem_description,
                'initial_condition' => array_key_exists('initial_condition', $validated) ? $validated['initial_condition'] : $job->initial_condition,
                'analysis' => array_key_exists('analysis', $validated) ? $validated['analysis'] : $job->analysis,
                'status' => $newStatus,
            ]);

            if ($oldStatus !== $newStatus) {
                JobEvent::create([
                    'job_id' => $job->id,
                    'user_id' => $request->user()->id,
                    'event_type' => 'status_changed',
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'description' => "Status diubah dari {$oldStatus} menjadi {$newStatus} oleh Admin",
                ]);
            }

            // Update / tambah treatment tanpa menghapus treatment lain.
            // ID treatment yang sudah ada dipertahankan agar riwayat log tidak hilang.
            if (! empty($validated['treatments'])) {
                $existingTreatments = $job->jobTreatments()
                    ->with(['worker', 'vendor', 'treatment'])
                    ->get()
                    ->keyBy('id');

                foreach ($validated['treatments'] as $idx => $trt) {
                    $payload = $this->normalizeTreatmentData($trt, $job->id, $idx);

                    if (! empty($trt['id'])) {
                        $jobTreatment = $existingTreatments->get((int) $trt['id']);

                        if (! $jobTreatment) {
                            throw ValidationException::withMessages([
                                "treatments.{$idx}.id" => 'Treatment tidak termasuk dalam Job ini.',
                            ]);
                        }

                        $oldAssignment = [
                            'execution_type' => $jobTreatment->execution_type,
                            'worker_id' => $jobTreatment->worker_id,
                            'worker_name' => $jobTreatment->worker->name ?? null,
                            'vendor_id' => $jobTreatment->vendor_id,
                            'vendor_name' => $jobTreatment->vendor->vendor_name ?? null,
                            'sequence' => $jobTreatment->sequence,
                        ];

                        $jobTreatment->update($payload);
                        $jobTreatment->load(['treatment', 'worker', 'vendor']);

                        $this->recordAssignmentChange($request, $job, $jobTreatment, $oldAssignment);
                    } else {
                        $jobTreatment = JobTreatment::create($payload);
                        $jobTreatment->load(['treatment', 'worker', 'vendor']);

                        JobEvent::create([
                            'job_id' => $job->id,
                            'user_id' => $request->user()->id,
                            'event_type' => 'treatment_assigned',
                            'old_status' => $job->status,
                            'new_status' => $job->status,
                            'description' => 'Treatment ' . ($jobTreatment->treatment->treatment_name ?? '-') .
                                ' ditambahkan dengan PIC ' . ($jobTreatment->worker->name ?? '-') .
                                ($jobTreatment->execution_type === 'vendor'
                                    ? ' dan vendor ' . ($jobTreatment->vendor->vendor_name ?? '-')
                                    : ' sebagai pekerjaan internal') . '.',
                        ]);
                    }
                }
            }

            // Penghapusan treatment hanya diizinkan jika belum pernah dikerjakan
            // dan belum memiliki riwayat aktivitas.
            foreach ($validated['deleted_treatment_ids'] ?? [] as $treatmentId) {
                $jobTreatment = $job->jobTreatments()->find($treatmentId);

                if (! $jobTreatment) {
                    continue;
                }

                if ($jobTreatment->started_at || $jobTreatment->completed_at || $jobTreatment->treatmentLogs()->exists()) {
                    throw ValidationException::withMessages([
                        'deleted_treatment_ids' => 'Treatment yang sudah memiliki riwayat pengerjaan tidak dapat dihapus.',
                    ]);
                }

                $jobTreatment->delete();
            }
        });

        $job->load([
            'item',
            'creator',
            'qrCode',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
            'jobTreatments.treatmentLogs.worker',
            'jobTreatments.treatmentLogs.documents.uploader',
        ]);

        return response()->json([
            'message' => 'Job berhasil diperbarui.',
            'job' => $job,
        ]);
    }

    /**
     * Admin dapat mengganti PIC internal / vendor / jenis pengerjaan.
     * Perubahan dicatat pada job_events (audit trail).
     */
    public function updateTreatment(Request $request, Job $job, JobTreatment $jobTreatment)
    {
        if ((int) $jobTreatment->job_id !== (int) $job->id) {
            return response()->json([
                'message' => 'Treatment bukan bagian dari Job ini.',
            ], 422);
        }

        $validated = $request->validate([
            'worker_id' => [
                'required',
                Rule::exists('users', 'id')->where(function ($query) {
                    $query->where('role', 'worker')->where('is_active', true);
                }),
            ],
            'execution_type' => ['required', Rule::in(['internal', 'vendor'])],
            'vendor_id' => 'nullable|exists:vendors,id',
            'sequence' => 'nullable|integer|min:1',
        ]);

        if ($validated['execution_type'] === 'internal' && ! empty($validated['vendor_id'])) {
            throw ValidationException::withMessages([
                'vendor_id' => 'Vendor harus dikosongkan untuk treatment internal.',
            ]);
        }

        if ($validated['execution_type'] === 'vendor' && empty($validated['vendor_id'])) {
            throw ValidationException::withMessages([
                'vendor_id' => 'Vendor wajib dipilih untuk treatment vendor.',
            ]);
        }

        $worker = User::with('treatmentSkills')->find($validated['worker_id']);

        if (! $worker || $worker->role !== 'worker' || ! $worker->is_active) {
            throw ValidationException::withMessages([
                'worker_id' => 'Worker PIC harus pengguna aktif dengan role worker.',
            ]);
        }

        if (! $worker->hasTreatmentSkill($jobTreatment->treatment_id)) {
            throw ValidationException::withMessages([
                'worker_id' => 'Worker yang dipilih tidak memiliki kompetensi untuk Treatment ini.',
            ]);
        }

        if ($validated['execution_type'] === 'vendor') {
            $vendor = Vendor::with('treatments')->find($validated['vendor_id']);

            if (! $vendor || ! $vendor->is_active) {
                throw ValidationException::withMessages([
                    'vendor_id' => 'Vendor yang dipilih sedang nonaktif atau tidak ditemukan.',
                ]);
            }

            if (! $vendor->hasTreatment($jobTreatment->treatment_id)) {
                throw ValidationException::withMessages([
                    'vendor_id' => 'Vendor yang dipilih tidak memiliki kompetensi untuk Treatment ini.',
                ]);
            }
        }

        DB::transaction(function () use ($request, $job, $jobTreatment, $validated) {
            $jobTreatment->load(['worker', 'vendor', 'treatment']);

            $oldAssignment = [
                'execution_type' => $jobTreatment->execution_type,
                'worker_id' => $jobTreatment->worker_id,
                'worker_name' => $jobTreatment->worker->name ?? null,
                'vendor_id' => $jobTreatment->vendor_id,
                'vendor_name' => $jobTreatment->vendor->vendor_name ?? null,
                'sequence' => $jobTreatment->sequence,
            ];

            $jobTreatment->update([
                'worker_id' => $validated['worker_id'],
                'vendor_id' => $validated['execution_type'] === 'vendor' ? $validated['vendor_id'] : null,
                'execution_type' => $validated['execution_type'],
                'sequence' => $validated['sequence'] ?? $jobTreatment->sequence,
            ]);

            $jobTreatment->load(['worker', 'vendor', 'treatment']);

            $this->recordAssignmentChange($request, $job, $jobTreatment, $oldAssignment);
        });

        return response()->json([
            'message' => 'Penugasan treatment berhasil diperbarui.',
            'treatment' => $jobTreatment->fresh(['treatment', 'worker', 'vendor']),
        ]);
    }

    public function timeline($id)
    {
        $job = Job::findOrFail($id);

        $events = JobEvent::with('user')
            ->where('job_id', $job->id)
            ->latest()
            ->get();

        return response()->json([
            'job_id' => $job->id,
            'job_number' => $job->job_number,
            'current_status' => $job->status,
            'timeline' => $events,
        ]);
    }

    public function qr($id)
    {
        $job = Job::with('qrCode', 'item')->findOrFail($id);

        if (! $job->qrCode) {
            return response()->json([
                'message' => 'QR Code belum dibuat untuk Job ini.',
            ], 404);
        }

        return response()->json([
            'job_id' => $job->id,
            'job_number' => $job->job_number,
            'item_name' => $job->item->item_name,
            'token' => $job->qrCode->token,
            'created_at' => $job->qrCode->created_at,
        ]);
    }

    /**
     * Riwayat seluruh siklus rework pada Job ini.
     * Setiap siklus bersifat append-only; siklus lama tidak pernah ditimpa.
     */
    public function reworks($id)
    {
        $job = Job::findOrFail($id);

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
}
