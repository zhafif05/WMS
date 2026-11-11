import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Search,
  Wrench,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  AlertCircle,
} from 'lucide-react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import itemService from '../../services/itemService';
import treatmentService from '../../services/treatmentService';
import vendorService from '../../services/vendorService';
import userService from '../../services/userService';
import jobService from '../../services/jobService';

export const CreateJob = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Data Barang
  const [isNewItem, setIsNewItem] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [newItemData, setNewItemData] = useState({
    item_code: '',
    name: '',
    brand: '',
    model: '',
    serial_number: '',
    description: '',
  });
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [initialCondition, setInitialCondition] = useState('');

  // Step 2: Analisis
  const [analysisResult, setAnalysisResult] = useState('');
  const [damageNotes, setDamageNotes] = useState('');

  // Step 3: Penentuan Treatment
  const [selectedTreatments, setSelectedTreatments] = useState([]);

  useEffect(() => {
    const fetchMasterData = async () => {
      setIsLoadingMaster(true);
      try {
        const [itemsData, trtsData, vendorsData, usersData] = await Promise.all([
          itemService.getItems(),
          treatmentService.getTreatments(),
          vendorService.getVendors(),
          userService.getUsers({ role: 'worker' }),
        ]);

        setItems(itemsData);
        setTreatments(trtsData);
        setVendors(vendorsData);
        const activeWorkers = usersData.filter((u) => u.is_active);
        setWorkers(activeWorkers);

        if (itemsData.length > 0) {
          setSelectedItemId(String(itemsData[0].id));
        } else {
          setIsNewItem(true);
        }

        setNewItemData((prev) => ({
          ...prev,
          item_code: `ITM-${new Date().getFullYear()}-${String(itemsData.length + 1).padStart(3, '0')}`,
        }));

        if (trtsData.length > 0) {
          const firstTreatmentWorkers = activeWorkers.filter((worker) =>
            worker.treatment_skills?.some((skill) => Number(skill.id) === Number(trtsData[0].id))
          );
          setSelectedTreatments([
            {
              id: Date.now(),
              treatment_id: trtsData[0].id,
              treatment_name: trtsData[0].treatment_name,
              execution_type: 'internal',
              worker_id: firstTreatmentWorkers[0]?.id || null,
              worker_name: firstTreatmentWorkers[0]?.name || '',
              vendor_id: null,
              vendor_name: null,
              instructions: '',
            },
          ]);
        }
      } catch {
        setErrorMsg('Gagal memuat master data. Pastikan koneksi backend aktif.');
      } finally {
        setIsLoadingMaster(false);
      }
    };

    fetchMasterData();
  }, []);

  // Validation per step
  const handleNextStep = () => {
    setErrorMsg('');
    if (currentStep === 1) {
      if (isNewItem) {
        if (!newItemData.item_code.trim() || !newItemData.name.trim()) {
          setErrorMsg('Kode dan nama barang baru wajib diisi.');
          return;
        }
      } else {
        if (!selectedItemId) {
          setErrorMsg('Silakan pilih salah satu barang yang terdaftar.');
          return;
        }
      }
      if (!initialCondition.trim()) {
        setErrorMsg('Kondisi awal / keluhan barang saat diterima wajib diisi.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!analysisResult.trim()) {
        setErrorMsg('Hasil analisis teknis Admin wajib diisi.');
        return;
      }
    }

    if (currentStep === 3) {
      if (selectedTreatments.length === 0) {
        setErrorMsg('Minimal tentukan 1 treatment yang harus dikerjakan.');
        return;
      }
      for (let i = 0; i < selectedTreatments.length; i++) {
        const t = selectedTreatments[i];
        if (!t.worker_id) {
          setErrorMsg(`Treatment urutan ke-${i + 1} wajib memiliki Worker Penanggung Jawab (PIC).`);
          return;
        }
        if (t.execution_type === 'vendor' && !t.vendor_id) {
          setErrorMsg(`Treatment urutan ke-${i + 1} berjenis Vendor, sehingga Vendor wajib dipilih.`);
          return;
        }
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setErrorMsg('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleAddTreatment = () => {
    const defaultTrt = treatments[0];
    const defaultWorker = workers[0];
    setSelectedTreatments((prev) => [
      ...prev,
      {
        id: Date.now(),
        treatment_id: defaultTrt?.id || 1,
        treatment_name: defaultTrt?.treatment_name || '',
        execution_type: 'internal',
        worker_id: defaultWorker?.id || null,
        worker_name: defaultWorker?.name || '',
        vendor_id: null,
        vendor_name: null,
        instructions: '',
      },
    ]);
  };

  const handleRemoveTreatment = (index) => {
    setSelectedTreatments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveTreatment = (index, direction) => {
    const updated = [...selectedTreatments];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setSelectedTreatments(updated);
  };

  const handleTreatmentChange = (index, field, value) => {
    const updated = [...selectedTreatments];
    if (field === 'treatment_id') {
      const trtObj = treatments.find((t) => t.id === Number(value));
      updated[index].treatment_id = Number(value);
      updated[index].treatment_name = trtObj?.treatment_name || '';
      const compatibleWorkers = workers.filter((worker) =>
        worker.treatment_skills?.some((skill) => Number(skill.id) === Number(value))
      );
      const compatibleVendors = vendors.filter((vendor) =>
        vendor.treatments?.some((treatment) => Number(treatment.id) === Number(value))
      );
      if (!compatibleWorkers.some((worker) => Number(worker.id) === Number(updated[index].worker_id))) {
        updated[index].worker_id = null;
        updated[index].worker_name = '';
      }
      if (!compatibleVendors.some((vendor) => Number(vendor.id) === Number(updated[index].vendor_id))) {
        updated[index].vendor_id = null;
        updated[index].vendor_name = null;
      }
    } else if (field === 'execution_type') {
      updated[index].execution_type = value;
      // Vendor hanya relevan untuk pekerjaan vendor.
      if (value === 'internal') {
        updated[index].vendor_id = null;
        updated[index].vendor_name = null;
      }
    } else if (field === 'worker_id') {
      const workerObj = workers.find((w) => w.id === Number(value));
      // Worker PIC selalu wajib, termasuk untuk treatment vendor.
      updated[index].worker_id = value ? Number(value) : null;
      updated[index].worker_name = workerObj?.name || null;
    } else if (field === 'vendor_id') {
      const vendorObj = vendors.find((v) => v.id === Number(value));
      updated[index].vendor_id = value ? Number(value) : null;
      updated[index].vendor_name = vendorObj?.vendor_name || null;
    } else {
      updated[index][field] = value;
    }
    setSelectedTreatments(updated);
  };

  const getCompatibleWorkers = (treatmentId) =>
    workers.filter((worker) =>
      worker.treatment_skills?.some((skill) => Number(skill.id) === Number(treatmentId))
    );

  const getCompatibleVendors = (treatmentId) =>
    vendors.filter((vendor) =>
      vendor.treatments?.some((treatment) => Number(treatment.id) === Number(treatmentId))
    );

  // Final submission to Laravel API
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        problem_description: damageNotes || initialCondition,
        initial_condition: initialCondition,
        analysis: analysisResult,
        received_at: receivedDate,
        treatments: selectedTreatments.map((t, idx) => ({
          treatment_id: t.treatment_id,
          worker_id: t.worker_id,
          execution_type: t.execution_type || 'internal',
          vendor_id: t.execution_type === 'vendor' ? t.vendor_id : null,
          sequence: idx + 1,
        })),
      };

      if (isNewItem) {
        payload.new_item = {
          item_code: newItemData.item_code,
          item_name: newItemData.name,
          brand: newItemData.brand,
          model: newItemData.model,
          serial_number: newItemData.serial_number,
          description: newItemData.description,
        };
      } else {
        payload.item_id = Number(selectedItemId);
      }

      const res = await jobService.createJob(payload);
      navigate(`/admin/jobs/${res.job.id}`);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Gagal membuat Job reparasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Data Barang', icon: Package },
    { number: 2, title: 'Analisis Teknis', icon: Search },
    { number: 3, title: 'Penentuan Treatment', icon: Wrench },
    { number: 4, title: 'Review & Terbitkan', icon: CheckCircle2 },
  ];

  if (isLoadingMaster) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Menyiapkan Formulir Pembuatan Job...
          </p>
        </div>
      </div>
    );
  }

  const selectedItemObj = items.find((i) => String(i.id) === String(selectedItemId));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Registrasi Job Reparasi Baru</h1>
        <p className="text-xs text-slate-500 mt-1">
          Ikuti tahapan alur penerimaan, analisis kerusakan, hingga penugasan treatment
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {steps.map((s) => {
          const Icon = s.icon;
          const isPassed = currentStep > s.number;
          const isCurrent = currentStep === s.number;

          return (
            <div
              key={s.number}
              className={`p-3 rounded-xl border transition-all flex items-center gap-3 ${
                isCurrent
                  ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-xs'
                  : isPassed
                  ? 'bg-emerald-50/60 border-emerald-300 text-emerald-900'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isPassed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isPassed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono tracking-wider uppercase font-semibold">
                  Langkah {s.number}
                </div>
                <div className="text-xs font-bold truncate">{s.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: DATA BARANG MASUK */}
      {currentStep === 1 && (
        <Card>
          <CardHeader
            title="Tahap 1: Penerimaan Barang & Kondisi Awal"
            subtitle="Pilih mesin yang sudah pernah masuk atau daftarkan unit baru"
          />
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="itemType"
                  checked={!isNewItem}
                  onChange={() => setIsNewItem(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Pilih Dari Data Barang Terdaftar
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="itemType"
                  checked={isNewItem}
                  onChange={() => setIsNewItem(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                + Daftarkan Barang Baru
              </label>
            </div>

            {!isNewItem ? (
              <div className="space-y-4">
                <Select
                  label="Pilih Barang / Mesin"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  options={items.map((it) => ({
                    value: String(it.id),
                    label: `${it.item_code} - ${it.item_name} (${it.brand || '-'} / SN: ${it.serial_number || '-'})`,
                  }))}
                />

                {selectedItemObj && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Kode</span>
                      <span className="font-mono font-bold text-slate-800">{selectedItemObj.item_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Nama</span>
                      <span className="font-semibold text-slate-800">{selectedItemObj.item_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Merek / Model</span>
                      <span className="text-slate-800">{selectedItemObj.brand} {selectedItemObj.model}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Serial Number</span>
                      <span className="font-mono text-slate-800">{selectedItemObj.serial_number || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Kode Barang"
                    value={newItemData.item_code}
                    onChange={(e) => setNewItemData({ ...newItemData, item_code: e.target.value })}
                    required
                  />
                  <Input
                    label="Nomor Seri / S/N"
                    value={newItemData.serial_number}
                    onChange={(e) => setNewItemData({ ...newItemData, serial_number: e.target.value })}
                    placeholder="SN-12345"
                  />
                </div>
                <Input
                  label="Nama Barang / Mesin"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                  placeholder="Contoh: Hydraulic Pump Unit 200 Bar"
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Merek"
                    value={newItemData.brand}
                    onChange={(e) => setNewItemData({ ...newItemData, brand: e.target.value })}
                    placeholder="Rexroth, Makino, dll"
                  />
                  <Input
                    label="Model / Tipe"
                    value={newItemData.model}
                    onChange={(e) => setNewItemData({ ...newItemData, model: e.target.value })}
                    placeholder="A10VSO"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                type="date"
                label="Tanggal Penerimaan Barang"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kondisi Awal & Keluhan Pelanggan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={initialCondition}
                onChange={(e) => setInitialCondition(e.target.value)}
                placeholder="Catat kondisi fisik barang saat diterima, cacat visual, dan keluhan utama..."
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: ANALISIS KERUSAKAN */}
      {currentStep === 2 && (
        <Card>
          <CardHeader
            title="Tahap 2: Analisis Kerusakan Barang"
            subtitle="Pemeriksaan mendalam kondisi teknis oleh Admin / Lead Engineer"
          />
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Hasil Analisis & Diagnosa Kerusakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={analysisResult}
                onChange={(e) => setAnalysisResult(e.target.value)}
                placeholder="Hasil pembongkaran awal, pengukuran toleransi, sumber penyebab getaran / kebocoran..."
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Catatan Komponen / Part yang Rusak
              </label>
              <textarea
                rows={3}
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                placeholder="Daftar part aus, retak, atau perlu rekondisi..."
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: PENENTUAN TREATMENT & PENUGASAN */}
      {currentStep === 3 && (
        <Card>
          <CardHeader
            title="Tahap 3: Rencana Treatment & Penugasan"
            subtitle="Setiap treatment wajib memiliki Worker PIC; pilih vendor hanya jika pengerjaan diserahkan ke pihak eksternal"
            action={
              <Button
                variant="outline"
                size="xs"
                onClick={handleAddTreatment}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Tambah Treatment
              </Button>
            }
          />
          <CardContent className="space-y-4">
            {selectedTreatments.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3 relative group"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      Treatment Urutan Ke-{idx + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={idx === 0}
                      onClick={() => handleMoveTreatment(idx, 'up')}
                      title="Geser ke Atas"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={idx === selectedTreatments.length - 1}
                      onClick={() => handleMoveTreatment(idx, 'down')}
                      title="Geser ke Bawah"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleRemoveTreatment(idx)}
                      title="Hapus Treatment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Pilih Jenis Treatment"
                    value={item.treatment_id}
                    onChange={(e) => handleTreatmentChange(idx, 'treatment_id', e.target.value)}
                    options={treatments.map((t) => ({
                      value: t.id,
                      label: `${t.treatment_name} (${t.estimated_duration || 'Std'})`,
                    }))}
                  />

                  <Select
                    label="Jenis Pengerjaan"
                    value={item.execution_type || 'internal'}
                    onChange={(e) => handleTreatmentChange(idx, 'execution_type', e.target.value)}
                    options={[
                      { value: 'internal', label: 'Internal (dikerjakan Worker)' },
                      { value: 'vendor', label: 'Vendor (dikerjakan pihak eksternal)' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Worker Penanggung Jawab (PIC)"
                    value={item.worker_id || ''}
                    onChange={(e) => handleTreatmentChange(idx, 'worker_id', e.target.value)}
                    options={[
                      { value: '', label: '-- Pilih Worker PIC --' },
                      ...getCompatibleWorkers(item.treatment_id).map((w) => ({ value: w.id, label: w.name })),
                    ]}
                  />

                  {item.execution_type === 'vendor' ? (
                    <Select
                      label="Vendor Pelaksana"
                      value={item.vendor_id || ''}
                      onChange={(e) => handleTreatmentChange(idx, 'vendor_id', e.target.value)}
                      options={[
                        { value: '', label: '-- Pilih Vendor --' },
                        ...getCompatibleVendors(item.treatment_id).map((v) => ({ value: v.id, label: v.vendor_name })),
                      ]}
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center">
                      Pekerjaan internal tidak memerlukan vendor. Worker PIC akan mengerjakan langsung.
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-200/70 rounded-lg p-2.5">
                  {item.execution_type === 'vendor'
                    ? 'Vendor mengerjakan pekerjaan fisik. Worker PIC tetap bertanggung jawab memantau, mendokumentasikan, dan memverifikasi hasil pekerjaan vendor.'
                    : 'Worker PIC bertugas mengerjakan treatment secara langsung serta mencatat aktivitas dan dokumentasi.'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* STEP 4: REVIEW & QR PREVIEW */}
      {currentStep === 4 && (
        <Card>
          <CardHeader
            title="Tahap 4: Review Akhir & Terbitkan QR Code"
            subtitle="Periksa seluruh ringkasan sebelum menerbitkan QR Code pekerjaan ini"
          />
          <CardContent className="space-y-5">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-200/80 pb-3">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Barang</span>
                  <span className="font-bold text-slate-800">
                    {isNewItem ? newItemData.name : selectedItemObj?.item_name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Kode Barang</span>
                  <span className="font-mono text-slate-700">
                    {isNewItem ? newItemData.item_code : selectedItemObj?.item_code}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Merek</span>
                  <span className="text-slate-700">
                    {isNewItem ? newItemData.brand : selectedItemObj?.brand || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Tanggal Masuk</span>
                  <span className="font-mono text-slate-700">{receivedDate}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Kondisi Awal & Keluhan</span>
                <p className="text-slate-700 mt-0.5">{initialCondition}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Hasil Analisis Kerusakan</span>
                <p className="text-slate-700 mt-0.5">{analysisResult}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Urutan Treatment yang Akan Dikerjakan ({selectedTreatments.length})
              </h4>
              <div className="space-y-2">
                {selectedTreatments.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-slate-800">{t.treatment_name}</span>
                    </div>
                    <div className="text-right space-y-1">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          t.execution_type === 'vendor'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {t.execution_type === 'vendor' ? 'Vendor' : 'Internal'}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        PIC:{' '}
                        <strong className="text-slate-800">
                          {t.worker_name || 'Belum dipilih'}
                        </strong>
                      </div>
                      {t.execution_type === 'vendor' && (
                        <div className="text-[11px] text-slate-500">
                          Vendor:{' '}
                          <strong className="text-slate-800">
                            {t.vendor_name || 'Belum dipilih'}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Setelah diterbitkan, sistem akan secara otomatis membuat <strong>1 Token QR Code unik</strong> untuk Job ini. QR Code yang sama akan digunakan oleh tim Teknisi dan QC.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || isSubmitting}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Sebelumnya
        </Button>

        {currentStep < 4 ? (
          <Button
            variant="accent"
            onClick={handleNextStep}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Lanjut ke Langkah {currentStep + 1}
          </Button>
        ) : (
          <Button
            variant="accent"
            isLoading={isSubmitting}
            onClick={handleFinalSubmit}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Terbitkan Job & Buat QR Code
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateJob;
