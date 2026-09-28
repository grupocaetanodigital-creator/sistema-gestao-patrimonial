import React, { useState, useMemo } from 'react';
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
  ImageIcon,
  History,
  Download,
  Printer,
  FileCheck,
  ShieldCheck,
  Calendar,
  X
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
  onBaixaItens: (ids: string[], retiranteNome: string, fotoUrl: string, retiranteDocumento?: string) => void;
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
  const [etapa, setEtapa] = useState<'lotes' | 'triagem' | 'baixa' | 'historico_retiradas'>('triagem');
  const [buscaHistoricoRetiradas, setBuscaHistoricoRetiradas] = useState('');
  const [filtroPeriodoRetiradas, setFiltroPeriodoRetiradas] = useState<'todos' | 'hoje' | '7dias' | '30dias'>('todos');
  const [apenasComFotoRetirada, setApenasComFotoRetirada] = useState(false);
  const [itemContestacaoModal, setItemContestacaoModal] = useState<ItemEncomenda | null>(null);

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
  const [retiranteDocumento, setRetiranteDocumento] = useState('');
  const [fotoComprovanteUrl, setFotoComprovanteUrl] = useState('');
  const [fotoVisualizarUrl, setFotoVisualizarUrl] = useState<string | null>(null);
  const [fotoVisualizarTitulo, setFotoVisualizarTitulo] = useState<string>('');

  // Itens retidos no condomínio ativo
  const itensRetidos = itensEncomenda.filter(
    (i) => i.condominioId === condominioAtivo.id && i.status === 'retido'
  );

  // Itens entregues / histórico de retiradas para auditoria e contestação
  const todosItensEntreguesCondominio = useMemo(() => {
    return itensEncomenda.filter(
      (i) => i.condominioId === condominioAtivo.id && i.status === 'entregue'
    );
  }, [itensEncomenda, condominioAtivo.id]);

  const itensEntreguesFiltrados = useMemo(() => {
    return todosItensEntreguesCondominio
      .filter((item) => {
        // Filtro por foto de comprovação
        if (apenasComFotoRetirada && !item.fotoComprovanteUrl) {
          return false;
        }

        // Filtro por período
        if (filtroPeriodoRetiradas !== 'todos') {
          const dtStr = item.dataEntrega || '';
          const match = dtStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (match) {
            const [, d, m, a] = match;
            const dtEntrega = new Date(Number(a), Number(m) - 1, Number(d));
            const agora = new Date();
            agora.setHours(0, 0, 0, 0);

            if (filtroPeriodoRetiradas === 'hoje') {
              if (dtEntrega.getTime() !== agora.getTime()) return false;
            } else if (filtroPeriodoRetiradas === '7dias') {
              const limite7 = new Date();
              limite7.setDate(limite7.getDate() - 7);
              limite7.setHours(0, 0, 0, 0);
              if (dtEntrega < limite7) return false;
            } else if (filtroPeriodoRetiradas === '30dias') {
              const limite30 = new Date();
              limite30.setDate(limite30.getDate() - 30);
              limite30.setHours(0, 0, 0, 0);
              if (dtEntrega < limite30) return false;
            }
          }
        }

        // Filtro por busca textual (CPF, Rastreio, Unidade, Morador, Retirante, Lote RE)
        if (buscaHistoricoRetiradas.trim()) {
          const q = buscaHistoricoRetiradas.toLowerCase().trim();
          const matchUnidade = item.unidade.toLowerCase().includes(q);
          const matchMorador = (item.moradorNome || '').toLowerCase().includes(q);
          const matchRetirante = (item.retiranteNome || '').toLowerCase().includes(q);
          const matchDoc = (item.retiranteDocumento || '').toLowerCase().includes(q);
          const matchRastreio = (item.codigoRastreio || '').toLowerCase().includes(q);
          const matchRE = (item.codigoRE || '').toLowerCase().includes(q);
          const matchDataEntrega = (item.dataEntrega || '').toLowerCase().includes(q);
          const matchDataRecebimento = (item.dataRecebimento || '').toLowerCase().includes(q);
          const matchOp = (item.operadorEntregaNome || '').toLowerCase().includes(q);

          return (
            matchUnidade ||
            matchMorador ||
            matchRetirante ||
            matchDoc ||
            matchRastreio ||
            matchRE ||
            matchDataEntrega ||
            matchDataRecebimento ||
            matchOp
          );
        }
        return true;
      })
      .sort((a, b) => {
        return (b.dataEntrega || '').localeCompare(a.dataEntrega || '');
      });
  }, [todosItensEntreguesCondominio, filtroPeriodoRetiradas, buscaHistoricoRetiradas, apenasComFotoRetirada]);

  const handleExportarRetiradasCsv = () => {
    if (itensEntreguesFiltrados.length === 0) return;
    const header = [
      'Condomínio',
      'Unidade',
      'Morador Destinatário',
      'Código RE',
      'Código de Rastreio',
      'Local Armazenado',
      'Data Recebimento',
      'Operador Recebimento',
      'Data/Hora Entrega',
      'Nome do Retirante',
      'Documento/CPF Retirante',
      'Operador da Entrega',
      'Possui Foto Comprovante'
    ];
    const rows = itensEntreguesFiltrados.map((i) => [
      condominioAtivo.nome,
      i.unidade,
      i.moradorNome || '',
      i.codigoRE,
      i.codigoRastreio || '',
      i.localArmazenamento || '',
      i.dataRecebimento,
      i.operadorRecebimentoNome,
      i.dataEntrega || '',
      i.retiranteNome || '',
      i.retiranteDocumento || '',
      i.operadorEntregaNome || '',
      i.fotoComprovanteUrl ? 'SIM' : 'NÃO'
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [header.join(';'), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `encomendas_retiradas_${condominioAtivo.codigo}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
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

        <button
          onClick={() => setEtapa('historico_retiradas')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            etapa === 'historico_retiradas'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Retiradas / Contestação ({todosItensEntreguesCondominio.length})</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    CPF ou RG do Retirante <span className="text-slate-500 font-normal">(Opcional / Contestação)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Digite CPF ou Doc (ex: 123.456.789-00)..."
                    value={retiranteDocumento}
                    onChange={(e) => setRetiranteDocumento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
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

      {/* ---------------- 4ª ETAPA: HISTÓRICO DE RETIRADAS & CONTESTAÇÃO DE ENCOMENDAS ---------------- */}
      {etapa === 'historico_retiradas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Header da Aba de Histórico de Retiradas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> AUDITORIA DE RETIRADAS & CONTESTAÇÃO
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Posto: <strong className="text-white">{condominioAtivo.nome}</strong>
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1">
                Histórico de Encomendas Entregues ({todosItensEntreguesCondominio.length} Registros)
              </h2>
              <p className="text-xs text-slate-400">
                Consulta instantânea de pacotes retirados com foto de comprovação, CPF/Documento do retirante e emissão de termo para contestações.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportarRetiradasCsv}
                disabled={itensEntreguesFiltrados.length === 0}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-white border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Exportar dados para planilha Excel / CSV"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>
          </div>

          {/* ESTATÍSTICAS RÁPIDAS DE RETIRADA */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-750">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Entregues</span>
              <p className="text-lg font-black text-white mt-0.5">{todosItensEntreguesCondominio.length}</p>
              <span className="text-[10px] text-slate-500">Histórico no posto</span>
            </div>
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-750">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Entregues Hoje</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">
                {todosItensEntreguesCondominio.filter((i) => (i.dataEntrega || '').includes(new Date().toLocaleDateString('pt-BR'))).length}
              </p>
              <span className="text-[10px] text-slate-500">Baixas do dia</span>
            </div>
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-750">
              <span className="text-[10px] text-blue-400 font-semibold uppercase block">Com Foto / Comprovante</span>
              <p className="text-lg font-black text-blue-400 mt-0.5">
                {todosItensEntreguesCondominio.filter((i) => Boolean(i.fotoComprovanteUrl)).length}
              </p>
              <span className="text-[10px] text-slate-500">Comprovação registrada</span>
            </div>
            <div className="bg-slate-850 p-3 rounded-xl border border-slate-750">
              <span className="text-[10px] text-amber-400 font-semibold uppercase block">Retidos na Guarita</span>
              <p className="text-lg font-black text-amber-400 mt-0.5">{itensRetidos.length}</p>
              <span className="text-[10px] text-slate-500">Aguardando retirada</span>
            </div>
          </div>

          {/* BARRA DE FILTROS & BUSCA ESPECÍFICA PARA CONTESTAÇÕES */}
          <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 space-y-2.5">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por CPF / Documento, Rastreio, Unidade, Destinatário, Lote RE ou Retirante..."
                  value={buscaHistoricoRetiradas}
                  onChange={(e) => setBuscaHistoricoRetiradas(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {buscaHistoricoRetiradas && (
                  <button
                    type="button"
                    onClick={() => setBuscaHistoricoRetiradas('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Seletor de Período */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700 shrink-0">
                {(['todos', 'hoje', '7dias', '30dias'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFiltroPeriodoRetiradas(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      filtroPeriodoRetiradas === p
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p === 'todos' ? 'Todos' : p === 'hoje' ? 'Hoje' : p === '7dias' ? '7 Dias' : '30 Dias'}
                  </button>
                ))}
              </div>

              {/* Toggle apenas com foto */}
              <button
                type="button"
                onClick={() => setApenasComFotoRetirada(!apenasComFotoRetirada)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                  apenasComFotoRetirada
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Apenas c/ Foto</span>
              </button>
            </div>
          </div>

          {/* LISTA DE ENCOMENDAS ENTREGUES */}
          {itensEntreguesFiltrados.length === 0 ? (
            <div className="p-8 text-center bg-slate-850 rounded-xl border border-slate-800 space-y-2">
              <Package className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-300">Nenhuma encomenda entregue encontrada com estes filtros.</p>
              <p className="text-[11px] text-slate-500">
                Tente ajustar a busca ou período. Todas as baixas realizadas no sistema aparecem aqui para conferência.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {itensEntreguesFiltrados.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-850 border border-slate-750 hover:border-emerald-500/50 rounded-xl p-3.5 space-y-3 transition-all shadow group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {item.unidade}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                          ENTREGUE ✓
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-200 mt-1 truncate max-w-[200px]">
                        {item.moradorNome || 'Destinatário'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Miniatura da Foto da Etiqueta */}
                      {item.fotoEtiquetaUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFotoVisualizarUrl(item.fotoEtiquetaUrl);
                            setFotoVisualizarTitulo(`Etiqueta: ${item.unidade} - ${item.codigoRE}`);
                          }}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-400 bg-black shrink-0 relative group/pic"
                          title="Ver Foto da Etiqueta"
                        >
                          <img src={item.fotoEtiquetaUrl} alt="Etiqueta" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/pic:opacity-100">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      )}

                      {/* Miniatura da Foto de Retirada */}
                      {item.fotoComprovanteUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setFotoVisualizarUrl(item.fotoComprovanteUrl!);
                            setFotoVisualizarTitulo(`Comprovante de Retirada: ${item.retiranteNome}`);
                          }}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/50 hover:border-emerald-400 bg-black shrink-0 relative group/pic"
                          title="Ver Foto do Retirante / Pacote entregue"
                        >
                          <img src={item.fotoComprovanteUrl} alt="Retirante" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/pic:opacity-100">
                            <Eye className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Informações de Rastreio e RE */}
                  <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 text-[11px] space-y-1 font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Rastreio:</span>
                      <strong className="text-amber-300 select-all truncate max-w-[150px]">
                        {item.codigoRastreio || 'Sem rastreio'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Lote RE:</span>
                      <span className="text-slate-300">{item.codigoRE}</span>
                    </div>
                  </div>

                  {/* Detalhes da Baixa / Retirada */}
                  <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-400" /> Retirado por:
                      </span>
                      <strong className="text-white truncate max-w-[170px]">
                        {item.retiranteNome || 'Morador'}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Entregue em:</span>
                      <strong className="text-emerald-400">{item.dataEntrega}</strong>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Operador:</span>
                      <span>{item.operadorEntregaNome || 'Portaria'}</span>
                    </div>
                  </div>

                  {/* Botões de Contestação */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setItemContestacaoModal(item)}
                      className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all shadow active:scale-95 cursor-pointer"
                    >
                      <FileCheck className="w-3.5 h-3.5" /> Termo / Contestação
                    </button>

                    {item.moradorWhatsapp && (
                      <a
                        href={buildWhatsAppDeepLink(
                          item.moradorWhatsapp,
                          `📦 *COMPROVANTE DE ENTREGA DE ENCOMENDA*\nCondomínio: ${condominioAtivo.nome}\nUnidade: ${item.unidade} - ${item.moradorNome}\n\n• Rastreio: ${item.codigoRastreio || item.codigoRE}\n• Retirado por: ${item.retiranteNome}\n• Data/Hora da Entrega: ${item.dataEntrega}\n• Operador: ${item.operadorEntregaNome || operadorAtivo.nome}\n\nComprovante registrado no sistema de segurança da portaria.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-750 rounded-lg text-xs font-bold transition-all"
                        title="Enviar comprovante direto para o WhatsApp do morador"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
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

      {/* MODAL TERMO OFICIAL DE RETIRADA / COMPROVANTE PARA CONTESTAÇÃO */}
      {itemContestacaoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">
                    Termo de Retirada & Comprovante de Entrega
                  </h2>
                  <p className="text-xs text-slate-400">
                    Registro auditado para segurança patrimonial e contestação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemContestacaoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-750 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Condomínio</span>
                  <p className="font-bold text-white text-sm">{condominioAtivo.nome} ({condominioAtivo.codigo})</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Status Oficial</span>
                  <span className="block px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-emerald-950/80 border border-emerald-500/50 text-emerald-300">
                    ✓ ENTREGUE / BAIXADO
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Destinatário Oficial</span>
                  <p className="font-bold text-white text-sm">{itemContestacaoModal.moradorNome || 'Não especificado'}</p>
                  <p className="text-slate-300 font-semibold">Unidade: {itemContestacaoModal.unidade}</p>
                  {itemContestacaoModal.moradorWhatsapp && (
                    <p className="text-slate-400 font-mono text-[11px]">WhatsApp: {itemContestacaoModal.moradorWhatsapp}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Códigos de Rastreio & Lote</span>
                  <p className="font-mono text-amber-300 font-bold">{itemContestacaoModal.codigoRastreio || 'Sem rastreio'}</p>
                  <p className="font-mono text-slate-300">Lote: {itemContestacaoModal.codigoRE}</p>
                  <p className="text-slate-400">Local na Triagem: {itemContestacaoModal.localArmazenamento || 'Guarita'}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    Pessoa que Retirou na Portaria:
                  </span>
                  <span className="font-black text-emerald-400 text-sm">
                    {itemContestacaoModal.retiranteNome || 'Assinatura / Baixa Portaria'}
                  </span>
                </div>

                {itemContestacaoModal.retiranteDocumento && (
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="text-slate-400">CPF / Documento:</span>
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {itemContestacaoModal.retiranteDocumento}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-400">Entrada na Guarita:</span>
                    <p className="font-semibold text-slate-200">{itemContestacaoModal.dataRecebimento}</p>
                    <p className="text-[10px] text-slate-400">Por: {itemContestacaoModal.operadorRecebimentoNome}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Saída / Entrega Efetiva:</span>
                    <p className="font-semibold text-emerald-400">{itemContestacaoModal.dataEntrega || 'Horário de registro'}</p>
                    <p className="text-[10px] text-slate-400">Operador: {itemContestacaoModal.operadorEntregaNome || operadorAtivo.nome}</p>
                  </div>
                </div>
              </div>

              {/* FOTOS DE COMPROVAÇÃO AUDITADA */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Fotos Anexadas para Comprovação (Auditoria)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Foto da Etiqueta:</span>
                    {itemContestacaoModal.fotoEtiquetaUrl ? (
                      <div
                        onClick={() => {
                          setFotoVisualizarUrl(itemContestacaoModal.fotoEtiquetaUrl);
                          setFotoVisualizarTitulo(`Etiqueta - Unidade ${itemContestacaoModal.unidade}`);
                        }}
                        className="h-28 rounded-xl overflow-hidden border border-slate-700 bg-black cursor-pointer group relative"
                      >
                        <img
                          src={itemContestacaoModal.fotoEtiquetaUrl}
                          alt="Etiqueta"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-slate-750 flex items-center justify-center text-slate-500 text-[11px]">
                        Sem foto
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Foto do Comprovante / Retirante:</span>
                    {itemContestacaoModal.fotoComprovanteUrl ? (
                      <div
                        onClick={() => {
                          setFotoVisualizarUrl(itemContestacaoModal.fotoComprovanteUrl!);
                          setFotoVisualizarTitulo(`Comprovante de Retirada - ${itemContestacaoModal.retiranteNome}`);
                        }}
                        className="h-28 rounded-xl overflow-hidden border border-emerald-500/40 bg-black cursor-pointer group relative"
                      >
                        <img
                          src={itemContestacaoModal.fotoComprovanteUrl}
                          alt="Comprovante"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 rounded-xl border border-dashed border-slate-750 flex items-center justify-center text-slate-500 text-[11px]">
                        Sem foto registrada na baixa
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÕES DE AÇÃO DO TERMO / CONTESTAÇÃO */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Imprimir Termo
              </button>

              <div className="flex items-center gap-2">
                {itemContestacaoModal.moradorWhatsapp && (
                  <a
                    href={buildWhatsAppDeepLink(
                      itemContestacaoModal.moradorWhatsapp,
                      `📋 *TERMO DE ENTREGA DE ENCOMENDA (COMPROVANTE)*\nCondomínio: ${condominioAtivo.nome}\nUnidade: ${itemContestacaoModal.unidade} - ${itemContestacaoModal.moradorNome}\n\n• Rastreio: ${itemContestacaoModal.codigoRastreio || itemContestacaoModal.codigoRE}\n• Retirado por: ${itemContestacaoModal.retiranteNome || 'Morador/Autorizado'}\n• Data/Hora da Entrega: ${itemContestacaoModal.dataEntrega}\n• Entregue pelo Operador: ${itemContestacaoModal.operadorEntregaNome || operadorAtivo.nome}\n\nRegistro formalizado e arquivado no sistema de portaria.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp do Morador
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setItemContestacaoModal(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
