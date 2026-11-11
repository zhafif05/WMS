import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Inbox,
  Search,
  Wrench,
  CheckCircle,
  AlertTriangle,
  ClipboardCheck,
  PlusCircle,
  Activity,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import dashboardService from '../../services/dashboardService';
import { JOB_STATUS, formatDate } from '../../utils/constants';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await dashboardService.getAdminStats();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat statistik dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = useMemo(() => {
    const s = data?.summary || {};
    const b = data?.status_breakdown || {};
    return {
      total: s.total_jobs || 0,
      received: b.received || 0,
      analysis: b.analysis || 0,
      treatment: b.treatment || 0,
      qc: b.qc || 0,
      rework: b.rework || 0,
      completed: b.completed || 0,
    };
  }, [data]);

  const chartData = [
    { name: 'Diterima', count: stats.received, fill: '#64748b' },
    { name: 'Analisis', count: stats.analysis, fill: '#3b82f6' },
    { name: 'Pengerjaan', count: stats.treatment, fill: '#f59e0b' },
    { name: 'QC', count: stats.qc, fill: '#a855f7' },
    { name: 'Rework', count: stats.rework, fill: '#f43f5e' },
    { name: 'Selesai', count: stats.completed, fill: '#10b981' },
  ];

  const recentJobs = data?.recent_jobs || [];

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Memuat Data Dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard Administrator</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan operasional dan status alur pekerjaan CV. ELMECH TECHNOLOGY
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/monitoring')}
            leftIcon={<Activity className="w-4 h-4 text-blue-600" />}
          >
            Monitoring Live
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate('/admin/jobs/create')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Buat Job Baru
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{error}</span>
          <Button size="xs" variant="outline" onClick={fetchStats}>Coba Lagi</Button>
        </div>
      )}

      {/* Primary 7 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          title="Total Job"
          value={stats.total}
          icon={Briefcase}
          color="slate"
          onClick={() => navigate('/admin/jobs')}
        />
        <StatCard
          title="Diterima"
          value={stats.received}
          icon={Inbox}
          color="slate"
          onClick={() => navigate('/admin/jobs?status=received')}
        />
        <StatCard
          title="Analisis"
          value={stats.analysis}
          icon={Search}
          color="blue"
          onClick={() => navigate('/admin/jobs?status=analysis')}
        />
        <StatCard
          title="Pengerjaan"
          value={stats.treatment}
          icon={Wrench}
          color="amber"
          onClick={() => navigate('/admin/jobs?status=treatment')}
        />
        <StatCard
          title="Inspeksi QC"
          value={stats.qc}
          icon={ClipboardCheck}
          color="purple"
          onClick={() => navigate('/admin/jobs?status=qc')}
        />
        <StatCard
          title="Rework"
          value={stats.rework}
          icon={AlertTriangle}
          color="rose"
          onClick={() => navigate('/admin/jobs?status=rework')}
        />
        <StatCard
          title="Selesai"
          value={stats.completed}
          icon={CheckCircle}
          color="emerald"
          onClick={() => navigate('/admin/history')}
        />
      </div>

      {/* Analytics Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Distribusi Status Pekerjaan"
            subtitle="Grafik jumlah unit pada setiap fase proses bisnis"
          />
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Ringkasan Kapasitas"
            subtitle="Rasio pengerjaan aktif vs selesai"
          />
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Aktif', value: stats.total - stats.completed, fill: '#3b82f6' },
                      { name: 'Selesai', value: stats.completed, fill: '#10b981' },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-xs mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-slate-600">Aktif: {stats.total - stats.completed}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Selesai: {stats.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs Table */}
      <Card>
        <CardHeader
          title="Pekerjaan Terbaru"
          subtitle="Daftar Job reparasi terbaru yang masuk ke sistem"
          action={
            <Button
              variant="ghost"
              size="xs"
              onClick={() => navigate('/admin/jobs')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Lihat Semua Job
            </Button>
          }
        />
        <CardContent className="p-0 overflow-x-auto">
          {recentJobs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Belum ada Job yang terdaftar.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="py-3 px-4">No. Job</th>
                  <th className="py-3 px-4">Barang / Mesin</th>
                  <th className="py-3 px-4">Keluhan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tanggal Masuk</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {job.job_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{job.item?.item_name || 'Item'}</div>
                      <div className="text-[10px] font-mono text-slate-400">{job.item?.serial_number || '-'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      {job.problem_description}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={job.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {formatDate(job.received_at || job.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => navigate(`/admin/jobs/${job.id}`)}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
