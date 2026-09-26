import React from 'react';
import { X, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface PhotoViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  title?: string;
  subtitle?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title = 'Visualização de Foto',
  subtitle
}) => {
  if (!isOpen || !photoUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `foto_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isHttp = photoUrl.startsWith('http://') || photoUrl.startsWith('https://');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isHttp && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Abrir em nova aba"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={handleDownload}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Baixar imagem"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Imagem */}
        <div className="p-2 sm:p-4 flex-1 flex items-center justify-center bg-black/60 overflow-auto">
          <img
            src={photoUrl}
            alt={title}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
          />
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-mono truncate max-w-[280px]">
            {isHttp ? 'Nuvem Supabase Storage' : 'Arquivo Local / Compactado'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
