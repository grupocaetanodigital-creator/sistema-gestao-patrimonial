import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Camera,
  MessageSquare,
  Layers,
  ArrowRight,
  Sparkles,
  Barcode,
  Truck,
  MapPin,
  User,
  Users,
  Eye,
  ImageIcon
} from 'lucide-react';
import {
  Condominio,
  Operador,
  Morador,
  Entregador,
  LoteEncomenda,
  ItemEncomenda
} from '../../types';
import { audioAlert } from '../../lib/audioAlert';
import {
  buildWhatsAppDeepLink,
  DEFAULT_WHATSAPP_TEMPLATES,
  interpolateTemplate,
  formatWhatsAppPhotoLink
} from '../../lib/whatsapp';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

interface Mod02EncomendasProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  moradores: Morador[];
  entregadores: Entregador[];
  lotes: LoteEncomenda[];
  itensEncomenda: ItemEncomenda[];
  onAddLote: (lote: LoteEncomenda) => void;
  onAddItemEncomenda: (item: ItemEncomenda) => void;
  onBaixaItens: (ids: string[], retiranteNome: string, fotoUrl: string) => void;
  onAddEntregador: (entregador: Entregador) => void;
}

export const Mod02Encomendas: React.FC<Mod02EncomendasProps> = ({
  condominioAtivo,
  operadorAtivo,
  moradores,
  entregadores,
  lotes,
  itensEncomenda,
  onAddLote,
  onAddItemEncomenda,
  onBaixaItens,
  onAddEntregador
}) => {
  const [etapa, setEtapa] = useState<'lotes' | 'triagem' | 'baixa'>('triagem');

  // Modais de Foto e Scanner
  const [fotoModalOpen, setFotoModalOpen] = useState(false);
  const [fotoTarget, setFotoTarget] = useState<'triagem' | 'baixa'>('triagem');
  const [modalCameraScanner, setModalCameraScanner] = useState(false);

  // Locais de armazenamento obtidos das configurações do condomínio (gerenciáveis em Cadastros)
  const locaisDisponiveis =
    condominioAtivo.locaisArmazenamento && condominioAtivo.locaisArmazenamento.length > 0
      ? condominioAtivo.locaisArmazenamento
      : [
          'Bancada Principal da Portaria',
          'Armário A',
          'Armário B',
          'Prateleira 1',
          'Prateleira 2',
          'Chão da Guarita (Volume Grande)',
          'Geladeira (Alimentos / Perecíveis)',
          'Gaveta de Envelopes (Pequenos)'
        ];

  // Formulário Novo Lote (RE)
  const [modalNovoLote, setModalNovoLote] = useState(false);
  const [entregadorSelecionadoId, setEntregadorSelecionadoId] = useState<string>('novo');
  const [entregadorNome, setEntregadorNome] = useState('');
  const [entregadorDoc, setEntregadorDoc] = useState('');
  const [entregadorEmpresa, setEntregadorEmpresa] = useState('Mercado Livre');
  const [qtdVolumesDeclarados, setQtdVolumesDeclarados] = useState(5);

  // Formulário Triagem
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string>(
    lotes.find((l) => l.status !== 'concluido')?.id || lotes[0]?.id || ''
  );
  const [blocoFiltro, setBlocoFiltro] = useState<string>('todos');
  const [unidadeBusca, setUnidadeBusca] = useState('');
  const [moradorSelecionado, setMoradorSelecionado] = useState<Morador | null>(null);
  const [localArmazenamento, setLocalArmazenamento] = useState<string>(locaisDisponiveis[0] || 'Bancada Principal da Portaria');
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [observacaoAvaria, setObservacaoAvaria] = useState('');
  const [fotoEtiquetaUrl, setFotoEtiquetaUrl] = useState('');
  const [alertaAgrupamento, setAlertaAgrupamento] = useState<{
    count: number;
    unidade: string;
    pacotes: ItemEncomenda[];
  } | null>(null);

  // Mantém local de armazenamento sincronizado se mudar condomínio
  React.useEffect(() => {
    if (!locaisDisponiveis.includes(localArmazenamento)) {
      setLocalArmazenamento(locaisDisponiveis[0] || 'Bancada Principal da Portaria');
    }
  }, [condominioAtivo, locaisDisponiveis]);

  // Formulário Baixa
  const [baixaUnidadeBusca, setBaixaUnidadeBusca] = useState('');
  const [itensSelecionadosParaBaixa, setItensSelecionadosParaBaixa] = useState<string[]>([]);
  const [retiranteNome, setRetiranteNome] = useState('');
  const [fotoComprovanteUrl, setFotoComprovanteUrl] = useState('');
  const [fotoVisualizarUrl, setFotoVisualizarUrl] = useState<string | null>(null);
  const [fotoVisualizarTitulo, setFotoVisualizarTitulo] = useState<string>('');

  // Itens retidos no condomínio ativo
  const itensRetidos = itensEncomenda.filter(
    (i) => i.condominioId === condominioAtivo.id && i.status === 'retido'
  );

  const lotesDoCondominio = lotes.filter((l) => l.condominioId === condominioAtivo.id);

  const blocosCondominio = condominioAtivo.listaBlocos && condominioAtivo.listaBlocos.length > 0
    ? condominioAtivo.listaBlocos
    : ['Bloco A', 'Bloco B'];

  // Gerador de Código RE: DDMMAAOPERNN baseado na ordem das entregas do dia (00:00 às 23:59)
  const gerarCodigoRE = () => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const aa = String(agora.getFullYear()).slice(-2);
    const prefixoDataBr = `${dd}/${mm}/`;

    // Filtra apenas os lotes criados no dia de hoje (00:00 às 23:59) no condomínio ativo
    const lotesDeHoje = lotesDoCondominio.filter((l) => {
      if (!l.dataHora) return false;
      return l.dataHora.includes(prefixoDataBr);
    });

    const seq = String(lotesDeHoje.length + 1).padStart(2, '0');
    // Formato exato solicitado: RE240926OPER00101 (sem dois-pontos)
    return `RE${dd}${mm}${aa}${operadorAtivo.codigo}${seq}`;
  };

  // Quando seleciona entregador cadastrado no Modal Novo Lote
  const handleSelectEntregador = (id: string) => {
    setEntregadorSelecionadoId(id);
    if (id === 'novo') {
      setEntregadorNome('');
      setEntregadorDoc('');
      setEntregadorEmpresa('Mercado Livre');
    } else {
      const ent = entregadores.find((item) => item.id === id);
      if (ent) {
        setEntregadorNome(ent.nome);
        setEntregadorDoc(ent.documento);
        setEntregadorEmpresa(ent.empresa);
      }
    }
  };

  // 1ª ETAPA: Criar Lote RE
  const handleCriarLote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entregadorNome.trim()) return;

    let ent = entregadores.find((item) => item.nome.toLowerCase() === entregadorNome.trim().toLowerCase());
    if (!ent) {
      ent = {
        id: `ent_${Date.now()}`,
        codigo: `ENTR${String(entregadores.length + 1).padStart(3, '0')}`,
        nome: entregadorNome.trim(),
        documento: entregadorDoc.trim() || 'Não informado',
        empresa: entregadorEmpresa
      };
      onAddEntregador(ent);
    }

    const novoLote: LoteEncomenda = {
      id: `lote_${Date.now()}`,
      codigoRE: gerarCodigoRE(),
      condominioId: condominioAtivo.id,
      entregadorId: ent.id,
      entregadorNome: ent.nome,
      empresa: entregadorEmpresa,
      quantidadeDeclarada: Number(qtdVolumesDeclarados),
      quantidadeTriada: 0,
      operadorId: operadorAtivo.id,
      operadorNome: operadorAtivo.nome,
      dataHora: new Date().toLocaleString('pt-BR'),
      status: 'em_triagem'
    };

    onAddLote(novoLote);
    setLoteSelecionadoId(novoLote.id);
    setModalNovoLote(false);
    setEtapa('triagem');

    // Notificação de lote via WhatsApp para o síndico / grupo
    const textoWhats = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.LOTE_RECEBIDO, {
      CONDOMINIO: condominioAtivo.nome,
      LOTE_RE: novoLote.codigoRE,
      EMPRESA: novoLote.empresa,
      ENTREGADOR: `${novoLote.entregadorNome} (${ent.documento})`,
      QTD_VOLUMES: novoLote.quantidadeDeclarada,
      OPERADOR: `${operadorAtivo.codigo} - ${operadorAtivo.nome}`,
      DATA_HORA: novoLote.dataHora
    });

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, textoWhats);
      window.open(url, '_blank');
    }
  };

  // Seleção de Unidade / Morador na Triagem com Checagem de Agrupamento
  const handleSelecionarMorador = (m: Morador) => {
    setMoradorSelecionado(m);
    setUnidadeBusca(m.unidade);

    // Checagem de agrupamento físico
    const pacotesAnteriores = itensRetidos.filter(
      (item) => item.unidade.toLowerCase() === m.unidade.toLowerCase()
    );

    if (pacotesAnteriores.length > 0) {
      audioAlert.playGroupingAlert();
      setAlertaAgrupamento({
        count: pacotesAnteriores.length,
        unidade: m.unidade,
        pacotes: pacotesAnteriores
      });
      // Sugere automaticamente o mesmo local de armazenamento já utilizado
      if (pacotesAnteriores[0]?.localArmazenamento) {
        setLocalArmazenamento(pacotesAnteriores[0].localArmazenamento);
      }
    } else {
      setAlertaAgrupamento(null);
    }
  };

  // 2ª ETAPA: Salvar Pacote Triado
  const handleSalvarPacote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moradorSelecionado || !loteSelecionadoId) return;

    const loteAtual = lotes.find((l) => l.id === loteSelecionadoId);
    const fotoFinal = fotoEtiquetaUrl || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60';

    const novoItem: ItemEncomenda = {
      id: `enc_${Date.now()}`,
      loteId: loteSelecionadoId,
      codigoRE: loteAtual?.codigoRE || 'REAVULSO',
      condominioId: condominioAtivo.id,
      unidade: moradorSelecionado.unidade,
      moradorId: moradorSelecionado.id,
      moradorNome: moradorSelecionado.nomeCompleto,
      moradorWhatsapp: moradorSelecionado.whatsapp,
      codigoRastreio: codigoRastreio || `COD-${Date.now().toString().slice(-6)}`,
      fotoEtiquetaUrl: fotoFinal,
      localArmazenamento: localArmazenamento,
      observacoes: observacaoAvaria,
      status: 'retido',
      dataRecebimento: new Date().toLocaleString('pt-BR'),
      operadorRecebimentoNome: operadorAtivo.nome
    };

    onAddItemEncomenda(novoItem);
    audioAlert.playSuccessBeep();

    // Disparo de notificação individual para o morador via WhatsApp com Local Armazenado
    const textoMorador = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.ENCOMENDA_DISPONIVEL, {
      UNIDADE: novoItem.unidade,
      MORADOR: novoItem.moradorNome,
      CONDOMINIO: condominioAtivo.nome,
      EMPRESA: loteAtual?.empresa || 'Transportadora',
      LOTE_RE: novoItem.codigoRE,
      LOCAL: localArmazenamento,
      OBSERVACOES: observacaoAvaria || 'Em perfeito estado na portaria',
      OPERADOR: operadorAtivo.nome,
      DATA_HORA: novoItem.dataRecebimento,
      LINK_FOTO: formatWhatsAppPhotoLink(fotoFinal)
    });

    if (novoItem.moradorWhatsapp) {
      const url = buildWhatsAppDeepLink(novoItem.moradorWhatsapp, textoMorador);
      window.open(url, '_blank');
    }

    // Reset para o próximo pacote do lote
    setMoradorSelecionado(null);
    setUnidadeBusca('');
    setCodigoRastreio('');
    setObservacaoAvaria('');
    setFotoEtiquetaUrl('');
    setAlertaAgrupamento(null);
  };

  // 3ª ETAPA: Baixa de Encomendas Selecionadas
  const handleEfetivarBaixa = () => {
    if (itensSelecionadosParaBaixa.length === 0 || !retiranteNome) return;

    const fotoFinal = fotoComprovanteUrl || 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=500&auto=format&fit=crop&q=60';
    onBaixaItens(itensSelecionadosParaBaixa, retiranteNome, fotoFinal);
    audioAlert.playSuccessBeep();

    // Notificação Cruzada para o morador titular
    const primeiroItem = itensEncomenda.find((i) => i.id === itensSelecionadosParaBaixa[0]);
    if (primeiroItem && primeiroItem.moradorWhatsapp) {
      const textoCruzado = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.CONFIRMACAO_RETIRADA, {
        CONDOMINIO: condominioAtivo.nome,
        UNIDADE: primeiroItem.unidade,
        QTD_RETIRADA: itensSelecionadosParaBaixa.length,
        RETIRANTE: retiranteNome,
        LINK_FOTO: formatWhatsAppPhotoLink(fotoFinal),
        OPERADOR: `${operadorAtivo.codigo} - ${operadorAtivo.nome}`,
        DATA_HORA: new Date().toLocaleString('pt-BR')
      });

      const url = buildWhatsAppDeepLink(primeiroItem.moradorWhatsapp, textoCruzado);
      window.open(url, '_blank');
    }

    setItensSelecionadosParaBaixa([]);
    setRetiranteNome('');
    setFotoComprovanteUrl('');
    setBaixaUnidadeBusca('');
  };

  // Moradores da unidade selecionada na baixa para facilitar seleção rápida
  const primeiroItemSelecionado = itensRetidos.find((i) => itensSelecionadosParaBaixa.includes(i.id));
  const moradoresDaUnidadeSelecionada = primeiroItemSelecionado
    ? moradores.filter(
        (m) =>
          m.condominioId === condominioAtivo.id &&
          m.unidade.toLowerCase() === primeiroItemSelecionado.unidade.toLowerCase()
      )
    : [];

  const loteAtivo = lotes.find((l) => l.id === loteSelecionadoId);

  return (
    <div className="space-y-4">
      {/* CABEÇALHO DO MÓDULO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
              ENCOMENDAS & LOTES RE
            </span>
            <span className="text-xs text-slate-400">
              Retidos na Guarita: <strong className="text-amber-400 font-bold">{itensRetidos.length} pacotes</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Recepção rápida de transportadoras, triagem por bloco/unidade e baixa com notificação instantânea no WhatsApp.
          </p>
        </div>

        <button
          onClick={() => setModalNovoLote(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-amber-950/40 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Novo Lote (RE)
        </button>
      </div>

      {/* SELETOR DE ETAPAS */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setEtapa('lotes')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            etapa === 'lotes'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lotes RE ({lotesDoCondominio.length})</span>
        </button>

        <button
          onClick={() => setEtapa('triagem')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            etapa === 'triagem'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Triagem & Guardar</span>
        </button>

        <button
          onClick={() => setEtapa('baixa')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            etapa === 'baixa'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Saída / Baixa ({itensRetidos.length})</span>
        </button>
      </div>

      {/* ---------------- 1ª ETAPA: LISTA DE LOTES RE ---------------- */}
      {etapa === 'lotes' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lotesDoCondominio.map((lote) => {
              const pacotesDoLote = itensEncomenda.filter((i) => i.loteId === lote.id);
              return (
                <div
                  key={lote.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
                      {lote.codigoRE}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        lote.status === 'concluido'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/60 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {lote.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-400" /> {lote.empresa}
                    </h3>
                    <p className="text-xs text-slate-400">Entregador: {lote.entregadorNome}</p>
                  </div>

                  <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
                    <span>Declarados: <strong className="text-slate-200">{lote.quantidadeDeclarada}</strong></span>
                    <span>Triados: <strong className="text-amber-400">{pacotesDoLote.length}</strong></span>
                  </div>

                  <button
                    onClick={() => {
                      setLoteSelecionadoId(lote.id);
                      setEtapa('triagem');
                    }}
                    className="w-full mt-2 py-2 bg-slate-800 hover:bg-amber-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Continuar Triando Este Lote</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------- 2ª ETAPA: TRIAGEM COM LOCAL DE ARMAZENAMENTO & BLOCO ---------------- */}
      {etapa === 'triagem' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-amber-400" />
                  Triagem Rápida de Encomenda
                </h2>
                <p className="text-xs text-slate-400">
                  Lote Ativo: <strong className="text-amber-400 font-mono">{loteAtivo?.codigoRE || 'Nenhum lote'}</strong> ({loteAtivo?.empresa})
                </p>
              </div>

              <select
                value={loteSelecionadoId}
                onChange={(e) => setLoteSelecionadoId(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              >
                {lotesDoCondominio.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.codigoRE} — {l.empresa}
                  </option>
                ))}
              </select>
            </div>

            {/* ALERTA DE AGRUPAMENTO FÍSICO COM O LOCAL EXATO */}
            {alertaAgrupamento && (
              <div className="p-3.5 bg-amber-950/70 border border-amber-500 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                    <span>ALERTA DE AGRUPAMENTO NA PORTARIA</span>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-900/60 px-2 py-0.5 rounded border border-amber-600/40">
                    {alertaAgrupamento.count} pacote(s) pendente(s)
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  A unidade <strong>{alertaAgrupamento.unidade}</strong> já possui{' '}
                  <strong className="text-amber-400 underline">{alertaAgrupamento.count} pacote(s) retido(s)</strong> na guarita.
                  Agrupe este novo pacote no mesmo local físico:
                </p>

                {/* Lista dos locais onde os pacotes existentes estão armazenados */}
                <div className="space-y-1.5 pt-1">
                  {alertaAgrupamento.pacotes?.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="flex items-center justify-between gap-2 p-2 bg-slate-900/90 rounded-lg border border-amber-600/30 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 font-mono text-[11px]">{p.codigoRE}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-300 font-mono text-[11px] truncate">
                          {p.codigoRastreio}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          {p.localArmazenamento}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (p.localArmazenamento) {
                              setLocalArmazenamento(p.localArmazenamento);
                            }
                          }}
                          className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded transition-all active:scale-95"
                          title="Usar este mesmo local para o pacote atual"
                        >
                          Usar Este Local
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSalvarPacote} className="space-y-3.5">
              {/* Leitura de Código / Rastreio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Código de Rastreio / Etiqueta *
                  </label>
                  <button
                    type="button"
                    onClick={() => setModalCameraScanner(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all active:scale-95"
                  >
                    <Camera className="w-3.5 h-3.5" /> Ler com a Câmera
                  </button>
                </div>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Bipe com leitor USB, digite ou use a câmera..."
                    value={codigoRastreio}
                    onChange={(e) => setCodigoRastreio(e.target.value)}
                    className="w-full pl-9 pr-24 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setModalCameraScanner(true)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Camera className="w-3 h-3 text-emerald-400" /> Câmera
                  </button>
                </div>
              </div>

              {/* SELEÇÃO DE BLOCO PRIMEIRO E DEPOIS UNIDADE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {condominioAtivo.tipoEstrutura === 'Casas/Quadras' ? 'Quadra / Rua' : 'Bloco / Torre'}
                  </label>
                  <select
                    value={blocoFiltro}
                    onChange={(e) => setBlocoFiltro(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="todos">Todos os Blocos</option>
                    {blocosCondominio.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unidade Destinatária / Morador *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Digite número da unidade (ex: 102)..."
                    value={unidadeBusca}
                    onChange={(e) => {
                      setUnidadeBusca(e.target.value);
                      setMoradorSelecionado(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              {/* Sugestões Rápidas de Moradores da Unidade / Bloco */}
              {unidadeBusca.length >= 1 && !moradorSelecionado && (
                <div className="p-2 bg-slate-850 border border-slate-700 rounded-xl max-h-36 overflow-y-auto space-y-1">
                  {moradores
                    .filter(
                      (m) =>
                        m.condominioId === condominioAtivo.id &&
                        (blocoFiltro === 'todos' || m.unidade.toLowerCase().includes(blocoFiltro.toLowerCase())) &&
                        (m.unidade.toLowerCase().includes(unidadeBusca.toLowerCase()) ||
                          m.nomeCompleto.toLowerCase().includes(unidadeBusca.toLowerCase()))
                    )
                    .map((morador) => (
                      <button
                        key={morador.id}
                        type="button"
                        onClick={() => handleSelecionarMorador(morador)}
                        className="w-full p-2 text-left bg-slate-800 hover:bg-amber-950/50 hover:border-amber-500/50 border border-transparent rounded-lg flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <span className="font-bold text-amber-400">{morador.unidade}</span>
                          <span className="text-white ml-2">{morador.nomeCompleto}</span>
                          <span className="text-slate-400 text-[10px] ml-2 font-mono">({morador.tipoVinculo})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {morador.whatsapp}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {moradorSelecionado && (
                <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-emerald-400">
                      {moradorSelecionado.unidade} — {moradorSelecionado.nomeCompleto}
                    </p>
                    <p className="text-slate-400 font-mono text-[11px]">
                      WhatsApp Destino: +55 {moradorSelecionado.whatsapp}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoradorSelecionado(null)}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    Alterar
                  </button>
                </div>
              )}

              {/* LOCAL DE ARMAZENAMENTO EXIGIDO NA ESPECIFICAÇÃO */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  Local Onde a Encomenda Foi Armazenada *
                </label>
                <select
                  value={localArmazenamento}
                  onChange={(e) => setLocalArmazenamento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                >
                  {locaisDisponiveis.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>Este local exato será informado na notificação do morador.</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Gerenciável em Cadastros</span>
                </div>
              </div>

              {/* Foto da Etiqueta */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Foto da Etiqueta / Pacote
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFotoTarget('triagem');
                      setFotoModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    {fotoEtiquetaUrl ? 'Trocar Foto da Etiqueta' : 'Capturar Foto da Etiqueta'}
                  </button>
                  {fotoEtiquetaUrl && (
                    <img
                      src={fotoEtiquetaUrl}
                      alt="Etiqueta"
                      className="w-10 h-10 rounded-lg object-cover border border-emerald-500 shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Observação / Avarias */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações de Avarias (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pacote amassado, rasgado ou violado..."
                  value={observacaoAvaria}
                  onChange={(e) => setObservacaoAvaria(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={!moradorSelecionado}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> Salvar Pacote & Enviar WhatsApp ao Morador
              </button>
            </form>
          </div>

          {/* Lateral: Pacotes Já Retidos da Unidade ou Recentes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pacotes Retidos na Portaria ({itensRetidos.length})
            </h3>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {itensRetidos.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1.5 text-xs hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-400">{item.unidade}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.codigoRE}</span>
                      </div>
                      <p className="text-white font-medium truncate">{item.moradorNome}</p>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <MapPin className="w-3 h-3" />
                        <span>{item.localArmazenamento || 'Bancada'}</span>
                      </div>
                    </div>

                    {item.fotoEtiquetaUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFotoVisualizarUrl(item.fotoEtiquetaUrl);
                          setFotoVisualizarTitulo(`Etiqueta - Unidade ${item.unidade} (${item.codigoRE})`);
                        }}
                        className="relative group shrink-0 w-11 h-11 rounded-lg overflow-hidden border border-slate-700 hover:border-emerald-500 bg-black cursor-pointer shadow"
                        title="Ver foto da etiqueta"
                      >
                        <img
                          src={item.fotoEtiquetaUrl}
                          alt="Etiqueta"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-80 group-hover:opacity-100">
                          <Eye className="w-3.5 h-3.5 text-white" />
                        </div>
                      </button>
                    )}
                  </div>
                  {item.observacoes && (
                    <p className="text-[11px] text-rose-300 italic">{item.observacoes}</p>
                  )}
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-750">
                    <span>{item.dataRecebimento}</span>
                    {item.moradorWhatsapp && (
                      <a
                        href={buildWhatsAppDeepLink(
                          item.moradorWhatsapp,
                          `Lembrete da portaria ${condominioAtivo.nome}: sua encomenda (${item.codigoRE}) aguarda retirada no local: ${item.localArmazenamento || 'Guarita'}.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 font-bold hover:underline flex items-center gap-0.5"
                      >
                        <MessageSquare className="w-3 h-3" /> Lembrar
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {itensRetidos.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhum pacote retido.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3ª ETAPA: SAÍDA / BAIXA COM LISTAGEM DE MORADORES ---------------- */}
      {etapa === 'baixa' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Retirada e Baixa de Encomendas
            </h2>
            <span className="text-xs text-slate-400">
              {itensSelecionadosParaBaixa.length} pacote(s) selecionado(s)
            </span>
          </div>

          {/* Busca por Unidade */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Digite a unidade para filtrar pacotes retidos (ex: 102)..."
              value={baixaUnidadeBusca}
              onChange={(e) => setBaixaUnidadeBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
            />
          </div>

          {/* Lista de Pacotes Disponíveis para Baixa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {itensRetidos
              .filter((item) =>
                item.unidade.toLowerCase().includes(baixaUnidadeBusca.toLowerCase())
              )
              .map((item) => {
                const selecionado = itensSelecionadosParaBaixa.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (selecionado) {
                        setItensSelecionadosParaBaixa(
                          itensSelecionadosParaBaixa.filter((id) => id !== item.id)
                        );
                      } else {
                        setItensSelecionadosParaBaixa([...itensSelecionadosParaBaixa, item.id]);
                      }
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selecionado
                        ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-xs text-emerald-400">{item.unidade}</span>
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => {}}
                        className="rounded accent-emerald-500"
                      />
                    </div>
                    <p className="text-xs font-bold text-white truncate">{item.moradorNome}</p>
                    <p className="text-[11px] text-amber-400 font-medium">Local: {item.localArmazenamento || 'Bancada'}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.codigoRE}</p>
                  </div>
                );
              })}
          </div>

          {/* Painel de Baixa quando houver itens selecionados */}
          {itensSelecionadosParaBaixa.length > 0 && (
            <div className="p-4 bg-slate-800/90 border border-emerald-500/50 rounded-xl space-y-3 mt-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Dados do Retirante ({itensSelecionadosParaBaixa.length} pacotes selecionados)
              </h3>

              {/* LISTAGEM DE MORADORES DA UNIDADE PARA BAIXA RÁPIDA (REQUISITO EXPLÍCITO) */}
              {moradoresDaUnidadeSelecionada.length > 0 && (
                <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Moradores cadastrados nesta unidade (Clique para preencher rápido):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {moradoresDaUnidadeSelecionada.map((morador) => (
                      <button
                        key={morador.id}
                        type="button"
                        onClick={() => setRetiranteNome(morador.nomeCompleto)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                          retiranteNome === morador.nomeCompleto
                            ? 'bg-emerald-600 text-white shadow'
                            : 'bg-slate-750 text-slate-200 hover:bg-slate-700 border border-slate-650'
                        }`}
                      >
                        <User className="w-3 h-3 text-emerald-400" />
                        <span>{morador.nomeCompleto}</span>
                        <span className="text-[10px] text-slate-400">({morador.tipoVinculo})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome de Quem Está Retirando *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Selecione acima ou digite (ex: Filho Pedro, Diarista Maria)..."
                    value={retiranteNome}
                    onChange={(e) => setRetiranteNome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Foto Obrigatória com o Pacote em Mãos
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFotoTarget('baixa');
                      setFotoModalOpen(true);
                    }}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    {fotoComprovanteUrl ? 'Foto Capturada ✓' : 'Tirar Foto do Retirante'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEfetivarBaixa}
                disabled={!retiranteNome}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirmar Baixa & Disparo de Notificação Cruzada
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL NOVO LOTE (RE) COM LISTAGEM DE ENTREGADORES JÁ CADASTRADOS */}
      {modalNovoLote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              Novo Recebimento de Entrega (Lote RE)
            </h2>

            <form onSubmit={handleCriarLote} className="space-y-3">
              {/* LISTAGEM DE ENTREGADORES JÁ CADASTRADOS */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Selecionar Entregador Cadastrado ou Novo *
                </label>
                <select
                  value={entregadorSelecionadoId}
                  onChange={(e) => handleSelectEntregador(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="novo">+ Cadastrar Novo Entregador</option>
                  {entregadores.map((ent) => {
                    const totalLotes = lotes.filter((l) => l.entregadorNome.toLowerCase() === ent.nome.toLowerCase()).length;
                    return (
                      <option key={ent.id} value={ent.id}>
                        {ent.nome} ({ent.empresa}) — {totalLotes} entrega(s) anteriores
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Empresa / Transportadora *
                </label>
                <select
                  value={entregadorEmpresa}
                  onChange={(e) => setEntregadorEmpresa(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Mercado Livre">Mercado Livre</option>
                  <option value="Shopee">Shopee</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Loggi">Loggi</option>
                  <option value="Correios">Correios</option>
                  <option value="iFood">iFood</option>
                  <option value="Total Express">Total Express</option>
                  <option value="Jadlog">Jadlog</option>
                  <option value="Outra">Outra Transportadora</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Entregador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marcos Antônio Silva"
                  value={entregadorNome}
                  onChange={(e) => setEntregadorNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Documento (RG ou CPF do Entregador)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 783.871.847-76"
                  value={entregadorDoc}
                  onChange={(e) => setEntregadorDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Total de Volumes Declarados pelo Entregador *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  required
                  value={qtdVolumesDeclarados}
                  onChange={(e) => setQtdVolumesDeclarados(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoLote(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40"
                >
                  Criar Lote & Iniciar Triagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FOTO */}
      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        presetTheme={fotoTarget === 'triagem' ? 'etiqueta' : 'entrega'}
        title={fotoTarget === 'triagem' ? 'Foto da Etiqueta da Encomenda' : 'Foto do Comprovante de Retirada'}
        subtitle="Compressão automática Canvas para ~150KB"
        onCapture={(url) => {
          if (fotoTarget === 'triagem') {
            setFotoEtiquetaUrl(url);
          } else {
            setFotoComprovanteUrl(url);
          }
        }}
      />

      {/* MODAL SCANNER DE CÓDIGO DE BARRAS / CÂMERA DO CELULAR */}
      <BarcodeScannerModal
        isOpen={modalCameraScanner}
        onClose={() => setModalCameraScanner(false)}
        title="Scanner de Código de Rastreio (Câmera)"
        onScan={(code) => {
          setCodigoRastreio(code);
        }}
      />

      {/* MODAL VISUALIZADOR DE FOTO EM ALTA RESOLUÇÃO */}
      <PhotoViewerModal
        isOpen={Boolean(fotoVisualizarUrl)}
        onClose={() => setFotoVisualizarUrl(null)}
        photoUrl={fotoVisualizarUrl || ''}
        title={fotoVisualizarTitulo}
      />
    </div>
  );
};
