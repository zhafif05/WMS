<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\QrCode;
use Illuminate\Http\Request;

class QrController extends Controller
{
    public function scan(Request $request, $token)
    {
        $user = $request->user();

        $qrCode = QrCode::where('token', $token)->first();

        if (! $qrCode) {
            return response()->json([
                'message' => 'QR Code tidak valid atau tidak ditemukan dalam sistem.',
            ], 404);
        }

        $job = $qrCode->job()->with([
            'item',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments.treatment',
            'jobTreatments.worker',
            'jobTreatments.vendor',
            'jobTreatments.treatmentLogs.worker',
            'jobTreatments.treatmentLogs.documents',
            'qcInspections.qc',
            'qcInspections.failedJobTreatment.treatment',
        ])->first();

        if (! $job) {
            return response()->json([
                'message' => 'Data pekerjaan terkait QR Code tidak ditemukan.',
            ], 404);
        }

        // Role-based authorization & data shaping
        if ($user->role === 'worker') {
            $assignedTreatments = $job->jobTreatments->where('worker_id', $user->id)->values();

            if ($assignedTreatments->isEmpty()) {
                return response()->json([
                    'message' => 'Akses ditolak. Anda tidak memiliki penugasan pada Job ini.',
                ], 403);
            }

            return response()->json([
                'role' => 'worker',
                'job_id' => $job->id,
                'job_number' => $job->job_number,
                'status' => $job->status,
                'item' => [
                    'item_code' => $job->item->item_code,
                    'item_name' => $job->item->item_name,
                    'brand' => $job->item->brand,
                    'model' => $job->item->model,
                    'serial_number' => $job->item->serial_number,
                    'description' => $job->item->description,
                ],
                'problem_description' => $job->problem_description,
                'initial_condition' => $job->initial_condition,
                'analysis' => $job->analysis,
                // Worker hanya menerima treatment yang menjadi tanggung jawabnya,
                // termasuk treatment vendor yang ia pantau sebagai PIC.
                'assigned_treatments' => $assignedTreatments,
                'treatments' => $assignedTreatments,
                'active_treatment' => $job->activeTreatment ? [
                    'id' => $job->activeTreatment->id,
                    'treatment_name' => $job->activeTreatment->treatment->treatment_name ?? null,
                    'worker_name' => $job->activeTreatment->worker->name ?? null,
                    'execution_type' => $job->activeTreatment->execution_type,
                    'started_at' => $job->activeTreatment->started_at,
                ] : null,
            ]);
        }

        if ($user->role === 'qc') {
            return response()->json([
                'role' => 'qc',
                'job_id' => $job->id,
                'job_number' => $job->job_number,
                'status' => $job->status,
                'item' => $job->item,
                'problem_description' => $job->problem_description,
                'initial_condition' => $job->initial_condition,
                'analysis' => $job->analysis,
                'treatments' => $job->jobTreatments,
                'inspections' => $job->qcInspections,
                'active_treatment' => $job->activeTreatment ? [
                    'id' => $job->activeTreatment->id,
                    'treatment_name' => $job->activeTreatment->treatment->treatment_name ?? null,
                    'worker_name' => $job->activeTreatment->worker->name ?? null,
                    'execution_type' => $job->activeTreatment->execution_type,
                    'started_at' => $job->activeTreatment->started_at,
                ] : null,
            ]);
        }

        // Admin has full view
        return response()->json([
            'role' => 'admin',
            'job' => $job,
        ]);
    }
}
