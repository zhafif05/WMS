<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use App\Models\User;
use App\Models\Item;
use App\Models\Treatment;
use App\Models\Vendor;
use App\Models\Job;
use App\Models\JobTreatment;
use App\Models\QrCode;

class WmsWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $worker1;
    protected $worker2;
    protected $worker3;
    protected $qc;
    protected $item;
    protected $treatment1;
    protected $treatment2;
    protected $vendor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin@test.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        $this->worker1 = User::create([
            'name' => 'Worker One',
            'email' => 'worker1@test.com',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'is_active' => true,
        ]);

        $this->worker2 = User::create([
            'name' => 'Worker Two',
            'email' => 'worker2@test.com',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'is_active' => true,
        ]);

        $this->worker3 = User::create([
            'name' => 'Worker Three',
            'email' => 'worker3@test.com',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'is_active' => true,
        ]);

        $this->qc = User::create([
            'name' => 'QC Test',
            'email' => 'qc@test.com',
            'password' => bcrypt('password123'),
            'role' => 'qc',
            'is_active' => true,
        ]);

        $this->item = Item::create([
            'item_code' => 'ITM-TEST-001',
            'item_name' => 'Turbine Pump Test',
            'brand' => 'Grundfos',
            'model' => 'CR-15',
        ]);

        $this->treatment1 = Treatment::create([
            'treatment_name' => 'Machining Impeller',
            'description' => 'Bubut impeller presisi',
            'estimated_duration' => '120 menit',
        ]);

        $this->treatment2 = Treatment::create([
            'treatment_name' => 'Balancing Rotor',
            'description' => 'Balancing dinamis',
            'estimated_duration' => '60 menit',
        ]);

        $this->vendor = Vendor::create([
            'vendor_name' => 'PT Vendor Test',
            'contact_person' => 'Bpk. Vendor',
            'phone' => '081200000000',
        ]);

        $this->worker1->treatmentSkills()->sync([$this->treatment1->id, $this->treatment2->id]);
        $this->worker2->treatmentSkills()->sync([$this->treatment1->id, $this->treatment2->id]);
        $this->worker3->treatmentSkills()->sync([$this->treatment1->id, $this->treatment2->id]);
        $this->vendor->treatments()->sync([$this->treatment1->id, $this->treatment2->id]);
    }

    // 1. Login berhasil dan gagal
    public function test_login_success_and_failure()
    {
        $failRes = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'wrongpassword',
        ]);
        $failRes->assertStatus(422);

        $successRes = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'password123',
        ]);
        $successRes->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);
    }

    // 2. Logout & 3. Pengambilan data user
    public function test_authenticated_user_me_and_logout()
    {
        $login = $this->postJson('/api/login', [
            'email' => 'worker1@test.com',
            'password' => 'password123',
        ]);
        $token = $login->json('token');

        $meRes = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/me');
        $meRes->assertStatus(200)
            ->assertJsonPath('user.email', 'worker1@test.com')
            ->assertJsonPath('user.role', 'worker');

        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $token)->postJson('/api/logout');
        $logoutRes->assertStatus(200);

        // Clear in-memory test guard cache
        $this->app['auth']->forgetGuards();

        // Access after logout is unauthorized
        $afterRes = $this->withHeader('Authorization', 'Bearer ' . $token)->getJson('/api/me');
        $afterRes->assertStatus(401);
    }

    // 4. Hak akses berdasarkan role: Worker tidak bisa akses fitur Admin
    public function test_worker_cannot_access_admin_routes()
    {
        $res = $this->actingAs($this->worker1, 'sanctum')->getJson('/api/users');
        $res->assertStatus(403);

        $resAdmin = $this->actingAs($this->admin, 'sanctum')->getJson('/api/users');
        $resAdmin->assertStatus(200);
    }

    // 5. Admin membuat Job & 6. Job memiliki satu QR Code unik
    public function test_admin_creates_job_with_single_qr_and_treatments()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/jobs', [
            'item_id' => $this->item->id,
            'problem_description' => 'Getaran tinggi pada poros pompa',
            'initial_condition' => 'Bearing macet dan housing tergores',
            'analysis' => 'Perlu pembubutan impeller dan balancing rotor',
            'treatments' => [
                [
                    'treatment_id' => $this->treatment1->id,
                    'worker_id' => $this->worker1->id,
                    'execution_type' => 'internal',
                    'sequence' => 1,
                ],
                [
                    'treatment_id' => $this->treatment2->id,
                    'worker_id' => $this->worker2->id,
                    'execution_type' => 'internal',
                    'sequence' => 2,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $jobId = $res->json('job.id');
        $this->assertDatabaseHas('jobs', ['id' => $jobId, 'status' => 'treatment']);

        // Assert single QR code exists
        $qrCodesCount = QrCode::where('job_id', $jobId)->count();
        $this->assertEquals(1, $qrCodesCount);

        // 7. Token QR dapat digunakan untuk mencari Job
        $token = $res->json('job.qr_code.token');
        $qrScan = $this->actingAs($this->worker1, 'sanctum')->getJson('/api/qr/' . $token);
        $qrScan->assertStatus(200)
            ->assertJsonPath('job_id', $jobId);

        // 8. Worker yang tidak ditugaskan tidak dapat scan / melihat Job ini
        $otherWorker = User::create([
            'name' => 'Stranger Worker',
            'email' => 'stranger@test.com',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'is_active' => true,
        ]);
        $unauthScan = $this->actingAs($otherWorker, 'sanctum')->getJson('/api/qr/' . $token);
        $unauthScan->assertStatus(403);
    }

    // 9. Worker memulai dan menyelesaikan treatment
    // 10. Status Job berubah menjadi QC setelah seluruh treatment selesai
    // 11. QC melakukan inspeksi, 12. Hasil Sesuai -> completed, 13. Hasil Tidak Sesuai -> rework
    // 14. Rework berjalan benar & 15. Riwayat inspeksi tersimpan
    public function test_full_workflow_from_worker_to_qc_and_rework()
    {
        // Setup a Job with 1 treatment assigned to worker1
        $job = Job::create([
            'job_number' => 'JOB-2026-TEST',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Bocor seal',
            'status' => 'treatment',
        ]);
        QrCode::create([
            'job_id' => $job->id,
            'token' => 'QR-TOKEN-TEST-12345',
        ]);
        $jt = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        // Worker1 starts treatment
        $startRes = $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/start", [
                'notes' => 'Mulai pengerjaan bubut',
            ]);
        $startRes->assertStatus(200);
        $this->assertNotNull($jt->fresh()->started_at);

        // Worker1 finishes treatment
        $finishRes = $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Selesai pengerjaan bubut presisi',
            ]);
        $finishRes->assertStatus(200);

        // Verify Job status automatically transitioned to QC
        $this->assertEquals('qc', $job->fresh()->status);

        // QC performs inspection: TIDAK SESUAI (First Inspection)
        $qcRes1 = $this->actingAs($this->qc, 'sanctum')
            ->postJson("/api/qc/jobs/{$job->id}/inspections", [
                'result' => 'tidak_sesuai',
                'notes' => 'Toleransi dimensi masih lebih 0.08mm, perlu diratakan kembali',
                'failed_job_treatment_id' => $jt->id,
            ]);
        $qcRes1->assertStatus(201);

        // Verify Job is now rework, and treatment reopened
        $this->assertEquals('rework', $job->fresh()->status);
        $this->assertNull($jt->fresh()->completed_at);

        // Worker performs rework
        $reworkRes = $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/rework", [
                'notes' => 'Perbaikan ulang dimensi impeller',
            ]);
        $reworkRes->assertStatus(200);

        // Worker finishes rework
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Rework selesai dengan toleransi 0.01mm',
            ]);
        $this->assertEquals('qc', $job->fresh()->status);

        // QC re-inspects: SESUAI (Second Inspection)
        $qcRes2 = $this->actingAs($this->qc, 'sanctum')
            ->postJson("/api/qc/jobs/{$job->id}/inspections", [
                'result' => 'sesuai',
                'notes' => 'Dimensi presisi dan lolos uji run-out',
            ]);
        $qcRes2->assertStatus(201);

        // Verify Job is now completed
        $this->assertEquals('completed', $job->fresh()->status);

        // Verify both inspections are preserved in history (total 2 records)
        $this->assertEquals(2, $job->qcInspections()->count());
    }

    // 16. Dokumen berhasil diunggah dan diakses
    public function test_document_upload_and_delete()
    {
        Storage::fake('public');

        $job = Job::create([
            'job_number' => 'JOB-DOC-TEST',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Test doc',
            'status' => 'treatment',
        ]);

        $jobTreatment = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $file = UploadedFile::fake()->image('kondisi_mesin.jpg', 600, 600);

        $uploadRes = $this->actingAs($this->worker1, 'sanctum')
            ->postJson('/api/documents', [
                'job_id' => $job->id,
                'job_treatment_id' => $jobTreatment->id,
                'file' => $file,
                'description' => 'Foto dokumentasi kondisi fisik awal',
            ]);

        $uploadRes->assertStatus(201);
        $docId = $uploadRes->json('document.id');

        $this->assertDatabaseHas('job_documents', ['id' => $docId]);

        // Dokumentasi treatment otomatis membuat catatan aktivitas.
        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jobTreatment->id,
            'worker_id' => $this->worker1->id,
            'activity_source' => 'internal_documentation',
        ]);

        // Worker deletes own document
        $delRes = $this->actingAs($this->worker1, 'sanctum')
            ->deleteJson("/api/documents/{$docId}");
        $delRes->assertStatus(200);
        $this->assertDatabaseMissing('job_documents', ['id' => $docId]);
    }

    // 17. Treatment vendor wajib memiliki Worker PIC dan muncul di Pekerjaan Saya
    public function test_vendor_treatment_requires_pic_and_appears_in_worker_jobs()
    {
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/jobs', [
            'item_id' => $this->item->id,
            'problem_description' => 'Poros spindle perlu machining presisi',
            'initial_condition' => 'Run-out tinggi',
            'analysis' => 'Diserahkan ke vendor dengan PIC internal',
            'treatments' => [
                [
                    'treatment_id' => $this->treatment1->id,
                    'worker_id' => $this->worker1->id,
                    'execution_type' => 'vendor',
                    'vendor_id' => $this->vendor->id,
                    'sequence' => 1,
                ],
                [
                    'treatment_id' => $this->treatment2->id,
                    'worker_id' => $this->worker2->id,
                    'execution_type' => 'internal',
                    'sequence' => 2,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $jobId = $res->json('job.id');

        $this->assertDatabaseHas('job_treatments', [
            'job_id' => $jobId,
            'worker_id' => $this->worker1->id,
            'vendor_id' => $this->vendor->id,
            'execution_type' => 'vendor',
        ]);

        // Worker1 (PIC vendor) melihat treatment vendor di Pekerjaan Saya.
        $jobsRes = $this->actingAs($this->worker1, 'sanctum')->getJson('/api/worker/jobs');
        $jobsRes->assertStatus(200);
        $jobsRes->assertJsonPath('0.id', $jobId);
        $jobsRes->assertJsonPath('0.job_treatments.0.execution_type', 'vendor');
        $jobsRes->assertJsonPath('0.job_treatments.0.vendor.vendor_name', 'PT Vendor Test');
        $jobsRes->assertJsonPath('0.job_treatments.0.worker.name', 'Worker One');

        // Worker2 tidak melihat treatment vendor milik Worker1.
        $jobsRes2 = $this->actingAs($this->worker2, 'sanctum')->getJson('/api/worker/jobs');
        $jobsRes2->assertStatus(200);
        $jobsRes2->assertJsonPath('0.job_treatments.0.execution_type', 'internal');

        // Filter execution_type vendor hanya menampilkan pekerjaan vendor.
        $vendorOnly = $this->actingAs($this->worker1, 'sanctum')
            ->getJson('/api/worker/jobs?execution_type=vendor');
        $vendorOnly->assertStatus(200);
        $vendorOnly->assertJsonPath('0.job_treatments.0.execution_type', 'vendor');
    }

    // 18. Worker PIC dapat mencatat koordinasi, progres, dokumentasi, dan verifikasi vendor
    public function test_vendor_pic_can_record_activities_and_verify_completion()
    {
        Storage::fake('public');

        $job = Job::create([
            'job_number' => 'JOB-VENDOR-TEST',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Vendor machining',
            'status' => 'treatment',
        ]);

        $jt = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => $this->vendor->id,
            'execution_type' => JobTreatment::EXECUTION_VENDOR,
            'sequence' => 1,
        ]);

        // Detail treatment vendor dapat dibuka PIC.
        $detailRes = $this->actingAs($this->worker1, 'sanctum')
            ->getJson("/api/worker/treatments/{$jt->id}");
        $detailRes->assertStatus(200)
            ->assertJsonPath('execution_type', 'vendor')
            ->assertJsonPath('vendor.vendor_name', 'PT Vendor Test')
            ->assertJsonPath('worker.name', 'Worker One');

        // Start pemantauan.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/start", [
                'notes' => 'Pemantauan vendor dimulai',
            ])->assertStatus(200);

        // Koordinasi.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/progress", [
                'notes' => 'Konfirmasi jadwal pengerjaan ke vendor',
                'activity_type' => 'coordination',
            ])->assertStatus(200);

        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jt->id,
            'worker_id' => $this->worker1->id,
            'activity_source' => 'vendor_coordination',
        ]);

        // Progress.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/progress", [
                'notes' => 'Vendor mulai pembubutan poros',
                'activity_type' => 'progress',
            ])->assertStatus(200);

        // Dokumentasi vendor.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson('/api/documents', [
                'job_id' => $job->id,
                'job_treatment_id' => $jt->id,
                'file' => UploadedFile::fake()->image('vendor_progress.jpg'),
                'description' => 'Foto progres vendor',
            ])->assertStatus(201);

        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jt->id,
            'activity_source' => 'vendor_documentation',
        ]);

        // Tidak boleh selesai tanpa verifikasi.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Barang diterima kembali',
                'verified' => false,
            ])->assertStatus(422);

        // Verifikasi dan selesai.
        $finishRes = $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Hasil vendor diverifikasi, dimensi sesuai',
                'verified' => true,
            ]);
        $finishRes->assertStatus(200);

        $this->assertNotNull($jt->fresh()->completed_at);
        $this->assertEquals('qc', $job->fresh()->status);

        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jt->id,
            'worker_id' => $this->worker1->id,
            'activity_source' => 'vendor_verification',
        ]);
    }

    // 19. Otorisasi: Worker lain tidak dapat mengakses / mengubah treatment
    public function test_worker_cannot_access_or_modify_other_workers_treatment()
    {
        $job = Job::create([
            'job_number' => 'JOB-SECURITY-TEST',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Security test',
            'status' => 'treatment',
        ]);

        $jt = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        // Worker2 tidak boleh melihat detail treatment Worker1.
        $this->actingAs($this->worker2, 'sanctum')
            ->getJson("/api/worker/treatments/{$jt->id}")
            ->assertStatus(403);

        // Worker2 tidak boleh mencatat progres.
        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/progress", [
                'notes' => 'Mencoba mengubah',
            ])->assertStatus(403);

        // Worker2 tidak boleh menyelesaikan.
        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Mencoba selesai',
            ])->assertStatus(403);

        // Worker tidak boleh mengganti PIC / vendor melalui endpoint admin.
        $this->actingAs($this->worker1, 'sanctum')
            ->putJson("/api/jobs/{$job->id}/treatments/{$jt->id}", [
                'worker_id' => $this->worker2->id,
                'execution_type' => 'internal',
            ])->assertStatus(403);
    }

    // 20. Dashboard Worker menghitung per treatment, termasuk vendor
    public function test_worker_dashboard_counts_treatments_including_vendor()
    {
        $job = Job::create([
            'job_number' => 'JOB-DASHBOARD-TEST',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Dashboard test',
            'status' => 'treatment',
        ]);

        JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => $this->vendor->id,
            'execution_type' => JobTreatment::EXECUTION_VENDOR,
            'sequence' => 2,
        ]);

        $res = $this->actingAs($this->worker1, 'sanctum')->getJson('/api/dashboard/worker');

        $res->assertStatus(200)
            ->assertJsonPath('summary.total_assigned_treatments', 2)
            ->assertJsonPath('summary.internal_treatments', 1)
            ->assertJsonPath('summary.vendor_treatments', 1)
            ->assertJsonPath('summary.pending', 2)
            ->assertJsonPath('summary.in_progress', 0)
            ->assertJsonPath('summary.completed', 0);
    }

    // 21. QC melihat vendor dan PIC internal pada detail inspeksi
    public function test_qc_detail_shows_vendor_and_internal_pic()
    {
        $job = Job::create([
            'job_number' => 'JOB-QC-VENDOR-TEST',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'QC vendor view',
            'status' => 'qc',
        ]);

        $jt = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => $this->vendor->id,
            'execution_type' => JobTreatment::EXECUTION_VENDOR,
            'sequence' => 1,
            'started_at' => now()->subDay(),
            'completed_at' => now(),
        ]);

        $res = $this->actingAs($this->qc, 'sanctum')
            ->getJson("/api/qc/jobs/{$job->id}");

        $res->assertStatus(200)
            ->assertJsonPath('job_treatments.0.execution_type', 'vendor')
            ->assertJsonPath('job_treatments.0.vendor.vendor_name', 'PT Vendor Test')
            ->assertJsonPath('job_treatments.0.worker.name', 'Worker One');
    }

    // 22. Serial execution: dua Worker dalam satu Job tidak boleh bersamaan
    public function test_serial_execution_blocks_second_treatment_until_first_finishes()
    {
        $job = Job::create([
            'job_number' => 'JOB-SERIAL-A',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Serial execution test A',
            'status' => 'treatment',
        ]);

        $t1 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $t2 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker2->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 2,
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/start")
            ->assertStatus(200);

        $this->assertEquals('in_progress', $t1->fresh()->status);

        $blocked = $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$t2->id}/start");

        $blocked->assertStatus(409)
            ->assertJsonPath('active_treatment.id', $t1->id)
            ->assertJsonPath('active_treatment.worker_name', 'Worker One')
            ->assertJsonPath('active_treatment.execution_type', 'internal');

        $this->assertNull($t2->fresh()->started_at);
        $this->assertEquals(
            1,
            JobTreatment::where('job_id', $job->id)
                ->whereNotNull('started_at')
                ->whereNull('completed_at')
                ->count()
        );

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/finish", [
                'notes' => 'Treatment pertama selesai',
            ])
            ->assertStatus(200);

        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$t2->id}/start")
            ->assertStatus(200);

        $this->assertEquals('in_progress', $t2->fresh()->status);
    }

    // 23. Serial execution: urutan treatment fleksibel (tidak harus sequence terkecil)
    public function test_serial_execution_allows_flexible_order()
    {
        $treatment3 = Treatment::create([
            'treatment_name' => 'Pengecatan Akhir',
            'description' => 'Pengecatan dan finishing',
            'estimated_duration' => '90 menit',
        ]);

        $job = Job::create([
            'job_number' => 'JOB-SERIAL-B',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Serial execution test B',
            'status' => 'treatment',
        ]);

        $t1 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $t2 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker2->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 2,
        ]);

        $t3 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $treatment3->id,
            'worker_id' => $this->worker3->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 3,
        ]);

        // Treatment nomor 3 dikerjakan lebih dulu.
        $this->actingAs($this->worker3, 'sanctum')
            ->postJson("/api/worker/treatments/{$t3->id}/start")
            ->assertStatus(200);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/start")
            ->assertStatus(409);

        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$t2->id}/start")
            ->assertStatus(409);

        $this->actingAs($this->worker3, 'sanctum')
            ->postJson("/api/worker/treatments/{$t3->id}/finish")
            ->assertStatus(200);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/start")
            ->assertStatus(200);

        $this->assertNull($t2->fresh()->started_at);
    }

    // 24. Serial execution berlaku per Job, bukan global
    public function test_serial_execution_is_per_job_not_global()
    {
        $jobA = Job::create([
            'job_number' => 'JOB-SERIAL-C-A',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Job A',
            'status' => 'treatment',
        ]);

        $jobB = Job::create([
            'job_number' => 'JOB-SERIAL-C-B',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Job B',
            'status' => 'treatment',
        ]);

        $tA = JobTreatment::create([
            'job_id' => $jobA->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $tB = JobTreatment::create([
            'job_id' => $jobB->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker2->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$tA->id}/start")
            ->assertStatus(200);

        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$tB->id}/start")
            ->assertStatus(200);

        $this->assertEquals('in_progress', $tA->fresh()->status);
        $this->assertEquals('in_progress', $tB->fresh()->status);
    }

    // 25. Serial execution juga berlaku untuk treatment Vendor
    public function test_vendor_serial_execution_blocks_internal_treatment()
    {
        $job = Job::create([
            'job_number' => 'JOB-SERIAL-D',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Serial execution vendor',
            'status' => 'treatment',
        ]);

        $vendorTreatment = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'vendor_id' => $this->vendor->id,
            'execution_type' => JobTreatment::EXECUTION_VENDOR,
            'sequence' => 1,
        ]);

        $internalTreatment = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker2->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 2,
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$vendorTreatment->id}/start")
            ->assertStatus(200);

        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$internalTreatment->id}/start")
            ->assertStatus(409)
            ->assertJsonPath('active_treatment.execution_type', 'vendor');

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$vendorTreatment->id}/finish", [
                'notes' => 'Hasil vendor diverifikasi',
                'verified' => true,
            ])
            ->assertStatus(200);

        $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$internalTreatment->id}/start")
            ->assertStatus(200);
    }

    // 26. Rework mengikuti serial execution dan riwayat lama tetap utuh
    public function test_rework_resets_treatment_and_obeys_serial_execution()
    {
        $job = Job::create([
            'job_number' => 'JOB-SERIAL-E',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Serial execution rework',
            'status' => 'treatment',
        ]);

        $jt = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/start")
            ->assertStatus(200);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Selesai awal',
            ])
            ->assertStatus(200);

        $this->assertEquals('qc', $job->fresh()->status);

        $this->actingAs($this->qc, 'sanctum')
            ->postJson("/api/qc/jobs/{$job->id}/inspections", [
                'result' => 'tidak_sesuai',
                'notes' => 'Perlu rework',
                'failed_job_treatment_id' => $jt->id,
            ])
            ->assertStatus(201);

        $this->assertEquals('rework', $job->fresh()->status);
        $this->assertNull($jt->fresh()->started_at);
        $this->assertNull($jt->fresh()->completed_at);
        $this->assertEquals('pending', $jt->fresh()->status);

        // QC belum boleh memeriksa sebelum rework selesai.
        $this->actingAs($this->qc, 'sanctum')
            ->postJson("/api/qc/jobs/{$job->id}/inspections", [
                'result' => 'tidak_sesuai',
                'notes' => 'Mencoba inspeksi saat rework belum selesai',
                'failed_job_treatment_id' => $jt->id,
            ])
            ->assertStatus(422);

        // Start biasa tidak boleh dipakai saat Job rework.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/start")
            ->assertStatus(422);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/rework", [
                'notes' => 'Memulai perbaikan ulang',
            ])
            ->assertStatus(200);

        $this->assertEquals('in_progress', $jt->fresh()->status);
        $this->assertEquals('treatment', $job->fresh()->status);
        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jt->id,
            'action_type' => 'rework',
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Rework selesai',
            ])
            ->assertStatus(200);

        $this->assertEquals('qc', $job->fresh()->status);

        $this->actingAs($this->qc, 'sanctum')
            ->postJson("/api/qc/jobs/{$job->id}/inspections", [
                'result' => 'sesuai',
                'notes' => 'Rework sesuai',
            ])
            ->assertStatus(201);

        $this->assertEquals('completed', $job->fresh()->status);

        // Riwayat awal tidak hilang.
        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jt->id,
            'action_type' => 'start',
        ]);
        $this->assertDatabaseHas('treatment_logs', [
            'job_treatment_id' => $jt->id,
            'action_type' => 'finish',
        ]);
    }

    // 27. Hanya satu treatment in_progress pada Job yang sama
    public function test_only_one_treatment_can_be_in_progress_per_job()
    {
        $job = Job::create([
            'job_number' => 'JOB-SERIAL-F',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Concurrent request test',
            'status' => 'treatment',
        ]);

        $t1 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $t2 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker2->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 2,
        ]);

        // Dua request start berurutan cepat. Lock Job memastikan hanya satu
        // yang boleh mengubah status treatment menjadi in_progress.
        $first = $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/start");
        $second = $this->actingAs($this->worker2, 'sanctum')
            ->postJson("/api/worker/treatments/{$t2->id}/start");

        $first->assertStatus(200);
        $second->assertStatus(409);

        $this->assertEquals(
            1,
            JobTreatment::where('job_id', $job->id)
                ->whereNotNull('started_at')
                ->whereNull('completed_at')
                ->count()
        );

        // Start ulang treatment yang sudah berjalan juga ditolak.
        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/start")
            ->assertStatus(422);
    }

    // 28. API Pekerjaan Saya dan detail treatment mengekspos active_treatment
    public function test_worker_jobs_and_detail_expose_active_treatment_lock()
    {
        $job = Job::create([
            'job_number' => 'JOB-SERIAL-G',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Active treatment info',
            'status' => 'treatment',
        ]);

        $t1 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $t2 = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment2->id,
            'worker_id' => $this->worker2->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 2,
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$t1->id}/start")
            ->assertStatus(200);

        $jobsRes = $this->actingAs($this->worker2, 'sanctum')
            ->getJson('/api/worker/jobs');

        $jobsRes->assertStatus(200)
            ->assertJsonPath('0.active_treatment.id', $t1->id)
            ->assertJsonPath('0.active_treatment.worker_name', 'Worker One')
            ->assertJsonPath('0.job_treatments.0.status', 'pending');

        $detailRes = $this->actingAs($this->worker2, 'sanctum')
            ->getJson("/api/worker/treatments/{$t2->id}");

        $detailRes->assertStatus(200)
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('job.active_treatment.id', $t1->id);
    }

    // 29. Progress dan finish hanya boleh pada treatment yang sudah dimulai
    public function test_progress_and_finish_require_started_treatment()
    {
        $job = Job::create([
            'job_number' => 'JOB-SERIAL-H',
            'item_id' => $this->item->id,
            'created_by' => $this->admin->id,
            'problem_description' => 'Progress guard',
            'status' => 'treatment',
        ]);

        $jt = JobTreatment::create([
            'job_id' => $job->id,
            'treatment_id' => $this->treatment1->id,
            'worker_id' => $this->worker1->id,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
        ]);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/progress", [
                'notes' => 'Belum dimulai',
            ])
            ->assertStatus(422);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Belum dimulai',
            ])
            ->assertStatus(422);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/start")
            ->assertStatus(200);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/progress", [
                'notes' => 'Progres berjalan',
            ])
            ->assertStatus(200);

        $this->actingAs($this->worker1, 'sanctum')
            ->postJson("/api/worker/treatments/{$jt->id}/finish", [
                'notes' => 'Selesai',
            ])
            ->assertStatus(200);
    }
}
