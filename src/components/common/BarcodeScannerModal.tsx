import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Zap, RefreshCw, Check, Barcode, AlertCircle } from 'lucide-react';
import { audioAlert } from '../../lib/audioAlert';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras / QR Code'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [detectedFeedback, setDetectedFeedback] = useState<string | null>(null);

  // Iniciar câmera quando o modal abrir
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    setDetectedFeedback(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        setCameraError('Câmera não suportada neste dispositivo/navegador.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Checar suporte à lanterna (torch)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities && capabilities.torch) {
          setHasTorch(true);
        }
      }

      // Iniciar detector nativo se disponível
      startDetectionLoop();
    } catch (err: any) {
      console.warn('Erro ao acessar câmera:', err);
      setHasCamera(false);
      setCameraError('Permissão da câmera não concedida ou dispositivo sem câmera ativa.');
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Erro ao alternar lanterna:', e);
      }
    }
  };

  const startDetectionLoop = () => {
    // Checa suporte nativo a BarcodeDetector (Chrome Android / Chromium)
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    if (BarcodeDetectorClass) {
      try {
        const detector = new BarcodeDetectorClass({
          formats: [
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'qr_code',
            'upc_a',
            'upc_e',
            'itf'
          ]
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              if (code && code.trim().length > 0) {
                confirmarLeitura(code.trim());
              }
            }
          } catch (e) {
            // Silencioso se frame falhar
          }
        }, 300);
      } catch (e) {
        console.warn('BarcodeDetector não suportado para todos os formatos:', e);
      }
    }
  };

  const confirmarLeitura = (codigo: string) => {
    stopCamera();
    audioAlert.playSuccessBeep();
    setDetectedFeedback(codigo);
    setTimeout(() => {
      onScan(codigo);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header do Scanner */}
        <div className="flex items-center justify-between p-4 bg-slate-850 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl border transition-all ${
                  torchOn
                    ? 'bg-amber-500 text-black border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Lanterna do Celular"
              >
                <Zap className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder da Câmera / Área de Vídeo */}
        <div className="relative bg-black flex-1 min-h-[280px] flex items-center justify-center overflow-hidden">
          {hasCamera ? (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover min-h-[280px] max-h-[380px]"
                playsInline
                autoPlay
                muted
              />

              {/* Moldura de Mira para o Código */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                <div className="relative w-full max-w-[280px] h-[180px] border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Cantoneiras */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>

                  {/* Linha Laser Animada */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse"></div>

                  {/* Instrução no centro da mira */}
                  <div className="absolute inset-x-0 bottom-2 text-center">
                    <span className="text-[10px] font-bold tracking-wider text-emerald-300 uppercase bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Aponte para o código de barras
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300">{cameraError || 'Câmera inacessível.'}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-white rounded-xl border border-slate-700 flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
              </button>
            </div>
          )}

          {/* Feedback de Detecção */}
          {detectedFeedback && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-95">
              <Check className="w-12 h-12 text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-white">Código Detectado!</p>
              <span className="text-sm font-mono font-black text-emerald-300 mt-1 bg-black/50 px-3 py-1 rounded-lg border border-emerald-500/40">
                {detectedFeedback}
              </span>
            </div>
          )}
        </div>

        {/* Rodapé: Simulação Rápida & Digitação Manual */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          {/* Opção Manual */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Ou digite/cole o código manualmente:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: BR928371829BR"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualCode.trim()) {
                      e.preventDefault();
                      confirmarLeitura(manualCode.trim());
                    }
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (manualCode.trim()) {
                    confirmarLeitura(manualCode.trim());
                  }
                }}
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/40"
              >
                Confirmar
              </button>
            </div>
          </div>

          {/* Botões de Leitura de Demonstração / Teste Rápido */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Simular Leitura de Transportadora (Clique Rápido):
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => confirmarLeitura(`SEDEX-${Math.floor(100000000 + Math.random() * 900000000)}BR`)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] font-mono font-bold text-amber-300 rounded-lg truncate text-left"
              >
                📦 Correios SEDEX
              </button>
              <button
                type="button"
                onClick={() => confirmarLeitura(`ML-${Math.floor(10000000 + Math.random() * 90000000)}`)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] font-mono font-bold text-yellow-300 rounded-lg truncate text-left"
              >
                🟡 Mercado Livre
              </button>
              <button
                type="button"
                onClick={() => confirmarLeitura(`AMZ-${Math.floor(1000000 + Math.random() * 9000000)}`)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] font-mono font-bold text-sky-300 rounded-lg truncate text-left"
              >
                🛒 Amazon Prime
              </button>
              <button
                type="button"
                onClick={() => confirmarLeitura(`LOGGI-${Math.floor(100000 + Math.random() * 900000)}`)}
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-[10px] font-mono font-bold text-indigo-300 rounded-lg truncate text-left"
              >
                🚚 Loggi Express
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
