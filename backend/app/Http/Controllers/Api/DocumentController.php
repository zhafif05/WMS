<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\JobDocument;
use App\Models\JobTreatment;
use App\Models\QcInspection;
use App\Models\TreatmentLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'job_id' => 'required|exists:jobs,id',
            'job_treatment_id' => 'nullable|exists:job_treatments,id',
            'treatment_log_id' => 'nullable|exists:treatment_logs,id',
            'qc_inspection_id' => 'nullable|exists:qc_inspections,id',
            'file' => 'required|file|mimes:jpeg,png,jpg,pdf,webp|max:10240', // max 10MB
            'description' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $job = Job::findOrFail($validated['job_id']);

        $jobTreatment = null;
        $treatmentLog = null;
        $inspection = null;

        if (! empty($validated['job_treatment_id'])) {
            $jobTreatment = JobTreatment::with(['worker', 'vendor'])->findOrFail($validated['job_treatment_id']);

            if ((int) $jobTreatment->job_id !== (int) $job->id) {
                return response()->json([
                    'message' => 'Treatment bukan bagian dari Job yang dipilih.',
                ], 422);
            }
        }

        if (! empty($validated['treatment_log_id'])) {
            $treatmentLog = TreatmentLog::with('jobTreatment')->findOrFail($validated['treatment_log_id']);

            if (! $treatmentLog->jobTreatment || (int) $treatmentLog->jobTreatment->job_id !== (int) $job->id) {
                return response()->json([
                    'message' => 'Catatan aktivitas bukan bagian dari Job yang dipilih.',
                ], 422);
            }

            $jobTreatment = $treatmentLog->jobTreatment;
        }

        if (! empty($validated['qc_inspection_id'])) {
            $inspection = QcInspection::findOrFail($validated['qc_inspection_id']);

            if ((int) $inspection->job_id !== (int) $job->id) {
                return response()->json([
                    'message' => 'Inspeksi QC bukan bagian dari Job yang dipilih.',
                ], 422);
            }
        }

        // ============================================================
        // Otorisasi backend: Worker hanya boleh mengunggah dokumentasi
        // untuk treatment yang menjadi tanggung jawabnya.
        // ============================================================
        if ($user->role === 'worker') {
            if ($jobTreatment) {
                if ((int) $jobTreatment->worker_id !== (int) $user->id) {
                    return response()->json([
                        'message' => 'Anda tidak memiliki akses untuk mengunggah dokumentasi pada treatment ini.',
                    ], 403);
                }
            } else {
                $isAssigned = JobTreatment::where('job_id', $job->id)
                    ->where('worker_id', $user->id)
                    ->exists();

                if (! $isAssigned) {
                    return response()->json([
                        'message' => 'Anda tidak memiliki penugasan pada Job ini.',
                    ], 403);
                }
            }
        } elseif ($user->role === 'qc') {
            // QC boleh mengunggah dokumentasi pemeriksaan. Jika terkait inspeksi,
            // pastikan inspeksi tersebut miliknya.
            if ($inspection && (int) $inspection->qc_id !== (int) $user->id) {
                return response()->json([
                    'message' => 'Anda hanya dapat mengunggah dokumentasi pada inspeksi milik Anda.',
                ], 403);
            }

            if (! $inspection && ! in_array($job->status, ['qc', 'rework', 'completed'], true)) {
                return response()->json([
                    'message' => 'Job ini belum berada pada tahap pemeriksaan QC.',
                ], 403);
            }
        } elseif ($user->role !== 'admin') {
            return response()->json([
                'message' => 'Anda tidak memiliki hak untuk mengunggah dokumen.',
            ], 403);
        }

        // Dokumentasi yang terkait treatment otomatis membuat catatan aktivitas
        // agar dapat ditelusuri pada riwayat pekerjaan.
        $shouldCreateLog = $jobTreatment && ! $treatmentLog;

        if ($shouldCreateLog) {
            $isVendor = $jobTreatment->execution_type === JobTreatment::EXECUTION_VENDOR;

            $treatmentLog = TreatmentLog::create([
                'job_treatment_id' => $jobTreatment->id,
                // Simpan siapa yang benar-benar mengunggah/mencatat.
                'worker_id' => $user->id,
                'action_type' => 'progress',
                'activity_source' => $isVendor
                    ? TreatmentLog::SOURCE_VENDOR_DOCUMENTATION
                    : TreatmentLog::SOURCE_INTERNAL_DOCUMENTATION,
                'notes' => $validated['description'] ?? ($isVendor
                    ? 'Dokumentasi pekerjaan vendor diunggah oleh PIC internal.'
                    : 'Dokumentasi pekerjaan diunggah oleh Worker.'),
            ]);
        }

        $file = $request->file('file');
        $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $file->getClientOriginalName());
        $path = $file->storeAs('job_documents/' . $validated['job_id'], $fileName, 'public');

        try {
            $document = DB::transaction(function () use (
                $validated,
                $request,
                $path,
                $file,
                $treatmentLog,
                $jobTreatment
            ) {
                return JobDocument::create([
                    'job_id' => $validated['job_id'],
                    'treatment_log_id' => $treatmentLog->id ?? null,
                    'qc_inspection_id' => $validated['qc_inspection_id'] ?? null,
                    'uploaded_by' => $request->user()->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_type' => $file->getClientMimeType(),
                    'file_size' => $file->getSize(),
                    'description' => $validated['description'] ?? null,
                ]);
            });
        } catch (\Throwable $e) {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            }

            throw $e;
        }

        $document->load(['uploader', 'treatmentLog.worker', 'treatmentLog.jobTreatment']);
        $document->file_url = asset('storage/' . $document->file_path);

        return response()->json([
            'message' => 'Dokumen berhasil diunggah.',
            'document' => $document,
        ], 201);
    }

    public function show(Request $request, JobDocument $document)
    {
        $user = $request->user();
        $document->load(['uploader', 'treatmentLog.worker', 'treatmentLog.jobTreatment', 'job']);

        // ============================================================
        // Otorisasi backend untuk membaca dokumen.
        // ============================================================
        if ($user->role === 'worker') {
            $jobTreatment = $document->treatmentLog?->jobTreatment;

            if ($jobTreatment) {
                if ((int) $jobTreatment->worker_id !== (int) $user->id) {
                    return response()->json([
                        'message' => 'Anda tidak memiliki akses untuk melihat dokumen ini.',
                    ], 403);
                }
            } else {
                $isAssigned = JobTreatment::where('job_id', $document->job_id)
                    ->where('worker_id', $user->id)
                    ->exists();

                if (! $isAssigned) {
                    return response()->json([
                        'message' => 'Anda tidak memiliki akses untuk melihat dokumen ini.',
                    ], 403);
                }
            }
        } elseif ($user->role === 'qc') {
            $ownInspection = $document->qc_inspection_id
                && $document->qcInspection
                && (int) $document->qcInspection->qc_id === (int) $user->id;

            $job = $document->job;

            if (! $ownInspection && (! $job || ! in_array($job->status, ['qc', 'rework', 'completed'], true))) {
                return response()->json([
                    'message' => 'Anda tidak memiliki akses untuk melihat dokumen ini.',
                ], 403);
            }
        } elseif ($user->role !== 'admin') {
            return response()->json([
                'message' => 'Anda tidak memiliki hak untuk melihat dokumen ini.',
            ], 403);
        }

        $document->file_url = asset('storage/' . $document->file_path);

        return response()->json($document);
    }

    public function destroy(Request $request, JobDocument $document)
    {
        $user = $request->user();

        // Only uploader or admin can delete
        if ($user->role !== 'admin' && $document->uploaded_by !== $user->id) {
            return response()->json([
                'message' => 'Anda tidak memiliki hak untuk menghapus dokumen ini.',
            ], 403);
        }

        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json([
            'message' => 'Dokumen berhasil dihapus.',
        ]);
    }
}
