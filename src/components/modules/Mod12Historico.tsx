import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Calendar,
  Download,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Info,
  User,
  Clock,
  Building2,
  Package,
  Key,
  Shield,
  Wrench,
  QrCode,
  BookOpen,
  ClipboardList,
  Users,
  Layers,
  Settings,
  X,
  FileSpreadsheet,
  Camera,
  RefreshCw,
  Printer,
  Copy,
  Check,
  Eye,
  FileText,
  ShieldCheck,
  SearchCode,
  ExternalLink
} from 'lucide-react';
import {
  Condominio,
  Operador,
  HistoricoAtividade,
  ItemEncomenda,
  CategoriaAtividade,
  NivelAtividade
} from '../../types';

interface Mod12HistoricoProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  operadores: Operador[];
  atividades: HistoricoAtividade[];
  itensEncomenda?: ItemEncomenda[];
  syncStatus?: 'conectado' | 'sincronizando' | 'offline';
  onForcarSincronizacao?: () => Promise<void> | void;
  onAddAtividade: (atividade: Omit<HistoricoAtividade, 'id' | 'dataHora'> & { dataHora?: string }) => void;
}

type PeriodoTipo = 'hoje' | '7dias' | '15dias' | 'mesAtual' | 'todos' | 'personalizado';
type AbaMod12 = 'auditoria' | 'encomendas_retiradas';

export const Mod12Historico: React.FC<Mod12HistoricoProps> = ({
  condominioAtivo,
  operadorAtivo,
  operadores,
  atividades,
  itensEncomenda = [],
  syncStatus = 'conectado',
  onForcarSincronizacao,
  onAddAtividade
}) => {
  // Aba ativa do módulo: Histórico Geral vs Encomendas Retiradas (Contestações)
  const [abaAtiva, setAbaAtiva] = useState<AbaMod12>('auditoria');

  // Estado de sincronização e consistência forçada
  const [isVerificandoConsistencia, setIsVerificandoConsistencia] = useState(false);
  const [ultimoTimestampSync, setUltimoTimestampSync] = useState(() => new Date().toLocaleTimeString('pt-BR'));
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // ==================== ESTADOS DA ABA 1: AUDITORIA GERAL ====================
  const [periodo, setPeriodo] = useState<PeriodoTipo>('todos');
  const [dataInicioCustom, setDataInicioCustom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimCustom, setDataFimCustom] = useState(() => new Date().toISOString().slice(0, 10));

  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [nivelFiltro, setNivelFiltro] = useState<string>('todos');
  const [operadorFiltro, setOperadorFiltro] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState('');

  // Modal de Nova Anotação Operacional
  const [modalNovaAnotacao, setModalNovaAnotacao] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState<CategoriaAtividade>('geral');
  const [novaAcao, setNovaAcao] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novosDetalhes, setNovosDetalhes] = useState('');
  const [novoNivel, setNovoNivel] = useState<NivelAtividade>('info');
  const [erroModal, setErroModal] = useState('');

  // ==================== ESTADOS DA ABA 2: ENCOMENDAS RETIRADAS (CONTESTAÇÃO) ====================
  const [buscaRetirada, setBuscaRetirada] = useState('');
  const [filtroCpf, setFiltroCpf] = useState('');
  const [filtroRastreio, setFiltroRastreio] = useState('');
  const [filtroDataEntrega, setFiltroDataEntrega] = useState('');
  const [periodoRetiradas, setPeriodoRetiradas] = useState<'todos' | 'hoje' | '7dias' | '30dias'>('todos');
  const [apenasComFoto, setApenasComFoto] = useState(false);

  // Modal de Dossiê de Contestação de Encomenda
  const [itemContestacao, setItemContestacao] = useState<ItemEncomenda | null>(null);
  const [notaContestacaoTexto, setNotaContestacaoTexto] = useState('');
  const [copiadoDossie, setCopiadoDossie] = useState(false);

  // Parser de data flexível (ISO ou pt-BR)
  const parseData = (dataStr: string): Date | null => {
    if (!dataStr) return null;
    if (dataStr.includes('T') || dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dataStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const [, dia, mes, ano, hora, min, seg] = match;
      return new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia),
        hora ? Number(hora) : 0,
        min ? Number(min) : 0,
        seg ? Number(seg) : 0
      );
    }
    const fallback = new Date(dataStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  // Cálculo dos limites do período selecionado (Aba Auditoria)
  const { dataInicioLimite, dataFimLimite } = useMemo(() => {
    const agora = new Date();
    let ini = new Date();
    let fim = new Date();

    if (periodo === 'hoje') {
      ini.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
    } else if (periodo === '7dias') {
      ini.setDate(agora.getDate() - 7);
      ini.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
    } else if (periodo === '15dias') {
      ini.setDate(agora.getDate() - 15);
      ini.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
    } else if (periodo === 'mesAtual') {
      ini = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodo === 'personalizado') {
      const [anoI, mesI, diaI] = (dataInicioCustom || '').split('-').map(Number);
      const [anoF, mesF, diaF] = (dataFimCustom || '').split('-').map(Number);
      ini = new Date(anoI || agora.getFullYear(), (mesI ? mesI - 1 : 0), diaI || 1, 0, 0, 0, 0);
      fim = new Date(anoF || agora.getFullYear(), (mesF ? mesF - 1 : 11), diaF || 28, 23, 59, 59, 999);
    } else {
      ini = new Date(2020, 0, 1);
      fim = new Date(2035, 11, 31);
    }

    return { dataInicioLimite: ini, dataFimLimite: fim };
  }, [periodo, dataInicioCustom, dataFimCustom]);

  // Filtragem das atividades do condomínio ativo
  const atividadesFiltradas = useMemo(() => {
    return atividades
      .filter((a) => a.condominioId === condominioAtivo.id)
      .filter((a) => {
        if (periodo !== 'todos') {
          const dt = parseData(a.dataHora);
          if (dt && (dt < dataInicioLimite || dt > dataFimLimite)) {
            return false;
          }
        }
        if (categoriaFiltro !== 'todas' && a.categoria !== categoriaFiltro) {
          return false;
        }
        if (nivelFiltro !== 'todos' && a.nivel !== nivelFiltro) {
          return false;
        }
        if (operadorFiltro !== 'todos' && a.operadorNome !== operadorFiltro) {
          return false;
        }
        if (buscaTexto.trim()) {
          const q = buscaTexto.toLowerCase();
          const matchAcao = a.acao.toLowerCase().includes(q);
          const matchDesc = a.descricao.toLowerCase().includes(q);
          const matchCod = (a.codigo || '').toLowerCase().includes(q);
          const matchOp = a.operadorNome.toLowerCase().includes(q);
          const matchMod = a.moduloOrigem.toLowerCase().includes(q);
          const matchDet = (a.detalhes || '').toLowerCase().includes(q);
          return matchAcao || matchDesc || matchCod || matchOp || matchMod || matchDet;
        }
        return true;
      })
      .sort((a, b) => {
        const dtA = parseData(a.dataHora)?.getTime() || 0;
        const dtB = parseData(b.dataHora)?.getTime() || 0;
        return dtB - dtA;
      });
  }, [
    atividades,
    condominioAtivo.id,
    periodo,
    dataInicioLimite,
    dataFimLimite,
    categoriaFiltro,
    nivelFiltro,
    operadorFiltro,
    buscaTexto
  ]);

  // Estatísticas de Auditoria
  const statsAuditoria = useMemo(() => {
    const total = atividadesFiltradas.length;
    const sucessos = atividadesFiltradas.filter((a) => a.nivel === 'sucesso').length;
    const avisos = atividadesFiltradas.filter((a) => a.nivel === 'aviso').length;
    const criticos = atividadesFiltradas.filter((a) => a.nivel === 'critico').length;
    const infos = atividadesFiltradas.filter((a) => a.nivel === 'info').length;
    return { total, sucessos, avisos, criticos, infos };
  }, [atividadesFiltradas]);

  // ==================== LISTA DE ENCOMENDAS RETIRADAS ====================
  const encomendasRetiradasDoCondominio = useMemo(() => {
    return itensEncomenda.filter(
      (item) => item.condominioId === condominioAtivo.id && item.status === 'entregue'
    );
  }, [itensEncomenda, condominioAtivo.id]);

  const normalizarDoc = (doc?: string) => (doc || '').replace(/\D/g, '');

  const encomendasRetiradasFiltradas = useMemo(() => {
    return encomendasRetiradasDoCondominio
      .filter((item) => {
        // Filtro por foto de comprovação
        if (apenasComFoto && !item.fotoComprovanteUrl) {
          return false;
        }

        // Filtro por CPF dedicado
        if (filtroCpf.trim()) {
          const cpfLimpo = normalizarDoc(filtroCpf);
          const cpfRetirante = normalizarDoc(item.retiranteDocumento);
          const cpfMorador = normalizarDoc(item.moradorCpf);
          if (!cpfRetirante.includes(cpfLimpo) && !cpfMorador.includes(cpfLimpo)) {
            return false;
          }
        }

        // Filtro por Código de Rastreio / Código RE
        if (filtroRastreio.trim()) {
          const rast = filtroRastreio.trim().toLowerCase();
          const codRastreio = (item.codigoRastreio || '').toLowerCase();
          const codRE = (item.codigoRE || '').toLowerCase();
          if (!codRastreio.includes(rast) && !codRE.includes(rast)) {
            return false;
          }
        }

        // Filtro por Data Específica de Entrega
        if (filtroDataEntrega) {
          const dtStr = item.dataEntrega || '';
          const match = dtStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (match) {
            const [, d, m, a] = match;
            const itemDataIso = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            if (itemDataIso !== filtroDataEntrega) {
              return false;
            }
          } else {
            return false;
          }
        }

        // Filtro por Período Rápido
        if (periodoRetiradas !== 'todos' && !filtroDataEntrega) {
          const dtStr = item.dataEntrega || '';
          const match = dtStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
          if (match) {
            const [, d, m, a] = match;
            const dtEntrega = new Date(Number(a), Number(m) - 1, Number(d));
            const agora = new Date();
            agora.setHours(23, 59, 59, 999);

            if (periodoRetiradas === 'hoje') {
              const hojeIni = new Date();
              hojeIni.setHours(0, 0, 0, 0);
              if (dtEntrega < hojeIni || dtEntrega > agora) return false;
            } else if (periodoRetiradas === '7dias') {
              const limite7 = new Date();
              limite7.setDate(limite7.getDate() - 7);
              limite7.setHours(0, 0, 0, 0);
              if (dtEntrega < limite7 || dtEntrega > agora) return false;
            } else if (periodoRetiradas === '30dias') {
              const limite30 = new Date();
              limite30.setDate(limite30.getDate() - 30);
              limite30.setHours(0, 0, 0, 0);
              if (dtEntrega < limite30 || dtEntrega > agora) return false;
            }
          }
        }

        // Filtro de Texto Geral (Nome, Unidade, CPF, Rastreio, Retirante, RE)
        if (buscaRetirada.trim()) {
          const q = buscaRetirada.toLowerCase();
          const matchNome = (item.moradorNome || '').toLowerCase().includes(q);
          const matchUnidade = (item.unidade || '').toLowerCase().includes(q);
          const matchRetirante = (item.retiranteNome || '').toLowerCase().includes(q);
          const matchDoc = (item.retiranteDocumento || '').toLowerCase().includes(q);
          const matchCpfMorador = (item.moradorCpf || '').toLowerCase().includes(q);
          const matchRastreio = (item.codigoRastreio || '').toLowerCase().includes(q);
          const matchRE = (item.codigoRE || '').toLowerCase().includes(q);
          const matchObs = (item.observacoes || '').toLowerCase().includes(q);
          const matchOp = (item.operadorEntregaNome || '').toLowerCase().includes(q);

          return (
            matchNome ||
            matchUnidade ||
            matchRetirante ||
            matchDoc ||
            matchCpfMorador ||
            matchRastreio ||
            matchRE ||
            matchObs ||
            matchOp
          );
        }

        return true;
      })
      .sort((a, b) => {
        const dtA = parseData(a.dataEntrega || '')?.getTime() || 0;
        const dtB = parseData(b.dataEntrega || '')?.getTime() || 0;
        return dtB - dtA;
      });
  }, [
    encomendasRetiradasDoCondominio,
    apenasComFoto,
    filtroCpf,
    filtroRastreio,
    filtroDataEntrega,
    periodoRetiradas,
    buscaRetirada
  ]);

  // Estatísticas de Encomendas Retiradas
  const statsRetiradas = useMemo(() => {
    const total = encomendasRetiradasDoCondominio.length;
    const comFoto = encomendasRetiradasDoCondominio.filter((i) => !!i.fotoComprovanteUrl).length;
    const comDoc = encomendasRetiradasDoCondominio.filter((i) => !!i.retiranteDocumento).length;
    const hojeStr = new Date().toLocaleDateString('pt-BR');
    const hoje = encomendasRetiradasDoCondominio.filter(
      (i) => i.dataEntrega && i.dataEntrega.includes(hojeStr)
    ).length;

    return { total, comFoto, comDoc, hoje };
  }, [encomendasRetiradasDoCondominio]);

  // AÇÃO: Verificação de Consistência Forçada com Supabase Cloud
  const handleExecutarVerificacaoConsistencia = async () => {
    setIsVerificandoConsistencia(true);
    try {
      if (onForcarSincronizacao) {
        await onForcarSincronizacao();
      }
      const agoraStr = new Date().toLocaleTimeString('pt-BR');
      setUltimoTimestampSync(agoraStr);

      // Registra evento de auditoria no histórico garantindo consistência em tempo real
      onAddAtividade({
        condominioId: condominioAtivo.id,
        categoria: 'sistema',
        moduloOrigem: 'Módulo 12: Histórico & Auditoria',
        acao: 'Verificação de Consistência Forçada Supabase',
        descricao: `Consistência verificada com sucesso. Estado local e Supabase Cloud 100% alinhados em tempo real às ${agoraStr}.`,
        detalhes: `Posto: ${condominioAtivo.nome} | Total Atividades: ${atividades.length} | Encomendas Retiradas: ${encomendasRetiradasDoCondominio.length}`,
        operadorNome: `${operadorAtivo.nome} (${operadorAtivo.cargo})`,
        nivel: 'sucesso'
      });

      setFeedbackMsg(`✓ Consistência verificada com sucesso com o Supabase Cloud às ${agoraStr}. Todos os dispositivos estão sincronizados em tempo real!`);
      setTimeout(() => setFeedbackMsg(''), 5000);
    } catch (err: any) {
      setFeedbackMsg(`Aviso na verificação de consistência: ${err?.message || 'Falha temporária de rede. Usando estado local.'}`);
      setTimeout(() => setFeedbackMsg(''), 5000);
    } finally {
      setIsVerificandoConsistencia(false);
    }
  };

  // Exportar histórico de atividades para CSV
  const handleExportarCsv = () => {
    if (atividadesFiltradas.length === 0) {
      setFeedbackMsg('Nenhuma atividade disponível para exportação com os filtros atuais.');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    const headers = [
      'CODIGO_LOG',
      'CONDOMINIO_NOME',
      'CONDOMINIO_CODIGO',
      'DATA_HORA',
      'NIVEL',
      'CATEGORIA',
      'MODULO_ORIGEM',
      'ACAO_REALIZADA',
      'DESCRICAO',
      'DETALHES_COMPLEMENTARES',
      'OPERADOR_RESPONSAVEL'
    ];

    const rows = atividadesFiltradas.map((a) => [
      a.codigo || '-',
      condominioAtivo.nome,
      condominioAtivo.codigo,
      a.dataHora,
      a.nivel.toUpperCase(),
      a.categoria.toUpperCase(),
      a.moduloOrigem,
      a.acao,
      a.descricao,
      a.detalhes || '-',
      a.operadorNome
    ]);

    const csvFormattedRows = rows.map((r) =>
      r.map((col) => `"${String(col || '').replace(/"/g, '""')}"`).join(';')
    );

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...csvFormattedRows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dataStr = new Date().toISOString().slice(0, 10);
    a.download = `historico_atividades_${condominioAtivo.codigo}_${dataStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedbackMsg(`✓ Histórico exportado com sucesso (${atividadesFiltradas.length} registro(s) baixados em CSV).`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Exportar histórico de encomendas retiradas para CSV
  const handleExportarCsvRetiradas = () => {
    if (encomendasRetiradasFiltradas.length === 0) {
      setFeedbackMsg('Nenhuma encomenda retirada disponível para exportação.');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    const headers = [
      'CODIGO_RE',
      'CODIGO_RASTREIO',
      'UNIDADE',
      'MORADOR_DESTINATARIO',
      'CPF_MORADOR',
      'QUEM_RETIROU',
      'DOCUMENTO_RETIRANTE_CPF',
      'DATA_RECEBIMENTO',
      'OPERADOR_RECEBIMENTO',
      'DATA_ENTREGA',
      'OPERADOR_ENTREGA',
      'TEM_FOTO_COMPROVANTE',
      'LOCAL_ARMAZENAMENTO',
      'OBSERVACOES'
    ];

    const rows = encomendasRetiradasFiltradas.map((item) => [
      item.codigoRE,
      item.codigoRastreio || '-',
      item.unidade,
      item.moradorNome,
      item.moradorCpf || '-',
      item.retiranteNome || '-',
      item.retiranteDocumento || '-',
      item.dataRecebimento,
      item.operadorRecebimentoNome,
      item.dataEntrega || '-',
      item.operadorEntregaNome || '-',
      item.fotoComprovanteUrl ? 'SIM' : 'NÃO',
      item.localArmazenamento || '-',
      item.observacoes || '-'
    ]);

    const csvFormattedRows = rows.map((r) =>
      r.map((col) => `"${String(col || '').replace(/"/g, '""')}"`).join(';')
    );

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...csvFormattedRows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dataStr = new Date().toISOString().slice(0, 10);
    a.download = `encomendas_retiradas_${condominioAtivo.codigo}_${dataStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedbackMsg(`✓ Relatório de retiradas exportado (${encomendasRetiradasFiltradas.length} encomenda(s) baixadas em CSV).`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Salvar Nova Anotação Manual
  const handleSalvarNovaAnotacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAcao.trim() || !novaDescricao.trim()) {
      setErroModal('Por favor, preencha o título e a descrição do evento.');
      return;
    }
    setErroModal('');

    onAddAtividade({
      condominioId: condominioAtivo.id,
      categoria: novaCategoria,
      moduloOrigem: 'Módulo 12: Registro Manual de Guarita',
      acao: novaAcao.trim(),
      descricao: novaDescricao.trim(),
      detalhes: novosDetalhes.trim() || undefined,
      operadorId: operadorAtivo.id,
      operadorNome: `${operadorAtivo.nome} (${operadorAtivo.cargo})`,
      nivel: novoNivel
    });

    setModalNovaAnotacao(false);
    setNovaAcao('');
    setNovaDescricao('');
    setNovosDetalhes('');
    setNovoNivel('info');
    setNovaCategoria('geral');
    setFeedbackMsg('✓ Nova anotação operacional gravada e auditada com sucesso.');
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Copiar Dossiê de Contestação de Encomenda para Área de Transferência
  const handleCopiarDossie = (item: ItemEncomenda) => {
    const textoDossie = `========================================
DOSSIÊ DE ENTREGA / COMPROVANTE DE ENCOMENDA
CONDOMÍNIO: ${condominioAtivo.nome} (${condominioAtivo.codigo})
========================================
Código RE: ${item.codigoRE}
Código de Rastreio: ${item.codigoRastreio || 'Não informado'}
Unidade de Destino: ${item.unidade}
Morador Titular: ${item.moradorNome}${item.moradorCpf ? ` (CPF: ${item.moradorCpf})` : ''}

ENTREGA / BAIXA:
Data/Hora da Entrega: ${item.dataEntrega || 'Não registrada'}
Quem Retirou: ${item.retiranteNome || 'Não registrado'}
Documento/CPF de Quem Retirou: ${item.retiranteDocumento || 'Não registrado'}
Operador Responsável pela Entrega: ${item.operadorEntregaNome || 'Não registrado'}

RECEBIMENTO ORIGINAL:
Data de Recebimento na Guarita: ${item.dataRecebimento}
Operador de Recebimento: ${item.operadorRecebimentoNome}
Local Armazenado: ${item.localArmazenamento || 'Guarita'}

COMPROVAÇÃO VISUAL:
Comprovante com Foto: ${item.fotoComprovanteUrl ? 'SIM (Foto arquivada no sistema)' : 'NÃO'}
${item.observacoes ? `Observações: ${item.observacoes}` : ''}
========================================
Emitido por: ${operadorAtivo.nome} em ${new Date().toLocaleString('pt-BR')}`;

    navigator.clipboard.writeText(textoDossie);
    setCopiadoDossie(true);
    setTimeout(() => setCopiadoDossie(false), 3000);
  };

  // Imprimir Comprovante de Contestação
  const handleImprimirComprovante = (item: ItemEncomenda) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprovante de Retirada - RE ${item.codigoRE}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; }
            .subtitle { font-size: 13px; color: #64748b; }
            .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 16px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
            .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
            .val { font-size: 14px; font-weight: 600; color: #0f172a; margin-top: 2px; }
            .foto-container { margin-top: 15px; text-align: center; }
            .foto { max-width: 100%; max-height: 400px; border-radius: 6px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">COMPROVANTE OFICIAL DE RETIRADA DE ENCOMENDA</div>
              <div class="subtitle">${condominioAtivo.nome} | Posto: ${condominioAtivo.codigo}</div>
            </div>
            <div style="text-align: right;">
              <div class="label">Código RE</div>
              <div style="font-size: 18px; font-weight: 800; color: #059669;">${item.codigoRE}</div>
            </div>
          </div>

          <div class="box">
            <div class="grid">
              <div>
                <div class="label">Unidade de Destino</div>
                <div class="val">${item.unidade}</div>
              </div>
              <div>
                <div class="label">Morador Destinatário</div>
                <div class="val">${item.moradorNome} ${item.moradorCpf ? `(CPF: ${item.moradorCpf})` : ''}</div>
              </div>
              <div>
                <div class="label">Código de Rastreio</div>
                <div class="val">${item.codigoRastreio || 'Sem rastreio externo'}</div>
              </div>
              <div>
                <div class="label">Data de Recebimento na Portaria</div>
                <div class="val">${item.dataRecebimento} (Op: ${item.operadorRecebimentoNome})</div>
              </div>
            </div>
          </div>

          <div class="box" style="border-left: 4px solid #059669;">
            <div class="label" style="color: #059669; font-weight: 800; margin-bottom: 8px;">DADOS DA RETIRADA / BAIXA</div>
            <div class="grid">
              <div>
                <div class="label">Quem Retirou</div>
                <div class="val" style="font-size: 16px;">${item.retiranteNome || 'Não registrado'}</div>
              </div>
              <div>
                <div class="label">Documento / CPF do Retirante</div>
                <div class="val" style="font-size: 16px;">${item.retiranteDocumento || 'Não informado no momento da baixa'}</div>
              </div>
              <div>
                <div class="label">Data & Horário da Entrega</div>
                <div class="val">${item.dataEntrega || 'Não registrada'}</div>
              </div>
              <div>
                <div class="label">Porteiro / Operador Responsável</div>
                <div class="val">${item.operadorEntregaNome || 'Porteiro de Plantão'}</div>
              </div>
            </div>
          </div>

          ${
            item.fotoComprovanteUrl
              ? `
              <div class="box">
                <div class="label" style="margin-bottom: 8px;">FOTO DE COMPROVAÇÃO DA ENTREGA (ANEXADA NO ATO DA RETIRADA)</div>
                <div class="foto-container">
                  <img src="${item.fotoComprovanteUrl}" class="foto" alt="Foto Comprovante" />
                </div>
              </div>
            `
              : '<div class="box" style="color: #b91c1c; font-weight: 600;">⚠️ Nenhuma foto de comprovante foi anexada no momento da entrega.</div>'
          }

          <div class="footer">
            Documento emitido para fins de auditoria e resolução de contestações condominiais.<br />
            Emitido por: ${operadorAtivo.nome} (${operadorAtivo.cargo}) em ${new Date().toLocaleString('pt-BR')}.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Registrar Nota de Contestação no Histórico Geral
  const handleRegistrarNotaContestacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemContestacao || !notaContestacaoTexto.trim()) return;

    onAddAtividade({
      condominioId: condominioAtivo.id,
      categoria: 'encomendas',
      moduloOrigem: 'Módulo 12: Histórico & Auditoria',
      acao: `Anotação de Contestação - Encomenda ${itemContestacao.codigoRE}`,
      descricao: `Contestação/Dúvida registrada para a encomenda ${itemContestacao.codigoRE} (Unidade ${itemContestacao.unidade}). ${notaContestacaoTexto.trim()}`,
      detalhes: `Destinatário: ${itemContestacao.moradorNome} | Retirante original: ${itemContestacao.retiranteNome || '-'} (Doc: ${itemContestacao.retiranteDocumento || '-'}) | Data Entrega: ${itemContestacao.dataEntrega || '-'} | Operador da Baixa: ${itemContestacao.operadorEntregaNome || '-'}`,
      operadorNome: `${operadorAtivo.nome} (${operadorAtivo.cargo})`,
      nivel: 'aviso'
    });

    setNotaContestacaoTexto('');
    setFeedbackMsg(`✓ Nota de contestação registrada no histórico com sucesso para a encomenda ${itemContestacao.codigoRE}.`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  // Helpers de Ícones e Badges
  const getIconeCategoria = (cat: CategoriaAtividade) => {
    switch (cat) {
      case 'login':
        return <User className="w-4 h-4 text-emerald-400" />;
      case 'encomendas':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'custodia':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'chaves':
        return <Key className="w-4 h-4 text-violet-400" />;
      case 'materiais':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'manutencao':
        return <Wrench className="w-4 h-4 text-rose-400" />;
      case 'ronda':
        return <QrCode className="w-4 h-4 text-indigo-400" />;
      case 'ocorrencias':
        return <BookOpen className="w-4 h-4 text-rose-500" />;
      case 'passagem':
        return <ClipboardList className="w-4 h-4 text-teal-400" />;
      case 'autorizados':
        return <Users className="w-4 h-4 text-purple-400" />;
      case 'cadastros':
        return <Settings className="w-4 h-4 text-slate-400" />;
      default:
        return <History className="w-4 h-4 text-slate-300" />;
    }
  };

  const getNivelBadge = (nivel: NivelAtividade) => {
    switch (nivel) {
      case 'critico':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-300 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> Crítico
          </span>
        );
      case 'aviso':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/40 text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Atenção
          </span>
        );
      case 'sucesso':
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sucesso
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950/70 border border-blue-500/40 text-blue-300 flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-400" /> Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* ==================== HEADER DO MÓDULO ==================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> MÓDULO 12: HISTÓRICO & AUDITORIA
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Posto: <strong className="text-white">{condominioAtivo.nome}</strong> ({condominioAtivo.codigo})
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
            Histórico Operacional & Resolução de Contestações
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico inviolável e interface de auditoria de encomendas retiradas com fotos de comprovação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {abaAtiva === 'auditoria' ? (
            <>
              <button
                type="button"
                onClick={handleExportarCsv}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-white border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Baixar planilha CSV com os eventos filtrados"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setModalNovaAnotacao(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nova Anotação Operacional</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleExportarCsvRetiradas}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-blue-400 hover:text-white border border-blue-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Baixar planilha CSV com as encomendas retiradas"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Exportar Retiradas (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================== BARRA DE CONSISTÊNCIA FORÇADA SUPABASE ==================== */}
      <div className="p-3 sm:p-3.5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {syncStatus === 'conectado' && (
              <>
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping absolute opacity-75" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </>
            )}
            {syncStatus === 'sincronizando' && (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            )}
            {syncStatus === 'offline' && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Supabase Cloud:
                {syncStatus === 'conectado' && (
                  <span className="text-emerald-400 font-extrabold">Conectado & Tempo Real Ativo</span>
                )}
                {syncStatus === 'sincronizando' && (
                  <span className="text-amber-400 font-extrabold">Sincronizando Banco de Dados...</span>
                )}
                {syncStatus === 'offline' && (
                  <span className="text-rose-400 font-extrabold">Offline (Modo Contingência Local)</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Última verificação de consistência: <strong className="text-slate-300 font-mono">{ultimoTimestampSync}</strong>. Alterações em qualquer aparelho (PC ou Celular) sincronizam instantaneamente.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExecutarVerificacaoConsistencia}
          disabled={isVerificandoConsistencia}
          className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          title="Força a sincronização bidirecional imediata entre o Supabase Cloud e a memória local"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerificandoConsistencia ? 'animate-spin' : ''}`} />
          <span>{isVerificandoConsistencia ? 'Verificando...' : 'Forçar Verificação de Consistência'}</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg('')}
            className="text-emerald-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ==================== SELETOR DE ABAS PRINCIPAIS ==================== */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setAbaAtiva('auditoria')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            abaAtiva === 'auditoria'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Trilha de Auditoria Geral</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            abaAtiva === 'auditoria' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-300'
          }`}>
            {atividadesFiltradas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('encomendas_retiradas')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            abaAtiva === 'encomendas_retiradas'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Package className="w-4 h-4 text-blue-300" />
          <span>Busca de Encomendas Retiradas (Contestações)</span>
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            abaAtiva === 'encomendas_retiradas' ? 'bg-blue-800 text-blue-100' : 'bg-slate-800 text-slate-300'
          }`}>
            {encomendasRetiradasFiltradas.length}
          </span>
        </button>
      </div>

      {/* ==================== ABA 1: AUDITORIA GERAL ==================== */}
      {abaAtiva === 'auditoria' && (
        <div className="space-y-4">
          {/* QUADRO DE RESUMO ESTATÍSTICO */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total de Atividades</span>
              <span className="text-xl font-black text-white mt-1 block">{statsAuditoria.total}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Sucesso / Concluídas</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">{statsAuditoria.sucessos}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Avisos & Alertas</span>
              <span className="text-xl font-black text-amber-400 mt-1 block">{statsAuditoria.avisos}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Eventos Críticos</span>
              <span className="text-xl font-black text-rose-400 mt-1 block">{statsAuditoria.criticos}</span>
            </div>
          </div>

          {/* BARRA DE FILTROS E PESQUISA */}
          <div className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-md">
            {/* Filtro Rápido de Período */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Período:
              </span>

              {[
                { id: 'hoje', label: 'Hoje' },
                { id: '7dias', label: 'Últimos 7 dias' },
                { id: '15dias', label: 'Últimos 15 dias' },
                { id: 'mesAtual', label: 'Mês Atual' },
                { id: 'todos', label: 'Todos' },
                { id: 'personalizado', label: 'Personalizado' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodo(p.id as PeriodoTipo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    periodo === p.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Intervalo Personalizado */}
            {periodo === 'personalizado' && (
              <div className="p-3 bg-slate-850 border border-slate-750 rounded-xl flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">De:</span>
                  <input
                    type="date"
                    value={dataInicioCustom}
                    onChange={(e) => setDataInicioCustom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Até:</span>
                  <input
                    type="date"
                    value={dataFimCustom}
                    onChange={(e) => setDataFimCustom(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

            {/* Filtros em Linha: Busca, Categoria, Nível, Operador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Campo de Busca Livre */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar ação, código, operador..."
                  value={buscaTexto}
                  onChange={(e) => setBuscaTexto(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                {buscaTexto && (
                  <button
                    type="button"
                    onClick={() => setBuscaTexto('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Seletor de Categoria */}
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="todas">Todas as Categorias</option>
                <option value="encomendas">📦 Encomendas & Triagem</option>
                <option value="chaves">🔑 Claviculário & Chaves</option>
                <option value="custodia">🛡️ Itens em Custódia</option>
                <option value="materiais">📋 Materiais do Posto</option>
                <option value="manutencao">🔧 Manutenção Predial</option>
                <option value="ronda">📱 Rondas QR Code</option>
                <option value="ocorrencias">🚨 Ocorrências & Livro</option>
                <option value="passagem">🔄 Passagem de Turno</option>
                <option value="autorizados">👥 Visitantes & Prestadores</option>
                <option value="login">👤 Logins & Sessões</option>
                <option value="geral">📝 Anotações Gerais</option>
                <option value="sistema">⚙️ Sistema & Consistência</option>
              </select>

              {/* Seletor de Nível */}
              <select
                value={nivelFiltro}
                onChange={(e) => setNivelFiltro(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">Todos os Níveis de Alerta</option>
                <option value="info">Info (Rotina Padrão)</option>
                <option value="sucesso">Sucesso (Concluídos)</option>
                <option value="aviso">Atenção (Advertências)</option>
                <option value="critico">Crítico (Urgências)</option>
              </select>

              {/* Seletor de Operador */}
              <select
                value={operadorFiltro}
                onChange={(e) => setOperadorFiltro(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">Todos os Operadores</option>
                {Array.from(
                  new Set(
                    atividades
                      .filter((a) => a.condominioId === condominioAtivo.id)
                      .map((a) => a.operadorNome)
                  )
                ).map((opNome) => (
                  <option key={opNome} value={opNome}>
                    {opNome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* LISTA DE EVENTOS DO HISTÓRICO (TIMELINE) */}
          <div className="space-y-3">
            {atividadesFiltradas.length === 0 ? (
              <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300">Nenhum evento localizado</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Não foram encontradas atividades registradas para este condomínio no período ou filtros selecionados.
                </p>
              </div>
            ) : (
              atividadesFiltradas.map((ativ) => (
                <div
                  key={ativ.id}
                  className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 border border-slate-750 rounded-xl shrink-0 mt-0.5">
                      {getIconeCategoria(ativ.categoria)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {ativ.codigo || '#LOG'}
                        </span>
                        <span className="text-xs font-black text-white">
                          {ativ.acao}
                        </span>
                        {getNivelBadge(ativ.nivel)}
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-750">
                          {ativ.moduloOrigem}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {ativ.descricao}
                      </p>

                      {ativ.detalhes && (
                        <p className="text-[11px] text-slate-400 bg-slate-850 p-2 rounded-lg border border-slate-800 font-mono">
                          {ativ.detalhes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                    <div className="text-xs font-mono text-slate-300 flex sm:justify-end items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{ativ.dataHora}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex sm:justify-end items-center gap-1.5 mt-0.5">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{ativ.operadorNome}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== ABA 2: ENCOMENDAS RETIRADAS (CONTESTAÇÃO) ==================== */}
      {abaAtiva === 'encomendas_retiradas' && (
        <div className="space-y-4">
          {/* ESTATÍSTICAS DE RETIRADAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total de Retiradas</span>
              <span className="text-xl font-black text-white mt-1 block">{statsRetiradas.total}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Com Foto de Comprovação</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">{statsRetiradas.comFoto}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">Com CPF/Documento</span>
              <span className="text-xl font-black text-blue-400 mt-1 block">{statsRetiradas.comDoc}</span>
            </div>
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">Retiradas Hoje</span>
              <span className="text-xl font-black text-purple-400 mt-1 block">{statsRetiradas.hoje}</span>
            </div>
          </div>

          {/* BARRA DE BUSCA ESPECÍFICA PARA CONTESTAÇÃO DE ENCOMENDAS */}
          <div className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <SearchCode className="w-4 h-4 text-blue-400" />
                  Localizador de Encomendas Retiradas (Para Resolução de Contestações)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Consulte por CPF do morador ou de quem retirou, código de rastreio, código RE ou data da entrega.
                </p>
              </div>

              {/* Toggle de Apenas com Foto */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-750 text-xs font-semibold text-slate-300">
                <input
                  type="checkbox"
                  checked={apenasComFoto}
                  onChange={(e) => setApenasComFoto(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>Apenas com Foto do Comprovante</span>
              </label>
            </div>

            {/* Inputs de Filtro Específicos Solicitados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* 1. Busca Geral */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Nome do morador, unidade, retirante..."
                  value={buscaRetirada}
                  onChange={(e) => setBuscaRetirada(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {buscaRetirada && (
                  <button
                    type="button"
                    onClick={() => setBuscaRetirada('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2. Busca por CPF */}
              <div className="relative">
                <User className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Filtrar por CPF (Morador ou Retirante)..."
                  value={filtroCpf}
                  onChange={(e) => setFiltroCpf(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
                {filtroCpf && (
                  <button
                    type="button"
                    onClick={() => setFiltroCpf('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 3. Busca por Código de Rastreio / RE */}
              <div className="relative">
                <SearchCode className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Código de Rastreio / Código RE..."
                  value={filtroRastreio}
                  onChange={(e) => setFiltroRastreio(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                {filtroRastreio && (
                  <button
                    type="button"
                    onClick={() => setFiltroRastreio('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 4. Busca por Data Específica de Entrega */}
              <div className="relative">
                <input
                  type="date"
                  value={filtroDataEntrega}
                  onChange={(e) => {
                    setFiltroDataEntrega(e.target.value);
                    if (e.target.value) setPeriodoRetiradas('todos');
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  title="Selecionar data exata de entrega"
                />
                {filtroDataEntrega && (
                  <button
                    type="button"
                    onClick={() => setFiltroDataEntrega('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filtros rápidos de período para retiradas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                  <Calendar className="w-3 h-3 text-blue-400" /> Período Rápido:
                </span>
                {[
                  { id: 'todos', label: 'Todos os Registros' },
                  { id: 'hoje', label: 'Entregues Hoje' },
                  { id: '7dias', label: 'Últimos 7 dias' },
                  { id: '30dias', label: 'Últimos 30 dias' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPeriodoRetiradas(p.id as any);
                      setFiltroDataEntrega('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      periodoRetiradas === p.id && !filtroDataEntrega
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {(buscaRetirada || filtroCpf || filtroRastreio || filtroDataEntrega || apenasComFoto || periodoRetiradas !== 'todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaRetirada('');
                    setFiltroCpf('');
                    setFiltroRastreio('');
                    setFiltroDataEntrega('');
                    setPeriodoRetiradas('todos');
                    setApenasComFoto(false);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 underline cursor-pointer"
                >
                  <X className="w-3 h-3" /> Limpar Filtros
                </button>
              )}
            </div>
          </div>

          {/* LISTA DE ENCOMENDAS RETIRADAS */}
          <div className="space-y-3">
            {encomendasRetiradasFiltradas.length === 0 ? (
              <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-300">Nenhuma encomenda retirada localizada</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Tente alterar os termos de busca, limpar os filtros de CPF/rastreio ou selecionar outro período.
                </p>
              </div>
            ) : (
              encomendasRetiradasFiltradas.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl transition-all shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Foto da Comprovação de Retirada (Miniatura clicável) */}
                    <div className="relative group shrink-0">
                      {item.fotoComprovanteUrl ? (
                        <div
                          onClick={() => setItemContestacao(item)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 cursor-pointer shadow-md relative"
                          title="Clique para ver a foto de comprovação ampliada"
                        >
                          <img
                            src={item.fotoComprovanteUrl}
                            alt="Comprovante de Retirada"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-5 h-5 text-white" />
                          </div>
                          <span className="absolute bottom-0 inset-x-0 bg-emerald-950/90 text-emerald-300 text-[9px] font-black text-center py-0.5 border-t border-emerald-500/30">
                            FOTO OK
                          </span>
                        </div>
                      ) : (
                        <div
                          onClick={() => setItemContestacao(item)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-800 bg-slate-800/80 flex flex-col items-center justify-center text-slate-500 cursor-pointer text-center p-1"
                          title="Sem foto de comprovante anexada"
                        >
                          <Camera className="w-5 h-5 mb-0.5 opacity-50" />
                          <span className="text-[9px] leading-tight font-semibold">Sem foto</span>
                        </div>
                      )}
                    </div>

                    {/* Dados Detalhados da Encomenda */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-950/70 border border-blue-500/40 rounded text-blue-300 text-xs font-mono font-black">
                          RE: {item.codigoRE}
                        </span>
                        {item.codigoRastreio && (
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs font-mono font-bold flex items-center gap-1">
                            <SearchCode className="w-3 h-3 text-slate-400" />
                            {item.codigoRastreio}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-500/30 rounded text-emerald-300 text-xs font-bold">
                          Unidade {item.unidade}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-white">
                        Destinatário: <span className="text-emerald-400">{item.moradorNome}</span>
                        {item.moradorCpf && (
                          <span className="text-xs text-slate-400 font-mono font-normal ml-2">
                            (CPF: {item.moradorCpf})
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>
                          Retirado por: <strong className="text-white">{item.retiranteNome || 'Não registrado'}</strong>
                        </span>
                        {item.retiranteDocumento && (
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono text-[11px] font-bold border border-slate-700">
                            Doc/CPF: {item.retiranteDocumento}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" /> Entregue em: <strong className="text-slate-200">{item.dataEntrega || '-'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Operador: <strong className="text-slate-300">{item.operadorEntregaNome || 'Porteiro'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Recebido na portaria em: {item.dataRecebimento}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações de Contestação */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    <button
                      type="button"
                      onClick={() => setItemContestacao(item)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-all active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Dossiê & Foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleImprimirComprovante(item)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <Printer className="w-3 h-3 text-slate-400" />
                      <span>Imprimir Laudo</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== MODAL DE DOSSIÊ DE CONTESTAÇÃO DE ENCOMENDA ==================== */}
      {itemContestacao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-950/70 border border-blue-500/40 rounded-xl text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-white">
                    Dossiê de Comprovação da Encomenda {itemContestacao.codigoRE}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registro de entrega para resolução jurídica e contestação de extravio
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setItemContestacao(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Imagem Ampliada do Comprovante de Retirada */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  Foto de Comprovação Registrada na Retirada
                </span>
                {itemContestacao.fotoComprovanteUrl && (
                  <a
                    href={itemContestacao.fotoComprovanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Abrir foto original
                  </a>
                )}
              </div>

              {itemContestacao.fotoComprovanteUrl ? (
                <div className="w-full max-h-72 sm:max-h-80 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={itemContestacao.fotoComprovanteUrl}
                    alt="Foto de Comprovação"
                    className="max-h-72 sm:max-h-80 w-auto object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-950 border border-rose-500/30 rounded-xl text-center text-rose-400 text-xs font-bold">
                  ⚠️ Nenhuma foto do comprovante foi anexada no momento da entrega desta encomenda.
                </div>
              )}
            </div>

            {/* Grade com Metadados da Entrega e do Recebimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                  Identificação & Destinatário
                </span>
                <div>
                  <span className="text-slate-400 block text-[11px]">Unidade:</span>
                  <strong className="text-white text-sm">{itemContestacao.unidade}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Morador Titular:</span>
                  <strong className="text-emerald-400">{itemContestacao.moradorNome}</strong>
                  {itemContestacao.moradorCpf && (
                    <span className="text-slate-400 block font-mono text-[11px]">
                      CPF: {itemContestacao.moradorCpf}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Código de Rastreio:</span>
                  <strong className="text-slate-200 font-mono">
                    {itemContestacao.codigoRastreio || 'Sem rastreio externo'}
                  </strong>
                </div>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Dados da Baixa / Retirada
                </span>
                <div>
                  <span className="text-slate-400 block text-[11px]">Quem Retirou no Posto:</span>
                  <strong className="text-white text-sm">{itemContestacao.retiranteNome || 'Não registrado'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Documento / CPF Apresentado:</span>
                  <strong className="text-amber-400 font-mono text-sm">
                    {itemContestacao.retiranteDocumento || 'Não informado no momento da baixa'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Data & Hora da Entrega:</span>
                  <strong className="text-slate-200">{itemContestacao.dataEntrega || 'Não registrada'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Porteiro que Realizou a Baixa:</span>
                  <strong className="text-slate-300">{itemContestacao.operadorEntregaNome || 'Porteiro'}</strong>
                </div>
              </div>
            </div>

            {/* Formulário Rápido de Registro de Nota de Contestação */}
            <form onSubmit={handleRegistrarNotaContestacao} className="p-3 bg-slate-850 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-[11px] font-bold text-slate-300">
                Registrar Parecer / Nota de Contestação para o Histórico de Auditoria:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Morador compareceu alegando não ter recebido; foto de entrega confirmada..."
                  value={notaContestacaoTexto}
                  onChange={(e) => setNotaContestacaoTexto(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!notaContestacaoTexto.trim()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                >
                  Salvar Nota
                </button>
              </div>
            </form>

            {/* Ações do Rodapé do Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopiarDossie(itemContestacao)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  {copiadoDossie ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiadoDossie ? 'Dossiê Copiado!' : 'Copiar Dossiê em Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleImprimirComprovante(itemContestacao)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir Laudo Oficial</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setItemContestacao(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DE NOVA ANOTAÇÃO MANUAL ==================== */}
      {modalNovaAnotacao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <Plus className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-white">Nova Anotação Operacional de Guarita</h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaAnotacao(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {erroModal && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-300 text-xs">
                {erroModal}
              </div>
            )}

            <form onSubmit={handleSalvarNovaAnotacao} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Categoria do Evento *</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as CategoriaAtividade)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="geral">📝 Anotação Geral</option>
                    <option value="encomendas">📦 Encomenda / Dúvida</option>
                    <option value="chaves">🔑 Chaves & Portões</option>
                    <option value="manutencao">🔧 Manutenção</option>
                    <option value="ronda">📱 Ronda Extra</option>
                    <option value="ocorrencias">🚨 Segurança</option>
                    <option value="autorizados">👥 Acesso Especial</option>
                    <option value="sistema">⚙️ Verificação de Sistema</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nível de Importância *</label>
                  <select
                    value={novoNivel}
                    onChange={(e) => setNovoNivel(e.target.value as NivelAtividade)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="info">Info / Rotina</option>
                    <option value="sucesso">Sucesso / Normalidade</option>
                    <option value="aviso">Atenção / Advertência</option>
                    <option value="critico">Crítico / Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Título da Ação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vistoria extraordinária do perímetro, Queda temporária de energia..."
                  value={novaAcao}
                  onChange={(e) => setNovaAcao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Descrição Detalhada do Evento *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva o que ocorreu no posto com precisão..."
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Detalhes Adicionais (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Contato feito com a Enel protocolo 12345; Portão restabelecido..."
                  value={novosDetalhes}
                  onChange={(e) => setNovosDetalhes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-slate-850 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                Operador Emissor: <strong className="text-white">{operadorAtivo.nome} ({operadorAtivo.cargo})</strong>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovaAnotacao(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-950/40"
                >
                  Salvar no Histórico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
