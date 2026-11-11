import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, RefreshCw, Lock, Play, CheckCircle2, Clock } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import workerService from '../../services/workerService';
import { formatDate } from '../../utils/constants';

const getTreatmentStatus = (t) => {
  if (t.status === 'completed' || t.completed_at) return 'completed';
  if (t.status === 'in_progress' || (t.started_at && !t.completed_at)) return 'in_progress';
  return 'pending';
};

const isLockedByOther = (t) =>
  getTreatmentStatus(t) === 'pending' &&
  !!t.active_treatment &&
  Number(t.active_treatment.id) !== Number(t.id);

export const MyJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchMyJobs = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await workerService.getMyJobs();
      setJobs(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil pekerjaan teknisi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const myTreatments = useMemo(() => {
    const list = [];
    jobs.forEach((job) => {
      if (job.job_treatments) {
        job.job_treatments.forEach((trt) => {
          list.push({
            id: trt.id,
            job_id: job.id,
            job_number: job.job_number,
            item_name: job.item?.item_name,
            item_code: job.item?.item_code,
            brand: job.item?.brand,
            job_status: job.status,
            sequence: trt.sequence,
            treatment_name: trt.treatment?.treatment_name,
            description: trt.treatment?.description,
            execution_type: trt.execution_type,
            worker: trt.worker,
            vendor: trt.vendor,
            status: trt.status,
            started_at: trt.started_at,
            completed_at: trt.completed_at,
            active_treatment: job.active_treatment,
            received_at: job.received_at || job.created_at,
          });
        });
      }
    });
    return list;
  }, [jobs]);

  const filtered = useMemo(() => {
    return myTreatments.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        (t.job_number && t.job_number.toLowerCase().includes(q)) ||
        (t.item_name && t.item_name.toLowerCase().includes(q)) ||
        (t.treatment_name && t.treatment_name.toLowerCase().includes(q)) ||
        (t.vendor?.vendor_name && t.vendor.vendor_name.toLowerCase().includes(q));

      const matchType =
        typeFilter === 'all' ? true : t.execution_type === typeFilter;

      const matchState =
        filterState === 'all'
          ? true
          : filterState === 'rework'
          ? t.job_status === 'rework'
          : filterState === 'in_progress'
          ? t.status === 'in_progress'
          : filterState === 'pending'
          ? t.status === 'pending'
          : t.status === 'completed';

      return matchSearch && matchType && matchState;
    });
  }, [myTreatments, search, filterState, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Pekerjaan Saya</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar pekerjaan internal dan pekerjaan vendor yang Anda tangani sebagai PIC internal
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMyJobs} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <Input
                placeholder="Cari nomor job, nama mesin, treatment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterState('all')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterState === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({myTreatments.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterState('pending')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterState === 'pending'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Belum Mulai ({myTreatments.filter((t) => t.status === 'pending').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterState('in_progress')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterState === 'in_progress'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Sedang Dikerjakan ({myTreatments.filter((t) => t.status === 'in_progress').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterState('rework')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterState === 'rework'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Rework ({myTreatments.filter((t) => t.job_status === 'rework').length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Jenis Tanggung Jawab:
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('internal')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === 'internal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Pekerjaan Internal ({myTreatments.filter((t) => t.execution_type === 'internal').length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('vendor')}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === 'vendor'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              PIC Vendor ({myTreatments.filter((t) => t.execution_type === 'vendor').length})
            </button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat daftar penugasan...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Tidak ada pekerjaan yang cocok dengan filter saat ini.
            </div>
          ) : (
            filtered.map((t) => {
              const treatmentStatus = getTreatmentStatus(t);
              const isLocked = isLockedByOther(t);

              return (
              <div
                key={t.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    #{t.sequence || 1}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {t.job_number}
                      </span>
                      {t.execution_type === 'vendor' ? (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          PIC VENDOR
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          PEKERJAAN INTERNAL
                        </span>
                      )}
                      {treatmentStatus === 'completed' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          SELESAI
                        </span>
                      ) : treatmentStatus === 'in_progress' ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          SEDANG DIKERJAKAN
                        </span>
                      ) : isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Lock className="w-2.5 h-2.5" /> MENUNGGU TREATMENT LAIN
                        </span>
                      ) : t.job_status === 'rework' ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          MENUNGGU REWORK
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          MENUNGGU DIMULAI
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm mt-1">{t.treatment_name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Mesin: {t.item_name} ({t.item_code})
                    </p>
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">
                      {t.description || 'Pengerjaan sesuai instruksi teknis.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px]">
                      <span className="text-slate-500">
                        Worker PIC: <strong className="text-slate-800">{t.worker?.name || '-'}</strong>
                      </span>
                      {t.execution_type === 'vendor' && (
                        <span className="text-purple-700">
                          Vendor: <strong>{t.vendor?.vendor_name || '-'}</strong>
                        </span>
                      )}
                      <span className="font-mono text-slate-400">
                        Diterima: {formatDate(t.received_at)}
                      </span>
                    </div>

                    {isLocked && (
                      <p className="mt-2 inline-flex items-start gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          Menunggu treatment lain selesai. Sedang dikerjakan:{' '}
                          <strong>{t.active_treatment?.treatment_name || '-'}</strong>
                          {t.active_treatment?.worker_name
                            ? ` oleh ${t.active_treatment.worker_name}`
                            : ''}
                          .
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 self-end sm:self-center">
                  <Button
                    variant={
                      treatmentStatus === 'in_progress'
                        ? 'accent'
                        : treatmentStatus === 'completed'
                        ? 'outline'
                        : isLocked
                        ? 'outline'
                        : t.job_status === 'rework'
                        ? 'accent'
                        : t.execution_type === 'vendor'
                        ? 'outline'
                        : 'primary'
                    }
                    size="sm"
                    onClick={() => navigate(`/worker/treatment/${t.job_id}/${t.id}`)}
                    leftIcon={
                      treatmentStatus === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : treatmentStatus === 'in_progress' ? (
                        <Clock className="w-4 h-4" />
                      ) : isLocked ? (
                        <Lock className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )
                    }
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    {treatmentStatus === 'completed'
                      ? 'Detail'
                      : treatmentStatus === 'in_progress'
                      ? 'Lanjutkan'
                      : isLocked
                      ? 'Terkunci'
                      : t.job_status === 'rework'
                      ? 'Mulai Rework'
                      : 'Mulai'}
                  </Button>
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

export default MyJobs;
