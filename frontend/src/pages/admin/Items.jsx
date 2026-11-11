import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, History, ExternalLink, RefreshCw } from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import itemService from '../../services/itemService';
import { formatDate } from '../../utils/constants';

export const Items = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    brand: '',
    model: '',
    serial_number: '',
    description: '',
  });
  const [formError, setFormError] = useState('');

  // Modal State for Item History
  const [historyModalItem, setHistoryModalItem] = useState(null);

  const fetchItems = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await itemService.getItems();
      setItems(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data barang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      return (
        (item.item_name && item.item_name.toLowerCase().includes(q)) ||
        (item.item_code && item.item_code.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.serial_number && item.serial_number.toLowerCase().includes(q))
      );
    });
  }, [items, search]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      item_code: `ITM-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, '0')}`,
      item_name: '',
      brand: '',
      model: '',
      serial_number: '',
      description: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      item_code: item.item_code,
      item_name: item.item_name,
      brand: item.brand || '',
      model: item.model || '',
      serial_number: item.serial_number || '',
      description: item.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Hapus barang "${item.item_name}"?`)) return;
    try {
      await itemService.deleteItem(item.id);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus barang.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.item_name.trim() || !formData.item_code.trim()) {
      setFormError('Kode barang dan nama barang wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await itemService.updateItem(editingItem.id, formData);
      } else {
        await itemService.createItem(formData);
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan barang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Kode & Nama Barang',
      key: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.item_name}</div>
          <div className="text-[11px] font-mono text-blue-600">{row.item_code}</div>
        </div>
      ),
    },
    {
      header: 'Merek & Model',
      key: 'brand',
      render: (row) => (
        <div className="text-slate-600">
          <div>{row.brand || '-'}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.model || '-'}</div>
        </div>
      ),
    },
    {
      header: 'Serial Number',
      key: 'serial_number',
      render: (row) => (
        <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
          {row.serial_number || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Total Job Reparasi',
      key: 'jobs_count',
      render: (row) => (
        <button
          onClick={() => setHistoryModalItem(row)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          <span>{row.jobs_count || 0} Kali Masuk</span>
        </button>
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
            title="Edit Barang"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => handleDeleteItem(row)}
            title="Hapus Barang"
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Data Barang / Mesin</h1>
          <p className="text-xs text-slate-500 mt-1">
            Master database mesin, unit peralatan, atau suku cadang pelanggan yang diperbaiki
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchItems} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Daftarkan Barang Baru
          </Button>
        </div>
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
              placeholder="Cari kode, nama, brand, serial number..."
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
            data={filteredItems}
            isLoading={isLoading}
            emptyMessage="Tidak ada data barang yang sesuai."
          />
        </CardContent>
      </Card>

      {/* Modal Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Data Barang' : 'Daftarkan Barang Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kode Barang"
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
              required
            />
            <Input
              label="Nomor Seri / S/N"
              value={formData.serial_number}
              onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
              placeholder="SN-12345"
            />
          </div>

          <Input
            label="Nama Barang / Mesin"
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            placeholder="Contoh: CNC Milling 3-Axis"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Merek / Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="Makino, Siemens, dll"
            />
            <Input
              label="Model / Tipe"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="V33i"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Deskripsi & Spesifikasi Singkat
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Karakteristik atau catatan umum mesin..."
              className="block w-full rounded-lg border border-slate-300 px-3.5 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isSubmitting}>
              {editingItem ? 'Simpan Perubahan' : 'Daftarkan Barang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* History Modal */}
      {historyModalItem && (
        <Modal
          isOpen={!!historyModalItem}
          onClose={() => setHistoryModalItem(null)}
          title={`Riwayat Reparasi: ${historyModalItem.item_name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex justify-between">
              <div>
                <span className="text-slate-400">Kode:</span>{' '}
                <span className="font-mono font-bold text-slate-800">{historyModalItem.item_code}</span>
              </div>
              <div>
                <span className="text-slate-400">S/N:</span>{' '}
                <span className="font-mono text-slate-800">{historyModalItem.serial_number || '-'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Total riwayat pekerjaan tercatat pada barang ini: <strong>{historyModalItem.jobs_count || 0} Job</strong>
            </p>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setHistoryModalItem(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Items;
