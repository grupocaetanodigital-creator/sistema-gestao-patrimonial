import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Search,
  X,
  Share2,
  Building2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Condominio, Operador, Ocorrencia } from '../../types';
import { buildWhatsAppDeepLink } from '../../lib/whatsapp';

interface RelatorioOcorrenciasPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  condominio: Condominio;
  ocorrencias: Ocorrencia[];
  operadorAtivo: Operador;
  tituloContexto?: string;
}

type PeriodoTipo = 'hoje' | '7dias' | '15dias' | 'mesAtual' | 'mesAnterior' | 'todos' | 'personalizado';

export const RelatorioOcorrenciasPdfModal: React.FC<RelatorioOcorrenciasPdfModalProps> = ({
  isOpen,
  onClose,
  condominio,
  ocorrencias,
  operadorAtivo,
  tituloContexto = 'Módulo de Ocorrências'
}) => {
  // Filtros de Período
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mesAtual');
  const [dataInicioCustom, setDataInicioCustom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [dataFimCustom, setDataFimCustom] = useState(() => new Date().toISOString().slice(0, 10));

  // Filtros de Tipo e Status
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'Interna (Posto)' | 'Morador (Regimento)'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'Pendente' | 'Resolvido'>('todos');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [copiadoFeedback, setCopiadoFeedback] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Helper para converter data de string pt-BR ou ISO para objeto Date
  const parseDataHora = (dataStr: string): Date | null => {
    if (!dataStr) return null;
    // Se for formato ISO
    if (dataStr.includes('T') || dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dataStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Se for formato pt-BR: "DD/MM/AAAA, HH:mm" ou "DD/MM/AAAA HH:mm"
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, dia, mes, ano] = match;
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    const fallback = new Date(dataStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  // Cálculo das datas limites de acordo com o período selecionado
  const { dataInicioLimite, dataFimLimite, periodoDescricao } = useMemo(() => {
    const agora = new Date();
    let ini = new Date();
    let fim = new Date();
    let desc = '';

    if (periodo === 'hoje') {
      ini.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
      desc = `Hoje (${agora.toLocaleDateString('pt-BR')})`;
    } else if (periodo === '7dias') {
      ini.setDate(agora.getDate() - 7);
      ini.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
      desc = `Últimos 7 dias (${ini.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')})`;
    } else if (periodo === '15dias') {
      ini.setDate(agora.getDate() - 15);
      ini.setHours(0, 0, 0, 0);
      fim.setHours(23, 59, 59, 999);
      desc = `Últimos 15 dias (${ini.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')})`;
    } else if (periodo === 'mesAtual') {
      ini = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999);
      const nomeMes = agora.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      desc = `Mês Atual (${nomeMes.toUpperCase()})`;
    } else if (periodo === 'mesAnterior') {
      ini = new Date(agora.getFullYear(), agora.getMonth() - 1, 1, 0, 0, 0, 0);
      fim = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59, 999);
      const nomeMes = ini.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      desc = `Mês Anterior (${nomeMes.toUpperCase()})`;
    } else if (periodo === 'personalizado') {
      const [anoI, mesI, diaI] = (dataInicioCustom || '').split('-').map(Number);
      const [anoF, mesF, diaF] = (dataFimCustom || '').split('-').map(Number);
      ini = new Date(anoI || agora.getFullYear(), (mesI ? mesI - 1 : 0), diaI || 1, 0, 0, 0, 0);
      fim = new Date(anoF || agora.getFullYear(), (mesF ? mesF - 1 : 11), diaF || 28, 23, 59, 59, 999);
      desc = `Período Personalizado: ${ini.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')}`;
    } else {
      // Todos
      ini = new Date(2020, 0, 1);
      fim = new Date(2035, 11, 31);
      desc = 'Histórico Completo (Todas as ocorrências registradas)';
    }

    return { dataInicioLimite: ini, dataFimLimite: fim, periodoDescricao: desc };
  }, [periodo, dataInicioCustom, dataFimCustom]);

  // Ocorrências filtradas do condomínio ativo
  const ocorrenciasFiltradas = useMemo(() => {
    return ocorrencias
      .filter((o) => o.condominioId === condominio.id)
      .filter((o) => {
        // Filtro de data
        const dt = parseDataHora(o.dataHora);
        if (dt && periodo !== 'todos') {
          if (dt < dataInicioLimite || dt > dataFimLimite) {
            return false;
          }
        }
        // Filtro de tipo
        if (filtroTipo !== 'todos' && o.tipo !== filtroTipo) {
          return false;
        }
        // Filtro de status
        const st = o.statusOcorrencia || 'Pendente';
        if (filtroStatus === 'Pendente' && st === 'Resolvido') {
          return false;
        }
        if (filtroStatus === 'Resolvido' && st !== 'Resolvido' && st !== 'Visto') {
          return false;
        }
        // Filtro de busca textual
        if (buscaTexto.trim()) {
          const q = buscaTexto.toLowerCase();
          const matchCodigo = o.codigo.toLowerCase().includes(q);
          const matchDesc = o.descricao.toLowerCase().includes(q);
          const matchCat = o.categoria.toLowerCase().includes(q);
          const matchInf = (o.unidadeInfratora || '').toLowerCase().includes(q);
          const matchRec = (o.unidadeReclamante || '').toLowerCase().includes(q);
          const matchOp = (o.operadorNome || '').toLowerCase().includes(q);
          return matchCodigo || matchDesc || matchCat || matchInf || matchRec || matchOp;
        }
        return true;
      })
      .sort((a, b) => {
        const dtA = parseDataHora(a.dataHora)?.getTime() || 0;
        const dtB = parseDataHora(b.dataHora)?.getTime() || 0;
        return dtB - dtA; // Mais recentes primeiro
      });
  }, [ocorrencias, condominio.id, dataInicioLimite, dataFimLimite, periodo, filtroTipo, filtroStatus, buscaTexto]);

  // Estatísticas do Relatório Consolidado
  const stats = useMemo(() => {
    const total = ocorrenciasFiltradas.length;
    const internas = ocorrenciasFiltradas.filter((o) => o.tipo === 'Interna (Posto)').length;
    const moradores = ocorrenciasFiltradas.filter((o) => o.tipo === 'Morador (Regimento)').length;
    const criticas = ocorrenciasFiltradas.filter((o) => o.severidade === 'Crítica').length;
    const medias = ocorrenciasFiltradas.filter((o) => o.severidade === 'Média').length;
    const baixas = ocorrenciasFiltradas.filter((o) => o.severidade === 'Baixa').length;
    const resolvidas = ocorrenciasFiltradas.filter((o) => o.statusOcorrencia === 'Resolvido' || o.statusOcorrencia === 'Visto').length;
    const pendentes = total - resolvidas;

    return { total, internas, moradores, criticas, medias, baixas, resolvidas, pendentes };
  }, [ocorrenciasFiltradas]);

  // Função para Gerar o Documento PDF limpo e imprimir
  const handleImprimirRelatorio = () => {
    const dataEmissao = new Date().toLocaleString('pt-BR');
    const protocoloEmissao = `REL-OCO-${Date.now().toString().slice(-6)}`;

    // Criar uma janela de impressão isolada para garantir layout A4 profissional
    const printWindow = window.open('', '_blank', 'width=900,height=950');
    if (!printWindow) {
      // Fallback caso pop-ups estejam bloqueados
      window.print();
      return;
    }

    const rowsHtml = ocorrenciasFiltradas.map((oco, idx) => {
      const isMorador = oco.tipo === 'Morador (Regimento)';
      const statusBadge =
        oco.statusOcorrencia === 'Resolvido'
          ? '<span style="color:#059669;background:#d1fae5;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;">RESOLVIDO</span>'
          : oco.statusOcorrencia === 'Visto'
          ? '<span style="color:#4f46e5;background:#e0e7ff;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;">VISTO</span>'
          : '<span style="color:#b91c1c;background:#fee2e2;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px;">PENDENTE</span>';

      const severidadeBadge = oco.severidade
        ? `<span style="font-size:10px;font-weight:bold;padding:2px 6px;border-radius:4px;border:1px solid #cbd5e1;background:#f8fafc;">
            ${oco.severidade === 'Crítica' ? '🔴 ALTA/CRÍTICA' : oco.severidade === 'Média' ? '🟡 MÉDIA' : '🟢 BAIXA'}
           </span>`
        : '';

      return `
        <tr style="border-bottom:1px solid #e2e8f0;background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};page-break-inside:avoid;">
          <td style="padding:10px 8px;vertical-align:top;font-family:monospace;font-size:11px;font-weight:bold;color:#1e293b;">
            ${oco.codigo}<br/>
            <span style="font-size:10px;color:#64748b;font-family:sans-serif;">${oco.dataHora}</span>
          </td>
          <td style="padding:10px 8px;vertical-align:top;">
            <div style="font-weight:bold;font-size:12px;color:#0f172a;">${oco.categoria}</div>
            <div style="font-size:10px;color:#475569;margin-top:2px;">
              Tipo: <strong>${oco.tipo}</strong> ${severidadeBadge}
            </div>
            ${
              isMorador
                ? `<div style="font-size:11px;margin-top:4px;color:#b91c1c;">
                     <strong>Infratora:</strong> ${oco.unidadeInfratora || 'Não especificada'}
                     ${oco.unidadeReclamante ? `| <strong>Reclamante:</strong> ${oco.unidadeReclamante}` : ''}
                   </div>`
                : ''
            }
          </td>
          <td style="padding:10px 8px;vertical-align:top;font-size:11px;color:#334155;line-height:1.4;">
            <p style="margin:0 0 4px 0;"><strong>Relato:</strong> ${oco.descricao}</p>
            ${
              oco.providenciasTomadas
                ? `<p style="margin:0;font-size:10px;color:#0369a1;background:#f0f9ff;padding:4px 6px;border-radius:4px;border-left:2px solid #0284c7;">
                    <strong>Providências:</strong> ${oco.providenciasTomadas}
                   </p>`
                : ''
            }
            ${
              oco.observacaoResolucao
                ? `<p style="margin:4px 0 0 0;font-size:10px;color:#15803d;background:#f0fdf4;padding:4px 6px;border-radius:4px;border-left:2px solid #16a34a;">
                    <strong>Despacho Supervisor (${oco.resolvidoPor || 'Coordenação'} em ${oco.dataResolucao || '-'}):</strong> ${oco.observacaoResolucao}
                   </p>`
                : ''
            }
          </td>
          <td style="padding:10px 8px;vertical-align:top;font-size:10px;color:#475569;white-space:nowrap;">
            ${statusBadge}<br/>
            <span style="font-size:9px;color:#64748b;display:inline-block;margin-top:4px;">Op: ${oco.operadorNome}</span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8"/>
        <title>Relatório de Ocorrências - ${condominio.nome}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 12mm 15mm 12mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 10px;
            font-size: 12px;
          }
          .header-box {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title-section h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .title-section h2 {
            margin: 2px 0 0 0;
            font-size: 13px;
            font-weight: 700;
            color: #dc2626;
            text-transform: uppercase;
          }
          .condo-details {
            font-size: 10.5px;
            color: #475569;
            margin-top: 4px;
            line-height: 1.3;
          }
          .meta-box {
            text-align: right;
            font-size: 10px;
            color: #64748b;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 16px;
          }
          .summary-card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 10px;
            background: #f8fafc;
          }
          .summary-card .label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #64748b;
          }
          .summary-card .value {
            font-size: 18px;
            font-weight: 900;
            color: #0f172a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 20px;
          }
          th {
            background: #0f172a;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px;
            text-align: left;
          }
          .signatures {
            margin-top: 30px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            page-break-inside: avoid;
          }
          .sig-line {
            border-top: 1px solid #475569;
            padding-top: 6px;
            text-align: center;
            font-size: 10px;
            color: #334155;
          }
          .footer-note {
            margin-top: 20px;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title-section">
            <h1>${condominio.nome}</h1>
            <h2>RELATÓRIO CONSOLIDADO DE OCORRÊNCIAS DO POSTO</h2>
            <div class="condo-details">
              <strong>CNPJ:</strong> ${condominio.cnpj || 'Não informado'} | <strong>Endereço:</strong> ${condominio.endereco || 'Portaria Principal'}<br/>
              <strong>Síndico(a):</strong> ${condominio.nomeSindico || 'Administração'} | <strong>Telefone Portaria:</strong> ${condominio.telefonePortaria || 'N/A'}<br/>
              <strong>Destinatário Oficial:</strong> Administradora do Condomínio / Síndico / Conselho Fiscal
            </div>
          </div>
          <div class="meta-box">
            <div><strong>PROTOCOLO:</strong> ${protocoloEmissao}</div>
            <div><strong>PERÍODO:</strong> ${periodoDescricao}</div>
            <div><strong>EMITIDO EM:</strong> ${dataEmissao}</div>
            <div><strong>EMISSOR:</strong> ${operadorAtivo.codigo} - ${operadorAtivo.nome}</div>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total no Período</div>
            <div class="value">${stats.total}</div>
          </div>
          <div class="summary-card">
            <div class="label">Infrações de Moradores</div>
            <div class="value" style="color:#b91c1c;">${stats.moradores}</div>
          </div>
          <div class="summary-card">
            <div class="label">Ocorrências Internas</div>
            <div class="value" style="color:#0284c7;">${stats.internas}</div>
          </div>
          <div class="summary-card">
            <div class="label">Resolvidas / Pendentes</div>
            <div class="value" style="font-size:15px;margin-top:5px;">
              <span style="color:#059669;">${stats.resolvidas} OK</span> / <span style="color:#dc2626;">${stats.pendentes} Pend.</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:18%;">Protocolo / Data</th>
              <th style="width:25%;">Classificação / Unidade</th>
              <th style="width:45%;">Relato dos Fatos & Providências</th>
              <th style="width:12%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${
              ocorrenciasFiltradas.length > 0
                ? rowsHtml
                : '<tr><td colspan="4" style="text-align:center;padding:30px;color:#64748b;">Nenhuma ocorrência registrada no período selecionado.</td></tr>'
            }
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-line">
            <strong>${operadorAtivo.nome} (${operadorAtivo.cargo})</strong><br/>
            Responsável pelo Posto / Emissor INFPORT
          </div>
          <div class="sig-line">
            <strong>Administradora / Síndico(a)</strong><br/>
            Ciente e Recebido para Providências Regimentais
          </div>
        </div>

        <div class="footer-note">
          Sistema INFPORT Gestão Patrimonial • Documento oficial inviolável emitido em conformidade com o regimento interno do condomínio.
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Copia o resumo em texto formatado para enviar no WhatsApp ou e-mail da administradora
  const handleCopiarResumoTexto = () => {
    let texto = `📋 *RELATÓRIO CONSOLIDADO DE OCORRÊNCIAS*\n`;
    texto += `*Condomínio:* ${condominio.nome}\n`;
    texto += `*Período:* ${periodoDescricao}\n`;
    texto += `*Total de Registros:* ${stats.total}\n\n`;
    texto += `📊 *Resumo Geral:*\n`;
    texto += `• Infrações de Moradores: ${stats.moradores}\n`;
    texto += `• Ocorrências Internas: ${stats.internas}\n`;
    texto += `• Situação: ${stats.resolvidas} resolvidas | ${stats.pendentes} pendentes\n\n`;
    texto += `📌 *Destaque dos Casos do Período:*\n`;

    ocorrenciasFiltradas.slice(0, 10).forEach((o, i) => {
      texto += `\n${i + 1}. *[${o.codigo}]* - ${o.categoria}\n`;
      texto += `   Data: ${o.dataHora}\n`;
      if (o.unidadeInfratora) {
        texto += `   Unidade: ${o.unidadeInfratora}\n`;
      }
      texto += `   Fato: ${o.descricao}\n`;
      if (o.providenciasTomadas) {
        texto += `   Providência: ${o.providenciasTomadas}\n`;
      }
      texto += `   Status: ${o.statusOcorrencia || 'Pendente'}\n`;
    });

    if (ocorrenciasFiltradas.length > 10) {
      texto += `\n_...e mais ${ocorrenciasFiltradas.length - 10} registros detalhados no relatório completo em anexo._\n`;
    }

    texto += `\nEmitido por: ${operadorAtivo.nome} via INFPORT`;

    navigator.clipboard.writeText(texto).then(() => {
      setCopiadoFeedback(true);
      setTimeout(() => setCopiadoFeedback(false), 3000);
    });
  };

  // Enviar resumo para o WhatsApp do Síndico / Administradora
  const handleEnviarWhatsAppSindico = () => {
    if (!condominio.telefoneSindico) {
      alert('Telefone do síndico/administradora não configurado no Módulo 01.');
      return;
    }
    const textoResumo = `📋 *RELATÓRIO DE OCORRÊNCIAS - ${condominio.nome}*
*Período:* ${periodoDescricao}
*Total:* ${stats.total} ocorrência(s) registrada(s).

• Infrações Regimentais: ${stats.moradores}
• Ocorrências Internas do Posto: ${stats.internas}
• Status: ${stats.resolvidas} resolvidas / ${stats.pendentes} pendentes.

Relatório oficial consolidado emitido para análise da administradora.`;

    const url = buildWhatsAppDeepLink(condominio.telefoneSindico, textoResumo);
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border-b border-slate-700/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-500/15 text-rose-400 rounded-2xl border border-rose-500/30">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                  RELATÓRIO DE OCORRÊNCIAS EM PDF
                </h3>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 rounded border border-rose-500/30">
                  {tituloContexto}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consolidação oficial para envio à Administradora do Condomínio e Síndico: <strong className="text-slate-200">{condominio.nome}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA DE FILTROS E CONTROLES */}
        <div className="p-3.5 sm:p-4 bg-slate-850 border-b border-slate-800 space-y-3">
          {/* Linha 1: Seleção de Período Rápido */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0 mr-1">
              <Calendar className="w-3.5 h-3.5 text-rose-400" /> Período:
            </span>

            {[
              { id: 'hoje', label: 'Hoje' },
              { id: '7dias', label: 'Últimos 7 dias' },
              { id: '15dias', label: 'Últimos 15 dias' },
              { id: 'mesAtual', label: 'Mês Atual' },
              { id: 'mesAnterior', label: 'Mês Anterior' },
              { id: 'todos', label: 'Todos' },
              { id: 'personalizado', label: 'Personalizado' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodo(p.id as PeriodoTipo)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  periodo === p.id
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/50 scale-105'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/70'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Linha 2 (Opcional): Seletor de Datas Personalizadas */}
          {periodo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-bold">De:</span>
                <input
                  type="date"
                  value={dataInicioCustom}
                  onChange={(e) => setDataInicioCustom(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-bold">Até:</span>
                <input
                  type="date"
                  value={dataFimCustom}
                  onChange={(e) => setDataFimCustom(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* Linha 3: Filtros de Tipo, Status e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 font-semibold w-full focus:outline-none"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="Morador (Regimento)">Somente Morador (Regimento)</option>
                <option value="Interna (Posto)">Somente Interna (Posto)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 font-semibold w-full focus:outline-none"
              >
                <option value="todos">Todos os Status</option>
                <option value="Pendente">Apenas Pendentes / Em Análise</option>
                <option value="Resolvido">Apenas Resolvidos / Vistos</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por unidade, palavra, código..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 w-full focus:outline-none"
              />
              {buscaTexto && (
                <button type="button" onClick={() => setBuscaTexto('')} className="text-slate-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO DO DOCUMENTO OFICIAL (ESTILO FOLHA A4) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950/60">
          <div
            ref={printAreaRef}
            className="bg-white text-slate-900 rounded-2xl p-5 sm:p-8 shadow-xl max-w-4xl mx-auto space-y-6 border border-slate-200"
          >
            {/* CABEÇALHO DO DOCUMENTO IMPRESSO */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight uppercase">
                      {condominio.nome}
                    </h1>
                    <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wide">
                      RELATÓRIO CONSOLIDADO DE OCORRÊNCIAS & INFRAÇÕES REGIMENTAIS
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 mt-2 space-y-0.5">
                  <p><strong>CNPJ:</strong> {condominio.cnpj || 'Não cadastrado'} | <strong>Endereço:</strong> {condominio.endereco || 'Portaria'}</p>
                  <p><strong>Síndico(a):</strong> {condominio.nomeSindico || 'Administração'} | <strong>Telefone Portaria:</strong> {condominio.telefonePortaria || 'N/A'}</p>
                  <p className="text-slate-800 font-semibold">
                    Destinado à: Administradora do Condomínio / Síndico(a) / Conselho Fiscal
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right text-[11px] text-slate-600 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <p><strong>Período:</strong> <span className="text-rose-700 font-bold">{periodoDescricao}</span></p>
                <p><strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}</p>
                <p><strong>Responsável:</strong> {operadorAtivo.codigo} - {operadorAtivo.nome}</p>
                <p><strong>Total de Registros:</strong> <span className="font-bold text-slate-900">{stats.total}</span></p>
              </div>
            </div>

            {/* QUADRO DE RESUMO ESTATÍSTICO */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Total Geral</span>
                <span className="text-xl font-black text-slate-900">{stats.total}</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 block">Morador (Regimento)</span>
                <span className="text-xl font-black text-rose-700">{stats.moradores}</span>
              </div>
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 block">Internas (Posto)</span>
                <span className="text-xl font-black text-sky-700">{stats.internas}</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Situação</span>
                <span className="text-xs font-bold text-emerald-700 block mt-1">
                  {stats.resolvidas} Resolvidas / {stats.pendentes} Pendentes
                </span>
              </div>
            </div>

            {/* TABELA CONSOLIDADA DE OCORRÊNCIAS */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                    <th className="p-2.5 rounded-l-lg">Código / Data</th>
                    <th className="p-2.5">Tipo & Categoria</th>
                    <th className="p-2.5">Unidade / Envolvidos</th>
                    <th className="p-2.5">Fato & Providências</th>
                    <th className="p-2.5 rounded-r-lg text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {ocorrenciasFiltradas.length > 0 ? (
                    ocorrenciasFiltradas.map((oco, idx) => {
                      const isMorador = oco.tipo === 'Morador (Regimento)';
                      const st = oco.statusOcorrencia || 'Pendente';
                      return (
                        <tr key={oco.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="p-2.5 align-top font-mono text-[11px] font-bold text-slate-800">
                            {oco.codigo}
                            <span className="block font-sans text-[10px] text-slate-500 font-normal mt-0.5">
                              {oco.dataHora}
                            </span>
                          </td>

                          <td className="p-2.5 align-top">
                            <span className="font-bold text-slate-900 block">{oco.categoria}</span>
                            <span className="text-[10px] text-slate-500 block">{oco.tipo}</span>
                            {oco.severidade && (
                              <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                {oco.severidade === 'Crítica' ? '🔴 Crítica' : oco.severidade === 'Média' ? '🟡 Média' : '🟢 Baixa'}
                              </span>
                            )}
                          </td>

                          <td className="p-2.5 align-top">
                            {isMorador ? (
                              <div className="space-y-0.5">
                                <span className="font-bold text-rose-700 block">
                                  Infratora: {oco.unidadeInfratora || 'Não informada'}
                                </span>
                                {oco.unidadeReclamante && (
                                  <span className="text-[10px] text-slate-600 block">
                                    Reclamante: {oco.unidadeReclamante}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Equipamento/Posto</span>
                            )}
                            <span className="text-[10px] text-slate-500 block mt-1">Op: {oco.operadorNome}</span>
                          </td>

                          <td className="p-2.5 align-top text-slate-700 space-y-1.5">
                            <p className="line-clamp-3 font-medium">{oco.descricao}</p>
                            {oco.providenciasTomadas && (
                              <div className="text-[10px] text-sky-800 bg-sky-50 p-1.5 rounded border border-sky-100">
                                <strong>Providências:</strong> {oco.providenciasTomadas}
                              </div>
                            )}
                            {oco.observacaoResolucao && (
                              <div className="text-[10px] text-emerald-800 bg-emerald-50 p-1.5 rounded border border-emerald-100">
                                <strong>Despacho Supervisor:</strong> {oco.observacaoResolucao} ({oco.resolvidoPor || 'Coordenação'})
                              </div>
                            )}
                          </td>

                          <td className="p-2.5 align-top text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                st === 'Resolvido'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : st === 'Visto'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {st}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Nenhuma ocorrência encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BLOCO DE ASSINATURA E PROTOCOLO */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs text-slate-600">
              <div className="space-y-1">
                <div className="h-10 border-b border-slate-400" />
                <p className="font-bold text-slate-800">{operadorAtivo.nome} ({operadorAtivo.cargo})</p>
                <p className="text-[10px]">Supervisor / Líder Operacional INFPORT</p>
              </div>

              <div className="space-y-1">
                <div className="h-10 border-b border-slate-400" />
                <p className="font-bold text-slate-800">Administradora do Condomínio / Síndico(a)</p>
                <p className="text-[10px]">Recebido e Ciente para Providências Regimentais</p>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MODAL COM BOTÕES DE AÇÃO */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>
              Exibindo <strong className="text-white">{ocorrenciasFiltradas.length}</strong> de <strong className="text-white">{ocorrencias.filter((o) => o.condominioId === condominio.id).length}</strong> ocorrências
            </span>
            {copiadoFeedback && (
              <span className="text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> Resumo copiado com sucesso!
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopiarResumoTexto}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer active:scale-95"
              title="Copiar resumo textual para colar no WhatsApp ou E-mail"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copiar Resumo</span>
            </button>

            {condominio.telefoneSindico && (
              <button
                type="button"
                onClick={handleEnviarWhatsAppSindico}
                className="px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Abre o WhatsApp direto do Síndico / Administradora"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">WhatsApp Síndico</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleImprimirRelatorio}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>[ 🖨️ IMPRIMIR / SALVAR PDF ]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
