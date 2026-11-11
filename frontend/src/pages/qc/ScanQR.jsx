import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, QrCode } from 'lucide-react';
import QRScanner from '../../components/common/QRScanner';
import qrService from '../../services/qrService';

export const QCScanQR = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScanSuccess = async (rawToken) => {
    setErrorMsg('');
    const cleanToken = rawToken ? rawToken.trim() : '';

    if (!cleanToken) {
      setErrorMsg('Token QR tidak boleh kosong.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await qrService.scanQR(cleanToken);
      navigate(`/qc/inspect/${res.job_id}`);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        `QR Code "${cleanToken}" tidak ditemukan di sistem atau tidak valid.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 flex items-center justify-center shrink-0">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Scan QR Code Pemeriksaan QC</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pindai QR Code pada unit barang untuk membuka formulir audit dan verifikasi kualitas
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <strong className="block font-semibold">Gagal Membuka Lembar QC</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Memvalidasi QR Code pemeriksaan ke server...</span>
        </div>
      )}

      <QRScanner onScanSuccess={handleScanSuccess} />
    </div>
  );
};

export default QCScanQR;
