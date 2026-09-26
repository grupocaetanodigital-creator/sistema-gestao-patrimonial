import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  Check,
  RefreshCw,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  SwitchCamera,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { uploadPhotoToSupabase } from '../../lib/supabase';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (urlOrDataUrl: string) => void;
  title: string;
  subtitle?: string;
  presetTheme?: 'etiqueta' | 'entrega' | 'documento' | 'avaria';
  folder?: 'encomendas' | 'custodia' | 'manutencao' | 'ocorrencias' | 'chaves' | 'materiais' | 'moradores' | 'ronda';
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title,
  subtitle,
  presetTheme = 'etiqueta',
  folder = 'encomendas'
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Controle de Câmera ao Vivo (Visor)
  const [visorAtivo, setVisorAtivo] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraErro, setCameraErro] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Input Nativo com Câmera Traseira Forçada (capture="environment")
  const envCameraInputRef = useRef<HTMLInputElement>(null);
  // Input de Galeria de Arquivos
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Iniciar automaticamente na Câmera Principal (Traseira) ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(null);
      setCameraErro(null);
      setFacingMode('environment');
      iniciarVisorAoVivo('environment');
    } else {
      pararCamera();
      setPreviewUrl(null);
      setVisorAtivo(false);
      setCameraErro(null);
    }
    return () => {
      pararCamera();
    };
  }, [isOpen]);

  // Conectar stream ao elemento de vídeo sempre que o stream ou visor mudar
  useEffect(() => {
    if (visorAtivo && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
      videoRef.current.play().catch((e) => console.warn('Erro ao reproduzir stream de vídeo:', e));
    }
  }, [visorAtivo, cameraStream]);

  const pararCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Erro ao parar track:', e);
        }
      });
      setCameraStream(null);
    }
  };

  /**
   * Conecta diretamente à câmera principal (traseira) do aparelho.
   * Faz varredura de dispositivos para garantir que não caia na câmera de selfie.
   */
  const iniciarVisorAoVivo = async (modo: 'environment' | 'user' = 'environment') => {
    pararCamera();
    setCameraErro(null);
    setVisorAtivo(true);
    setIsProcessing(true);
    setStatusMsg(modo === 'environment' ? 'Abrindo Câmera Principal (Traseira)...' : 'Abrindo Câmera Frontal...');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraErro('Seu navegador não suporta visor direto. Use o botão da Câmera Nativa abaixo.');
      setVisorAtivo(false);
      setIsProcessing(false);
      setStatusMsg('');
      return;
    }

    try {
      let stream: MediaStream | null = null;

      // 1. Tenta identificar explicitamente a câmera traseira pela lista de dispositivos
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        if (modo === 'environment' && videoDevices.length > 0) {
          // Procurar por identificador de câmera traseira/externa/back
          const backDevice = videoDevices.find((d) =>
            /back|traseira|rear|environment|externa|world|environment/i.test(d.label)
          );

          if (backDevice) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: backDevice.deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              },
              audio: false
            });
          }
        }
      } catch (enumErr) {
        console.warn('Tentativa por enumerateDevices falhou:', enumErr);
      }

      // 2. Se não pegou por deviceId, tenta restrição exata de facingMode
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: modo },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });
        } catch {
          // Fallback para facingMode ideal
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: modo },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        }
      }

      setCameraStream(stream);
      setVisorAtivo(true);
      setIsProcessing(false);
      setStatusMsg('');
    } catch (err: any) {
      console.warn('Erro ao conectar com a câmera traseira:', err);
      setCameraErro('Não foi possível iniciar o visor ao vivo. Toque no botão verde abaixo para usar a Câmera do seu celular.');
      setVisorAtivo(false);
      setIsProcessing(false);
      setStatusMsg('');
    }
  };

  // Alternar entre Câmera Traseira (Principal) e Frontal
  const handleAlternarCamera = () => {
    const proximoModo = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(proximoModo);
    iniciarVisorAoVivo(proximoModo);
  };

  // Disparo instantâneo do visor de vídeo (síncrono e ultra rápido via Canvas)
  const handleTirarFotoDoVisor = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Contexto Canvas 2D indisponível');

      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setPreviewUrl(dataUrl);
      pararCamera();
      setVisorAtivo(false);
    } catch (err) {
      console.error('Erro ao capturar imagem do visor:', err);
      alert('Não foi possível capturar a foto do visor. Toque em "Câmera do Celular".');
    }
  };

  // Carrega arquivo lido do input nativo do celular
  const handleFile = (file: File) => {
    setIsProcessing(true);
    setStatusMsg('Processando foto da câmera...');

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setPreviewUrl(result);
        pararCamera();
        setVisorAtivo(false);
      }
      setIsProcessing(false);
      setStatusMsg('');
    };

    reader.onerror = (err) => {
      console.error('Erro ao ler foto do celular:', err);
      alert('Erro ao carregar a foto do celular. Tente novamente.');
      setIsProcessing(false);
      setStatusMsg('');
    };

    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = '';
  };

  // Simulação rápida para computadores de guarita sem webcam
  const handleQuickPreset = () => {
    let sampleImg = '';
    if (presetTheme === 'etiqueta') {
      sampleImg = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80';
    } else if (presetTheme === 'entrega') {
      sampleImg = 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=600&auto=format&fit=crop&q=80';
    } else if (presetTheme === 'documento') {
      sampleImg = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80';
    } else {
      sampleImg = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
    }
    setPreviewUrl(sampleImg);
    pararCamera();
    setVisorAtivo(false);
  };

  const handleConfirm = async () => {
    if (!previewUrl) return;
    try {
      setIsUploading(true);
      setStatusMsg('Enviando foto...');
      const finalUrl = await uploadPhotoToSupabase(previewUrl, folder);
      onCapture(finalUrl);
      setPreviewUrl(null);
      pararCamera();
      onClose();
    } catch (err) {
      console.warn('Fallback salvando imagem localmente:', err);
      onCapture(previewUrl);
      setPreviewUrl(null);
      pararCamera();
      onClose();
    } finally {
      setIsUploading(false);
      setStatusMsg('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
      {/* 1. Input Câmera Traseira Nativa com capture="environment" (NUNCA abre em selfie) */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={envCameraInputRef}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* 2. Input Galeria de Imagens */}
      <input
        type="file"
        accept="image/*"
        ref={galleryInputRef}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              pararCamera();
              setPreviewUrl(null);
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 space-y-4 text-center overflow-y-auto">
          {previewUrl ? (
            /* ================= ESTADO 1: FOTO TIRADA COM SUCESSO ================= */
            <div className="space-y-3 animate-in zoom-in-95">
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 max-h-72 bg-black shadow-xl">
                <img
                  src={previewUrl}
                  alt="Foto capturada"
                  className="w-full h-auto object-cover max-h-72 mx-auto"
                />
                <div className="absolute top-2 right-2 bg-emerald-600/90 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Foto Capturada (OK)
                </div>
              </div>

              {statusMsg && (
                <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {statusMsg}
                </p>
              )}

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setPreviewUrl(null);
                    iniciarVisorAoVivo('environment');
                  }}
                  className="py-3 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-700 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400" /> Tirar Outra
                </button>

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleConfirm}
                  className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-950/40 active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Confirmar Foto
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : visorAtivo ? (
            /* ================= ESTADO 2: VISOR DE CÂMERA AO VIVO NA CÂMERA PRINCIPAL ================= */
            <div className="space-y-3 animate-in zoom-in-95">
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/70 aspect-[4/3] flex items-center justify-center shadow-2xl">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Badge Indicador de Câmera Principal */}
                <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>{facingMode === 'environment' ? '📷 CÂMERA PRINCIPAL (TRASEIRA)' : '📷 CÂMERA FRONTAL'}</span>
                </div>

                {/* Botão de Alternar Câmera (Traseira / Frontal) */}
                <button
                  type="button"
                  onClick={handleAlternarCamera}
                  className="absolute top-2.5 right-2.5 p-2 bg-black/75 hover:bg-black/95 text-white rounded-xl border border-slate-600 transition-colors shadow-lg active:scale-95 flex items-center gap-1 text-[10px]"
                  title="Alternar entre câmera traseira e frontal"
                >
                  <SwitchCamera className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">Virar</span>
                </button>

                {/* Mira de Alinhamento */}
                <div className="absolute inset-6 border border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
                  <div className="w-8 h-8 border border-white/40 rounded-full" />
                </div>
              </div>

              {cameraErro && (
                <div className="text-xs text-amber-300 bg-amber-950/60 p-2.5 rounded-xl border border-amber-500/40 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{cameraErro}</span>
                </div>
              )}

              {/* Botão Principal de Disparo Instantâneo */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleTirarFotoDoVisor}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/50 active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>[ 📸 TIRAR FOTO AGORA ]</span>
              </button>

              {/* Opções de Fallback e Alternativas */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    pararCamera();
                    setVisorAtivo(false);
                    envCameraInputRef.current?.click();
                  }}
                  className="flex-1 py-2 px-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                  title="Abre o aplicativo nativo de câmera do aparelho com a câmera traseira forçada"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> App Câmera Traseira
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" /> Galeria
                </button>
              </div>
            </div>
          ) : (
            /* ================= ESTADO 3: CASO O VISOR ESTEJA DESATIVADO OU COM ERRO ================= */
            <div className="space-y-4 py-2">
              {cameraErro && (
                <div className="text-xs text-amber-300 bg-amber-950/60 p-3 rounded-2xl border border-amber-500/40 flex items-start gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>{cameraErro}</span>
                </div>
              )}

              {/* Botão de Disparo Nativo na Câmera Traseira */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => envCameraInputRef.current?.click()}
                className="w-full p-5 bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2.5 shadow-xl shadow-emerald-950/50 border border-emerald-400/40 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center text-white shadow-inner transition-colors">
                  <Camera className="w-7 h-7 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black tracking-wide uppercase">
                    ABRIR CÂMERA DO CELULAR (TRASEIRA)
                  </h4>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5">
                    Aciona a câmera principal traseira do celular sem abrir em modo selfie
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => iniciarVisorAoVivo('environment')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tentar Reabrir Visor ao Vivo
              </button>

              {statusMsg && (
                <p className="text-xs text-emerald-400 flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> {statusMsg}
                </p>
              )}

              {/* Opções Alternativas: Galeria / Simulação */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-400" /> Galeria / Arquivo
                </button>

                <button
                  type="button"
                  onClick={handleQuickPreset}
                  className="py-2.5 px-3 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Foto Simulação
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
