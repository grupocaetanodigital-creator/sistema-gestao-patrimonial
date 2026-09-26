import React from 'react';
import { PhoneCall } from 'lucide-react';

interface FloatingEmergencyButtonProps {
  onClick: () => void;
}

export const FloatingEmergencyButton: React.FC<FloatingEmergencyButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm rounded-full shadow-2xl shadow-red-900/60 border-2 border-red-300 active:scale-95 transition-all group animate-bounce duration-1000"
      title="Botão de Pânico e Emergência 24h"
    >
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
      </span>
      <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
      <span className="tracking-wider">EMERGÊNCIA</span>
    </button>
  );
};
