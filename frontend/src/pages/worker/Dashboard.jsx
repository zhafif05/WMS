import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  HardHat,
  ChevronRight,
  RefreshCw,
  Building2,
  ClipboardList,
  Lock,
  Play,
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import dashboardService from '../../services/dashboardService';

const getTreatmentStatus = (t) => {
  if (t.status === 'completed' || t.completed_at) return 'completed';
  if (t.status === 'in_progress' || (t.started_at && !t.completed_at)) return 'in_progress';
  return 'pending';
};

const isLockedByOther = (t, activeTreatment) =>
  getTreatmentStatus(t) === 'pending' &&
  !!activeTreatment &&
  Number(activeTreatment.id) !== Number(t.id);

export const WorkerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await dashboardService.getWorkerStats();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat statistik teknisi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const summary = data?.summary || {
    total_assigned_treatments: 0,
    internal_treatments: 0,
    vendor_treatments: 0,
    in_progress: 0,
    pending: 0,
    completed: 0,
    rework_tasks: 0,
  };

  const activeJobs = data?.active_jobs || [];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Memuat Dashboard Teknisi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-slate-700/80 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Halo, {user?.name || 'Teknisi'}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Konsol Lembar Kerja & Pelaksanaan Treatment – CV. ELMECH TECHNOLOGY
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="sm" onClick={fetchStats} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-colors" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate('/worker/scan')}
            leftIcon={<QrCode className="w-4 h-4" />}
          >
            Scan QR Code Job
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard
          title="Total Tanggung Jawab"
          value={summary.total_assigned_treatments}
          icon={Wrench}
          color="blue"
          onClick={() => navigate('/worker/jobs')}
        />
        <StatCard
          title="Pekerjaan Internal"
          value={summary.internal_treatments}
          icon={HardHat}
          color="blue"
          onClick={() => navigate('/worker/jobs')}
        />
        <StatCard
          title="PIC Vendor"
          value={summary.vendor_treatments}
          icon={Building2}
          color="purple"
          onClick={() => navigate('/worker/jobs')}
        />
        <StatCard
          title="Belum Dimulai"
          value={summary.pending}
          icon={ClipboardList}
          color="slate"
          onClick={() => navigate('/worker/jobs')}
        />
        <StatCard
          title="Sedang Dikerjakan"
          value={summary.in_progress}
          icon={Clock}
          color="amber"
          onClick={() => navigate('/worker/jobs')}
        />
        <StatCard
          title="Telah Diselesaikan"
          value={summary.completed}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => navigate('/worker/history')}
        />
      </div>

      {summary.rework_tasks > 0 && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            Terdapat <strong>{summary.rework_tasks}</strong> pekerjaan yang diminta perbaikan ulang (rework) oleh QC.
          </span>
        </div>
      )}

      {/* Active Work Items */}
      <Card>
        <CardHeader
          title="Pekerjaan Aktif yang Ditugaskan"
          subtitle="Daftar Job dan treatment yang memerlukan tindakan Anda saat ini"
        />
        <div className="divide-y divide-slate-100">
          {activeJobs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada pekerjaan aktif yang tertunda untuk Anda saat ini.
            </div>
          ) : (
            activeJobs.map((job) => {
              const myTreatments = job.job_treatments || [];
              return (
                <div
                  key={job.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      #{job.id}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {job.job_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            job.status === 'treatment'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : job.status === 'rework'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {job.status.toUpperCase()}
                        </span>
                      </div>

                      <h4 className="font-semibold text-slate-800 text-sm mt-1">
                        {job.item?.item_name || 'Unit Mesin'}
                      </h4>
                      <p className="text-xs text-slate-500 font-mono">
                        Kode: {job.item?.item_code} • S/N: {job.item?.serial_number || '-'}
                      </p>

                      <div className="mt-3 space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Tanggung Jawab Anda pada Job ini:
                        </span>
                        {myTreatments.map((t) => {
                          const isVendor = t.execution_type === 'vendor';
                          const treatmentStatus = getTreatmentStatus(t);
                          const isLocked = isLockedByOther(t, job.active_treatment);
                          return (
                            <div
                              key={t.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-200 bg-white"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                      isVendor
                                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    {isVendor ? 'PIC Vendor' : 'Pekerjaan Internal'}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-800">
                                    {t.treatment?.treatment_name}
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
                                {isVendor && (
                                  <p className="text-[10px] text-purple-700 mt-0.5">
                                    Vendor: <strong>{t.vendor?.vendor_name || '-'}</strong>
                                  </p>
                                )}
                                {isLocked && (
                                  <p className="text-[10px] text-amber-700 mt-0.5 inline-flex items-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Treatment aktif:{' '}
                                    <strong>{job.active_treatment?.treatment_name || '-'}</strong>
                                    {job.active_treatment?.worker_name
                                      ? ` oleh ${job.active_treatment.worker_name}`
                                      : ''}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant={
                                  treatmentStatus === 'in_progress'
                                    ? 'accent'
                                    : treatmentStatus === 'completed' || isLocked
                                    ? 'outline'
                                    : job.status === 'rework'
                                    ? 'accent'
                                    : isVendor
                                    ? 'outline'
                                    : 'primary'
                                }
                                size="sm"
                                onClick={() => navigate(`/worker/treatment/${job.id}/${t.id}`)}
                                leftIcon={
                                  isLocked ? (
                                    <Lock className="w-3.5 h-3.5" />
                                  ) : treatmentStatus === 'pending' ? (
                                    <Play className="w-3.5 h-3.5" />
                                  ) : undefined
                                }
                                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                className="shrink-0 self-start sm:self-center"
                              >
                                {treatmentStatus === 'completed'
                                  ? 'Detail'
                                  : treatmentStatus === 'in_progress'
                                  ? 'Lanjutkan'
                                  : isLocked
                                  ? 'Terkunci'
                                  : isVendor
                                  ? 'Pantau Vendor'
                                  : 'Buka Lembar Kerja'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};

export default WorkerDashboard;
