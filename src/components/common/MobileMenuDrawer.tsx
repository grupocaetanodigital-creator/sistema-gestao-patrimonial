import React from 'react';
import {
  Shield,
  X,
  Home,
  Package,
  Key,
  QrCode,
  AlertTriangle,
  ClipboardList,
  Wrench,
  Radio,
  FileSpreadsheet,
  Settings,
  LogOut,
  Building2,
  Users,
  History
} from 'lucide-react';
import { Condominio, Operador } from '../../types';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  condominiosDisponiveis: Condominio[];
  onSelectCondominio: (condId: string) => void;
  moduloAtivo: string;
  onSelectModulo: (modId: string) => void;
  onLogout: () => void;
}

export const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({
  isOpen,
  onClose,
  condominioAtivo,
  operadorAtivo,
  condominiosDisponiveis,
  onSelectCondominio,
  moduloAtivo,
  onSelectModulo,
  onLogout
}) => {
  if (!isOpen) return null;

  const f = condominioAtivo.featureFlags;
  const cargoLower = operadorAtivo.cargo?.toLowerCase() || '';
  const isVigilanteOuManutencao =
    cargoLower.includes('ronda') ||
    cargoLower.includes('vigilante') ||
    cargoLower.includes('manuten');

  // Itens do menu respeitando rigorosamente as Feature Flags do condomínio ativo
  const menuItems = [
    { id: 'inicio', label: 'Painel Geral', icon: Home, active: true },
    { id: 'mod02_encomendas', label: 'Encomendas', icon: Package, active: Boolean(f?.mod02_encomendas) },
    { id: 'mod03_custodia', label: 'Custódia Itens', icon: Shield, active: Boolean(f?.mod03_custodia) },
    { id: 'mod10_autorizados', label: 'Prestadores & Obras', icon: Users, active: Boolean(f?.mod10_autorizados) },
    { id: 'mod04_materiais', label: 'Materiais Posto', icon: Radio, active: Boolean(f?.mod04_materiais) },
    { id: 'mod05_chaves', label: 'Quadro Chaves', icon: Key, active: Boolean(f?.mod05_chaves) },
    { id: 'mod06_manutencao', label: 'Manutenção OS', icon: Wrench, active: Boolean(f?.mod06_manutencao) },
    { id: 'mod07_ronda', label: 'Rondas QR', icon: QrCode, active: Boolean(f?.mod07_ronda) },
    { id: 'mod08_ocorrencias', label: 'Livro Ocorrências', icon: AlertTriangle, active: Boolean(f?.mod08_ocorrencias) },
    { id: 'mod09_passagem', label: 'Passagem de Posto', icon: ClipboardList, active: Boolean(f?.mod09_passagem) },
    { id: 'mod12_historico', label: 'Histórico de Atividades', icon: History, active: true },
    { id: 'mod11_relatorios', label: 'Relatórios', icon: FileSpreadsheet, active: true },
    { id: 'mod01_cadastros', label: 'Cadastros & Administração', icon: Settings, active: !isVigilanteOuManutencao }
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in"
      />

      {/* Painel Lateral (Drawer) */}
      <div className="relative w-full max-w-xs bg-slate-900 border-l border-slate-800 text-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-sm text-white tracking-wide">Menu INFPORT</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Condomínio Ativo */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800">
          <label className="block text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1">
            Condomínio Ativo:
          </label>
          {condominiosDisponiveis.length > 1 ? (
            <div className="relative">
              <select
                value={condominioAtivo.id}
                onChange={(e) => onSelectCondominio(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500 appearance-none"
              >
                {condominiosDisponiveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.codigo})
                  </option>
                ))}
              </select>
              <Building2 className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-xl text-xs font-bold text-slate-200 border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">{condominioAtivo.nome}</span>
            </div>
          )}
        </div>

        {/* Lista de Módulos */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {menuItems
            .filter((item) => item.active)
            .map((item) => {
              const Icon = item.icon;
              const isSelected = moduloAtivo === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectModulo(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>

        {/* Rodapé com Operador e Logout */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-white truncate">
              {operadorAtivo.nome}
            </p>
            <p className="text-[10px] text-slate-400 uppercase truncate">
              {condominioAtivo.nome}
            </p>
          </div>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="p-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg transition-transform active:scale-95 shrink-0"
            title="Sair do Sistema"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
