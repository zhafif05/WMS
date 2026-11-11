import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, QrCode } from 'lucide-react';
import QRScanner from '../../components/common/QRScanner';
import qrService from '../../services/qrService';

export const ScanQR = () => {
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

      const assigned = res.assigned_treatments || [];
      const activeId = res.active_treatment?.id;
      const target =
        assigned.find((t) => Number(t.id) === Number(activeId)) || assigned[0];

      if (target) {
        navigate(`/worker/treatment/${res.job_id}/${target.id}`);
      } else {
        navigate(`/worker/jobs`);
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        `QR Code "${cleanToken}" tidak valid atau Anda tidak memiliki hak akses pengerjaan untuk Job ini.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
          <QrCode className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Scan QR Code Pekerjaan</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Arahkan kamera ke stiker QR Code pada unit mesin untuk membuka lembar kerja tindakan
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Memvalidasi QR Code dan hak akses pengerjaan ke server...</span>
        </div>
      )}

      <QRScanner onScanSuccess={handleScanSuccess} />
    </div>
  );
};

export default ScanQR;
