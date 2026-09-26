import React, { useState } from 'react';
import { BookOpen, Plus, Camera, Mic, Volume2, CheckCircle2, AlertTriangle, ShieldAlert, Check, Edit3, Clock, Printer } from 'lucide-react';
import { Condominio, Operador, Ocorrencia } from '../../types';
import { buildWhatsAppDeepLink } from '../../lib/whatsapp';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';
import { AudioRecorderModal } from '../common/AudioRecorderModal';
import { RelatorioOcorrenciasPdfModal } from '../common/RelatorioOcorrenciasPdfModal';

interface Mod08OcorrenciasProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  ocorrencias: Ocorrencia[];
  onAddOcorrencia: (oco: Ocorrencia) => void;
  onUpdateOcorrencia?: (oco: Ocorrencia) => void;
}

export const Mod08Ocorrencias: React.FC<Mod08OcorrenciasProps> = ({
  condominioAtivo,
  operadorAtivo,
  ocorrencias,
  onAddOcorrencia,
  onUpdateOcorrencia
}) => {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalResolucao, setModalResolucao] = useState<Ocorrencia | null>(null);
  const [relatorioPdfOpen, setRelatorioPdfOpen] = useState(false);
  const [tipoOcorrencia, setTipoOcorrencia] = useState<'Interna (Posto)' | 'Morador (Regimento)'>('Interna (Posto)');

  // Form Nova Ocorrência
  const [categoria, setCategoria] = useState('Falha de Equipamento / Sistema');
  const [severidade, setSeveridade] = useState<Ocorrencia['severidade']>('Média');
  const [unidadeInfratora, setUnidadeInfratora] = useState('');
  const [unidadeReclamante, setUnidadeReclamante] = useState('');
  const [descricao, setDescricao] = useState('');
  const [providencias, setProvidencias] = useState('');

  // Multimídia: Foto + Áudio
  const [fotoUrl, setFotoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [fotoModalOpen, setFotoModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);

  // Form Resolução (Supervisores / ADMs)
  const [statusEdicao, setStatusEdicao] = useState<Ocorrencia['statusOcorrencia']>('Resolvido');
  const [obsResolucao, setObsResolucao] = useState('');

  const ocorrenciasDoCondominio = ocorrencias.filter((o) => o.condominioId === condominioAtivo.id);

  const isSupervisorOuAdmin =
    operadorAtivo.login === 'admin' ||
    operadorAtivo.cargo.toLowerCase().includes('supervisor') ||
    operadorAtivo.cargo.toLowerCase().includes('diretor') ||
    operadorAtivo.cargo.toLowerCase().includes('desenvolvedor');

  const gerarCodigo = (tipo: 'Interna (Posto)' | 'Morador (Regimento)') => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const aa = String(agora.getFullYear()).slice(-2);
    const prefixo = tipo === 'Interna (Posto)' ? 'OCOR_INT' : 'OCOR_MOR';
    const seq = String(ocorrenciasDoCondominio.length + 1).padStart(2, '0');
    return `${prefixo}:${dd}${mm}${aa}${operadorAtivo.codigo}${seq}`;
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;

    const nova: Ocorrencia = {
      id: `oco_${Date.now()}`,
      codigo: gerarCodigo(tipoOcorrencia),
      condominioId: condominioAtivo.id,
      tipo: tipoOcorrencia,
      categoria,
      severidade: tipoOcorrencia === 'Interna (Posto)' ? severidade : undefined,
      unidadeInfratora: tipoOcorrencia === 'Morador (Regimento)' ? unidadeInfratora : undefined,
      unidadeReclamante: tipoOcorrencia === 'Morador (Regimento)' ? unidadeReclamante : undefined,
      descricao,
      fotoUrl: fotoUrl || undefined,
      audioUrl: audioUrl || undefined,
      dataHora: new Date().toLocaleString('pt-BR'),
      operadorNome: operadorAtivo.nome,
      providenciasTomadas: providencias,
      statusOcorrencia: 'Pendente'
    };

    onAddOcorrencia(nova);
    setModalAberto(false);

    // Preparar WhatsApp de Notificação ($0)
    let textoWhats = '';
    if (tipoOcorrencia === 'Interna (Posto)') {
      textoWhats = `⚠️ *REGISTRO DE OCORRÊNCIA INTERNA (POSTO)*
Condomínio: ${condominioAtivo.nome}
Código: ${nova.codigo}

• Categoria: ${nova.categoria}
• Severidade: ${nova.severidade === 'Crítica' ? '🔴 CRÍTICA / EMERGÊNCIA' : nova.severidade === 'Média' ? '🟡 MÉDIA' : '🟢 BAIXA'}
• Detalhes do Fato: ${nova.descricao}
• Providências Iniciais: ${nova.providenciasTomadas || 'Aguardando supervisor'}

Operador Responsável: ${operadorAtivo.codigo} - ${operadorAtivo.nome}
Data/Hora: ${nova.dataHora}`;
    } else {
      textoWhats = `📋 *REGISTRO DE OCORRÊNCIA DE MORADOR (REGIMENTO)*
Condomínio: ${condominioAtivo.nome}
Código: ${nova.codigo}

• Unidade Reclamada/Infratora: ${nova.unidadeInfratora}
• Unidade Reclamante: ${nova.unidadeReclamante || 'Não especificada'}
• Tipo de Infração: ${nova.categoria}
• Relato do Fato: ${nova.descricao}
• Providência da Portaria: ${nova.providenciasTomadas || 'Registrado no livro'}

Operador: ${operadorAtivo.codigo} - ${operadorAtivo.nome}
Data/Hora: ${nova.dataHora}`;
    }

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, textoWhats);
      window.open(url, '_blank');
    }

    // Reset
    setDescricao('');
    setProvidencias('');
    setFotoUrl('');
    setAudioUrl('');
  };

  const handleSalvarResolucao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalResolucao || !onUpdateOcorrencia) return;

    const atualizada: Ocorrencia = {
      ...modalResolucao,
      statusOcorrencia: statusEdicao,
      observacaoResolucao: obsResolucao,
      resolvidoPor: operadorAtivo.nome,
      dataResolucao: new Date().toLocaleString('pt-BR')
    };

    onUpdateOcorrencia(atualizada);
    setModalResolucao(null);
  };

  return (
    <div className="space-y-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/30">
              LIVRO DE OCORRÊNCIAS
            </span>
            <span className="text-xs text-slate-400">
              Registros no Posto: <strong className="text-white">{ocorrenciasDoCondominio.length}</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registro interno e sigiloso de infrações regimentais e eventos do posto com fotos, áudios e despacho de supervisores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRelatorioPdfOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            title="Gerar relatório consolidado em PDF para entrega à administradora do condomínio"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>Relatório PDF (Administradora)</span>
          </button>

          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-950/40 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Registrar Ocorrência
          </button>
        </div>
      </div>

      {/* LISTAGEM DE OCORRÊNCIAS */}
      <div className="space-y-3">
        {ocorrenciasDoCondominio.map((oco) => {
          const st = oco.statusOcorrencia || 'Pendente';
          const corStatus =
            st === 'Resolvido'
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
              : st === 'Visto'
              ? 'bg-indigo-950/60 text-indigo-400 border-indigo-500/30'
              : st === 'Em Análise'
              ? 'bg-blue-950/60 text-blue-400 border-blue-500/30'
              : 'bg-amber-950/60 text-amber-400 border-amber-500/30 animate-pulse';

          return (
            <div
              key={oco.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 hover:border-slate-750 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/20">
                    {oco.codigo}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    {oco.tipo}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${corStatus}`}>
                    {st}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{oco.dataHora}</span>
                  {/* BOTÃO PARA SUPERVISORES / ADMS ALTERAREM STATUS */}
                  {onUpdateOcorrencia && (
                    <button
                      onClick={() => {
                        setStatusEdicao(oco.statusOcorrencia || 'Em Análise');
                        setObsResolucao(oco.observacaoResolucao || '');
                        setModalResolucao(oco);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors"
                      title="Alterar Status / Resolução da Ocorrência"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isSupervisorOuAdmin ? 'Despachar / Status' : 'Atualizar Status'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{oco.categoria}</span>
                  {oco.severidade && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        oco.severidade === 'Crítica'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                          : oco.severidade === 'Média'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}
                    >
                      Severidade: {oco.severidade}
                    </span>
                  )}
                </h3>

                {oco.unidadeInfratora && (
                  <p className="text-xs text-rose-300 font-bold mt-1">
                    Unidade Infratora/Reclamada: {oco.unidadeInfratora}{' '}
                    {oco.unidadeReclamante ? `(Reclamante: ${oco.unidadeReclamante})` : ''}
                  </p>
                )}

                <p className="text-xs text-slate-300 mt-2 bg-slate-850 p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                  {oco.descricao}
                </p>
              </div>

              {/* RESOLUÇÃO DO SUPERVISOR / ADMIN */}
              {oco.observacaoResolucao && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Parecer / Resolução do Supervisor:
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {oco.resolvidoPor} • {oco.dataResolucao}
                    </span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{oco.observacaoResolucao}</p>
                </div>
              )}

              {/* ANEXOS MULTIMÍDIA */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
                {oco.fotoUrl && (
                  <a
                    href={oco.fotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2.5 py-1 rounded-lg"
                  >
                    <Camera className="w-3.5 h-3.5 text-rose-400" /> Ver Foto Anexa
                  </a>
                )}

                {oco.audioUrl && (
                  <audio controls src={oco.audioUrl} className="h-8 max-w-[240px]" />
                )}

                <span className="text-[11px] text-slate-500 ml-auto">
                  Registrado por: <strong>{oco.operadorNome}</strong>
                </span>
              </div>
            </div>
          );
        })}

        {ocorrenciasDoCondominio.length === 0 && (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            Nenhuma ocorrência registrada neste posto.
          </div>
        )}
      </div>

      {/* MODAL NOVA OCORRÊNCIA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-3.5 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-rose-400" /> Registro de Ocorrência
            </h2>

            <form onSubmit={handleSalvar} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTipoOcorrencia('Interna (Posto)');
                    setCategoria('Falha de Equipamento / Sistema');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    tipoOcorrencia === 'Interna (Posto)'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Interna do Posto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoOcorrencia('Morador (Regimento)');
                    setCategoria('Barulho Excessivo / Som Alto');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                    tipoOcorrencia === 'Morador (Regimento)'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Regimento de Morador
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria / Motivo *</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {tipoOcorrencia === 'Interna (Posto)' ? (
                    <>
                      <option value="Falha de Equipamento / Sistema">Falha de Equipamento / Sistema</option>
                      <option value="Portão da Garagem Travado">Portão da Garagem Travado</option>
                      <option value="Queda de Energia Geral">Queda de Energia Geral</option>
                      <option value="Tentativa de Invasão / Suspeito">Tentativa de Invasão / Suspeito</option>
                      <option value="Incidente com Funcionário">Incidente com Funcionário</option>
                      <option value="Outro Evento Interno">Outro Evento Interno</option>
                    </>
                  ) : (
                    <>
                      <option value="Barulho Excessivo / Som Alto">Barulho Excessivo / Som Alto</option>
                      <option value="Vaga de Garagem Obstruída">Vaga de Garagem Obstruída</option>
                      <option value="Uso Indevido de Área Comum">Uso Indevido de Área Comum</option>
                      <option value="Lixo em Local Inadequado">Lixo em Local Inadequado</option>
                      <option value="Animal sem Coleira / Sujeira">Animal sem Coleira / Sujeira</option>
                      <option value="Desrespeito ao Porteiro / Colaborador">Desrespeito ao Porteiro / Colaborador</option>
                      <option value="Outra Infração Regimental">Outra Infração Regimental</option>
                    </>
                  )}
                </select>
              </div>

              {tipoOcorrencia === 'Morador (Regimento)' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Unidade Infratora *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Bloco A - Apto 204"
                      value={unidadeInfratora}
                      onChange={(e) => setUnidadeInfratora(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Unidade Reclamante</label>
                    <input
                      type="text"
                      placeholder="Ex: Bloco A - Apto 304"
                      value={unidadeReclamante}
                      onChange={(e) => setUnidadeReclamante(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                    />
                  </div>
                </div>
              )}

              {tipoOcorrencia === 'Interna (Posto)' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nível de Severidade</label>
                  <select
                    value={severidade}
                    onChange={(e) => setSeveridade(e.target.value as Ocorrencia['severidade'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="Baixa">🟢 Baixa (Informativo)</option>
                    <option value="Média">🟡 Média (Requer Atenção)</option>
                    <option value="Crítica">🔴 Crítica / Emergência</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Relato Detalhado do Fato *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva exatamente o ocorrido, horários e pessoas envolvidas..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* FOTO E ÁUDIO */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFotoModalOpen(true)}
                  className="py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-rose-400" />
                  {fotoUrl ? 'Foto Anexa ✓' : 'Tirar Foto'}
                </button>

                <button
                  type="button"
                  onClick={() => setAudioModalOpen(true)}
                  className="py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  {audioUrl ? 'Áudio Gravado ✓' : 'Gravar Áudio'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/40"
                >
                  Registrar no Livro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESPACHO / RESOLUÇÃO DO SUPERVISOR OU ADMIN */}
      {modalResolucao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Despacho / Resolução da Ocorrência
            </h3>
            <p className="text-xs text-slate-400">
              Código: <strong>{modalResolucao.codigo}</strong> • {modalResolucao.categoria}
            </p>

            <form onSubmit={handleSalvarResolucao} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Novo Status da Ocorrência *
                </label>
                <select
                  value={statusEdicao}
                  onChange={(e) => setStatusEdicao(e.target.value as Ocorrencia['statusOcorrencia'])}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Pendente">🟡 Pendente (Aguardando Análise)</option>
                  <option value="Em Análise">🔵 Em Análise pelo Síndico / Gestor</option>
                  <option value="Visto">🟣 Visto / Ciente da Administração</option>
                  <option value="Resolvido">🟢 Resolvido / Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observação da Resolução / Parecer do Supervisor *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Morador foi notificado formalmente por advertência regimental. O som foi cessado às 23:45..."
                  value={obsResolucao}
                  onChange={(e) => setObsResolucao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalResolucao(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  Salvar Despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOTO */}
      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        presetTheme="avaria"
        title="Foto da Ocorrência"
        subtitle="Registro de infração ou dano material"
        onCapture={(url) => setFotoUrl(url)}
      />

      {/* MODAL ÁUDIO */}
      <AudioRecorderModal
        isOpen={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
        title="Gravar Relato em Áudio"
        onConfirm={(url: string) => setAudioUrl(url)}
      />

      {/* MODAL RELATÓRIO PDF PARA ADMINISTRADORA */}
      <RelatorioOcorrenciasPdfModal
        isOpen={relatorioPdfOpen}
        onClose={() => setRelatorioPdfOpen(false)}
        condominio={condominioAtivo}
        ocorrencias={ocorrencias}
        operadorAtivo={operadorAtivo}
        tituloContexto="Módulo 08: Ocorrências"
      />
    </div>
  );
};
