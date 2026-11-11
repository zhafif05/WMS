import React from 'react';
import { LayoutDashboard, ClipboardCheck, QrCode, History } from 'lucide-react';
import AppLayout from '../components/common/AppLayout';

export const QCLayout = () => {
  const qcNavigation = [
    { name: 'Dashboard', path: '/qc/dashboard', icon: LayoutDashboard, end: true },
    { name: 'Daftar Pemeriksaan', path: '/qc/inspections', icon: ClipboardCheck },
    { name: 'Scan QR Code', path: '/qc/scan', icon: QrCode },
    { name: 'Riwayat QC', path: '/qc/history', icon: History },
  ];

  return <AppLayout navigation={qcNavigation} roleLabel="Quality Control (QC)" roleBadgeColor="purple" />;
};

export default QCLayout;
