import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import qcService from '../../services/qcService';
import { formatDate } from '../../utils/constants';

export const Inspections = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState('qc'); // 'qc', 'rework', 'all'

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await qcService.getInspectionJobs();
      setJobs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat daftar antrean inspeksi.');
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

      const matchTab =
        tabFilter === 'all'
          ? ['qc', 'rework', 'completed', 'treatment'].includes(job.status)
          : job.status === tabFilter;

      return matchSearch && matchTab;
    });
  }, [jobs, search, tabFilter]);

  const columns = [
    {
      header: 'Nomor Job',
      key: 'job_number',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900">{row.job_number}</span>
          <div className="text-[10px] font-mono text-slate-400">{row.qr_code?.token || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Komponen / Mesin',
      key: 'item_name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.item?.item_name || '-'}</div>
          <div className="text-xs text-slate-400 font-mono">
            {row.item?.item_code} • {row.item?.brand}
          </div>
        </div>
      ),
    },
    {
      header: 'Status Alur',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Treatment Selesai',
      key: 'treatments',
      render: (row) => {
        const trts = row.job_treatments || [];
        const completedCount = trts.filter((t) => t.completed_at).length;
        return (
          <span className="text-xs font-mono text-slate-600">
            {completedCount} / {trts.length} Treatment Selesai
          </span>
        );
      },
    },
    {
      header: 'Tanggal Diterima',
      key: 'received_date',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
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
          className="border-purple-200 text-purple-700 hover:bg-purple-50"
          onClick={() => navigate(`/qc/inspect/${row.id}`)}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          {row.status === 'qc' ? 'Mulai Inspeksi' : 'Detail'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Antrean Pemeriksaan QC
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar pekerjaan reparasi yang menunggu verifikasi standar kelayakan dan hasil perbaikan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchJobs} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Cari No. Job, nama mesin, kode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTabFilter('qc')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  tabFilter === 'qc'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Menunggu QC ({jobs.filter((j) => j.status === 'qc').length})
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('rework')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  tabFilter === 'rework'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Dalam Rework ({jobs.filter((j) => j.status === 'rework').length})
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('all')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  tabFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({jobs.length})
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredJobs}
            isLoading={isLoading}
            emptyMessage="Tidak ada antrean inspeksi yang cocok dengan filter saat ini."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Inspections;
