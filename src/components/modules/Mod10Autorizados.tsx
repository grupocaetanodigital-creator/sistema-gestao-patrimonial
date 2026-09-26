import React, { useState } from 'react';
import { UserCheck, Plus, Search, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck, MessageSquare, LogIn, LogOut } from 'lucide-react';
import { Condominio, Operador, Morador, Autorizado } from '../../types';
import { buildWhatsAppDeepLink } from '../../lib/whatsapp';

interface Mod10AutorizadosProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  moradores: Morador[];
  autorizados: Autorizado[];
  onAddAutorizado: (autorizado: Autorizado) => void;
  onRegistrarEntradaAutorizado: (id: string, cracha?: string) => void;
}

export const Mod10Autorizados: React.FC<Mod10AutorizadosProps> = ({
  condominioAtivo,
  operadorAtivo,
  moradores,
  autorizados,
  onAddAutorizado,
  onRegistrarEntradaAutorizado
}) => {
  const [modalNovo, setModalNovo] = useState(false);
  const [busca, setBusca] = useState('');

  // Form Novo Autorizado
  const [unidadeFiltro, setUnidadeFiltro] = useState('');
  const [moradorSel, setMoradorSel] = useState<Morador | null>(null);
  const [nomeAutorizado, setNomeAutorizado] = useState('');
  const [tipoAutorizacao, setTipoAutorizacao] = useState<Autorizado['tipoAutorizacao']>('Visita');
  const [vigenciaTipo, setVigenciaTipo] = useState<Autorizado['vigenciaTipo']>('Hoje');
  const [dataFimVigencia, setDataFimVigencia] = useState('');
  const [crachaNumero, setCrachaNumero] = useState('');

  const autorizadosDoCondominio = autorizados.filter((a) => a.condominioId === condominioAtivo.id);

  // Checagem de vigência
  const isVigente = (aut: Autorizado) => {
    if (aut.vigenciaTipo === 'Permanente') return true;

    const hoje = new Date().toISOString().split('T')[0];

    if (aut.vigenciaTipo === 'Hoje') {
      return aut.dataInicio === hoje;
    }

    if (aut.vigenciaTipo === 'Amanhã') {
      const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      return hoje <= amanha;
    }

    if (aut.vigenciaTipo === 'Intervalo' && aut.dataFim) {
      return hoje <= aut.dataFim;
    }

    return true;
  };

  const handleSalvarAutorizado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moradorSel || !nomeAutorizado) return;

    const hoje = new Date().toISOString().split('T')[0];

    const novo: Autorizado = {
      id: `aut_${Date.now()}`,
      codigo: `AUT${String(autorizadosDoCondominio.length + 1).padStart(3, '0')}`,
      condominioId: condominioAtivo.id,
      nome: nomeAutorizado,
      tipoAutorizacao,
      unidadeResponsavel: moradorSel.unidade,
      moradorSolicitanteNome: moradorSel.nomeCompleto,
      vigenciaTipo,
      dataInicio: hoje,
      dataFim: vigenciaTipo === 'Intervalo' ? dataFimVigencia : undefined,
      statusAcesso: 'Fora do Posto'
    };

    onAddAutorizado(novo);
    setModalNovo(false);

    // Reset
    setNomeAutorizado('');
    setMoradorSel(null);
    setUnidadeFiltro('');
  };

  const handleEntrada = (aut: Autorizado) => {
    onRegistrarEntradaAutorizado(aut.id, crachaNumero || 'Crachá Padrão');

    // Notificar Morador Titular via WhatsApp ($0)
    const morador = moradores.find(
      (m) => m.condominioId === condominioAtivo.id && m.unidade === aut.unidadeResponsavel
    );

    if (morador?.whatsapp) {
      const msg = `🔔 *INFPORT — ENTRADA DE AUTORIZADO*
Condomínio: ${condominioAtivo.nome}
Unidade: ${aut.unidadeResponsavel}

Olá ${morador.nomeCompleto}, informamos que o(a) seu autorizado(a) *${aut.nome}* (${aut.tipoAutorizacao}) acabou de ingressar no condomínio.

Operador: ${operadorAtivo.nome}
Horário: ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      const url = buildWhatsAppDeepLink(morador.whatsapp, msg);
      window.open(url, '_blank');
    }

    setCrachaNumero('');
  };

  const autorizadosFiltrados = autorizadosDoCondominio.filter(
    (a) =>
      a.nome.toLowerCase().includes(busca.toLowerCase()) ||
      a.unidadeResponsavel.toLowerCase().includes(busca.toLowerCase()) ||
      a.tipoAutorizacao.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
              MÓDULO 10
            </span>
            <h1 className="text-lg font-bold text-white">Autorizados (Visitas, Diaristas e Obras)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pré-autorizações dos moradores com controle de vigência e checagem de entrada com 1 toque.
          </p>
        </div>

        <button
          onClick={() => setModalNovo(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-teal-950/40 active:scale-95"
        >
          <Plus className="w-4 h-4" /> + Nova Pré-Autorização
        </button>
      </div>

      {/* Busca Rápida na Guarita */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por nome do visitante, diarista, prestador ou número da unidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Grid de Autorizados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {autorizadosFiltrados.map((aut) => {
          const liberado = isVigente(aut);
          const noCondominio = aut.statusAcesso === 'Em Visita (No Condomínio)';

          return (
            <div
              key={aut.id}
              className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                noCondominio
                  ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-950/20'
                  : liberado
                  ? 'bg-slate-900 border-teal-500/40 hover:border-teal-400 shadow-md shadow-teal-950/20'
                  : 'bg-slate-900 border-red-500/40 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/20">
                  {aut.unidadeResponsavel}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    noCondominio
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse'
                      : liberado
                      ? 'bg-teal-950/80 text-teal-300 border border-teal-500/30'
                      : 'bg-red-950/80 text-red-400 border border-red-500/30'
                  }`}
                >
                  {noCondominio ? '📍 NO CONDOMÍNIO' : liberado ? '✓ LIBERADO' : 'EXPIRADO'}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{aut.nome}</h3>
                <p className="text-xs text-slate-400">
                  Tipo: <strong className="text-slate-200">{aut.tipoAutorizacao}</strong>
                </p>
                <p className="text-xs text-slate-400">
                  Morador(a): <span className="text-slate-300 font-medium">{aut.moradorSolicitanteNome}</span>
                </p>
              </div>

              <div className="p-2 bg-slate-850 rounded-lg text-[11px] text-slate-300 space-y-0.5">
                <p>
                  <strong>Vigência:</strong> {aut.vigenciaTipo}
                  {aut.dataFim && ` (Até ${aut.dataFim})`}
                </p>
                {aut.ultimoCheckin && (
                  <p className="text-teal-400 font-mono text-[10px]">
                    Última entrada: {aut.ultimoCheckin}
                  </p>
                )}
                {aut.crachaAtual && (
                  <p className="text-amber-400 font-mono text-[10px]">
                    Em posse de: {aut.crachaAtual}
                  </p>
                )}
              </div>

              {liberado && !noCondominio && (
                <button
                  onClick={() => handleEntrada(aut)}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-teal-950/30"
                >
                  <LogIn className="w-3.5 h-3.5" /> Registrar Entrada & Notificar Morador
                </button>
              )}

              {noCondominio && (
                <button
                  onClick={() => onRegistrarEntradaAutorizado(aut.id)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-amber-500/40"
                >
                  <LogOut className="w-3.5 h-3.5" /> Registrar Saída do Condomínio
                </button>
              )}
            </div>
          );
        })}

        {autorizadosFiltrados.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Nenhum autorizado encontrado.
          </div>
        )}
      </div>

      {/* MODAL NOVA PRÉ-AUTORIZAÇÃO */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-400" /> Cadastrar Pré-Autorização
            </h2>

            <form onSubmit={handleSalvarAutorizado} className="space-y-3">
              {/* UNIDADE / MORADOR */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unidade que está Autorizando *
                </label>
                <input
                  type="text"
                  placeholder="Digite número da unidade (ex: 102 ou 304)..."
                  value={unidadeFiltro}
                  onChange={(e) => {
                    setUnidadeFiltro(e.target.value);
                    setMoradorSel(null);
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />

                {unidadeFiltro.length >= 2 && !moradorSel && (
                  <div className="p-2 bg-slate-850 border border-slate-700 rounded-xl max-h-32 overflow-y-auto space-y-1 mt-1">
                    {moradores
                      .filter(
                        (m) =>
                          m.condominioId === condominioAtivo.id &&
                          m.unidade.toLowerCase().includes(unidadeFiltro.toLowerCase())
                      )
                      .map((morador) => (
                        <button
                          key={morador.id}
                          type="button"
                          onClick={() => setMoradorSel(morador)}
                          className="w-full p-2 text-left bg-slate-800 hover:bg-teal-950/60 rounded-lg text-xs flex items-center justify-between"
                        >
                          <span className="font-bold text-white">{morador.nomeCompleto}</span>
                          <span className="text-teal-400 font-bold">{morador.unidade}</span>
                        </button>
                      ))}
                  </div>
                )}

                {moradorSel && (
                  <div className="p-2.5 bg-teal-950/50 border border-teal-500/40 rounded-xl flex items-center justify-between text-xs mt-1">
                    <div>
                      <p className="font-bold text-teal-400">{moradorSel.unidade} — {moradorSel.nomeCompleto}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMoradorSel(null)}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Trocar
                    </button>
                  </div>
                )}
              </div>

              {/* NOME DO AUTORIZADO (SEM EXIGÊNCIA DE DOCUMENTOS) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Autorizado (Visitante / Diarista / Prestador) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria José (Diarista) ou Henrique (Amigo)"
                  value={nomeAutorizado}
                  onChange={(e) => setNomeAutorizado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* TIPO DE AUTORIZAÇÃO */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo *</label>
                  <select
                    value={tipoAutorizacao}
                    onChange={(e) => setTipoAutorizacao(e.target.value as Autorizado['tipoAutorizacao'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Visita">Visita</option>
                    <option value="Diarista">Diarista</option>
                    <option value="Obras/Reformas">Obras / Reformas</option>
                    <option value="Prestador Técnico">Prestador Técnico</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vigência *</label>
                  <select
                    value={vigenciaTipo}
                    onChange={(e) => setVigenciaTipo(e.target.value as Autorizado['vigenciaTipo'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Hoje">Hoje (Apenas Hoje)</option>
                    <option value="Amanhã">Amanhã (Apenas Amanhã)</option>
                    <option value="Intervalo">Intervalo de Datas</option>
                    <option value="Permanente">Permanente</option>
                  </select>
                </div>
              </div>

              {vigenciaTipo === 'Intervalo' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Autorizado até qual data? *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataFimVigencia}
                    onChange={(e) => setDataFimVigencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!moradorSel}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-950/40"
                >
                  Salvar Pré-Autorização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
