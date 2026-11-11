<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\TreatmentController;
use App\Http\Controllers\Api\VendorController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\WorkerController;
use App\Http\Controllers\Api\QcController;
use App\Http\Controllers\Api\QrController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\DashboardController;

/*
|--------------------------------------------------------------------------
| API Routes - CV. ELMECH TECHNOLOGY Workflow Management System
|--------------------------------------------------------------------------
*/

// ================= PUBLIC AUTHENTICATION =================
Route::post('/login', [AuthController::class, 'login']);

// ================= PROTECTED ROUTES =================
Route::middleware('auth:sanctum')->group(function () {
    // Current authenticated user & logout
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/user', [AuthController::class, 'me']); // alias
    Route::post('/logout', [AuthController::class, 'logout']);

    // QR Code Scanner (Role & authorization handled inside controller)
    Route::get('/qr/{token}', [QrController::class, 'scan']);

    // Documents
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    // Common readable resources for dropdowns and views
    Route::get('/items', [ItemController::class, 'index']);
    Route::get('/items/{item}', [ItemController::class, 'show']);
    Route::get('/treatments', [TreatmentController::class, 'index']);
    Route::get('/treatments/{treatment}', [TreatmentController::class, 'show']);
    Route::get('/vendors', [VendorController::class, 'index']);
    Route::get('/vendors/{vendor}', [VendorController::class, 'show']);

    // ================= ADMIN MODULE =================
    Route::middleware('role:admin')->group(function () {
        // Dashboard
        Route::get('/dashboard/admin', [DashboardController::class, 'admin']);

        // Jobs (read) - admin only; Worker & QC memakai endpoint modul masing-masing.
        Route::get('/jobs', [JobController::class, 'index']);
        Route::get('/jobs/{id}', [JobController::class, 'show']);
        Route::get('/jobs/{id}/timeline', [JobController::class, 'timeline']);
        Route::get('/jobs/{id}/qr', [JobController::class, 'qr']);

        // Users Management
        Route::apiResource('users', UserController::class);

        // Master Items Management
        Route::post('/items', [ItemController::class, 'store']);
        Route::put('/items/{item}', [ItemController::class, 'update']);
        Route::delete('/items/{item}', [ItemController::class, 'destroy']);

        // Master Treatments Management
        Route::post('/treatments', [TreatmentController::class, 'store']);
        Route::put('/treatments/{treatment}', [TreatmentController::class, 'update']);
        Route::delete('/treatments/{treatment}', [TreatmentController::class, 'destroy']);

        // Master Vendors Management
        Route::post('/vendors', [VendorController::class, 'store']);
        Route::put('/vendors/{vendor}', [VendorController::class, 'update']);
        Route::delete('/vendors/{vendor}', [VendorController::class, 'destroy']);

        // Opsi penugasan: Worker/Vendor yang kompeten pada suatu Treatment
        Route::get('/treatments/{treatment}/workers', [TreatmentController::class, 'workers']);
        Route::get('/treatments/{treatment}/vendors', [TreatmentController::class, 'vendors']);

        // Kompetensi Treatment Worker (hanya Admin)
        Route::get('/workers/{worker}/skills', [UserController::class, 'skills']);
        Route::put('/workers/{worker}/skills', [UserController::class, 'syncSkills']);
        Route::post('/workers/{worker}/skills', [UserController::class, 'addSkill']);
        Route::delete('/workers/{worker}/skills/{treatment}', [UserController::class, 'removeSkill']);

        // Kompetensi Treatment Vendor (hanya Admin)
        Route::get('/vendors/{vendor}/treatments', [VendorController::class, 'treatments']);
        Route::put('/vendors/{vendor}/treatments', [VendorController::class, 'syncTreatments']);
        Route::post('/vendors/{vendor}/treatments', [VendorController::class, 'addTreatment']);
        Route::delete('/vendors/{vendor}/treatments/{treatment}', [VendorController::class, 'removeTreatment']);

        // Riwayat siklus rework pada satu Job
        Route::get('/jobs/{id}/reworks', [JobController::class, 'reworks']);

        // Jobs Management
        Route::post('/jobs', [JobController::class, 'store']);
        Route::put('/jobs/{job}', [JobController::class, 'update']);
        Route::put('/jobs/{job}/treatments/{jobTreatment}', [JobController::class, 'updateTreatment']);
    });

    // ================= WORKER MODULE =================
    Route::middleware('role:worker,admin')->prefix('worker')->group(function () {
        Route::get('/jobs', [WorkerController::class, 'jobs']);
        Route::get('/jobs/{id}', [WorkerController::class, 'show']);
        Route::get('/jobs/{id}/reworks', [WorkerController::class, 'jobReworks']);
        Route::get('/reworks', [WorkerController::class, 'reworks']);
        Route::get('/history', [WorkerController::class, 'history']);
        Route::get('/treatments/{id}', [WorkerController::class, 'treatment']);
        Route::post('/treatments/{id}/start', [WorkerController::class, 'startTreatment']);
        Route::post('/treatments/{id}/progress', [WorkerController::class, 'progressTreatment']);
        Route::post('/treatments/{id}/finish', [WorkerController::class, 'finishTreatment']);
        Route::post('/treatments/{id}/rework', [WorkerController::class, 'reworkTreatment']);
    });
    Route::middleware('role:worker,admin')->get('/dashboard/worker', [DashboardController::class, 'worker']);

    // ================= QC MODULE =================
    Route::middleware('role:qc,admin')->prefix('qc')->group(function () {
        Route::get('/jobs', [QcController::class, 'jobs']);
        Route::get('/jobs/{id}', [QcController::class, 'show']);
        Route::get('/history', [QcController::class, 'history']);
        Route::get('/jobs/{id}/inspections', [QcController::class, 'inspections']);
        Route::get('/jobs/{id}/rework-options', [QcController::class, 'reworkOptions']);
        Route::post('/jobs/{id}/inspections', [QcController::class, 'submitInspection']);
    });
    Route::middleware('role:qc,admin')->get('/dashboard/qc', [DashboardController::class, 'qc']);
});
