import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Clock,
  Printer,
  Upload,
  User,
  Building2,
  ShieldCheck,
  ChevronLeft,
  CheckCircle2,
  FileText,
  RefreshCw,
  Pencil,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import jobService from '../../services/jobService';
import documentService from '../../services/documentService';
import userService from '../../services/userService';
import vendorService from '../../services/vendorService';
import { formatDate } from '../../utils/constants';

const ACTIVITY_SOURCE_LABELS = {
  internal: 'Pengerjaan Internal',
  internal_documentation: 'Dokumentasi Internal',
  vendor_coordination: 'Koordinasi Vendor',
  vendor_progress: 'Progres Vendor',
  vendor_documentation: 'Dokumentasi Vendor',
  vendor_verification: 'Verifikasi Vendor',
  rework: 'Rework',
};

const ACTION_LABELS = {
  start: 'Mulai',
  progress: 'Progres',
  finish: 'Selesai',
  rework: 'Rework',
};

const documentUrl = (doc) =>
  doc.file_url || `http://localhost:8000/storage/${doc.file_path}`;

export const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docDescription, setDocDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Reassignment (PIC / Vendor) state
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignForm, setReassignForm] = useState({
    worker_id: '',
    execution_type: 'internal',
    vendor_id: '',
    sequence: 1,
  });
  const [reassignError, setReassignError] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [vendors, setVendors] = useState([]);

  const fetchJob = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await jobService.getJobById(id);
      setJob(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat detail pekerjaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignmentOptions = async () => {
    try {
      const [usersData, vendorsData] = await Promise.all([
        userService.getUsers({ role: 'worker' }),
        vendorService.getVendors(),
      ]);
      const userList = Array.isArray(usersData) ? usersData : usersData.data || [];
      const vendorList = Array.isArray(vendorsData) ? vendorsData : vendorsData.data || [];
      setWorkers(userList.filter((u) => u.is_active !== false));
      setVendors(vendorList);
    } catch {
      // Opsi reassignment gagal dimuat; halaman tetap dapat dilihat.
      setWorkers([]);
      setVendors([]);
    }
  };

  const compatibleWorkers = workers.filter((worker) =>
    worker.treatment_skills?.some(
      (skill) => Number(skill.id) === Number(reassignTarget?.treatment_id)
    )
  );
  const compatibleVendors = vendors.filter((vendor) =>
    vendor.treatments?.some(
      (treatment) => Number(treatment.id) === Number(reassignTarget?.treatment_id)
    )
  );

  useEffect(() => {
    fetchJob();
    fetchAssignmentOptions();
  }, [id]);

  const handlePrintQR = () => {
    window.print();
  };

  const openReassignModal = (t) => {
    setReassignTarget(t);
    setReassignForm({
      worker_id: t.worker_id || t.worker?.id || '',
      execution_type: t.execution_type || 'internal',
      vendor_id: t.vendor_id || t.vendor?.id || '',
      sequence: t.sequence || 1,
    });
    setReassignError('');
    setIsReassignOpen(true);
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!reassignTarget) return;

    if (!reassignForm.worker_id) {
      setReassignError('Worker PIC wajib dipilih.');
      return;
    }

    if (reassignForm.execution_type === 'vendor' && !reassignForm.vendor_id) {
      setReassignError('Vendor wajib dipilih untuk treatment vendor.');
      return;
    }

    setIsReassigning(true);
    setReassignError('');
    try {
      await jobService.updateTreatment(job.id, reassignTarget.id, {
        worker_id: Number(reassignForm.worker_id),
        execution_type: reassignForm.execution_type,
        vendor_id:
          reassignForm.execution_type === 'vendor'
            ? Number(reassignForm.vendor_id)
            : null,
        sequence: Number(reassignForm.sequence) || reassignTarget.sequence || 1,
      });
      setIsReassignOpen(false);
      setReassignTarget(null);
      fetchJob();
    } catch (err) {
      const messages = err.response?.data?.errors;
      const firstError = messages ? Object.values(messages)[0]?.[0] : null;
      setReassignError(
        firstError || err.response?.data?.message || 'Gagal memperbarui penugasan treatment.'
      );
    } finally {
      setIsReassigning(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Pilih file dokumen atau foto terlebih dahulu.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    try {
      await documentService.uploadDocument({
        jobId: job.id,
        file: selectedFile,
        description: docDescription,
      });
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setDocDescription('');
      fetchJob();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Gagal mengunggah dokumen.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Memuat Data Job...
          </p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{error || 'Job Tidak Ditemukan'}</h2>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Kembali
        </Button>
      </div>
    );
  }

  const qrToken = job.qr_code?.token || `QR-${job.job_number}`;
  const activeTreatment = job.active_treatment || null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Kembali
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {job.job_number}
              </h1>
              <Badge status={job.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dibuat oleh {job.creator?.name || 'Admin'} • Diterima pada {formatDate(job.received_at || job.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJob} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintQR}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Cetak Label & QR
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Unggah Dokumen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Info & Treatments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card Item Info */}
          <Card>
            <CardHeader
              title="Informasi Barang / Mesin"
              subtitle="Data teknis unit yang masuk untuk perbaikan"
            />
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pb-4 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nama Barang</span>
                  <span className="font-bold text-slate-800 text-sm">{job.item?.item_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kode Barang</span>
                  <span className="font-mono text-blue-600 font-bold">{job.item?.item_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Merek / Model</span>
                  <span className="text-slate-700">{job.item?.brand || '-'} {job.item?.model || ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Serial Number</span>
                  <span className="font-mono text-slate-700">{job.item?.serial_number || '-'}</span>
                </div>
              </div>

              <div className="pt-4 space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kondisi Awal & Keluhan</span>
                  <p className="text-slate-700 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                    {job.initial_condition || job.problem_description}
                  </p>
                </div>
                {job.analysis && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hasil Analisis Kerusakan</span>
                    <p className="text-slate-700 mt-1 leading-relaxed bg-blue-50/60 p-2.5 rounded-lg border border-blue-200/60 text-blue-950">
                      {job.analysis}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card Treatments Sequence */}
          <Card>
            <CardHeader
              title="Rencana & Progres Pengerjaan Treatment"
              subtitle="Urutan tindakan yang harus dikerjakan oleh teknisi atau vendor"
            />
            <CardContent className="space-y-4">
              {activeTreatment && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Treatment aktif: {activeTreatment.treatment?.treatment_name || '-'}
                    </p>
                    <p className="mt-0.5">
                      Sedang dikerjakan oleh{' '}
                      <strong>{activeTreatment.worker?.name || '-'}</strong>
                      {activeTreatment.execution_type === 'vendor' && activeTreatment.vendor
                        ? ` melalui vendor ${activeTreatment.vendor.vendor_name}`
                        : ''}
                      . Treatment lain pada Job ini menunggu sampai treatment aktif selesai
                      (serial execution per Job).
                    </p>
                  </div>
                </div>
              )}

              {(!job.job_treatments || job.job_treatments.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Belum ada treatment yang ditentukan untuk Job ini.
                </div>
              ) : (
                job.job_treatments.map((t, idx) => {
                  const isDone = !!t.completed_at;
                  const isStarted = !!t.started_at && !t.completed_at;
                  const isVendor = t.execution_type === 'vendor';
                  const treatmentStatus =
                    t.status || (isDone ? 'completed' : isStarted ? 'in_progress' : 'pending');
                  const isLocked =
                    treatmentStatus === 'pending' &&
                    !!activeTreatment &&
                    Number(activeTreatment.id) !== Number(t.id);
                  const logs = t.treatment_logs || [];
                  const verificationLog = [...logs]
                    .reverse()
                    .find((log) => log.activity_source === 'vendor_verification');

                  return (
                    <div
                      key={t.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isStarted
                          ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className={`w-6 h-6 rounded-full font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isStarted
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {t.sequence || idx + 1}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs font-bold text-slate-900">
                                {t.treatment?.treatment_name}
                              </h4>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  isVendor
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {isVendor ? 'Vendor' : 'Internal'}
                              </span>
                              {isDone && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Selesai
                                </span>
                              )}
                              {isStarted && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" /> Sedang Dikerjakan
                                </span>
                              )}
                              {isLocked && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <Clock className="w-3 h-3" /> Menunggu Treatment Lain
                                </span>
                              )}
                              {treatmentStatus === 'pending' && job.status === 'rework' && !isLocked && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <Clock className="w-3 h-3" /> Menunggu Rework
                                </span>
                              )}
                            </div>
                            <p className="text-slate-500 text-[11px] mt-1">
                              {t.treatment?.description}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openReassignModal(t)}
                          leftIcon={<Pencil className="w-3 h-3" />}
                          className="shrink-0"
                        >
                          Ubah Penugasan
                        </Button>
                      </div>

                      {/* PIC & Vendor (ditampilkan bersama) */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-slate-200">
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <div>
                            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                              Worker PIC Internal
                            </span>
                            <span className="font-semibold text-slate-800">
                              {t.worker?.name || '-'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/70 border border-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <div>
                            <span className="text-[9px] uppercase font-semibold text-slate-400 block">
                              {isVendor ? 'Vendor Pelaksana' : 'Pelaksana'}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {isVendor ? t.vendor?.vendor_name || '-' : 'Dikerjakan internal'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Timestamps */}
                      {(t.started_at || t.completed_at) && (
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-slate-400 pt-2.5 mt-2.5 border-t border-slate-200/60">
                          {t.started_at && <span>Mulai: {formatDate(t.started_at, { includeTime: true })}</span>}
                          {t.completed_at && <span>Selesai: {formatDate(t.completed_at, { includeTime: true })}</span>}
                        </div>
                      )}

                      {/* Vendor verification info */}
                      {isVendor && verificationLog && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Terverifikasi oleh PIC Internal</span>
                            <span className="leading-relaxed">
                              {verificationLog.notes || 'Hasil pekerjaan vendor telah diverifikasi.'}
                            </span>
                            <span className="block text-[10px] text-emerald-700 mt-0.5 font-mono">
                              {verificationLog.worker?.name || '-'} •{' '}
                              {formatDate(verificationLog.created_at, { includeTime: true })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Treatment Logs */}
                      {logs.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Riwayat Aktivitas:
                          </span>
                          {logs.map((log) => (
                            <div key={log.id} className="text-[11px] text-slate-600">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {ACTION_LABELS[log.action_type] || log.action_type}
                                  </span>
                                  {log.activity_source && (
                                    <span
                                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                        log.activity_source?.startsWith('vendor')
                                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                                          : 'bg-blue-50 text-blue-700 border-blue-200'
                                      }`}
                                    >
                                      {ACTIVITY_SOURCE_LABELS[log.activity_source] || log.activity_source}
                                    </span>
                                  )}
                                  <span>{log.notes}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400">
                                  {formatDate(log.created_at, { includeTime: true })}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Dicatat oleh: <strong className="text-slate-600">{log.worker?.name || '-'}</strong>
                              </div>
                              {log.documents && log.documents.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {log.documents.map((doc) => (
                                    <a
                                      key={doc.id}
                                      href={documentUrl(doc)}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[10px] font-mono text-blue-600 bg-white border border-blue-200 rounded px-1.5 py-0.5 hover:underline truncate max-w-[180px]"
                                    >
                                      {doc.file_name}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* QC Inspection History */}
          {job.qc_inspections && job.qc_inspections.length > 0 && (
            <Card>
              <CardHeader
                title="Riwayat Pemeriksaan QC"
                subtitle="Catatan inspeksi kualitas dari Quality Control Lead"
              />
              <CardContent className="space-y-3">
                {job.qc_inspections.map((ins) => (
                  <div
                    key={ins.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      ins.result === 'sesuai'
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : 'bg-rose-50/60 border-rose-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className={ins.result === 'sesuai' ? 'text-emerald-800' : 'text-rose-800'}>
                        Hasil: {ins.result === 'sesuai' ? 'SESUAI' : 'TIDAK SESUAI'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {formatDate(ins.inspected_at || ins.created_at, { includeTime: true })}
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{ins.notes}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Inspektor: <strong>{ins.qc?.name || 'QC Lead'}</strong></span>
                      {ins.failed_job_treatment && (
                        <span className="text-rose-700 font-semibold">
                          Treatment Perlu Rework: {ins.failed_job_treatment.treatment?.treatment_name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Col: QR Code, Timeline & Documents */}
        <div className="space-y-6">
          {/* QR Code Card */}
          <Card className="text-center">
            <CardHeader
              title="QR Code Pelacakan Job"
              subtitle="Gunakan kamera untuk scan melalui portal Worker atau QC"
            />
            <CardContent className="flex flex-col items-center">
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md inline-block">
                <QRCodeSVG value={qrToken} size={180} />
              </div>
              <div className="mt-3 font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 w-full truncate text-center">
                {qrToken}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                1 Token unik berlaku untuk seluruh siklus pekerjaan ini
              </p>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader
              title="Foto & Dokumen"
              subtitle={`Total ${job.job_documents?.length || 0} file terunggah`}
            />
            <CardContent>
              {(!job.job_documents || job.job_documents.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Belum ada dokumen yang diunggah.
                </div>
              ) : (
                <div className="space-y-2">
                  {job.job_documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800">{doc.file_name}</span>
                      </div>
                      <a
                        href={documentUrl(doc)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 font-semibold hover:underline text-[11px] shrink-0"
                      >
                        Buka
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail Timeline */}
          <Card>
            <CardHeader
              title="Audit Trail & Riwayat"
              subtitle="Catatan kejadian dan perubahan status"
            />
            <CardContent className="space-y-3">
              {(!job.job_events || job.job_events.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Belum ada riwayat aktivitas.
                </div>
              ) : (
                job.job_events.map((ev) => (
                  <div key={ev.id} className="text-xs flex items-start gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800">{ev.description}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {formatDate(ev.created_at, { includeTime: true })} {ev.user ? `oleh ${ev.user.name}` : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Unggah Dokumen / Foto Dokumentasi"
        size="md"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4">
          {uploadError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {uploadError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Berkas (Foto / PDF, Maks. 10MB)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              required
            />
          </div>

          <Input
            label="Keterangan / Deskripsi Berkas"
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
            placeholder="Contoh: Foto kondisi fisik awal sebelum pembongkaran"
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsUploadModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isUploading}>
              Unggah Sekarang
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reassignment Modal */}
      <Modal
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        title="Ubah Penugasan Treatment"
        size="md"
      >
        <form onSubmit={handleReassignSubmit} className="space-y-4">
          {reassignTarget && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Treatment
              </span>
              <span className="font-bold text-slate-800">
                {reassignTarget.treatment?.treatment_name}
              </span>
              <span className="text-slate-500"> • urutan #{reassignTarget.sequence || 1}</span>
            </div>
          )}

          {reassignError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {reassignError}
            </div>
          )}

          <Select
            label="Jenis Pengerjaan"
            value={reassignForm.execution_type}
            onChange={(e) =>
              setReassignForm((prev) => ({
                ...prev,
                execution_type: e.target.value,
                vendor_id: e.target.value === 'internal' ? '' : prev.vendor_id,
              }))
            }
            options={[
              { value: 'internal', label: 'Internal (dikerjakan Worker)' },
              { value: 'vendor', label: 'Vendor (dikerjakan pihak eksternal)' },
            ]}
          />

          <Select
            label="Worker Penanggung Jawab (PIC)"
            value={reassignForm.worker_id}
            onChange={(e) =>
              setReassignForm((prev) => ({ ...prev, worker_id: e.target.value }))
            }
            options={[
              { value: '', label: '-- Pilih Worker PIC --' },
              ...compatibleWorkers.map((w) => ({ value: w.id, label: w.name })),
            ]}
          />

          {reassignForm.execution_type === 'vendor' && (
            <Select
              label="Vendor Pelaksana"
              value={reassignForm.vendor_id}
              onChange={(e) =>
                setReassignForm((prev) => ({ ...prev, vendor_id: e.target.value }))
              }
              options={[
                { value: '', label: '-- Pilih Vendor --' },
                ...compatibleVendors.map((v) => ({ value: v.id, label: v.vendor_name })),
              ]}
            />
          )}

          <Input
            label="Urutan Pengerjaan"
            type="number"
            min="1"
            value={reassignForm.sequence}
            onChange={(e) =>
              setReassignForm((prev) => ({ ...prev, sequence: e.target.value }))
            }
          />

          <p className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-200/70 rounded-lg p-2.5">
            Perubahan PIC/vendor akan tercatat pada audit trail Job. Riwayat aktivitas
            sebelumnya tetap tersimpan. Untuk rework vendor, PIC yang sama dipertahankan
            secara default kecuali diubah di sini.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsReassignOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isReassigning}>
              Simpan Penugasan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default JobDetail;
