import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ExternalLink, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import qcService from '../../services/qcService';
import { formatDate } from '../../utils/constants';

export const QCHistory = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await qcService.getHistory();
      setInspections(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat riwayat inspeksi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    return inspections.filter((ins) => {
      const q = search.toLowerCase();
      const jobNum = ins.job?.job_number || '';
      const itemName = ins.job?.item?.item_name || '';
      const notes = ins.notes || '';
      return (
        jobNum.toLowerCase().includes(q) ||
        itemName.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q)
      );
    });
  }, [inspections, search]);

  const columns = [
    {
      header: 'Nomor Job',
      key: 'job_number',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {row.job?.job_number || '-'}
        </span>
      ),
    },
    {
      header: 'Komponen Mesin',
      key: 'item_name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.job?.item?.item_name || '-'}</div>
          <div className="text-xs text-slate-400 font-mono">
            {row.job?.item?.item_code || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Hasil QC',
      key: 'result',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            row.result === 'sesuai'
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-rose-100 text-rose-800 border border-rose-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.result === 'sesuai' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
          {row.result === 'sesuai' ? 'Sesuai' : 'Tidak Sesuai (Rework)'}
        </span>
      ),
    },
    {
      header: 'Catatan Pengujian & Temuan',
      key: 'notes',
      render: (row) => (
        <div className="text-xs text-slate-600 max-w-sm line-clamp-2 leading-relaxed">
          {row.notes}
        </div>
      ),
    },
    {
      header: 'Tanggal Inspeksi',
      key: 'inspected_at',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono">
          {formatDate(row.inspected_at || row.created_at, { includeTime: true })}
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
          onClick={() => navigate(`/qc/inspect/${row.job_id}`)}
          rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
        >
          Buka Berkas
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Riwayat Pemeriksaan QC</h1>
          <p className="text-xs text-slate-500 mt-1">
            Arsip seluruh keputusan inspeksi kualitas, catatan pengujian, dan riwayat rework yang pernah Anda lakukan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
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
              placeholder="Cari nomor job, nama mesin, temuan..."
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
            data={filtered}
            isLoading={isLoading}
            emptyMessage="Belum ada riwayat pemeriksaan kualitas yang tercatat."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default QCHistory;
