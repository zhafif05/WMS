import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import dashboardService from '../../services/dashboardService';
import { formatDate } from '../../utils/constants';

export const QCDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await dashboardService.getQcStats();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat statistik QC.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const summary = data?.summary || {
    pending_inspections: 0,
    rework_jobs: 0,
    completed_jobs: 0,
    my_inspections: 0,
    passed_inspections: 0,
    failed_inspections: 0,
  };

  const pendingJobs = data?.pending_jobs || [];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Memuat Dashboard QC...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950 to-slate-900 rounded-2xl p-6 text-white border border-purple-900/50 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            Quality Control & Assurance Console
          </div>
          <h1 className="text-xl font-bold">Halo, {user?.name || 'QC Inspector'}</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Lakukan verifikasi toleransi, uji fungsi, dan inspeksi visual terhadap hasil perbaikan komponen.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={fetchStats} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-colors" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="md"
            onClick={() => navigate('/qc/scan')}
            leftIcon={<QrCode className="w-4 h-4" />}
            className="bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/30"
          >
            Scan QR Code
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Menunggu QC"
          value={summary.pending_inspections}
          icon={ClipboardCheck}
          color="purple"
          onClick={() => navigate('/qc/inspections')}
        />
        <StatCard
          title="Dalam Rework"
          value={summary.rework_jobs}
          icon={AlertTriangle}
          color="rose"
          onClick={() => navigate('/qc/inspections')}
        />
        <StatCard
          title="Pernah Diperiksa"
          value={summary.my_inspections}
          icon={Clock}
          color="blue"
          onClick={() => navigate('/qc/history')}
        />
        <StatCard
          title="Selesai (Lolos QC)"
          value={summary.completed_jobs}
          icon={CheckCircle2}
          color="emerald"
          onClick={() => navigate('/qc/history')}
        />
      </div>

      {/* Ready for QC Inspection List */}
      <Card>
        <CardHeader
          title="Antrean Job Siap Diperiksa (Status: QC)"
          subtitle="Komponen yang seluruh treatment-nya telah selesai dikerjakan oleh teknisi"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/qc/inspections')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Lihat Semua ({summary.pending_inspections})
            </Button>
          }
        />
        <div className="divide-y divide-slate-100">
          {pendingJobs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Tidak ada antrean pekerjaan yang menunggu inspeksi QC saat ini.
            </div>
          ) : (
            pendingJobs.map((job) => (
              <div
                key={job.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {job.job_number}
                    </span>
                    <Badge status={job.status} />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm mt-1">
                    {job.item?.item_name || 'Unit Mesin'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    Kode: {job.item?.item_code} • S/N: {job.item?.serial_number || '-'}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1 max-w-xl">
                    Keluhan: {job.problem_description}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    Diterima: {formatDate(job.received_at || job.created_at)}
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <Button
                    variant="accent"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 shadow-xs"
                    onClick={() => navigate(`/qc/inspect/${job.id}`)}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Mulai Pemeriksaan
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default QCDashboard;
