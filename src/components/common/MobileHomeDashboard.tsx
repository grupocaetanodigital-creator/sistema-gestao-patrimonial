import React from 'react';
import {
  Package,
  Shield,
  Users,
  Radio,
  Key,
  Wrench,
  QrCode,
  AlertTriangle,
  ClipboardList,
  FileSpreadsheet,
  Settings,
  History
} from 'lucide-react';
import { Condominio, Operador, ItemEncomenda, Chave, ChamadoManutencao } from '../../types';

interface MobileHomeDashboardProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  onSelectModulo: (modId: string) => void;
  itensEncomenda: ItemEncomenda[];
  chaves: Chave[];
  chamados: ChamadoManutencao[];
}

export const MobileHomeDashboard: React.FC<MobileHomeDashboardProps> = ({
  condominioAtivo,
  operadorAtivo,
  onSelectModulo,
  itensEncomenda,
  chaves,
  chamados
}) => {
  const f = condominioAtivo.featureFlags;
  const cargoLower = operadorAtivo.cargo?.toLowerCase() || '';
  const isVigilanteOuManutencao =
    cargoLower.includes('ronda') ||
    cargoLower.includes('vigilante') ||
    cargoLower.includes('manuten');

  // Contadores dinâmicos para enriquecer os cards
  const encomendasRetidas = itensEncomenda.filter(
    (e) => e.condominioId === condominioAtivo.id && e.status === 'retido'
  ).length;

  const chavesEmUso = chaves.filter(
    (c) => c.condominioId === condominioAtivo.id && c.status === 'retirada'
  ).length;

  const chamadosAbertos = chamados.filter(
    (c) => c.condominioId === condominioAtivo.id && c.status === 'Aberto'
  ).length;

  // Lista dos módulos respeitando estritamente o layout do print e as Feature Flags
  const modulos = [
    {
      id: 'mod02_encomendas',
      title: 'Encomendas',
      icon: Package,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      active: Boolean(f?.mod02_encomendas),
      badge: encomendasRetidas > 0 ? `${encomendasRetidas} na guarita` : null,
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-500/40'
    },
    {
      id: 'mod03_custodia',
      title: 'Custódia Itens',
      icon: Shield,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      active: Boolean(f?.mod03_custodia)
    },
    {
      id: 'mod10_autorizados',
      title: 'Prestadores & Obras',
      icon: Users,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      active: Boolean(f?.mod10_autorizados)
    },
    {
      id: 'mod04_materiais',
      title: 'Materiais Posto',
      icon: Radio,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      active: Boolean(f?.mod04_materiais)
    },
    {
      id: 'mod05_chaves',
      title: 'Quadro Chaves',
      icon: Key,
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-500/10 border-violet-500/20',
      active: Boolean(f?.mod05_chaves),
      badge: chavesEmUso > 0 ? `${chavesEmUso} retiradas` : null,
      badgeColor: 'bg-violet-950 text-violet-300 border-violet-500/40'
    },
    {
      id: 'mod06_manutencao',
      title: 'Manutenção OS',
      icon: Wrench,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-500/10 border-orange-500/20',
      active: Boolean(f?.mod06_manutencao),
      badge: chamadosAbertos > 0 ? `${chamadosAbertos} abertos` : null,
      badgeColor: 'bg-orange-950 text-orange-300 border-orange-500/40'
    },
    {
      id: 'mod07_ronda',
      title: 'Rondas QR',
      icon: QrCode,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/10 border-teal-500/20',
      active: Boolean(f?.mod07_ronda)
    },
    {
      id: 'mod08_ocorrencias',
      title: 'Livro Ocorrências',
      icon: AlertTriangle,
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      active: Boolean(f?.mod08_ocorrencias)
    },
    {
      id: 'mod09_passagem',
      title: 'Passagem Posto',
      icon: ClipboardList,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
      active: Boolean(f?.mod09_passagem)
    },
    {
      id: 'mod12_historico',
      title: 'Histórico & Auditoria',
      icon: History,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      active: true
    },
    {
      id: 'mod11_relatorios',
      title: 'Relatórios',
      icon: FileSpreadsheet,
      iconColor: 'text-indigo-400',
      iconBg: 'bg-indigo-500/10 border-indigo-500/20',
      active: true
    },
    {
      id: 'mod01_cadastros',
      title: 'Cadastros & Adm',
      icon: Settings,
      iconColor: 'text-slate-300',
      iconBg: 'bg-slate-700/30 border-slate-600/40',
      active: !isVigilanteOuManutencao
    }
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto animate-in fade-in">
      {/* ========================================================================= */}
      {/* CARD DO POSTO ATIVO (Exatamente como no print WhatsApp)                   */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          POSTO ATIVO
        </div>

        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
          {condominioAtivo.nome}
        </h2>

        <p className="text-xs text-slate-300 font-semibold">
          Operador:{' '}
          <strong className="text-white uppercase font-black tracking-wide">
            {operadorAtivo.nome}
          </strong>{' '}
          <span className="text-slate-400 font-normal">({operadorAtivo.cargo})</span>
        </p>
      </div>

      {/* ========================================================================= */}
      {/* GRID DE MÓDULOS OPERACIONAIS (2 Colunas no Mobile / 3-4 no Desktop)       */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
          Módulos Operacionais
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {modulos
            .filter((m) => m.active)
            .map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectModulo(m.id)}
                  className="bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center gap-3 shadow-md hover:shadow-xl transition-all duration-200 active:scale-95 group cursor-pointer min-h-[135px]"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110 ${m.iconBg}`}
                  >
                    <Icon className={`w-7 h-7 ${m.iconColor}`} />
                  </div>

                  <div className="space-y-1 w-full">
                    <span className="block font-black text-xs sm:text-sm text-slate-900 dark:text-white tracking-tight truncate">
                      {m.title}
                    </span>

                    {m.badge && (
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}
                      >
                        {m.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
