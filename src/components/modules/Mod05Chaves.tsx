import React, { useState } from 'react';
import { Key, Plus, Camera, CheckCircle2, Clock, AlertTriangle, MessageSquare, AlertCircle } from 'lucide-react';
import { Condominio, Operador, Morador, Chave } from '../../types';
import { buildWhatsAppDeepLink, DEFAULT_WHATSAPP_TEMPLATES, interpolateTemplate } from '../../lib/whatsapp';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';

interface Mod05ChavesProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  moradores: Morador[];
  chaves: Chave[];
  onAddChave: (chave: Chave) => void;
  onRetirarChave: (id: string, dados: Partial<Chave>) => void;
  onDevolverChave: (id: string, motivoAvaria?: string, fotoAvaria?: string) => void;
}

export const Mod05Chaves: React.FC<Mod05ChavesProps> = ({
  condominioAtivo,
  operadorAtivo,
  moradores,
  chaves,
  onAddChave,
  onRetirarChave,
  onDevolverChave
}) => {
  const [modalNovaChave, setModalNovaChave] = useState(false);
  const [modalRetirada, setModalRetirada] = useState<Chave | null>(null);
  const [modalDevolucao, setModalDevolucao] = useState<Chave | null>(null);

  // Form Nova Chave
  const [nomeChave, setNomeChave] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [categoria, setCategoria] = useState<Chave['categoria']>('Técnica');
  const [horarioLimite, setHorarioLimite] = useState('22:00');

  // Form Retirada
  const [tipoSol, setTipoSol] = useState<'Morador' | 'Colaborador' | 'Terceiro'>('Morador');
  const [unidadeFiltro, setUnidadeFiltro] = useState('');
  const [moradorSel, setMoradorSel] = useState<Morador | null>(null);
  const [colaboradorNome, setColaboradorNome] = useState('');
  const [colaboradorCargo, setColaboradorCargo] = useState('Manutencionista');
  const [terceiroNome, setTerceiroNome] = useState('');
  const [terceiroRgFoto, setTerceiroRgFoto] = useState('');
  const [motivoRetirada, setMotivoRetirada] = useState('');
  const [limiteAjustado, setLimiteAjustado] = useState('');
  const [fotoModalOpen, setFotoModalOpen] = useState(false);

  // Form Devolução com Avaria / Perda (Apenas se quebrar ou perder)
  const [houveAvariaOuPerda, setHouveAvariaOuPerda] = useState(false);
  const [obsAvariaChave, setObsAvariaChave] = useState('');
  const [fotoAvariaChave, setFotoAvariaChave] = useState('');
  const [fotoAvariaModalOpen, setFotoAvariaModalOpen] = useState(false);

  const chavesDoCondominio = chaves.filter((c) => c.condominioId === condominioAtivo.id);

  // Lógica de Chave Atrasada
  const isChaveAtrasada = (chave: Chave) => {
    if (chave.status !== 'retirada') return false;
    // Se tiver horário limite fixo (ex: "23:00")
    if (chave.horarioLimiteDevolucao) {
      const agora = new Date();
      const [limiteHora, limiteMin] = chave.horarioLimiteDevolucao.split(':').map(Number);
      const dataLimite = new Date();
      dataLimite.setHours(limiteHora, limiteMin, 0, 0);
      return agora.getTime() > dataLimite.getTime();
    }
    return false;
  };

  const handleSalvarNovaChave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeChave || !etiqueta) return;

    const nova: Chave = {
      id: `chv_${Date.now()}`,
      codigo: `CHV${String(chavesDoCondominio.length + 1).padStart(3, '0')}`,
      condominioId: condominioAtivo.id,
      nome: nomeChave,
      etiquetaClaviculario: etiqueta,
      categoria,
      horarioLimiteDevolucao: horarioLimite || '22:00',
      status: 'disponivel'
    };

    onAddChave(nova);
    setNomeChave('');
    setEtiqueta('');
    setModalNovaChave(false);
  };

  const handleEfetivarRetirada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRetirada) return;

    let solNome = '';
    let solDet = '';

    if (tipoSol === 'Morador') {
      if (!moradorSel) return;
      solNome = moradorSel.nomeCompleto;
      solDet = moradorSel.unidade;
    } else if (tipoSol === 'Colaborador') {
      if (!colaboradorNome) return;
      solNome = colaboradorNome;
      solDet = colaboradorCargo;
    } else {
      if (!terceiroNome) return;
      solNome = terceiroNome;
      solDet = 'Terceiro / Prestador (Doc Validado)';
    }

    onRetirarChave(modalRetirada.id, {
      status: 'retirada',
      solicitanteTipo: tipoSol,
      solicitanteNome: solNome,
      solicitanteDetalhe: solDet,
      solicitanteDocumentoFotoUrl: terceiroRgFoto,
      motivoRetirada: motivoRetirada || 'Acesso rotineiro',
      horarioLimiteDevolucao: limiteAjustado || modalRetirada.horarioLimiteDevolucao || '23:00',
      dataHoraRetirada: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      operadorRetiradaNome: operadorAtivo.nome
    });

    setModalRetirada(null);
    setMoradorSel(null);
    setUnidadeFiltro('');
    setColaboradorNome('');
    setTerceiroNome('');
    setTerceiroRgFoto('');
    setMotivoRetirada('');
  };

  const handleEfetivarDevolucao = () => {
    if (!modalDevolucao) return;
    onDevolverChave(
      modalDevolucao.id,
      houveAvariaOuPerda ? obsAvariaChave : undefined,
      houveAvariaOuPerda ? fotoAvariaChave : undefined
    );
    setModalDevolucao(null);
    setHouveAvariaOuPerda(false);
    setObsAvariaChave('');
    setFotoAvariaChave('');
  };

  return (
    <div className="space-y-4">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              MÓDULO 05
            </span>
            <h1 className="text-lg font-bold text-white">Quadro Digital de Chaves (Claviculário)</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Total de chaves cadastradas: <strong className="text-amber-400">{chavesDoCondominio.length}</strong> • Em uso:{' '}
            <strong className="text-rose-400">{chavesDoCondominio.filter((c) => c.status === 'retirada').length}</strong>
          </p>
        </div>

        <button
          onClick={() => setModalNovaChave(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-950/40 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Nova Chave
        </button>
      </div>

      {/* CLAVICULÁRIO VIRTUAL (GRID DE CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {chavesDoCondominio.map((chave) => {
          const atrasada = isChaveAtrasada(chave);
          const disponivel = chave.status === 'disponivel';

          return (
            <div
              key={chave.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                disponivel
                  ? 'bg-slate-900 border-emerald-500/50 hover:border-emerald-400 shadow-md shadow-emerald-950/20'
                  : atrasada
                  ? 'bg-slate-900 border-red-500 shadow-xl shadow-red-950/40 animate-pulse'
                  : 'bg-slate-900 border-rose-500/60 shadow-md shadow-rose-950/20'
              }`}
            >
              <div className="space-y-2">
                {/* Topo: Gancho e Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-white border border-slate-700">
                    {chave.etiquetaClaviculario}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      disponivel
                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                        : atrasada
                        ? 'bg-red-600 text-white animate-bounce'
                        : 'bg-rose-950/70 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {disponivel ? 'No Quadro' : atrasada ? '🚨 ATRASADA' : 'Em Uso'}
                  </span>
                </div>

                {/* Nome da Chave */}
                <div>
                  <h3 className="text-sm font-bold text-white line-clamp-2">{chave.nome}</h3>
                  <p className="text-[11px] text-slate-400">
                    {chave.categoria} • Limite: <strong className="text-amber-400">{chave.horarioLimiteDevolucao}h</strong>
                  </p>
                </div>

                {/* Detalhes de quem retirou */}
                {!disponivel && (
                  <div className="p-2 bg-slate-850 rounded-lg text-xs space-y-0.5 border border-slate-700/80">
                    <p className="text-slate-400">
                      Retirada por:{' '}
                      <strong className="text-white font-bold">{chave.solicitanteNome}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {chave.solicitanteTipo}: {chave.solicitanteDetalhe}
                    </p>
                    <p className="text-[10px] text-amber-400 font-mono">
                      Saída: {chave.dataHoraRetirada} | Devolver até: {chave.horarioLimiteDevolucao}h
                    </p>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 border-t border-slate-800 mt-3 flex items-center gap-1.5">
                {disponivel ? (
                  <button
                    onClick={() => {
                      setModalRetirada(chave);
                      setLimiteAjustado(chave.horarioLimiteDevolucao || '23:00');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/40"
                  >
                    <Key className="w-3.5 h-3.5" /> Retirar Chave
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      onClick={() => setModalDevolucao(chave)}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Devolver
                    </button>

                    {atrasada && (
                      <button
                        onClick={() => {
                          const msg = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.CHAVE_ATRASADA, {
                            CONDOMINIO: condominioAtivo.nome,
                            CHAVE_NOME: chave.nome,
                            POSICAO: chave.etiquetaClaviculario,
                            SOLICITANTE: `${chave.solicitanteNome} (${chave.solicitanteDetalhe})`,
                            HORARIO_LIMITE: `${chave.horarioLimiteDevolucao}h`
                          });
                          const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, msg);
                          window.open(url, '_blank');
                        }}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors"
                        title="Cobrar Devolução via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL RETIRADA DE CHAVE */}
      {modalRetirada && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" /> Retirada de Chave
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Chave: <strong className="text-white">{modalRetirada.nome}</strong> ({modalRetirada.etiquetaClaviculario})
            </p>

            <form onSubmit={handleEfetivarRetirada} className="space-y-3">
              {/* TIPO DE SOLICITANTE */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Solicitante *
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Morador', 'Colaborador', 'Terceiro'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipoSol(t)}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                        tipoSol === t
                          ? 'bg-amber-600 border-amber-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* SE MORADOR: SOLICITA UNIDADE E LISTA MORADORES */}
              {tipoSol === 'Morador' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Digite a Unidade do Morador *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 102 ou 304..."
                    value={unidadeFiltro}
                    onChange={(e) => {
                      setUnidadeFiltro(e.target.value);
                      setMoradorSel(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />

                  {unidadeFiltro.length >= 2 && !moradorSel && (
                    <div className="p-2 bg-slate-850 border border-slate-700 rounded-xl max-h-32 overflow-y-auto space-y-1">
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
                            className="w-full p-2 text-left bg-slate-800 hover:bg-amber-950/60 rounded-lg text-xs flex items-center justify-between"
                          >
                            <span className="font-bold text-white">{morador.nomeCompleto}</span>
                            <span className="text-amber-400 font-bold">{morador.unidade}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  {moradorSel && (
                    <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-emerald-400">{moradorSel.nomeCompleto}</p>
                        <p className="text-slate-400">{moradorSel.unidade} • {moradorSel.tipoVinculo}</p>
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
              )}

              {/* SE COLABORADOR: NOME E CARGO */}
              {tipoSol === 'Colaborador' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome do Colaborador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Mendes"
                      value={colaboradorNome}
                      onChange={(e) => setColaboradorNome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo *</label>
                    <select
                      value={colaboradorCargo}
                      onChange={(e) => setColaboradorCargo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Manutencionista">Manutencionista</option>
                      <option value="Zelador">Zelador</option>
                      <option value="Ronda">Ronda</option>
                      <option value="Limpeza">Aux. de Limpeza</option>
                      <option value="Porteiro">Porteiro</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SE TERCEIRO: NOME E FOTO DO RG */}
              {tipoSol === 'Terceiro' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome do Terceiro / Prestador *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Marcos Antônio (HidroTech)"
                      value={terceiroNome}
                      onChange={(e) => setTerceiroNome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Foto Obrigatória do Documento (RG/CNH) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFotoModalOpen(true)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      {terceiroRgFoto ? 'Foto do Documento Capturada ✓' : 'Tirar Foto do RG/Documento'}
                    </button>
                  </div>
                </div>
              )}

              {/* Horário Limite de Devolução Configurado */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Horário Limite para Devolução na Portaria *
                </label>
                <input
                  type="time"
                  required
                  value={limiteAjustado}
                  onChange={(e) => setLimiteAjustado(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo da Retirada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reparo na bomba de recalque, festa de aniversário..."
                  value={motivoRetirada}
                  onChange={(e) => setMotivoRetirada(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalRetirada(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40"
                >
                  Liberar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DEVOLUÇÃO (FOTO APENAS SE QUEBRAR OU PERDER) */}
      {modalDevolucao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Confirmar Devolução ao Quadro
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Chave: <strong>{modalDevolucao.nome}</strong> ({modalDevolucao.etiquetaClaviculario})
            </p>

            <div className="space-y-3">
              {/* Checkbox: Registrar Avaria ou Perda? */}
              <label className="flex items-center gap-2 text-xs font-semibold text-amber-400 cursor-pointer p-2.5 bg-amber-950/20 border border-amber-500/30 rounded-xl">
                <input
                  type="checkbox"
                  checked={houveAvariaOuPerda}
                  onChange={(e) => setHouveAvariaOuPerda(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>A chave foi perdida, entortada ou quebrada?</span>
              </label>

              {houveAvariaOuPerda && (
                <div className="space-y-2 p-3 bg-slate-800/80 rounded-xl border border-slate-700">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Relato do Dano / Perda *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Quebrou dentro do miolo do salão, chave perdida pelo morador..."
                      value={obsAvariaChave}
                      onChange={(e) => setObsAvariaChave(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Foto Comprovante do Dano
                    </label>
                    <button
                      type="button"
                      onClick={() => setFotoAvariaModalOpen(true)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      {fotoAvariaChave ? 'Foto do Dano Anexada ✓' : 'Tirar Foto da Chave Danificada'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalDevolucao(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEfetivarDevolucao}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  Confirmar Devolução
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVA CHAVE */}
      {modalNovaChave && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" /> Cadastrar Chave no Claviculário
            </h2>

            <form onSubmit={handleSalvarNovaChave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Posição no Claviculário *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gancho 05 ou Posição 12-B"
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome / Identificação da Chave *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Casa de Bombas Bloco B ou Salão de Jogos"
                  value={nomeChave}
                  onChange={(e) => setNomeChave(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as Chave['categoria'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Técnica">Técnica (Bombas/Gerador)</option>
                    <option value="Social / Lazer">Social / Lazer (Salões)</option>
                    <option value="Administrativa">Administrativa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Horário Limite Padrão
                  </label>
                  <input
                    type="time"
                    value={horarioLimite}
                    onChange={(e) => setHorarioLimite(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovaChave(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40"
                >
                  Cadastrar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOTO RG DO TERCEIRO */}
      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        presetTheme="documento"
        title="Foto do Documento (RG/CNH) do Terceiro"
        onCapture={(url) => setTerceiroRgFoto(url)}
      />

      {/* FOTO AVARIA DA CHAVE */}
      <PhotoCaptureModal
        isOpen={fotoAvariaModalOpen}
        onClose={() => setFotoAvariaModalOpen(false)}
        presetTheme="avaria"
        title="Foto da Chave Danificada / Quebrada"
        onCapture={(url) => setFotoAvariaChave(url)}
      />
    </div>
  );
};
