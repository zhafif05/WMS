import React from 'react';
import {
  LayoutDashboard,
  Users,
  Package,
  Wrench,
  Building2,
  FileSpreadsheet,
  PlusCircle,
  Activity,
  History,
} from 'lucide-react';
import AppLayout from '../components/common/AppLayout';

export const AdminLayout = () => {
  const adminNavigation = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, end: true },
    { name: 'Data Pengguna', path: '/admin/users', icon: Users },
    { name: 'Data Barang', path: '/admin/items', icon: Package },
    { name: 'Data Treatment', path: '/admin/treatments', icon: Wrench },
    { name: 'Data Vendor', path: '/admin/vendors', icon: Building2 },
    { name: 'Daftar Job', path: '/admin/jobs', icon: FileSpreadsheet, end: true },
    { name: 'Buat Job', path: '/admin/jobs/create', icon: PlusCircle },
    { name: 'Monitoring Pekerjaan', path: '/admin/monitoring', icon: Activity },
    { name: 'Riwayat Job', path: '/admin/history', icon: History },
  ];

  return <AppLayout navigation={adminNavigation} roleLabel="Administrator" roleBadgeColor="blue" />;
};

export default AdminLayout;
