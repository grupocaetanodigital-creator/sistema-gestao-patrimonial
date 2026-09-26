import React, { useState } from 'react';
import { Wrench, Plus, Camera, CheckCircle2, Clock, AlertTriangle, CheckSquare, Settings } from 'lucide-react';
import { Condominio, Operador, ChamadoManutencao, ItemChecklistConfig } from '../../types';
import { buildWhatsAppDeepLink, DEFAULT_WHATSAPP_TEMPLATES, interpolateTemplate } from '../../lib/whatsapp';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';

interface Mod06ManutencaoProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  chamados: ChamadoManutencao[];
  checklistsConfig: ItemChecklistConfig[];
  onAddChamado: (chamado: ChamadoManutencao) => void;
  onConcluirChamado: (id: string, solucao: string, fotoDepois: string) => void;
  onUpdateChecklistConfig: (configs: ItemChecklistConfig[]) => void;
}

export const Mod06Manutencao: React.FC<Mod06ManutencaoProps> = ({
  condominioAtivo,
  operadorAtivo,
  chamados,
  checklistsConfig,
  onAddChamado,
  onConcluirChamado,
  onUpdateChecklistConfig
}) => {
  const [tab, setTab] = useState<'chamados' | 'checklist' | 'config'>('chamados');
  const [modalNovoChamado, setModalNovoChamado] = useState(false);
  const [modalConcluir, setModalConcluir] = useState<ChamadoManutencao | null>(null);

  // Form Novo Chamado
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<ChamadoManutencao['categoria']>('Hidráulica');
  const [localizacao, setLocalizacao] = useState('');
  const [prioridade, setPrioridade] = useState<ChamadoManutencao['prioridade']>('Média');
  const [descricao, setDescricao] = useState('');
  const [fotoAntesUrl, setFotoAntesUrl] = useState('');
  const [fotoModalOpen, setFotoModalOpen] = useState(false);

  // Form Concluir Chamado
  const [solucao, setSolucao] = useState('');
  const [fotoDepoisUrl, setFotoDepoisUrl] = useState('');
  const [fotoDepoisModalOpen, setFotoDepoisModalOpen] = useState(false);

  // Execução de Checklist
  const [freqSelecionada, setFreqSelecionada] = useState<'Diário' | 'Semanal' | 'Mensal'>('Diário');
  const [checklistRespostas, setChecklistRespostas] = useState<Record<string, 'OK' | 'NOK'>>({});

  // Configuração pelo ADM
  const [novoItemChecklist, setNovoItemChecklist] = useState('');
  const [novaFreq, setNovaFreq] = useState<'Diário' | 'Semanal' | 'Mensal'>('Diário');

  const chamadosDoCondominio = chamados.filter((c) => c.condominioId === condominioAtivo.id);
  const chamadosAbertos = chamadosDoCondominio.filter((c) => c.status !== 'Concluído');

  const gerarCodigoOS = () => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const aa = String(agora.getFullYear()).slice(-2);
    const seq = String(chamadosDoCondominio.length + 1).padStart(2, '0');
    return `MANT:${dd}${mm}${aa}${operadorAtivo.codigo}${seq}`;
  };

  const handleSalvarChamado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !localizacao || !descricao) return;

    const fotoFinal =
      fotoAntesUrl ||
      'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&auto=format&fit=crop&q=60';

    const novo: ChamadoManutencao = {
      id: `cham_${Date.now()}`,
      codigoOS: gerarCodigoOS(),
      condominioId: condominioAtivo.id,
      origem: 'Abertura Avulsa (Portaria)',
      titulo,
      categoria,
      localizacao,
      prioridade,
      descricao,
      fotoAntesUrl: fotoFinal,
      status: 'Aberto',
      dataAbertura: new Date().toLocaleString('pt-BR'),
      operadorAberturaNome: operadorAtivo.nome
    };

    onAddChamado(novo);
    setModalNovoChamado(false);

    // Disparo WhatsApp de abertura para grupo da gestão
    const textoMsg = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.MANUTENCAO_ABERTA, {
      CONDOMINIO: condominioAtivo.nome,
      CODIGO_OS: novo.codigoOS,
      TITULO: novo.titulo,
      CATEGORIA: novo.categoria,
      LOCAL: novo.localizacao,
      PRIORIDADE: `${novo.prioridade === 'Alta' ? '🔴 ALTA / URGENTE' : novo.prioridade === 'Média' ? '🟡 MÉDIA' : '🟢 BAIXA'}`,
      DESCRICAO: novo.descricao,
      OPERADOR: `${operadorAtivo.codigo} - ${operadorAtivo.nome}`,
      DATA_HORA: novo.dataAbertura,
      LINK_FOTO: fotoFinal
    });

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, textoMsg);
      window.open(url, '_blank');
    }

    // Reset
    setTitulo('');
    setLocalizacao('');
    setDescricao('');
    setFotoAntesUrl('');
  };

  const handleEfetivarConclusao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalConcluir || !solucao) return;

    const fotoFinal =
      fotoDepoisUrl ||
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60';

    onConcluirChamado(modalConcluir.id, solucao, fotoFinal);

    // Disparo WhatsApp de conclusão
    const msgConclusao = `✅ *CHAMADO DE MANUTENÇÃO CONCLUÍDO*
Condomínio: ${condominioAtivo.nome}
Código: ${modalConcluir.codigoOS}

• Item/Problema: ${modalConcluir.titulo}
• Local: ${modalConcluir.localizacao}
• Serviço Realizado: ${solucao}
• Foto ("Depois"): ${fotoFinal}

Responsável: ${operadorAtivo.codigo} - ${operadorAtivo.nome}
Data/Hora: ${new Date().toLocaleString('pt-BR')}`;

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, msgConclusao);
      window.open(url, '_blank');
    }

    setModalConcluir(null);
    setSolucao('');
    setFotoDepoisUrl('');
  };

  const handleAddConfigItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItemChecklist) return;

    const novaLista: ItemChecklistConfig[] = [
      ...checklistsConfig,
      {
        id: `chk_${Date.now()}`,
        texto: novoItemChecklist,
        frequencia: novaFreq
      }
    ];

    onUpdateChecklistConfig(novaLista);
    setNovoItemChecklist('');
  };

  return (
    <div className="space-y-4">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">
              MÓDULO 06
            </span>
            <h1 className="text-lg font-bold text-white">Gestão Técnica & Manutenção</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Chamados da Guarita e Checklists (Diário, Semanal e Mensal) para o Manutencionista.
          </p>
        </div>

        <button
          onClick={() => setModalNovoChamado(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-orange-950/40 active:scale-95"
        >
          <Plus className="w-4 h-4" /> + Novo Chamado (OS)
        </button>
      </div>

      {/* Abas */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setTab('chamados')}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            tab === 'chamados'
              ? 'border-orange-400 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          Ordens de Serviço ({chamadosAbertos.length} Abertas)
        </button>

        <button
          onClick={() => setTab('checklist')}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            tab === 'checklist'
              ? 'border-orange-400 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          Rotinas de Checklist
        </button>

        <button
          onClick={() => setTab('config')}
          className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
            tab === 'config'
              ? 'border-orange-400 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configurar Checklists (ADM)
        </button>
      </div>

      {/* ABA: CHAMADOS / ORDENS DE SERVIÇO */}
      {tab === 'chamados' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {chamadosDoCondominio.map((chamado) => (
            <div
              key={chamado.id}
              className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">
                  {chamado.codigoOS}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    chamado.prioridade === 'Alta'
                      ? 'bg-red-950/70 text-red-400 border border-red-500/40 animate-pulse'
                      : chamado.prioridade === 'Média'
                      ? 'bg-amber-950/70 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {chamado.prioridade} Prioridade
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{chamado.titulo}</h3>
                <p className="text-xs text-slate-400">
                  Local: <strong className="text-slate-200">{chamado.localizacao}</strong> • {chamado.categoria}
                </p>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2">{chamado.descricao}</p>
              </div>

              {chamado.status === 'Concluído' ? (
                <div className="p-2 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
                  ✓ Concluído: {chamado.solucaoDescricao}
                </div>
              ) : (
                <button
                  onClick={() => setModalConcluir(chamado)}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/30"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Concluir OS & Enviar Relatório
                </button>
              )}
            </div>
          ))}

          {chamadosDoCondominio.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 text-xs">
              Nenhum chamado de manutenção registrado.
            </div>
          )}
        </div>
      )}

      {/* ABA: ROTINA DE CHECKLIST DO MANUTENCIONISTA */}
      {tab === 'checklist' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Vistoria e Checklist Operacional</h2>
            <div className="flex items-center gap-1.5">
              {(['Diário', 'Semanal', 'Mensal'] as const).map((freq) => (
                <button
                  key={freq}
                  onClick={() => setFreqSelecionada(freq)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    freqSelecionada === freq
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {freq}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {checklistsConfig
              .filter((c) => c.frequencia === freqSelecionada)
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-medium text-white">{item.texto}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() =>
                        setChecklistRespostas({ ...checklistRespostas, [item.id]: 'OK' })
                      }
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        checklistRespostas[item.id] === 'OK'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      [ ✓ OK ]
                    </button>
                    <button
                      onClick={() => {
                        setChecklistRespostas({ ...checklistRespostas, [item.id]: 'NOK' });
                        // Sugere abrir chamado imediatamente
                        setTitulo(item.texto);
                        setLocalizacao('Área Comum');
                        setDescricao(`Anomalia identificada durante checklist ${freqSelecionada}`);
                        setModalNovoChamado(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                        checklistRespostas[item.id] === 'NOK'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      [ ! NOK ]
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <button
            onClick={() => {
              alert('Checklist concluído e registrado na rotina do posto!');
              setChecklistRespostas({});
            }}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/40 mt-3"
          >
            Finalizar Inspeção de {freqSelecionada}
          </button>
        </div>
      )}

      {/* ABA: CONFIGURAR CHECKLISTS (ADM) */}
      {tab === 'config' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-orange-400" />
            Configuração de Perguntas por Frequência (Painel ADM)
          </h2>

          <form onSubmit={handleAddConfigItem} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              required
              placeholder="Digite o novo item de checagem (ex: Testar barramento do gerador)..."
              value={novoItemChecklist}
              onChange={(e) => setNovoItemChecklist(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            />
            <select
              value={novaFreq}
              onChange={(e) => setNovaFreq(e.target.value as 'Diário' | 'Semanal' | 'Mensal')}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
            >
              <option value="Diário">Diário</option>
              <option value="Semanal">Semanal</option>
              <option value="Mensal">Mensal</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shrink-0"
            >
              + Adicionar Item
            </button>
          </form>

          <div className="space-y-2 pt-3 border-t border-slate-800">
            {checklistsConfig.map((c) => (
              <div
                key={c.id}
                className="p-2.5 bg-slate-800 rounded-lg flex items-center justify-between text-xs text-slate-300"
              >
                <span>{c.texto}</span>
                <span className="font-bold text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/20">
                  {c.frequencia}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL NOVO CHAMADO */}
      {modalNovoChamado && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-400" /> Abrir Ordem de Serviço (OS)
            </h2>

            <form onSubmit={handleSalvarChamado} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título do Problema *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Motor do Portão Social Travado"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as ChamadoManutencao['categoria'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Hidráulica">Hidráulica</option>
                    <option value="Elétrica">Elétrica</option>
                    <option value="Portões / Acessos">Portões / Acessos</option>
                    <option value="Piscina">Piscina</option>
                    <option value="Gerador">Gerador</option>
                    <option value="Iluminação">Iluminação</option>
                    <option value="Civil / Pintura">Civil / Pintura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as ChamadoManutencao['prioridade'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Baixa">🟢 Baixa</option>
                    <option value="Média">🟡 Média</option>
                    <option value="Alta">🔴 Alta / Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Localização Física *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Subsolo 2 - Casa de Bombas ou Hall Torre B"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição Detalhada *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Descreva o que foi observado..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Foto da Avaria ("Antes")</label>
                <button
                  type="button"
                  onClick={() => setFotoModalOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-orange-400" />
                  {fotoAntesUrl ? 'Foto Registrada ✓' : 'Capturar Foto do Problema'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoChamado(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/40"
                >
                  Criar OS & Enviar WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONCLUIR CHAMADO (FOTO DEPOIS) */}
      {modalConcluir && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Finalizar Chamado de Manutenção
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              OS: <strong>{modalConcluir.titulo}</strong> ({modalConcluir.codigoOS})
            </p>

            <form onSubmit={handleEfetivarConclusao} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição da Solução Realizada *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Efetuada a substituição do capacitor e regulagem de fim de curso..."
                  value={solucao}
                  onChange={(e) => setSolucao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Foto do Serviço Concluído ("Depois") *
                </label>
                <button
                  type="button"
                  onClick={() => setFotoDepoisModalOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  {fotoDepoisUrl ? 'Foto do Serviço Registrada ✓' : 'Capturar Foto da Solução'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalConcluir(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  Concluir & Notificar Síndico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOTO ANTES */}
      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        presetTheme="avaria"
        title="Foto do Defeito ('Antes')"
        onCapture={(url) => setFotoAntesUrl(url)}
      />

      {/* FOTO DEPOIS */}
      <PhotoCaptureModal
        isOpen={fotoDepoisModalOpen}
        onClose={() => setFotoDepoisModalOpen(false)}
        presetTheme="entrega"
        title="Foto do Reparo Concluído ('Depois')"
        onCapture={(url) => setFotoDepoisUrl(url)}
      />
    </div>
  );
};
