import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import treatmentService from '../../services/treatmentService';

export const Treatments = () => {
  const [treatments, setTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrt, setEditingTrt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    treatment_name: '',
    description: '',
    estimated_duration: '',
  });
  const [formError, setFormError] = useState('');

  const fetchTreatments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await treatmentService.getTreatments();
      setTreatments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil data treatment.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreatments();
  }, []);

  const handleOpenCreate = () => {
    setEditingTrt(null);
    setFormData({
      treatment_name: '',
      description: '',
      estimated_duration: '180 menit',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (trt) => {
    setEditingTrt(trt);
    setFormData({
      treatment_name: trt.treatment_name,
      description: trt.description || '',
      estimated_duration: trt.estimated_duration || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus treatment "${name}"?`)) return;
    try {
      await treatmentService.deleteTreatment(id);
      fetchTreatments();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus treatment.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.treatment_name.trim()) {
      setFormError('Nama jenis treatment wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTrt) {
        await treatmentService.updateTreatment(editingTrt.id, formData);
      } else {
        await treatmentService.createTreatment(formData);
      }
      setIsModalOpen(false);
      fetchTreatments();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan treatment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Nama Jenis Tindakan / Treatment',
      key: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.treatment_name}</div>
          <div className="text-[11px] text-slate-500 max-w-md line-clamp-1">{row.description || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Estimasi Durasi',
      key: 'estimated_duration',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {row.estimated_duration || '-'}
        </span>
      ),
    },
    {
      header: 'Aksi',
      key: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="xs"
            variant="outline"
            onClick={() => handleOpenEdit(row)}
            title="Edit Treatment"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => handleDelete(row.id, row.treatment_name)}
            title="Hapus Treatment"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Master Data Treatment</h1>
          <p className="text-xs text-slate-500 mt-1">
            Katalog tindakan teknis reparasi, durasi standar, dan deskripsi pengerjaan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTreatments} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tambah Treatment
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={treatments}
            isLoading={isLoading}
            emptyMessage="Belum ada data treatment teknis yang didaftarkan."
          />
        </CardContent>
      </Card>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTrt ? 'Edit Jenis Treatment' : 'Tambah Jenis Treatment'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Nama Tindakan / Treatment"
            value={formData.treatment_name}
            onChange={(e) => setFormData({ ...formData, treatment_name: e.target.value })}
            placeholder="Contoh: Precision Machining Poros"
            required
          />

          <Input
            label="Estimasi Durasi Pengerjaan"
            value={formData.estimated_duration}
            onChange={(e) => setFormData({ ...formData, estimated_duration: e.target.value })}
            placeholder="Contoh: 180 menit atau 3 jam"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Instruksi Teknis & Deskripsi
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="SOP atau detail lingkup pengerjaan tindakan ini..."
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isSubmitting}>
              {editingTrt ? 'Simpan Perubahan' : 'Tambahkan Treatment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Treatments;
