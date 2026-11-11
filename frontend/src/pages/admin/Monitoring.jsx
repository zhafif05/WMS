import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  RefreshCw,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import jobService from '../../services/jobService';
import { JOB_STATUS, formatDate } from '../../utils/constants';

export const Monitoring = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await jobService.getJobs();
      setJobs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat monitoring.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = search.toLowerCase();
      const itemName = job.item?.item_name || '';
      const itemCode = job.item?.item_code || '';
      const brand = job.item?.brand || '';
      const matchSearch =
        job.job_number.toLowerCase().includes(q) ||
        itemName.toLowerCase().includes(q) ||
        itemCode.toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || job.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobs, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Live Monitoring Pekerjaan Bengkel
            </h1>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pantau progres setiap tahapan pengerjaan, antrean QC, dan penanganan perbaikan ulang (rework)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchJobs}
          leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
        >
          Perbarui Data
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Cari No. Job, nama barang, kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(JOB_STATUS.TREATMENT)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === JOB_STATUS.TREATMENT
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pengerjaan ({jobs.filter((j) => j.status === JOB_STATUS.TREATMENT).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(JOB_STATUS.QC)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === JOB_STATUS.QC
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Menunggu QC ({jobs.filter((j) => j.status === JOB_STATUS.QC).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter(JOB_STATUS.REWORK)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === JOB_STATUS.REWORK
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Rework ({jobs.filter((j) => j.status === JOB_STATUS.REWORK).length})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of monitored jobs */}
      {isLoading ? (
        <div className="min-h-[250px] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-xs text-slate-400">
            Tidak ada pekerjaan yang cocok dengan kriteria filter saat ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.map((job) => {
            const trts = job.job_treatments || [];
            const completedTrts = trts.filter((t) => t.completed_at).length;
            const totalTrts = trts.length;
            const percent = totalTrts > 0 ? Math.round((completedTrts / totalTrts) * 100) : 0;

            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-slate-900 block">
                        {job.job_number}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {formatDate(job.received_at || job.created_at)}
                      </span>
                    </div>
                    <Badge status={job.status} />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {job.item?.item_name || 'Item'}
                    </h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                      {job.problem_description}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-mono">
                      <span>Progres Treatment</span>
                      <span>{completedTrts}/{totalTrts} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          job.status === JOB_STATUS.COMPLETED
                            ? 'bg-emerald-500'
                            : job.status === JOB_STATUS.REWORK
                            ? 'bg-rose-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                      {job.qr_code?.token}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => navigate(`/admin/jobs/${job.id}`)}
                      rightIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Buka Job
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Monitoring;
