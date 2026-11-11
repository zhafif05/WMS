import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, RefreshCw, Clock } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card, { CardContent } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import workerService from '../../services/workerService';
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

export const WorkerHistory = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await workerService.getHistory();
      setLogs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat riwayat teknisi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const columns = [
    {
      header: 'Nomor Job',
      key: 'job_number',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-900">
          {row.job_treatment?.job?.job_number || '-'}
        </span>
      ),
    },
    {
      header: 'Unit Mesin',
      key: 'item_name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">
            {row.job_treatment?.job?.item?.item_name || '-'}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {row.job_treatment?.job?.item?.item_code || '-'}
          </div>
        </div>
      ),
    },
    {
      header: 'Tindakan Treatment',
      key: 'treatment_name',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">
            {row.job_treatment?.treatment?.treatment_name || '-'}
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">{row.notes || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Jenis Pengerjaan',
      key: 'execution_type',
      render: (row) => {
        const isVendor = row.job_treatment?.execution_type === 'vendor';
        return (
          <div>
            <span
              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                isVendor
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isVendor ? 'PIC Vendor' : 'Pekerjaan Internal'}
            </span>
            {isVendor && (
              <div className="text-[10px] text-purple-700 mt-0.5">
                {row.job_treatment?.vendor?.vendor_name || '-'}
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Aktivitas',
      key: 'action_type',
      render: (row) => (
        <div className="space-y-1">
          <span className="block w-fit text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            {ACTION_LABELS[row.action_type] || row.action_type}
          </span>
          {row.activity_source && (
            <span
              className={`block w-fit text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                row.activity_source?.startsWith('vendor')
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {ACTIVITY_SOURCE_LABELS[row.activity_source] || row.activity_source}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Waktu Pencatatan',
      key: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {formatDate(row.created_at, { includeTime: true })}
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
          onClick={() =>
            navigate(
              `/worker/treatment/${row.job_treatment?.job_id}/${row.job_treatment?.id}`
            )
          }
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Lihat
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Riwayat Pengerjaan Anda
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Arsip log aktivitas pekerjaan internal dan pemantauan vendor yang Anda catat sebagai PIC
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

      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={logs}
            isLoading={isLoading}
            emptyMessage="Belum ada riwayat aktivitas pengerjaan yang tercatat."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkerHistory;
