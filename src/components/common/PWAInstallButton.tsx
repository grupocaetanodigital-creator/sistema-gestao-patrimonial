import React, { useState } from 'react';
import { Download, Smartphone, X, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../../lib/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95 animate-pulse"
        title="Instalar INFPORT no seu celular ou computador"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden">Instalar</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold rounded-lg shadow transition-all active:scale-95"
          title="Instalar no iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Instalar App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Instalar INFPORT no iOS
                </h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs space-y-2.5 text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">1</span>
                  No navegador <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> (ícone com quadrado e seta para cima no rodapé).
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">2</span>
                  Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">3</span>
                  Toque em <strong>Adicionar</strong> no canto superior direito.
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition-all shadow"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
