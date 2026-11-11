import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Upload,
  ChevronLeft,
  ShieldCheck,
  RotateCcw,
  RefreshCw,
  FileText,
  User,
  Building2,
  Lock,
  Clock,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import qcService from '../../services/qcService';
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

const getTreatmentStatus = (t) => {
  if (t.status === 'completed' || t.completed_at) return 'completed';
  if (t.status === 'in_progress' || (t.started_at && !t.completed_at)) return 'in_progress';
  return 'pending';
};

export const InspectionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [passNotes, setPassNotes] = useState('');

  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkNotes, setReworkNotes] = useState('');
  const [selectedFailedTreatmentIds, setSelectedFailedTreatmentIds] = useState([]);
  const [failureNotes, setFailureNotes] = useState({});

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [docDescription, setDocDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchJob = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await qcService.getInspectionDetail(id);
      setJob(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil detail inspeksi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Memuat Berkas Pemeriksaan QC...
          </p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">{error || 'Job Tidak Ditemukan'}</h2>
        <Button variant="outline" onClick={() => navigate('/qc/inspections')}>
          Kembali ke Antrean QC
        </Button>
      </div>
    );
  }

  const handleConfirmPass = async (e) => {
    e.preventDefault();
    if (!passNotes.trim()) return;

    setIsSubmitting(true);
    try {
      await qcService.submitInspection(job.id, {
        result: 'sesuai',
        notes: passNotes,
      });
      setIsPassModalOpen(false);
      setPassNotes('');
      fetchJob();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil inspeksi sesuai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRework = async (e) => {
    e.preventDefault();
    if (selectedFailedTreatmentIds.length === 0) {
      alert('Pilih minimal satu treatment yang harus diperbaiki kembali (rework).');
      return;
    }
    if (selectedFailedTreatmentIds.some((treatmentId) => !failureNotes[treatmentId]?.trim())) {
      alert('Alasan ketidaksesuaian wajib diisi untuk setiap treatment yang dipilih.');
      return;
    }

    setIsSubmitting(true);
    try {
      await qcService.submitInspection(job.id, {
        result: 'tidak_sesuai',
        notes: reworkNotes || 'Ditemukan ketidaksesuaian pada treatment yang dipilih.',
        failed_treatments: selectedFailedTreatmentIds.map((treatmentId) => ({
          job_treatment_id: Number(treatmentId),
          failure_notes: failureNotes[treatmentId].trim(),
        })),
      });
      setIsReworkModalOpen(false);
      setReworkNotes('');
      setSelectedFailedTreatmentIds([]);
      setFailureNotes({});
      fetchJob();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menyimpan hasil inspeksi tidak sesuai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsSubmitting(true);
    try {
      await documentService.uploadDocument({
        jobId: job.id,
        file: selectedFile,
        description: docDescription || 'Dokumentasi hasil pemeriksaan QC',
      });
      setIsDocModalOpen(false);
      setSelectedFile(null);
      setDocDescription('');
      fetchJob();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengunggah dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const treatments = job.job_treatments || [];
  const inspections = job.qc_inspections || [];
  const activeTreatment = job.active_treatment || null;
  const hasActiveTreatment = !!activeTreatment;
  const hasPendingRework = treatments.some(
    (t) => getTreatmentStatus(t) === 'pending' && job.status === 'rework'
  );
  // QC hanya memeriksa saat Job sudah kembali ke tahap QC dan tidak ada
  // treatment yang sedang dikerjakan (serial execution per Job).
  const canInspect = ['qc', 'rework'].includes(job.status) && !hasActiveTreatment && !hasPendingRework;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/qc/inspections')}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Antrean QC
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {job.job_number}
              </h1>
              <Badge status={job.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit: {job.item?.item_name} ({job.item?.item_code})
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
            onClick={() => setIsDocModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4 text-purple-600" />}
          >
            Unggah Berkas QC
          </Button>

          {canInspect && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-rose-600 border-rose-300 hover:bg-rose-50"
                onClick={() => setIsReworkModalOpen(true)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Tidak Sesuai (Rework)
              </Button>
              <Button
                variant="accent"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 shadow-xs"
                onClick={() => setIsPassModalOpen(true)}
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Sesuai (Lolos QC)
              </Button>
            </>
          )}
        </div>
      </div>

      {hasActiveTreatment && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Masih ada treatment yang sedang dikerjakan.</p>
            <p className="mt-0.5 leading-relaxed">
              Treatment <strong>{activeTreatment.treatment_name || '-'}</strong> sedang dikerjakan
              {activeTreatment.worker_name ? ` oleh ${activeTreatment.worker_name}` : ''}. Tunggu
              sampai treatment tersebut selesai sebelum melakukan pemeriksaan QC.
            </p>
          </div>
        </div>
      )}

      {hasPendingRework && !hasActiveTreatment && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Job sedang dalam proses rework.</p>
            <p className="mt-0.5 leading-relaxed">
              Worker PIC harus memulai dan menyelesaikan rework terlebih dahulu. Job akan kembali
              ke tahap QC setelah rework selesai.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Treatments check & Logs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Hasil Pengerjaan Seluruh Treatment"
              subtitle="Periksa catatan dan kepatuhan setiap tahap yang telah dikerjakan oleh teknisi"
            />
            <CardContent className="space-y-4">
              {treatments.map((t, idx) => {
                const isVendor = t.execution_type === 'vendor';
                const treatmentStatus = getTreatmentStatus(t);
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
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                            {t.sequence || idx + 1}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800">
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
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              treatmentStatus === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : treatmentStatus === 'in_progress'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isLocked
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {treatmentStatus === 'completed'
                              ? 'Selesai'
                              : treatmentStatus === 'in_progress'
                              ? 'Sedang Dikerjakan'
                              : isLocked
                              ? 'Menunggu Treatment Lain'
                              : job.status === 'rework'
                              ? 'Menunggu Rework'
                              : 'Belum Mulai'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{t.treatment?.description}</p>
                        {isLocked && (
                          <p className="text-[10px] text-amber-700 mt-1 inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Treatment aktif:{' '}
                            <strong>{activeTreatment?.treatment_name || '-'}</strong>
                            {activeTreatment?.worker_name
                              ? ` oleh ${activeTreatment.worker_name}`
                              : ''}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          Selesai: {t.completed_at ? formatDate(t.completed_at, { includeTime: true }) : 'Belum'}
                        </span>
                      </div>
                    </div>

                    {/* PIC & Vendor (ditampilkan bersama) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
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
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
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

                    {/* Vendor verification info */}
                    {isVendor && verificationLog && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
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

                    {/* Treatment logs */}
                    {logs.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                          Catatan & Bukti Pengerjaan:
                        </span>
                        {logs.map((log) => (
                          <div key={log.id} className="text-xs text-slate-600">
                            <div className="flex items-start justify-between gap-2">
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
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
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
                                    className="text-[10px] font-mono text-purple-600 bg-white border border-purple-200 rounded px-1.5 py-0.5 hover:underline truncate max-w-[180px]"
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
              })}
            </CardContent>
          </Card>

          {/* Past QC Inspections History */}
          <Card>
            <CardHeader
              title="Riwayat Seluruh Hasil Inspeksi QC"
              subtitle="Audit trail historis pemeriksaan kualitas pada Job ini"
            />
            <CardContent>
              {inspections.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Belum ada catatan inspeksi pada Job ini. Tekan tombol &quot;Sesuai&quot; atau &quot;Tidak Sesuai&quot; untuk menyimpan hasil pemeriksaan.
                </div>
              ) : (
                <div className="space-y-3">
                  {inspections.map((ins) => (
                    <div
                      key={ins.id}
                      className={`p-4 rounded-xl border text-xs ${
                        ins.result === 'sesuai'
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-rose-50/70 border-rose-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className={ins.result === 'sesuai' ? 'text-emerald-800' : 'text-rose-800'}>
                          Hasil: {ins.result === 'sesuai' ? 'SESUAI (LOLOS QC)' : 'TIDAK SESUAI (REWORK)'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatDate(ins.inspected_at || ins.created_at, { includeTime: true })}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed mt-1">{ins.notes}</p>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Pemeriksa: <strong>{ins.qc?.name || 'QC Lead'}</strong></span>
                        {ins.failed_job_treatment && (
                          <span className="text-rose-700 font-bold">
                            Treatment Rework: {ins.failed_job_treatment.treatment?.treatment_name}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Job Reference Details & Documents */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Referensi Diagnosa Awal"
              subtitle="Keluhan dan analisis awal Admin"
            />
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Keluhan Awal</span>
                <p className="text-slate-700 mt-0.5">{job.problem_description}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hasil Analisis Admin</span>
                <p className="text-slate-700 mt-0.5">{job.analysis || '-'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              title="Dokumentasi & Berkas"
              subtitle={`Total ${job.job_documents?.length || 0} berkas`}
            />
            <CardContent>
              {(!job.job_documents || job.job_documents.length === 0) ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Belum ada berkas atau foto dokumentasi.
                </div>
              ) : (
                <div className="space-y-2">
                  {job.job_documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800">{doc.file_name}</span>
                      </div>
                      <a
                        href={documentUrl(doc)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 font-semibold hover:underline text-[11px] shrink-0"
                      >
                        Buka
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Pass QC */}
      <Modal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        title="Konfirmasi Hasil Pemeriksaan: SESUAI"
        size="md"
      >
        <form onSubmit={handleConfirmPass} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
            Menandai hasil SESUAI akan menyelesaikan Job ini dan mengubah status akhir menjadi <strong>COMPLETED</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Pengujian & Verifikasi QC <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={passNotes}
              onChange={(e) => setPassNotes(e.target.value)}
              placeholder="Catat hasil pengujian toleransi, uji getaran, running test, kelayakan visual..."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsPassModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="bg-emerald-600 hover:bg-emerald-700"
              isLoading={isSubmitting}
            >
              Selesaikan & Setujui
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Rework QC */}
      <Modal
        isOpen={isReworkModalOpen}
        onClose={() => setIsReworkModalOpen(false)}
        title="Tentukan Perbaikan Ulang (REWORK)"
        size="md"
      >
        <form onSubmit={handleConfirmRework} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
            Pekerjaan akan dikembalikan ke teknisi pelaksana dengan status <strong>REWORK</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Treatment yang Perlu Diperbaiki Kembali <span className="text-rose-500">*</span>
            </label>
            <div className="space-y-2">
              {treatments.map((t) => {
                const treatmentKey = String(t.id);
                const isSelected = selectedFailedTreatmentIds.includes(treatmentKey);

                return (
                  <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                    <label className="flex items-start gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          setSelectedFailedTreatmentIds((current) =>
                            e.target.checked
                              ? [...current, treatmentKey]
                              : current.filter((id) => id !== treatmentKey)
                          );
                        }}
                        className="mt-0.5 accent-rose-600"
                      />
                      <span>
                        <span className="block font-semibold">{t.treatment?.treatment_name}</span>
                        <span className="text-slate-500">
                          {t.execution_type === 'vendor'
                            ? `Vendor: ${t.vendor?.vendor_name || '-'} — PIC: ${t.worker?.name || '-'}`
                            : `PIC: ${t.worker?.name || '-'}`}
                        </span>
                      </span>
                    </label>
                    {isSelected && (
                      <textarea
                        rows={2}
                        value={failureNotes[treatmentKey] || ''}
                        onChange={(e) =>
                          setFailureNotes((current) => ({
                            ...current,
                            [treatmentKey]: e.target.value,
                          }))
                        }
                        placeholder="Alasan ketidaksesuaian treatment ini..."
                        className="mt-2 w-full rounded-lg border border-rose-200 p-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        required
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Umum & Instruksi Perbaikan
            </label>
            <textarea
              rows={4}
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              placeholder="Catatan umum pemeriksaan atau instruksi tambahan..."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsReworkModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="bg-rose-600 hover:bg-rose-700"
              isLoading={isSubmitting}
            >
              Kirim untuk Rework
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Document upload */}
      <Modal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        title="Unggah Foto / Hasil Pengujian QC"
        size="md"
      >
        <form onSubmit={handleUploadDoc} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Berkas (Foto / PDF, Maks. 10MB)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              required
            />
          </div>

          <Input
            label="Keterangan Berkas"
            value={docDescription}
            onChange={(e) => setDocDescription(e.target.value)}
            placeholder="Contoh: Lembar kalibrasi micrometer atau foto visual akhir"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsDocModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isSubmitting}>
              Unggah Dokumen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InspectionDetail;
