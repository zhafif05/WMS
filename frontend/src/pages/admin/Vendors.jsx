import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import vendorService from '../../services/vendorService';
import treatmentService from '../../services/treatmentService';
import MultiSelectTreatment from '../../components/common/MultiSelectTreatment';

export const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    treatment_ids: [],
  });
  const [formError, setFormError] = useState('');

  const fetchVendors = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [data, treatmentData] = await Promise.all([
        vendorService.getVendors(),
        treatmentService.getTreatments(),
      ]);
      setVendors(data);
      setTreatments(treatmentData);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data vendor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenCreate = () => {
    setEditingVendor(null);
    setFormData({
      vendor_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      treatment_ids: [],
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setFormData({
      vendor_name: v.vendor_name,
      contact_person: v.contact_person || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      treatment_ids: (v.treatments || []).map((treatment) => treatment.id),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Yakin ingin menghapus vendor "${name}"?`)) return;
    try {
      await vendorService.deleteVendor(id);
      fetchVendors();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus vendor.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.vendor_name.trim()) {
      setFormError('Nama vendor wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, formData);
      } else {
        await vendorService.createVendor(formData);
      }
      setIsModalOpen(false);
      fetchVendors();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Nama Vendor',
      key: 'vendor_name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900">{row.vendor_name}</div>
          <div className="text-[11px] text-slate-500">PIC: {row.contact_person || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Kontak',
      key: 'contact',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          {row.phone && (
            <div className="flex items-center gap-1.5 text-slate-600 font-mono">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{row.email}</span>
            </div>
          )}
          {!row.phone && !row.email && <span className="text-slate-400">-</span>}
        </div>
      ),
    },
    {
      header: 'Alamat',
      key: 'address',
      render: (row) => (
        <div className="flex items-start gap-1.5 text-xs text-slate-600 max-w-xs">
          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{row.address || '-'}</span>
        </div>
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
            title="Edit Vendor"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => handleDelete(row.id, row.vendor_name)}
            title="Hapus Vendor"
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Data Rekanan & Vendor</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar pihak ketiga / rekanan spesialis untuk pengerjaan eksternal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchVendors} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tambah Rekanan
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
            data={vendors}
            isLoading={isLoading}
            emptyMessage="Belum ada data rekanan eksternal."
          />
        </CardContent>
      </Card>

      {/* Modal Add / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVendor ? 'Edit Data Rekanan' : 'Tambah Rekanan Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Nama Perusahaan / Bengkel Vendor"
            value={formData.vendor_name}
            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
            placeholder="Contoh: PT Precision Part Surabaya"
            required
          />

          <Input
            label="Contact Person (PIC)"
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
            placeholder="Nama perwakilan rekanan"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nomor Telepon"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="081234567890"
            />
            <Input
              label="Alamat Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="kontak@vendor.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Alamat Lengkap Workshop / Kantor
            </label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Jl. Kawasan Industri..."
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <MultiSelectTreatment
            options={treatments}
            value={formData.treatment_ids}
            onChange={(treatment_ids) => setFormData({ ...formData, treatment_ids })}
            label="Kompetensi Treatment Vendor"
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isSubmitting}>
              {editingVendor ? 'Simpan Perubahan' : 'Tambahkan Rekanan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Vendors;
