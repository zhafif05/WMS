import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  UserPlus,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import Card, { CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import userService from '../../services/userService';
import treatmentService from '../../services/treatmentService';
import MultiSelectTreatment from '../../components/common/MultiSelectTreatment';
import { ROLES, formatDate } from '../../utils/constants';

export const Users = () => {
  const [users, setUsers] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: ROLES.WORKER,
    treatment_ids: [],
  });
  const [formError, setFormError] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [data, treatmentData] = await Promise.all([
        userService.getUsers(),
        treatmentService.getTreatments(),
      ]);
      setUsers(data);
      setTreatments(treatmentData);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengambil data pengguna.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone && u.phone.toLowerCase().includes(search.toLowerCase()));
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: ROLES.WORKER,
      treatment_ids: [],
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role,
      treatment_ids: (user.treatment_skills || []).map((treatment) => treatment.id),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Hapus pengguna "${name}"?`)) return;
    try {
      await userService.deleteUser(id);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus pengguna.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Nama dan email wajib diisi.');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      setFormError('Kata sandi wajib diisi untuk pengguna baru.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        ...(formData.role === ROLES.WORKER
          ? { treatment_ids: [...new Set(formData.treatment_ids.map(Number))] }
          : { treatment_ids: [] }),
      };
      if (editingUser) {
        await userService.updateUser(editingUser.id, payload);
      } else {
        await userService.createUser(payload);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Nama Pengguna',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-white uppercase">
            {row.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-slate-800">{row.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      key: 'role',
      render: (row) => {
        let badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
        let Icon = ShieldCheck;
        let label = 'Admin';

        if (row.role === ROLES.WORKER) {
          badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
          Icon = Wrench;
          label = 'Worker';
        } else if (row.role === ROLES.QC) {
          badgeClass = 'bg-purple-100 text-purple-800 border-purple-200';
          Icon = CheckCircle;
          label = 'QC';
        }

        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeClass}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </span>
        );
      },
    },
    {
      header: 'No. Telepon',
      key: 'phone',
      render: (row) => <span className="font-mono text-slate-600">{row.phone || '-'}</span>,
    },
    {
      header: 'Status',
      key: 'is_active',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
            row.is_active
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      ),
    },
    {
      header: 'Terdaftar',
      key: 'created_at',
      render: (row) => <span className="text-slate-400 font-mono text-[11px]">{formatDate(row.created_at)}</span>,
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
            title="Edit Pengguna"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="xs"
            variant="outline"
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            onClick={() => handleDeleteUser(row.id, row.name)}
            title="Hapus Pengguna"
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Manajemen Pengguna</h1>
          <p className="text-xs text-slate-500 mt-1">
            Kelola data dan hak akses akun Admin, Worker, dan Tim QC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {error}
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-72">
              <Input
                placeholder="Cari nama, email, no telepon..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-medium text-slate-500 shrink-0">Filter Role:</span>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Semua Role' },
                  { value: ROLES.ADMIN, label: 'Admin' },
                  { value: ROLES.WORKER, label: 'Worker' },
                  { value: ROLES.QC, label: 'QC' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table
            columns={columns}
            data={filteredUsers}
            isLoading={isLoading}
            emptyMessage="Tidak ada pengguna yang cocok dengan kriteria pencarian."
          />
        </CardContent>
      </Card>

      {/* Modal Add / Edit User */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs">
              {formError}
            </div>
          )}

          <Input
            label="Nama Lengkap"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Contoh: Budi Santoso"
            required
          />

          <Input
            label="Alamat Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="nama@elmech.co.id"
            required
          />

          <Input
            label={editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Minimal 6 karakter"
            required={!editingUser}
          />

          <Input
            label="No. Telepon / WhatsApp"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="081234567890"
          />

          <Select
            label="Role Akses Sistem"
            value={formData.role}
            onChange={(e) =>
              setFormData({
                ...formData,
                role: e.target.value,
                treatment_ids: e.target.value === ROLES.WORKER ? formData.treatment_ids : [],
              })
            }
            options={[
              { value: ROLES.WORKER, label: 'Worker (Teknisi Pengerjaan)' },
              { value: ROLES.QC, label: 'Quality Control (QC Lead)' },
              { value: ROLES.ADMIN, label: 'Administrator (Akses Penuh)' },
            ]}
          />

          {formData.role === ROLES.WORKER && (
            <MultiSelectTreatment
              options={treatments}
              value={formData.treatment_ids}
              onChange={(treatment_ids) => setFormData({ ...formData, treatment_ids })}
              label="Kompetensi Treatment Worker"
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="accent" isLoading={isSubmitting}>
              {editingUser ? 'Simpan Perubahan' : 'Tambahkan Pengguna'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;
