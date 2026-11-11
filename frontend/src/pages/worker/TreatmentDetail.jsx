import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  CheckCircle,
  FileText,
  Upload,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  Building2,
  User,
  ShieldCheck,
  ClipboardList,
  Lock,
  Clock,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import workerService from '../../services/workerService';
import documentService from '../../services/documentService';
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

export const TreatmentDetail = () => {
  const { treatmentId } = useParams();
  const navigate = useNavigate();

  const [treatment, setTreatment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Modal State: Notes
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [workerNotes, setWorkerNotes] = useState('');
  const [activityType, setActivityType] = useState('progress');
  const [isSubmittingNotes, setIsSubmittingNotes] = useState(false);

  // Modal State: Photo Upload
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Modal State: Finish / Verification
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finishNotes, setFinishNotes] = useState('');
  const [verified, setVerified] = useState(false);
  const [finishError, setFinishError] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchTreatment = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await workerService.getTreatment(treatmentId);
      setTreatment(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat detail pekerjaan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatmentId]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Memuat Lembar Pengerjaan...
          </p>
        </div>
      </div>
    );
  }

  if (error || !treatment) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{error || 'Treatment Tidak Ditemukan'}</h2>
        <Button variant="outline" onClick={() => navigate('/worker/jobs')}>
          Kembali ke Pekerjaan Saya
        </Button>
      </div>
    );
  }

  const job = treatment.job || {};
  const isVendor = treatment.execution_type === 'vendor';
  const isStarted = !!treatment.started_at;
  const isCompleted = !!treatment.completed_at;
  const treatmentStatus =
    treatment.status || (isCompleted ? 'completed' : isStarted ? 'in_progress' : 'pending');
  const activeTreatment = job.active_treatment || null;
  const isLocked =
    treatmentStatus === 'pending' &&
    !!activeTreatment &&
    Number(activeTreatment.id) !== Number(treatment.id);
  const isRework = job.status === 'rework' && !isCompleted;
  const waitingForRework = treatmentStatus === 'pending' && job.status === 'rework';
  const logs = treatment.treatment_logs || [];
  const failedInspections = treatment.failed_inspections || [];
  const reworkInspection =
    failedInspections.find((ins) => ins.result === 'tidak_sesuai') || null;

  const logDocuments = logs.flatMap((log) =>
    (log.documents || []).map((doc) => ({ ...doc, log }))
  );
  const jobDocuments = job.job_documents || [];
  const allDocuments = [
    ...logDocuments,
    ...jobDocuments.filter((jd) => !logDocuments.some((ld) => ld.id === jd.id)),
  ];

  const handleStart = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      await workerService.startTreatment(
        treatment.id,
        isVendor
          ? 'PIC internal memulai pemantauan pekerjaan vendor.'
          : 'Pengerjaan dimulai oleh Worker.'
      );
      fetchTreatment();
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Gagal memulai treatment.'
      );
      // Kondisi bisa berubah jika Worker lain menyelesaikan treatment aktif.
      fetchTreatment();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReworkStart = async () => {
    const notes = prompt('Masukkan catatan koordinasi / perbaikan ulang (rework):');
    if (!notes) return;
    setActionLoading(true);
    setActionError('');
    try {
      await workerService.reworkTreatment(treatment.id, notes);
      fetchTreatment();
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Gagal memulai perbaikan ulang.'
      );
      fetchTreatment();
    } finally {
      setActionLoading(false);
    }
  };

  const openNotesModal = (type) => {
    setActivityType(type);
    setWorkerNotes('');
    setIsNotesModalOpen(true);
  };

  const handleSaveNotes = async (e) => {
    e.preventDefault();
    if (!workerNotes.trim()) return;

    setIsSubmittingNotes(true);
    try {
      await workerService.progressTreatment(
        treatment.id,
        workerNotes,
        isVendor ? activityType : 'progress'
      );
      setIsNotesModalOpen(false);
      setWorkerNotes('');
      fetchTreatment();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan catatan aktivitas.');
    } finally {
      setIsSubmittingNotes(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploadingPhoto(true);
    try {
      await documentService.uploadDocument({
        jobId: job.id,
        jobTreatmentId: treatment.id,
        file: selectedFile,
        description:
          photoDescription ||
          (isVendor ? 'Dokumentasi pemantauan pekerjaan vendor' : 'Dokumentasi pengerjaan Worker'),
      });
      setIsPhotoModalOpen(false);
      setSelectedFile(null);
      setPhotoDescription('');
      fetchTreatment();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengunggah foto.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const openFinishModal = () => {
    setFinishNotes('');
    setVerified(false);
    setFinishError('');
    setIsFinishModalOpen(true);
  };

  const handleFinish = async (e) => {
    e.preventDefault();
    setFinishError('');
    setActionError('');

    if (isVendor && !finishNotes.trim()) {
      setFinishError('Catatan verifikasi hasil pekerjaan vendor wajib diisi.');
      return;
    }

    if (isVendor && !verified) {
      setFinishError('Konfirmasi bahwa Anda telah memverifikasi hasil pekerjaan vendor wajib dicentang.');
      return;
    }

    setActionLoading(true);
    try {
      await workerService.finishTreatment(
        treatment.id,
        finishNotes,
        isVendor ? true : false
      );
      setIsFinishModalOpen(false);
      fetchTreatment();
    } catch (err) {
      setFinishError(err.response?.data?.message || 'Gagal menyelesaikan treatment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/worker/jobs')}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Pekerjaan Saya
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {job.job_number}
              </h1>
              <Badge status={job.status} />
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isVendor
                    ? 'text-purple-700 bg-purple-50 border-purple-200'
                    : 'text-blue-700 bg-blue-50 border-blue-200'
                }`}
              >
                {isVendor ? 'PIC VENDOR' : 'PEKERJAAN INTERNAL'}
              </span>
              {isRework && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  REWORK DIMINTA QC
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Komponen: {job.item?.item_name} ({job.item?.item_code})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTreatment} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>

          {treatmentStatus === 'completed' && (
            <Button
              variant="outline"
              size="sm"
              disabled
              leftIcon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
            >
              Pengerjaan Selesai
            </Button>
          )}

          {treatmentStatus === 'pending' && isLocked && (
            <Button
              variant="outline"
              size="sm"
              disabled
              leftIcon={<Lock className="w-4 h-4 text-amber-600" />}
            >
              Terkunci
            </Button>
          )}

          {treatmentStatus === 'pending' && !isLocked && isRework && (
            <Button
              variant="accent"
              size="sm"
              onClick={handleReworkStart}
              isLoading={actionLoading}
              leftIcon={<Play className="w-4 h-4" />}
            >
              Mulai Rework
            </Button>
          )}

          {treatmentStatus === 'pending' && !isLocked && !isRework && (
            <Button
              variant="accent"
              size="sm"
              onClick={handleStart}
              isLoading={actionLoading}
              leftIcon={<Play className="w-4 h-4" />}
            >
              {isVendor ? 'Mulai Pemantauan Vendor' : 'Mulai Pengerjaan'}
            </Button>
          )}

          {isStarted && !isCompleted && (
            <Button
              variant="accent"
              size="sm"
              onClick={openFinishModal}
              isLoading={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
              leftIcon={isVendor ? <ShieldCheck className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            >
              {isVendor ? 'Verifikasi & Selesaikan' : 'Selesaikan Pengerjaan'}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {actionError}
        </div>
      )}

      {isLocked && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Menunggu Treatment lain selesai.</p>
            <p className="mt-0.5 leading-relaxed">
              Treatment <strong>{activeTreatment?.treatment_name || '-'}</strong> sedang dikerjakan
              {activeTreatment?.worker_name ? ` oleh ${activeTreatment.worker_name}` : ''} pada Job
              ini. Anda dapat memulai treatment ini setelah treatment tersebut selesai.
            </p>
          </div>
        </div>
      )}

      {waitingForRework && !isLocked && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Treatment ini menunggu dimulainya rework.</p>
            <p className="mt-0.5 leading-relaxed">
              Tekan tombol <strong>Mulai Rework</strong> untuk memulai perbaikan. Selama rework
              berlangsung, treatment lain pada Job ini tidak dapat dikerjakan.
            </p>
          </div>
        </div>
      )}

      {/* Vendor PIC notice */}
      {isVendor && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2.5">
          <Building2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Anda adalah PIC internal untuk pekerjaan vendor ini.</p>
            <p className="mt-0.5 leading-relaxed">
              Pekerjaan fisik dilaksanakan oleh <strong>{treatment.vendor?.vendor_name || 'Vendor'}</strong>.
              Anda bertugas memantau, mencatat koordinasi & progres, mengunggah dokumentasi, serta
              memverifikasi hasil pekerjaan vendor sebelum menandai treatment selesai.
            </p>
          </div>
        </div>
      )}

      {/* QC Rejection Notice if rework */}
      {isRework && reworkInspection && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Catatan Ketidaksesuaian dari Quality Control:</span>
          </div>
          <p className="leading-relaxed pl-6">{reworkInspection.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Treatment Details & Working Log */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title={`Instruksi Tindakan: ${treatment.treatment?.treatment_name}`}
              subtitle={`Urutan ke-${treatment.sequence || 1} dalam alur reparasi Job`}
            />
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Jenis Pengerjaan</span>
                  <span className={`font-bold ${isVendor ? 'text-purple-700' : 'text-blue-700'}`}>
                    {isVendor ? 'Vendor' : 'Internal'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Worker PIC</span>
                  <span className="font-semibold text-slate-800">{treatment.worker?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    {isVendor ? 'Vendor Pelaksana' : 'Pelaksana'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {isVendor ? treatment.vendor?.vendor_name || '-' : treatment.worker?.name || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Status Pengerjaan</span>
                  <span className="font-semibold text-slate-800">
                    {treatmentStatus === 'completed'
                      ? 'Pengerjaan Selesai'
                      : treatmentStatus === 'in_progress'
                      ? 'Sedang Dikerjakan'
                      : isLocked
                      ? 'Menunggu Treatment Lain'
                      : waitingForRework
                      ? 'Menunggu Rework'
                      : 'Belum Dimulai'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Waktu Mulai</span>
                  <span className="font-mono text-slate-800">
                    {treatment.started_at ? formatDate(treatment.started_at, { includeTime: true }) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Waktu Selesai</span>
                  <span className="font-mono text-slate-800">
                    {treatment.completed_at ? formatDate(treatment.completed_at, { includeTime: true }) : '-'}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Deskripsi & Prosedur Teknis
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                  {treatment.treatment?.description || 'Lakukan perbaikan sesuai instruksi lead engineer.'}
                </p>
              </div>

              {/* Action Buttons to Add Notes and Photos */}
              {isStarted && !isCompleted && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  {isVendor ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openNotesModal('coordination')}
                        leftIcon={<ClipboardList className="w-4 h-4 text-purple-600" />}
                      >
                        Catat Koordinasi Vendor
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openNotesModal('progress')}
                        leftIcon={<FileText className="w-4 h-4 text-blue-600" />}
                      >
                        Catat Progres Vendor
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openNotesModal('progress')}
                      leftIcon={<FileText className="w-4 h-4 text-blue-600" />}
                    >
                      Tambah Catatan Progres
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPhotoModalOpen(true)}
                    leftIcon={<Upload className="w-4 h-4 text-emerald-600" />}
                  >
                    Unggah Foto Dokumentasi
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Treatment Logs History */}
          <Card>
            <CardHeader
              title={isVendor ? 'Riwayat Aktivitas Pemantauan Vendor' : 'Log Aktivitas Pengerjaan Anda'}
              subtitle={
                isVendor
                  ? 'Koordinasi, progres, dokumentasi, dan verifikasi yang Anda catat sebagai PIC internal'
                  : 'Catatan riwayat mulai, progres, foto, dan selesai'
              }
            />
            <CardContent>
              {logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada catatan aktivitas pada treatment ini.
                  {!isStarted && ' Tekan tombol mulai untuk mencatat waktu mulai.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-start gap-3"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          log.activity_source === 'vendor_verification'
                            ? 'bg-emerald-500'
                            : log.activity_source?.startsWith('vendor')
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-800 uppercase text-[10px]">
                              {ACTION_LABELS[log.action_type] || log.action_type}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                log.activity_source?.startsWith('vendor')
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {ACTIVITY_SOURCE_LABELS[log.activity_source] || log.activity_source || '-'}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatDate(log.created_at, { includeTime: true })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{log.notes}</p>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Dicatat oleh: <strong className="text-slate-600">{log.worker?.name || '-'}</strong>
                        </div>
                        {log.documents && log.documents.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Overall Job Context & Photos */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Kondisi & Analisis Kerusakan"
              subtitle="Referensi teknis dari diagnosa awal"
            />
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Kondisi Awal</span>
                <p className="text-slate-700 mt-0.5">{job.initial_condition || job.problem_description}</p>
              </div>
              {job.analysis && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hasil Analisis Admin</span>
                  <p className="text-slate-700 mt-0.5">{job.analysis}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Foto & Dokumen Pengerjaan"
              subtitle="Bukti visual dan dokumen pendukung"
            />
            <CardContent>
              {allDocuments.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  Belum ada foto atau dokumen yang diunggah.
                </div>
              ) : (
                <div className="space-y-2">
                  {allDocuments.map((doc) => (
                    <a
                      key={doc.id}
                      href={documentUrl(doc)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono truncate text-slate-700">{doc.file_name}</div>
                          {doc.description && (
                            <div className="text-[10px] text-slate-400 truncate">{doc.description}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 shrink-0">Buka</span>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Ringkasan Penugasan" subtitle="Tanggung jawab Anda pada treatment ini" />
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Jenis</span>
                <span className={`font-bold ${isVendor ? 'text-purple-700' : 'text-blue-700'}`}>
                  {isVendor ? 'PIC Vendor' : 'Pekerjaan Internal'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Worker PIC</span>
                <span className="font-semibold text-slate-800">{treatment.worker?.name || '-'}</span>
              </div>
              {isVendor && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Vendor</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {treatment.vendor?.vendor_name || '-'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Urutan</span>
                <span className="font-mono font-semibold text-slate-800">#{treatment.sequence || 1}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Durasi Estimasi</span>
                <span className="font-semibold text-slate-800">
                  {treatment.treatment?.estimated_duration || 'Sesuai SOP'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Add Progress / Coordination Notes */}
      <Modal
        isOpen={isNotesModalOpen}
        onClose={() => setIsNotesModalOpen(false)}
        title={
          isVendor
            ? activityType === 'coordination'
              ? 'Catat Koordinasi dengan Vendor'
              : 'Catat Progres Pekerjaan Vendor'
            : 'Tambah Catatan Progres Pengerjaan'
        }
        size="md"
      >
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isVendor && activityType === 'coordination'
                ? 'Catatan Koordinasi'
                : isVendor
                ? 'Catatan Perkembangan Pekerjaan Vendor'
                : 'Catatan Tindakan & Pengukuran'}
            </label>
            <textarea
              rows={4}
              value={workerNotes}
              onChange={(e) => setWorkerNotes(e.target.value)}
              placeholder={
                isVendor && activityType === 'coordination'
                  ? 'Contoh: Konfirmasi jadwal pengerjaan dan kebutuhan material kepada vendor...'
                  : isVendor
                  ? 'Contoh: Vendor mulai pembubutan poros spindle, progres 50%...'
                  : 'Contoh: Pembubutan tahap 1 selesai, toleransi dimensi mendekati 0.02mm...'
              }
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsNotesModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isSubmittingNotes}>
              Simpan Catatan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Upload Photo */}
      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title={isVendor ? 'Unggah Dokumentasi Pekerjaan Vendor' : 'Unggah Foto Bukti Pengerjaan'}
        size="md"
      >
        <form onSubmit={handleUploadPhoto} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Foto (JPG, PNG, Maks. 10MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
              required
            />
          </div>

          <Input
            label="Keterangan Foto"
            value={photoDescription}
            onChange={(e) => setPhotoDescription(e.target.value)}
            placeholder={
              isVendor
                ? 'Contoh: Foto progres pekerjaan vendor atau hasil akhir dari vendor'
                : 'Contoh: Kondisi fisik poros sesudah dibubut halus'
            }
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsPhotoModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isUploadingPhoto}>
              Unggah Foto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Finish / Vendor Verification */}
      <Modal
        isOpen={isFinishModalOpen}
        onClose={() => setIsFinishModalOpen(false)}
        title={isVendor ? 'Verifikasi Hasil Pekerjaan Vendor' : 'Selesaikan Pengerjaan'}
        size="md"
      >
        <form onSubmit={handleFinish} className="space-y-4">
          {isVendor && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-xs leading-relaxed">
              Pastikan vendor telah menyatakan pekerjaan selesai, barang/komponen sudah diterima
              kembali, dan Anda telah memverifikasi hasilnya sebelum menandai treatment selesai.
            </div>
          )}

          {finishError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {finishError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {isVendor ? 'Catatan Verifikasi Hasil Vendor' : 'Catatan Penyelesaian (Opsional)'}
              {isVendor && <span className="text-rose-500"> *</span>}
            </label>
            <textarea
              rows={4}
              value={finishNotes}
              onChange={(e) => setFinishNotes(e.target.value)}
              placeholder={
                isVendor
                  ? 'Contoh: Dimensi poros sesuai toleransi, hasil grinding halus, uji run-out 0.01mm, barang diterima lengkap...'
                  : 'Catatan hasil akhir pengerjaan...'
              }
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required={isVendor}
            />
          </div>

          {isVendor && (
            <label className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                Saya menyatakan telah memverifikasi hasil pekerjaan vendor dan pekerjaan dinyatakan
                selesai sesuai standar.
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsFinishModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="bg-emerald-600 hover:bg-emerald-700"
              isLoading={actionLoading}
            >
              {isVendor ? 'Verifikasi & Selesaikan' : 'Tandai Selesai'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TreatmentDetail;
