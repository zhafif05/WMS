<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Item;
use App\Models\Treatment;
use App\Models\Vendor;
use App\Models\Job;
use App\Models\JobTreatment;
use App\Models\QrCode;
use App\Models\TreatmentLog;
use App\Models\QcInspection;
use App\Models\JobEvent;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Users
        $admin = User::create([
            'name' => 'Admin Utama',
            'email' => 'admin@elmech.co.id',
            'password' => Hash::make('password123'),
            'phone' => '081122334455',
            'role' => 'admin',
            'is_active' => true,
        ]);

        $worker1 = User::create([
            'name' => 'Budi Santoso',
            'email' => 'budi.worker@elmech.co.id',
            'password' => Hash::make('password123'),
            'phone' => '081234567891',
            'role' => 'worker',
            'is_active' => true,
        ]);

        $worker2 = User::create([
            'name' => 'Agus Setiawan',
            'email' => 'agus.worker@elmech.co.id',
            'password' => Hash::make('password123'),
            'phone' => '081234567892',
            'role' => 'worker',
            'is_active' => true,
        ]);

        $qc = User::create([
            'name' => 'Siti Nurhaliza',
            'email' => 'siti.qc@elmech.co.id',
            'password' => Hash::make('password123'),
            'phone' => '081398765432',
            'role' => 'qc',
            'is_active' => true,
        ]);

        // 2. Items
        $item1 = Item::create([
            'item_code' => 'ITM-MC-001',
            'item_name' => 'CNC Milling 3-Axis Spindle Head',
            'brand' => 'Makino',
            'model' => 'V33i',
            'serial_number' => 'SN-MK-99214',
            'description' => 'Mesin milling presisi tinggi, keluhan getaran abnormal di atas 4000 RPM.',
        ]);

        $item2 = Item::create([
            'item_code' => 'ITM-MC-002',
            'item_name' => 'Hydraulic Axial Piston Pump 200 Bar',
            'brand' => 'Rexroth',
            'model' => 'A10VSO-71',
            'serial_number' => 'SN-RX-44812',
            'description' => 'Tekanan hidrolik drop di bawah beban kerja berat, terdapat kebocoran seal primer.',
        ]);

        $item3 = Item::create([
            'item_code' => 'ITM-MC-003',
            'item_name' => 'Industrial Electric Motor 15kW Heavy Duty',
            'brand' => 'Siemens',
            'model' => '1LE1002-1DB2',
            'serial_number' => 'SN-SM-77319',
            'description' => 'Overheating dan suara dengung keras pada bearing sisi non-drive end.',
        ]);

        // 3. Treatments
        $trt1 = Treatment::create([
            'treatment_name' => 'Welding & Rekonstruksi Fabrikasi',
            'description' => 'Pengelasan argon TIG dan rekonstruksi struktur metal dudukan',
            'estimated_duration' => '180 menit',
        ]);

        $trt2 = Treatment::create([
            'treatment_name' => 'Precision Machining & Grinding',
            'description' => 'Pembubutan presisi poros spindle toleransi mikron',
            'estimated_duration' => '240 menit',
        ]);

        $trt3 = Treatment::create([
            'treatment_name' => 'Dynamic Balancing Spindle Rotor',
            'description' => 'Uji getaran dinamis ISO 1940 dan penyeimbangan rotor',
            'estimated_duration' => '120 menit',
        ]);

        $trt4 = Treatment::create([
            'treatment_name' => 'Overhaul Kelistrikan & Rewinding',
            'description' => 'Penggulungan ulang stator kawat tembaga dan pernis isolasi oven',
            'estimated_duration' => '300 menit',
        ]);

        // 4. Vendors
        $vendor1 = Vendor::create([
            'vendor_name' => 'PT Precision Part Surabaya',
            'contact_person' => 'Bpk. Hendro',
            'phone' => '081234567890',
            'email' => 'hendro@precisionpart.co.id',
            'address' => 'Jl. Rungkut Industri No. 12, Surabaya',
        ]);

        $vendor2 = Vendor::create([
            'vendor_name' => 'Bengkel Bubut Makmur Jaya',
            'contact_person' => 'Ibu Lilik',
            'phone' => '082198765432',
            'email' => 'lilik@makmurjaya.com',
            'address' => 'Kawasan Industri Gresik Kav. 4',
        ]);

        // 5. Sample Job 1 (Active in Treatment phase)
        $job1 = Job::create([
            'job_number' => 'JOB-2026-0001',
            'item_id' => $item1->id,
            'created_by' => $admin->id,
            'problem_description' => 'Spindle getar pada kecepatan tinggi, hasil milling kasar.',
            'initial_condition' => 'Run-out spindle terukur 0.05mm, bearing terasa seret.',
            'analysis' => 'Perlu re-machining dudukan bearing dan balancing poros utama.',
            'received_at' => now()->subDays(2),
            'status' => 'treatment',
        ]);

        QrCode::create([
            'job_id' => $job1->id,
            'token' => 'QR-JOB-2026-0001-' . substr(md5($job1->id . 'elmech'), 0, 12),
        ]);

        JobEvent::create([
            'job_id' => $job1->id,
            'user_id' => $admin->id,
            'event_type' => 'status_change',
            'old_status' => 'received',
            'new_status' => 'analysis',
            'description' => 'Job didaftarkan dan mulai dianalisis oleh Admin',
            'created_at' => now()->subDays(2),
        ]);

        JobEvent::create([
            'job_id' => $job1->id,
            'user_id' => $admin->id,
            'event_type' => 'status_change',
            'old_status' => 'analysis',
            'new_status' => 'treatment',
            'description' => 'Rencana treatment disetujui, siap dikerjakan Worker',
            'created_at' => now()->subDays(1),
        ]);

        $jt1 = JobTreatment::create([
            'job_id' => $job1->id,
            'treatment_id' => $trt2->id,
            'worker_id' => $worker1->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
            'started_at' => now()->subHours(5),
            'completed_at' => null,
        ]);

        TreatmentLog::create([
            'job_treatment_id' => $jt1->id,
            'worker_id' => $worker1->id,
            'action_type' => 'start',
            'activity_source' => TreatmentLog::SOURCE_INTERNAL,
            'notes' => 'Pengerjaan pembubutan poros spindle dimulai.',
            'created_at' => now()->subHours(5),
        ]);

        $jt2 = JobTreatment::create([
            'job_id' => $job1->id,
            'treatment_id' => $trt3->id,
            'worker_id' => $worker2->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 2,
            'started_at' => null,
            'completed_at' => null,
        ]);

        // Treatment vendor: Vendor mengerjakan fisik, Worker tetap PIC internal.
        $jtVendor = JobTreatment::create([
            'job_id' => $job1->id,
            'treatment_id' => $trt4->id,
            'worker_id' => $worker2->id,
            'vendor_id' => $vendor1->id,
            'execution_type' => JobTreatment::EXECUTION_VENDOR,
            'sequence' => 3,
            'started_at' => null,
            'completed_at' => null,
        ]);

        TreatmentLog::create([
            'job_treatment_id' => $jtVendor->id,
            'worker_id' => $worker2->id,
            'action_type' => 'progress',
            'activity_source' => TreatmentLog::SOURCE_VENDOR_COORDINATION,
            'notes' => 'Koordinasi awal jadwal pengerjaan dengan PT Precision Part Surabaya.',
            'created_at' => now()->subHours(3),
        ]);

        // 6. Sample Job 2 (Ready for QC)
        $job2 = Job::create([
            'job_number' => 'JOB-2026-0002',
            'item_id' => $item2->id,
            'created_by' => $admin->id,
            'problem_description' => 'Pompa hidrolik bocor dan tekanan tidak stabil.',
            'initial_condition' => 'Oli merembes di flange, seal kit aus total.',
            'analysis' => 'Ganti seal kit dan pengelasan retakan casing pompa.',
            'received_at' => now()->subDays(4),
            'status' => 'qc',
        ]);

        QrCode::create([
            'job_id' => $job2->id,
            'token' => 'QR-JOB-2026-0002-' . substr(md5($job2->id . 'elmech'), 0, 12),
        ]);

        $jt3 = JobTreatment::create([
            'job_id' => $job2->id,
            'treatment_id' => $trt1->id,
            'worker_id' => $worker1->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
            'started_at' => now()->subDays(3),
            'completed_at' => now()->subDays(2),
        ]);

        TreatmentLog::create([
            'job_treatment_id' => $jt3->id,
            'worker_id' => $worker1->id,
            'action_type' => 'finish',
            'activity_source' => TreatmentLog::SOURCE_INTERNAL,
            'notes' => 'Pengelasan retakan casing selesai, uji tekan hidrostatik awal lolos.',
            'created_at' => now()->subDays(2),
        ]);

        JobEvent::create([
            'job_id' => $job2->id,
            'user_id' => $worker1->id,
            'event_type' => 'status_change',
            'old_status' => 'treatment',
            'new_status' => 'qc',
            'description' => 'Seluruh treatment selesai, diteruskan ke Quality Control',
            'created_at' => now()->subDays(1),
        ]);

        // 7. Sample Job 3 (Completed)
        $job3 = Job::create([
            'job_number' => 'JOB-2026-0003',
            'item_id' => $item3->id,
            'created_by' => $admin->id,
            'problem_description' => 'Motor listrik 15kW terbakar lilitan fasa R.',
            'initial_condition' => 'Stator gosong, resistansi isolasi 0 MegaOhm.',
            'analysis' => 'Full rewinding stator dan penggantian bearing SKF.',
            'received_at' => now()->subDays(7),
            'status' => 'completed',
        ]);

        QrCode::create([
            'job_id' => $job3->id,
            'token' => 'QR-JOB-2026-0003-' . substr(md5($job3->id . 'elmech'), 0, 12),
        ]);

        $jt4 = JobTreatment::create([
            'job_id' => $job3->id,
            'treatment_id' => $trt4->id,
            'worker_id' => $worker2->id,
            'vendor_id' => null,
            'execution_type' => JobTreatment::EXECUTION_INTERNAL,
            'sequence' => 1,
            'started_at' => now()->subDays(6),
            'completed_at' => now()->subDays(3),
        ]);

        QcInspection::create([
            'job_id' => $job3->id,
            'qc_id' => $qc->id,
            'result' => 'sesuai',
            'notes' => 'Inspeksi QC lolos: Megger test 500V > 100 MOhm, uji beban no-load arus seimbang dan temperatur stabil 42°C.',
            'inspected_at' => now()->subDays(2),
        ]);

        JobEvent::create([
            'job_id' => $job3->id,
            'user_id' => $qc->id,
            'event_type' => 'status_change',
            'old_status' => 'qc',
            'new_status' => 'completed',
            'description' => 'Inspeksi QC Sesuai. Pekerjaan dinyatakan selesai.',
            'created_at' => now()->subDays(2),
        ]);
    }
}
