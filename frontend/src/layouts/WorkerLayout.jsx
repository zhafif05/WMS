import React from 'react';
import { LayoutDashboard, CheckSquare, QrCode, History } from 'lucide-react';
import AppLayout from '../components/common/AppLayout';

export const WorkerLayout = () => {
  const workerNavigation = [
    { name: 'Dashboard', path: '/worker/dashboard', icon: LayoutDashboard, end: true },
    { name: 'Pekerjaan Saya', path: '/worker/jobs', icon: CheckSquare },
    { name: 'Scan QR Code', path: '/worker/scan', icon: QrCode },
    { name: 'Riwayat Pengerjaan', path: '/worker/history', icon: History },
  ];

  return <AppLayout navigation={workerNavigation} roleLabel="Teknisi / Worker" roleBadgeColor="amber" />;
};

export default WorkerLayout;
