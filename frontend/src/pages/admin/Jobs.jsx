import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlusCircle, ArrowUpRight, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import jobService from '../../services/jobService';
import { JOB_STATUS, JOB_STATUS_LABELS, formatDate } from '../../utils/constants';

export const Jobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await jobService.getJobs();
      setJobs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat daftar pekerjaan.');
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

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage) || 1;
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredJobs.slice(start, start + itemsPerPage);
  }, [filteredJobs, currentPage]);

  const columns = [
    {
      header: 'Nomor Job & QR Token',
      key: 'job_number',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900">{row.job_number}</span>
          <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate max-w-xs">
            {row.qr_code?.token || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Nama Komponen & Barang',
      key: 'item_name',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.item?.item_name || '-'}</div>
          <div className="text-xs text-slate-400 font-mono">
            {row.item?.item_code} {row.item?.brand ? `• ${row.item.brand}` : ''}
          </div>
        </div>
      ),
    },
    {
      header: 'Status Aktif',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Progres Treatment',
      key: 'treatments',
      render: (row) => {
        const trts = row.job_treatments || [];
        const completed = trts.filter((t) => t.completed_at).length;
        const total = trts.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div className="w-36">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-mono">
              <span>{completed} / {total} Tindakan</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  row.status === JOB_STATUS.COMPLETED
                    ? 'bg-emerald-500'
                    : row.status === JOB_STATUS.REWORK
                    ? 'bg-rose-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Diterima',
      key: 'received_at',
      render: (row) => (
        <span className="text-slate-500 text-xs font-mono">
          {formatDate(row.received_at || row.created_at)}
        </span>
      ),
    },
    {
      header: 'Aksi',
      key: 'action',
      align: 'right',
      render: (row) => (
        <Button
          size="xs"
          variant="outline"
          onClick={() => navigate(`/admin/jobs/${row.id}`)}
          rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
        >
          Buka
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Daftar Pekerjaan (Jobs)</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola dan pantau seluruh order reparasi aktif maupun historis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchJobs} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate('/admin/jobs/create')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Registrasi Job Baru
          </Button>
        </div>
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
            <div className="w-full sm:w-72">
              <Input
                placeholder="Cari No. Job atau Komponen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Status:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({jobs.length})
              </button>
              {Object.keys(JOB_STATUS).map((key) => {
                const val = JOB_STATUS[key];
                const count = jobs.filter((j) => j.status === val).length;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStatusFilter(val)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                      statusFilter === val
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {JOB_STATUS_LABELS[val]} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={paginatedJobs}
            isLoading={isLoading}
            emptyMessage="Tidak ada pekerjaan yang cocok dengan kriteria pencarian."
          />
        </CardContent>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Menampilkan {paginatedJobs.length} dari {filteredJobs.length} Job
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                    currentPage === idx + 1
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Jobs;
