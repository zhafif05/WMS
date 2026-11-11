import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import {
  Camera,
  CameraOff,
  AlertCircle,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Video,
  Bug,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

export const QRScanner = ({ onScanSuccess, defaultToken = '' }) => {
  const [cameraState, setCameraState] = useState('idle'); // 'idle' | 'connecting' | 'active' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('Kamera belum dimulai');
  const [errorMsg, setErrorMsg] = useState('');
  const [manualToken, setManualToken] = useState(defaultToken);
  const [isManualLoading, setIsManualLoading] = useState(false);

  // Available devices
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Debug Panel State
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    mediaDevicesAvailable: false,
    devicesCount: 0,
    activeDeviceLabel: '-',
    resolution: '-',
    trackState: '-',
    decoding: false,
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const codeReaderRef = useRef(null);
  const isMountedRef = useRef(true);

  // Stop camera tracks and decoder
  const stopCamera = useCallback(() => {
    // 1. Stop ZXing code reader if active
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current = null;
      } catch (e) {
        console.warn('Code reader cleanup error', e);
      }
    }

    // 2. Stop all MediaStreamTracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.info(`Camera track stopped: ${track.label}`);
        });
      } catch (e) {
        console.warn('Stream tracks stop error', e);
      }
      streamRef.current = null;
    }

    // 3. Clear video element srcObject
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      } catch (e) {
        console.warn('Video element clear error', e);
      }
    }

    if (isMountedRef.current) {
      setCameraState('idle');
      setStatusMessage('Kamera belum dimulai');
      setDebugInfo((prev) => ({
        ...prev,
        trackState: 'ended',
        resolution: '-',
        activeDeviceLabel: '-',
        decoding: false,
      }));
    }
  }, []);

  const stopCameraRef = useRef(stopCamera);
  useEffect(() => {
    stopCameraRef.current = stopCamera;
  }, [stopCamera]);

  // Enumerate video devices on mount
  useEffect(() => {
    isMountedRef.current = true;

    const checkDevices = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        setDebugInfo((prev) => ({ ...prev, mediaDevicesAvailable: false }));
        return;
      }
      setDebugInfo((prev) => ({ ...prev, mediaDevicesAvailable: true }));

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        if (isMountedRef.current) {
          setVideoDevices(videoInputs);
          setDebugInfo((prev) => ({ ...prev, devicesCount: videoInputs.length }));
          if (videoInputs.length > 0) {
            setSelectedDeviceId((curr) => curr || videoInputs[0].deviceId);
          }
        }
      } catch (e) {
        console.warn('Enumerate devices error', e);
      }
    };

    checkDevices();

    return () => {
      isMountedRef.current = false;
      stopCameraRef.current();
    };
  }, []);

  // Start Camera and QR Scanner
  const startCamera = async (targetDeviceId = selectedDeviceId) => {
    setErrorMsg('');
    setCameraState('connecting');
    setStatusMessage('Menghubungkan kamera...');

    // 1. Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errText =
        'Browser tidak mendukung akses kamera (getUserMedia) atau koneksi tidak berada di HTTPS/localhost.';
      setErrorMsg(errText);
      setCameraState('error');
      setStatusMessage('Gagal mengakses kamera');
      return;
    }

    // Stop any existing stream first
    stopCamera();

    let stream = null;

    // 2. Try getUserMedia with deviceId or facingMode
    try {
      const constraints = targetDeviceId
        ? {
            video: {
              deviceId: { exact: targetDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          }
        : {
            video: {
              facingMode: { ideal: 'user' }, // Prioritize laptop webcam or front camera
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          };

      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (firstErr) {
      console.warn('First constraints attempt failed, falling back to basic { video: true }', firstErr);
      try {
        // Fallback: minimal constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (fallbackErr) {
        console.error('All camera attempts failed:', fallbackErr);
        handleCameraError(fallbackErr);
        return;
      }
    }

    if (!stream || !isMountedRef.current) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;
    const activeTrack = stream.getVideoTracks()[0];

    // Update debug info with track details
    if (activeTrack) {
      setDebugInfo((prev) => ({
        ...prev,
        activeDeviceLabel: activeTrack.label || 'Default Camera',
        trackState: activeTrack.readyState,
      }));
    }

    // 3. Connect stream to <video> element
    const video = videoRef.current;
    if (!video) {
      setErrorMsg('Elemen tampilan video tidak tersedia di DOM.');
      setCameraState('error');
      setStatusMessage('Gagal mengakses kamera');
      return;
    }

    video.srcObject = stream;

    // Wait until metadata is loaded and dimensions are verified
    video.onloadedmetadata = async () => {
      if (!isMountedRef.current) return;

      try {
        await video.play();

        const vWidth = video.videoWidth || 0;
        const vHeight = video.videoHeight || 0;

        console.info(`Webcam stream active: ${vWidth}x${vHeight}`);

        setDebugInfo((prev) => ({
          ...prev,
          resolution: `${vWidth} x ${vHeight}`,
          trackState: activeTrack ? activeTrack.readyState : 'live',
        }));

        setCameraState('active');
        setStatusMessage('Kamera aktif');

        // 4. Start ZXing QR Code Continuous Decoder on the playing video element
        initQRDecoder(video);
      } catch (playErr) {
        console.error('Error starting video playback:', playErr);
        setErrorMsg('Gagal memutar aliran video kamera.');
        setCameraState('error');
        setStatusMessage('Gagal mengakses kamera');
      }
    };
  };

  // Decode loop using BrowserQRCodeReader
  const initQRDecoder = (videoElement) => {
    try {
      const codeReader = new BrowserQRCodeReader();
      codeReaderRef.current = codeReader;

      setDebugInfo((prev) => ({ ...prev, decoding: true }));

      // Decode continuously from the active <video> element
      codeReader.decodeFromVideoElement(videoElement, (result, error) => {
        if (!isMountedRef.current || !codeReaderRef.current) return;

        if (result) {
          const text = result.getText();
          if (text) {
            console.info('QR Code detected:', text);

            setCameraState('success');
            setStatusMessage('QR Code berhasil dipindai');

            // Play short subtle beep if AudioContext is available
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.value = 880; // A5 note
              gain.gain.value = 0.15;
              osc.start();
              setTimeout(() => {
                osc.stop();
                audioCtx.close();
              }, 120);
            } catch {
              // Ignore audio errors
            }

            // Stop camera immediately to turn off webcam indicator
            stopCamera();

            // Notify parent
            onScanSuccess(text);
          }
        }

        if (error) {
          // Expected per-frame scanning error (NotFoundException), ignore
        }
      });
    } catch (e) {
      console.error('Failed to initialize QR decoder:', e);
    }
  };

  // Human-readable camera error handler
  const handleCameraError = (err) => {
    let message = 'Gagal mengakses kamera.';

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      message =
        'Izin akses kamera ditolak. Harap izinkan izin kamera pada ikon gembok/pengaturan di address bar browser Anda.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      message = 'Kamera tidak ditemukan. Pastikan webcam terpasang dengan baik pada perangkat.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      message =
        'Kamera sedang digunakan oleh aplikasi lain (seperti Zoom, Teams, Skype) atau mengalami kendala hardware.';
    } else if (err.name === 'OverconstrainedError') {
      message = 'Konfigurasi kamera tidak didukung oleh perangkat keras Anda.';
    } else if (err.name === 'AbortError') {
      message = 'Akses kamera dibatalkan oleh sistem.';
    }

    setErrorMsg(message);
    setCameraState('error');
    setStatusMessage('Gagal mengakses kamera');
  };

  // Switch camera device
  const handleDeviceChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    if (cameraState === 'active' || cameraState === 'connecting') {
      startCamera(newDeviceId);
    }
  };

  // Manual token input handler
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setErrorMsg('Harap masukkan token QR atau Nomor Job terlebih dahulu.');
      return;
    }

    setIsManualLoading(true);
    setErrorMsg('');

    try {
      // Simulate slight responsive feel
      await new Promise((r) => setTimeout(r, 200));
      onScanSuccess(manualToken.trim());
    } finally {
      if (isMountedRef.current) setIsManualLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Viewport Box */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl relative text-white">
        {/* Status Indicator Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraState === 'active'
                  ? 'bg-emerald-500 animate-pulse'
                  : cameraState === 'connecting'
                  ? 'bg-amber-500 animate-ping'
                  : cameraState === 'success'
                  ? 'bg-blue-500'
                  : cameraState === 'error'
                  ? 'bg-rose-500'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-semibold text-slate-300">Status:</span>
            <span
              className={`font-medium ${
                cameraState === 'active'
                  ? 'text-emerald-400 font-semibold'
                  : cameraState === 'connecting'
                  ? 'text-amber-400'
                  : cameraState === 'success'
                  ? 'text-blue-400 font-semibold'
                  : cameraState === 'error'
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {statusMessage}
            </span>
          </div>

          {videoDevices.length > 1 && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Video className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {dev.label || `Kamera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Video Canvas Area */}
        <div className="relative w-full aspect-4/3 max-h-[420px] bg-black flex items-center justify-center overflow-hidden">
          {/* Native HTML5 Video Element with PlaysInline, AutoPlay, Muted */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraState === 'active' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
            }`}
          />

          {/* Idle Placeholder */}
          {cameraState === 'idle' && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-blue-400 mb-4 shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Scanner Webcam Aktif</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
                Klik tombol di bawah untuk menyalakan webcam laptop dan memindai stiker QR Code Job
              </p>
              <Button
                variant="accent"
                size="md"
                onClick={() => startCamera()}
                leftIcon={<Camera className="w-4 h-4" />}
                className="shadow-lg shadow-blue-600/30 font-semibold"
              >
                Mulai Kamera Scanner
              </Button>
            </div>
          )}

          {/* Connecting / Loading Spinner */}
          {cameraState === 'connecting' && (
            <div className="flex flex-col items-center gap-3 text-slate-300">
              <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-300">Menginisialisasi Perangkat Webcam...</p>
            </div>
          )}

          {/* Error State Banner */}
          {cameraState === 'error' && (
            <div className="p-6 flex flex-col items-center justify-center text-center max-w-md">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Gagal Mengakses Kamera</h4>
              <p className="text-xs text-rose-300 mb-4 leading-relaxed">{errorMsg}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCamera()}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
              >
                Coba Hubungkan Ulang
              </Button>
            </div>
          )}

          {/* Active Viewfinder Frame Overlay (Target Box & Scanline) */}
          {cameraState === 'active' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer dimmed mask */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-blue-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                {/* 4 Corner Crosshairs */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />

                {/* Animated Scan Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#22d3ee] animate-bounce mt-10" />

                {/* Center target helper text */}
                <div className="absolute -bottom-9 inset-x-0 text-center">
                  <span className="text-[11px] font-medium bg-slate-950/80 px-2.5 py-1 rounded-full text-slate-200 border border-slate-700">
                    Arahkan QR Code ke dalam kotak
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Success Overlay Flash */}
          {cameraState === 'success' && (
            <div className="absolute inset-0 bg-blue-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 animate-in fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
              <h4 className="font-bold text-base">QR Code Terdeteksi!</h4>
              <p className="text-xs text-slate-300 mt-1">Membuka lembar kerja Job...</p>
            </div>
          )}
        </div>

        {/* Viewport Bottom Controls */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Format: QR Code Standar ISO / IEC 18004</span>
          </div>

          <div className="flex items-center gap-2">
            {cameraState === 'active' && (
              <Button
                variant="danger"
                size="xs"
                onClick={stopCamera}
                leftIcon={<CameraOff className="w-3.5 h-3.5" />}
              >
                Hentikan Kamera
              </Button>
            )}

            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Informasi Teknis Debug Kamera"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Debug</span>
              {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Debug Panel (Developer & System Diagnosis) */}
        {showDebug && (
          <div className="p-3.5 bg-slate-950 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-slate-500 block">MediaDevices API:</span>
              <span className={debugInfo.mediaDevicesAvailable ? 'text-emerald-400' : 'text-rose-400'}>
                {debugInfo.mediaDevicesAvailable ? 'Tersedia' : 'Tidak Didukung'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Jumlah Kamera:</span>
              <span className="text-slate-200">{debugInfo.devicesCount} terdeteksi</span>
            </div>
            <div>
              <span className="text-slate-500 block">Kamera Aktif:</span>
              <span className="text-slate-200 truncate block">{debugInfo.activeDeviceLabel}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Resolusi Video:</span>
              <span className="text-slate-200">{debugInfo.resolution}</span>
            </div>
            <div>
              <span className="text-slate-500 block">MediaStreamTrack:</span>
              <span className={debugInfo.trackState === 'live' ? 'text-emerald-400' : 'text-amber-400'}>
                {debugInfo.trackState}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Decoder Engine:</span>
              <span className={debugInfo.decoding ? 'text-cyan-400' : 'text-slate-500'}>
                {debugInfo.decoding ? 'Running (ZXing)' : 'Idle'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Token Input Fallback */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <KeyRound className="w-4 h-4 text-blue-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Atau Masukkan Token QR / No. Job Manual
          </h4>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Jika kamera tidak dapat digunakan atau stiker QR Code rusak/kotor, Anda dapat mengetik token QR atau Nomor Job secara manual.
        </p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <Input
            placeholder="Contoh: QR-ELM-98234-A78B atau JOB-2026-001"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="font-mono text-xs"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isManualLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Buka Job
          </Button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
