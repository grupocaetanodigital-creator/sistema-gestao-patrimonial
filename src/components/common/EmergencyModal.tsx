import React, { useState } from 'react';
import { PhoneCall, AlertTriangle, X, ShieldAlert, Phone, MessageSquare, Flame, HeartPulse, Building2, Wrench } from 'lucide-react';
import { ContatoEmergencia, Condominio, Operador } from '../../types';
import { buildWhatsAppDeepLink, DEFAULT_WHATSAPP_TEMPLATES, interpolateTemplate } from '../../lib/whatsapp';
import { audioAlert } from '../../lib/audioAlert';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  contatos: ContatoEmergencia[];
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  condominioAtivo,
  operadorAtivo,
  contatos
}) => {
  const [panicoAtivado, setPanicoAtivado] = useState(false);

  if (!isOpen) return null;

  const contatosDoCondominio = contatos.filter(
    (c) => c.condominioId === condominioAtivo.id || !c.condominioId
  );

  const orgaosPublicos = contatosDoCondominio.filter((c) => c.categoria === 'Órgão Público');
  const supervisao = contatosDoCondominio.filter((c) => c.categoria === 'Supervisão INFPORT');
  const gestao = contatosDoCondominio.filter((c) => c.categoria === 'Gestão Interna');
  const manutencaoCritica = contatosDoCondominio.filter((c) => c.categoria === 'Manutenção Crítica');

  const handleAcionarPanico = () => {
    audioAlert.playWarningAlert();
    setPanicoAtivado(true);

    const agora = new Date().toLocaleString('pt-BR');
    const textoMensagem = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.ALERTA_PANICO, {
      CONDOMINIO: condominioAtivo.nome,
      OPERADOR: `${operadorAtivo.codigo} - ${operadorAtivo.nome}`,
      DATA_HORA: agora
    });

    // Procura o contato da supervisão ou síndico para abrir WhatsApp
    const destinatario = supervisao[0]?.whatsapp || gestao[0]?.whatsapp || condominioAtivo.telefoneSindico;
    if (destinatario) {
      const url = buildWhatsAppDeepLink(destinatario, textoMensagem);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-red-500/50 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Topo Vermelho de Alerta */}
        <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-700 p-4 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">CANAL DE EMERGÊNCIA & PÂNICO</h2>
              <p className="text-xs text-red-100 font-medium">Posto: {condominioAtivo.nome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* BOTÃO DE PÂNICO GERAL */}
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-center">
            <button
              onClick={handleAcionarPanico}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-sm sm:text-base rounded-xl shadow-lg shadow-red-900/40 flex items-center justify-center gap-2.5 active:scale-95 transition-all border border-red-400"
            >
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <span>ACIONAR BOTÃO DE PÂNICO / ALERTA IMEDIATO</span>
            </button>
            {panicoAtivado && (
              <p className="mt-2 text-xs font-bold text-red-400 animate-pulse">
                ⚠️ Alerta emitido! Janela do WhatsApp de emergência aberta.
              </p>
            )}
          </div>

          {/* ÓRGÃOS PÚBLICOS (DISCAGEM RÁPIDA 1 TOQUE) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Órgãos Públicos de Emergência
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <a
                href="tel:190"
                className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500 rounded-xl text-center transition-all group"
              >
                <PhoneCall className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-base font-black text-white">190</span>
                <span className="text-[10px] text-slate-300 font-semibold">Polícia Militar</span>
              </a>

              <a
                href="tel:193"
                className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 rounded-xl text-center transition-all group"
              >
                <Flame className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-base font-black text-white">193</span>
                <span className="text-[10px] text-slate-300 font-semibold">Bombeiros</span>
              </a>

              <a
                href="tel:192"
                className="flex flex-col items-center justify-center p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 rounded-xl text-center transition-all group"
              >
                <HeartPulse className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-1" />
                <span className="text-base font-black text-white">192</span>
                <span className="text-[10px] text-slate-300 font-semibold">SAMU</span>
              </a>
            </div>
          </div>

          {/* SUPERVISÃO INFPORT 24H */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
              Supervisão INFPORT & Apoio
            </h3>
            <div className="space-y-2">
              {supervisao.map((contato) => (
                <div
                  key={contato.id}
                  className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{contato.nome}</p>
                    <p className="text-xs text-slate-400">{contato.telefone} • {contato.descricao}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${contato.telefone}`}
                      className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                      title="Ligar"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    {contato.whatsapp && (
                      <a
                        href={buildWhatsAppDeepLink(contato.whatsapp, `Olá! Contato de emergência via guarita do condomínio ${condominioAtivo.nome}.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GESTÃO DO CONDOMÍNIO (SÍNDICO / ZELADOR) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              Gestão Interna (Síndico / Posto)
            </h3>
            <div className="space-y-2">
              {gestao.map((contato) => (
                <div
                  key={contato.id}
                  className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{contato.nome}</p>
                    <p className="text-xs text-slate-400">{contato.telefone} • {contato.descricao}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${contato.telefone}`}
                      className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                      title="Ligar"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    {contato.whatsapp && (
                      <a
                        href={buildWhatsAppDeepLink(contato.whatsapp, `Olá ${contato.nome}! Chamado prioritário da portaria do ${condominioAtivo.nome}.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        title="WhatsApp"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MANUTENÇÃO CRÍTICA (ELEVADORES / GERADORES) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-purple-400" />
              Manutenção de Emergência (Elevadores / Portões)
            </h3>
            <div className="space-y-2">
              {manutencaoCritica.map((contato) => (
                <div
                  key={contato.id}
                  className="flex items-center justify-between p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{contato.nome}</p>
                    <p className="text-xs text-slate-400">{contato.telefone} • {contato.descricao}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${contato.telefone}`}
                      className="p-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
                      title="Ligar"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500">
            Discagem direta para os canais e serviços públicos de emergência da localidade.
          </p>
        </div>
      </div>
    </div>
  );
};
