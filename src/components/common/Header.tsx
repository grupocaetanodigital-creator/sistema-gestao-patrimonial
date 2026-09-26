import React from 'react';
import { Shield, Building2, User, LogOut, PhoneCall, RefreshCw, Menu } from 'lucide-react';
import { Condominio, Operador } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  podeTrocarCondominio?: boolean;
  onTrocarCondominio: () => void;
  onLogout: () => void;
  onAbrirEmergencia: () => void;
  onAbrirMenuDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  condominioAtivo,
  operadorAtivo,
  podeTrocarCondominio = true,
  onTrocarCondominio,
  onLogout,
  onAbrirEmergencia,
  onAbrirMenuDrawer
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2">
        {/* Logo & Info do Posto */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-sm">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm sm:text-base tracking-tight text-white">INFPORT</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/30">
                1.0
              </span>
            </div>
            {/* Posto Ativo */}
            {podeTrocarCondominio ? (
              <button
                onClick={onTrocarCondominio}
                className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-300 hover:text-emerald-400 transition-colors truncate text-left group"
                title="Trocar Posto / Condomínio Autorizado"
              >
                <Building2 className="w-3 h-3 text-slate-400 group-hover:text-emerald-400 shrink-0" />
                <span className="font-semibold truncate max-w-[130px] sm:max-w-[220px]">
                  {condominioAtivo.nome}
                </span>
                <RefreshCw className="w-2.5 h-2.5 text-slate-500 group-hover:text-emerald-400 shrink-0" />
              </button>
            ) : (
              <div
                className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-300 truncate text-left"
                title="Posto de trabalho único autorizado para este operador"
              >
                <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate max-w-[130px] sm:max-w-[220px]">
                  {condominioAtivo.nome}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Operador Logado & Ações */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Botão de Instalação PWA */}
          <PWAInstallButton />

          {/* Botão de Emergência Rápido no Header */}
          <button
            onClick={onAbrirEmergencia}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl shadow transition-all active:scale-95"
            title="Agenda de Emergência e Pânico"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden md:inline">EMERGÊNCIA</span>
          </button>

          {/* Badge do Operador */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/60">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {operadorAtivo.nome.split(' ')[0]}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                {operadorAtivo.cargo}
              </p>
            </div>
          </div>

          {/* Botão Hambúrguer para Abrir Menu Lateral (Exatamente como no print) */}
          {onAbrirMenuDrawer && (
            <button
              onClick={onAbrirMenuDrawer}
              className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl border border-slate-700 transition-colors shadow-sm active:scale-95"
              title="Abrir Menu de Funções"
            >
              <Menu className="w-5 h-5 text-emerald-400" />
            </button>
          )}

          {/* Sair */}
          <button
            onClick={onLogout}
            className="hidden sm:flex p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
            title="Sair do Posto"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
