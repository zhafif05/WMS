import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import jobService from '../../services/jobService';
import { JOB_STATUS, formatDate } from '../../utils/constants';

export const History = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await jobService.getJobs({ status: JOB_STATUS.COMPLETED });
      setJobs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat arsip riwayat pekerjaan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const completedJobs = useMemo(() => {
    return jobs.filter((j) => {
      const q = search.toLowerCase();
      const itemName = j.item?.item_name || '';
      const itemCode = j.item?.item_code || '';
      const brand = j.item?.brand || '';
      return (
        j.job_number.toLowerCase().includes(q) ||
        itemName.toLowerCase().includes(q) ||
        itemCode.toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q)
      );
    });
  }, [jobs, search]);

  const columns = [
    {
      header: 'Nomor Job',
      key: 'job_number',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.job_number}</span>
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
      header: 'Tanggal Diterima',
      key: 'received_date',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">{formatDate(row.received_at || row.created_at)}</span>
      ),
    },
    {
      header: 'Status Akhir',
      key: 'status',
      render: (row) => <Badge status={row.status} />,
    },
    {
      header: 'Keluhan Awal',
      key: 'problem',
      render: (row) => (
        <span className="text-xs text-slate-500 line-clamp-1 max-w-xs">{row.problem_description}</span>
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
          rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
        >
          Lihat Berkas
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Arsip Riwayat Pekerjaan</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar seluruh pekerjaan reparasi yang telah berhasil diselesaikan dan lolos uji QC
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

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Cari arsip nomor job, unit mesin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={completedJobs}
            isLoading={isLoading}
            emptyMessage="Belum ada riwayat pekerjaan yang berstatus selesai."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
