# PROMPT PEMBUATAN WORKFLOW MANAGEMENT SYSTEM CV. ELMECH TECHNOLOGY

Saya ingin membuat sebuah aplikasi berbasis web bernama **Workflow Management System (WMS) CV. ELMECH TECHNOLOGY**.

Aplikasi ini digunakan untuk mengelola proses penerimaan barang, analisis kerusakan, penentuan treatment/perbaikan, pengerjaan oleh Worker, hingga pemeriksaan kualitas oleh QC (Quality Control).

## 1. Teknologi yang Digunakan

Buat aplikasi dengan teknologi berikut:

**Frontend:**
- React.js menggunakan Vite.
- JavaScript atau TypeScript.
- Tailwind CSS untuk styling.
- React Router untuk navigasi halaman.
- Axios untuk komunikasi dengan backend.
- Library QR Code Scanner untuk membaca QR Code melalui kamera.

**Backend:**
- Laravel sebagai REST API.
- Laravel Sanctum untuk autentikasi.
- MySQL sebagai database.
- Laravel Validation untuk validasi input.
- Laravel Storage untuk menyimpan dokumentasi foto atau file.

**Arsitektur aplikasi:**

React (Frontend) → Laravel REST API (Backend) → MySQL (Database)

Frontend dan backend harus dipisahkan dalam dua folder/project berbeda.

## 2. Role dan Hak Akses Pengguna

Aplikasi hanya memiliki tiga role utama:

### A. Admin

Admin bertanggung jawab mengelola seluruh proses pekerjaan.

Fitur Admin:
- Login dan logout.
- Dashboard statistik pekerjaan.
- Mengelola data pengguna (Admin, Worker, QC).
- Mengelola data barang.
- Mencatat barang masuk.
- Membuat Job baru.
- Melakukan analisis kondisi barang.
- Menentukan treatment yang diperlukan.
- Mengatur urutan pengerjaan treatment.
- Menentukan Worker yang bertanggung jawab.
- Menentukan vendor jika treatment dikerjakan pihak eksternal.
- Membuat QR Code untuk setiap Job.
- Melihat progres pekerjaan.
- Melihat riwayat pengerjaan.
- Melihat hasil pemeriksaan QC.
- Memantau pekerjaan yang harus diperbaiki kembali.

### B. Worker

Worker bertanggung jawab mengerjakan treatment yang telah diberikan oleh Admin.

Fitur Worker:
- Login dan logout.
- Melihat dashboard pekerjaan.
- Melihat daftar Job yang ditugaskan kepadanya.
- Scan QR Code untuk membuka detail Job.
- Melihat informasi barang dan instruksi treatment.
- Memulai pengerjaan treatment.
- Mengisi catatan pengerjaan.
- Mengunggah foto dokumentasi.
- Menyelesaikan pengerjaan treatment.
- Melihat riwayat pengerjaan.
- Menerima pekerjaan perbaikan ulang jika hasil QC tidak sesuai.

### C. QC (Quality Control)

QC bertanggung jawab melakukan pemeriksaan terhadap hasil pekerjaan Worker.

Fitur QC:
- Login dan logout.
- Melihat daftar Job yang menunggu pemeriksaan.
- Scan QR Code untuk membuka detail Job.
- Melihat informasi barang.
- Melihat daftar treatment yang sudah dikerjakan.
- Melihat catatan dan dokumentasi pengerjaan Worker.
- Memulai pemeriksaan QC.
- Mengisi catatan hasil pemeriksaan.
- Mengunggah foto dokumentasi QC.
- Menentukan hasil pemeriksaan:
  - Sesuai.
  - Tidak Sesuai.
- Jika tidak sesuai, menentukan treatment yang perlu diperbaiki.
- Jika sesuai, menyelesaikan pemeriksaan QC.

## 3. Alur Kerja Sistem

Buat sistem mengikuti alur berikut:

### Tahap 1: Barang Masuk

1. Admin menerima barang dari pelanggan.
2. Admin memasukkan data barang ke dalam sistem.
3. Admin membuat Job baru untuk barang tersebut.
4. Sistem memberikan nomor Job yang unik.
5. Sistem menyimpan waktu penerimaan dan kondisi awal barang.

### Tahap 2: Analisis Barang

1. Admin melakukan analisis terhadap kondisi barang.
2. Admin mengisi hasil analisis dan kerusakan yang ditemukan.
3. Admin menentukan treatment yang dibutuhkan.
4. Admin dapat memilih lebih dari satu treatment.
5. Admin mengatur urutan pengerjaan treatment.
6. Admin menentukan Worker yang bertanggung jawab untuk setiap treatment.
7. Jika pengerjaan dilakukan pihak eksternal, Admin dapat menentukan vendor.

Contoh treatment:
- Welding.
- Machining.
- Assembling.
- External Vendor.

### Tahap 3: Pembuatan QR Code

1. Setelah data Job dan treatment selesai ditentukan, sistem membuat satu QR Code untuk Job tersebut.
2. Setiap Job hanya memiliki satu QR Code.
3. QR Code berisi token unik yang digunakan untuk mengakses informasi Job melalui sistem.
4. QR Code yang sama digunakan oleh Worker dan QC.
5. QR Code tidak boleh berisi informasi sensitif atau ID database secara langsung.

### Tahap 4: Pengerjaan oleh Worker

1. Worker login ke aplikasi.
2. Worker melihat daftar pekerjaan yang ditugaskan kepadanya.
3. Worker melakukan scan QR Code.
4. Sistem memvalidasi QR Code dan hak akses Worker.
5. Sistem menampilkan informasi Job, data barang, instruksi, dan treatment yang harus dikerjakan.
6. Worker menekan tombol Mulai Pengerjaan.
7. Sistem mencatat waktu mulai pengerjaan.
8. Selama pengerjaan, Worker dapat menambahkan catatan dan mengunggah foto dokumentasi.
9. Setelah selesai, Worker menekan tombol Selesaikan Pengerjaan.
10. Sistem mencatat waktu selesai dan riwayat pengerjaan.
11. Jika semua treatment yang diperlukan telah selesai, Job diteruskan ke tahap QC.

### Tahap 5: Pemeriksaan QC

1. QC login ke aplikasi.
2. QC melakukan scan QR Code yang sama.
3. Sistem menampilkan detail Job dan seluruh riwayat treatment.
4. QC memeriksa hasil pengerjaan Worker.
5. QC dapat melihat catatan dan dokumentasi dari setiap treatment.
6. QC menekan tombol Mulai Pemeriksaan.
7. QC melakukan pemeriksaan dan mengisi catatan.
8. QC dapat mengunggah foto dokumentasi pemeriksaan.
9. QC menentukan hasil pemeriksaan.

**Jika hasil QC Sesuai:**
- Sistem menyimpan hasil pemeriksaan.
- Status utama Job berubah menjadi completed.
- Job dinyatakan selesai.

**Jika hasil QC Tidak Sesuai:**
- QC mengisi catatan ketidaksesuaian.
- QC menentukan treatment yang perlu diperbaiki.
- Job dikembalikan ke tahap perbaikan (rework).
- Worker yang bertanggung jawab menerima pekerjaan perbaikan.
- Worker mengerjakan ulang treatment tersebut.
- Setelah selesai, Job kembali ke tahap QC.
- QC melakukan pemeriksaan ulang.

Proses QC dapat dilakukan berulang sampai hasil pemeriksaan dinyatakan sesuai.

## 4. Database MySQL

Gunakan satu database bernama `workflow_management`.

Buat struktur database berdasarkan tabel berikut:

1. `users`
   - Menyimpan data pengguna dan role (admin, worker, qc).

2. `items`
   - Menyimpan data barang yang diterima.

3. `jobs`
   - Menyimpan data pekerjaan utama, nomor Job, barang, analisis, kondisi awal, dan status keseluruhan Job.

4. `treatments`
   - Menyimpan master data jenis treatment.

5. `vendors`
   - Menyimpan data vendor eksternal.

6. `job_treatments`
   - Menghubungkan Job dengan treatment yang diperlukan, Worker yang bertanggung jawab, vendor jika ada, urutan pengerjaan, serta waktu mulai dan selesai.

7. `qr_codes`
   - Menyimpan satu QR Code untuk setiap Job dengan token unik.

8. `treatment_logs`
   - Menyimpan aktivitas Worker seperti mulai, progres, selesai, dan perbaikan ulang.

9. `qc_inspections`
   - Menyimpan riwayat pemeriksaan QC, hasil pemeriksaan, catatan, dan treatment yang perlu diperbaiki.

10. `job_events`
    - Menyimpan riwayat perubahan status utama Job dan kejadian penting dalam proses pekerjaan.

11. `job_documents`
    - Menyimpan informasi file dokumentasi, seperti foto pengerjaan dan foto pemeriksaan QC.

**Ketentuan database:**
- Gunakan relasi foreign key yang sesuai.
- Gunakan satu database untuk seluruh role.
- Status utama pekerjaan hanya disimpan pada kolom `jobs.status`.
- Gunakan `job_events` untuk mencatat perubahan status dan riwayat kejadian.
- Jangan membuat kolom status terpisah pada tabel treatment, log, atau QC.
- `treatment_logs.action_type` digunakan untuk mencatat jenis aktivitas Worker, bukan status Job.
- `qc_inspections.result` digunakan untuk menyimpan hasil pemeriksaan QC, bukan status Job.
- Satu Job hanya memiliki satu QR Code.
- Satu Job dapat memiliki banyak treatment.
- Satu Job dapat memiliki banyak catatan pengerjaan dan pemeriksaan QC.
- Dokumentasi file disimpan di Laravel Storage, sedangkan database menyimpan nama dan lokasi file.

Status utama pada tabel `jobs`:

- `received` = Barang diterima.
- `analysis` = Sedang dianalisis Admin.
- `treatment` = Sedang dalam proses pengerjaan.
- `qc` = Menunggu atau sedang diperiksa QC.
- `rework` = Memerlukan perbaikan ulang.
- `completed` = Pekerjaan selesai.

## 5. Tampilan Frontend React

Buat tampilan modern, profesional, responsif, dan mudah digunakan.

Gunakan desain dashboard dengan:
- Sidebar navigasi.
- Topbar berisi profil pengguna.
- Dashboard statistik.
- Tabel data dengan fitur pencarian dan filter.
- Form input dan edit data.
- Modal konfirmasi.
- Badge untuk menampilkan status Job.
- Halaman detail Job dengan timeline aktivitas.
- Tampilan QR Code dan fitur scan QR.
- Halaman dokumentasi foto.

Pisahkan dashboard berdasarkan role:

**Admin Dashboard:**
- Dashboard.
- Data Pengguna.
- Data Barang.
- Data Treatment.
- Data Vendor.
- Daftar Job.
- Buat Job.
- Monitoring Pekerjaan.
- Riwayat Job.

**Worker Dashboard:**
- Dashboard.
- Pekerjaan Saya.
- Scan QR Code.
- Detail Pengerjaan.
- Riwayat Pengerjaan.

**QC Dashboard:**
- Dashboard.
- Daftar Pemeriksaan.
- Scan QR Code.
- Detail Pemeriksaan.
- Riwayat QC.

## 6. Backend Laravel

Buat backend menggunakan pendekatan REST API dengan struktur kode yang rapi.

Pisahkan kode berdasarkan:
- Models.
- Controllers.
- Requests.
- Middleware.
- Services jika diperlukan.
- Routes API.

Buat endpoint API untuk:
- Authentication.
- Users.
- Items.
- Treatments.
- Vendors.
- Jobs.
- Job Treatments.
- QR Code.
- Treatment Logs.
- QC Inspections.
- Job Events.
- Job Documents.

Gunakan Laravel Sanctum untuk autentikasi dan middleware untuk membatasi akses berdasarkan role.

Semua validasi proses pekerjaan harus dilakukan di backend, bukan hanya melalui frontend.

Contohnya:
- Worker hanya dapat mengerjakan treatment yang ditugaskan kepadanya.
- QC hanya dapat melakukan pemeriksaan pada Job yang sudah siap diperiksa.
- Job tidak dapat diselesaikan jika hasil QC belum sesuai.
- QR Code harus divalidasi sebelum data Job ditampilkan.
- Worker tidak dapat mengubah hasil pemeriksaan QC.
- Admin dapat memantau seluruh Job.

## 7. Ketentuan Pengembangan

Kerjakan aplikasi secara bertahap dan jangan langsung membuat seluruh fitur sekaligus.

Urutan pengerjaan:

1. Buat struktur project React dan Laravel.
2. Buat database dan migration.
3. Buat model dan relasi database.
4. Buat autentikasi dan sistem role.
5. Buat dashboard berdasarkan role.
6. Buat CRUD data pengguna, barang, treatment, dan vendor.
7. Buat fitur pembuatan Job dan penentuan treatment.
8. Buat fitur QR Code.
9. Buat fitur pengerjaan Worker.
10. Buat fitur pemeriksaan QC.
11. Buat fitur perbaikan ulang (rework).
12. Buat timeline dan riwayat Job.
13. Lakukan pengujian seluruh alur.

**PENTING:**
- Jangan membuat fitur yang tidak sesuai dengan alur bisnis di atas.
- Jangan menghilangkan relasi database yang sudah ditentukan.
- Pastikan frontend React terhubung dengan Laravel melalui REST API.
- Pastikan seluruh role memiliki batasan akses yang benar.
- Gunakan kode yang modular, mudah dipahami, dan mudah dikembangkan.
- Jangan menggunakan data dummy sebagai pengganti proses backend yang sebenarnya.
- Jika ada keputusan teknis yang belum jelas, jelaskan terlebih dahulu sebelum mengimplementasikannya.

Mulai dari tahap pertama: buat struktur project React dan Laravel, kemudian jelaskan struktur folder dan cara menjalankannya. Jangan lanjut ke tahap berikutnya sebelum tahap pertama selesai dan dapat dijalankan.