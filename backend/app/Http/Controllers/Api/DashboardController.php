<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Job;
use App\Models\JobTreatment;
use App\Models\Item;
use App\Models\User;
use App\Models\QcInspection;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function admin(Request $request)
    {
        $totalJobs = Job::count();
        $totalItems = Item::count();
        $totalWorkers = User::where('role', 'worker')->where('is_active', true)->count();
        $totalQc = User::where('role', 'qc')->where('is_active', true)->count();

        $statusCounts = [
            'received' => Job::where('status', 'received')->count(),
            'analysis' => Job::where('status', 'analysis')->count(),
            'treatment' => Job::where('status', 'treatment')->count(),
            'qc' => Job::where('status', 'qc')->count(),
            'rework' => Job::where('status', 'rework')->count(),
            'completed' => Job::where('status', 'completed')->count(),
        ];

        $recentJobs = Job::with(['item', 'creator', 'qrCode', 'jobTreatments.worker', 'jobTreatments.treatment'])
            ->latest()
            ->take(8)
            ->get();

        return response()->json([
            'summary' => [
                'total_jobs' => $totalJobs,
                'total_items' => $totalItems,
                'total_workers' => $totalWorkers,
                'total_qc' => $totalQc,
                'active_jobs' => $totalJobs - $statusCounts['completed'],
                'completed_jobs' => $statusCounts['completed'],
            ],
            'status_breakdown' => $statusCounts,
            'recent_jobs' => $recentJobs,
        ]);
    }

    public function worker(Request $request)
    {
        $workerId = $request->user()->id;

        // Statistik dihitung per penugasan treatment, bukan per Job.
        // Treatment vendor tetap dihitung karena Worker adalah PIC internal.
        $assignedTreatments = JobTreatment::where('worker_id', $workerId);

        $totalAssigned = (clone $assignedTreatments)->count();
        $internal = (clone $assignedTreatments)->where('execution_type', JobTreatment::EXECUTION_INTERNAL)->count();
        $vendor = (clone $assignedTreatments)->where('execution_type', JobTreatment::EXECUTION_VENDOR)->count();
        $inProgress = (clone $assignedTreatments)->whereNotNull('started_at')->whereNull('completed_at')->count();
        $pending = (clone $assignedTreatments)->whereNull('started_at')->whereNull('completed_at')->count();
        $completed = (clone $assignedTreatments)->whereNotNull('completed_at')->count();

        // Rework jobs
        $reworkCount = Job::whereHas('jobTreatments', function ($q) use ($workerId) {
            $q->where('worker_id', $workerId)->whereNull('completed_at');
        })->where('status', 'rework')->count();

        $activeJobs = Job::whereHas('jobTreatments', function ($q) use ($workerId) {
            $q->where('worker_id', $workerId);
        })
        ->whereIn('status', ['treatment', 'rework', 'received', 'analysis'])
        ->with([
            'item',
            'qrCode',
            'activeTreatment.treatment',
            'activeTreatment.worker',
            'activeTreatment.vendor',
            'jobTreatments' => function ($q) use ($workerId) {
                $q->where('worker_id', $workerId)
                    ->with(['treatment', 'worker', 'vendor'])
                    ->orderBy('sequence');
            },
        ])
        ->latest()
        ->get();

        return response()->json([
            'summary' => [
                'total_assigned_treatments' => $totalAssigned,
                'total_treatments' => $totalAssigned,
                'internal_treatments' => $internal,
                'vendor_treatments' => $vendor,
                'in_progress' => $inProgress,
                'pending' => $pending,
                'completed' => $completed,
                'rework_tasks' => $reworkCount,
            ],
            'active_jobs' => $activeJobs,
        ]);
    }

    public function qc(Request $request)
    {
        $qcId = $request->user()->id;

        $pendingInspectionCount = Job::where('status', 'qc')->count();
        $reworkCount = Job::where('status', 'rework')->count();
        $completedCount = Job::where('status', 'completed')->count();

        $myInspectionsCount = QcInspection::where('qc_id', $qcId)->count();
        $passedCount = QcInspection::where('qc_id', $qcId)->where('result', 'sesuai')->count();
        $failedCount = QcInspection::where('qc_id', $qcId)->where('result', 'tidak_sesuai')->count();

        $pendingJobs = Job::where('status', 'qc')
            ->with(['item', 'qrCode', 'jobTreatments.treatment', 'jobTreatments.worker'])
            ->latest()
            ->get();

        $recentInspections = QcInspection::with(['job.item', 'failedJobTreatment.treatment'])
            ->where('qc_id', $qcId)
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'summary' => [
                'pending_inspections' => $pendingInspectionCount,
                'rework_jobs' => $reworkCount,
                'completed_jobs' => $completedCount,
                'my_inspections' => $myInspectionsCount,
                'passed_inspections' => $passedCount,
                'failed_inspections' => $failedCount,
            ],
            'pending_jobs' => $pendingJobs,
            'recent_inspections' => $recentInspections,
        ]);
    }
}
