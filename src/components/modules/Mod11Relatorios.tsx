import React, { useState } from 'react';
import { FileSpreadsheet, Download, Filter, MessageSquare, TrendingUp, ShieldCheck, CheckCircle2, Layers } from 'lucide-react';
import {
  Condominio,
  Operador,
  ItemEncomenda,
  ItemCustodia,
  Chave,
  ChamadoManutencao,
  ExecucaoRonda,
  Ocorrencia,
  PassagemPosto,
  Autorizado
} from '../../types';
import { buildWhatsAppDeepLink } from '../../lib/whatsapp';

interface Mod11RelatoriosProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  itensEncomenda: ItemEncomenda[];
  custodias: ItemCustodia[];
  chaves: Chave[];
  chamados: ChamadoManutencao[];
  execucoesRonda: ExecucaoRonda[];
  ocorrencias: Ocorrencia[];
  passagens: PassagemPosto[];
  autorizados: Autorizado[];
}

export const Mod11Relatorios: React.FC<Mod11RelatoriosProps> = ({
  condominioAtivo,
  operadorAtivo,
  itensEncomenda,
  custodias,
  chaves,
  chamados,
  execucoesRonda,
  ocorrencias,
  passagens,
  autorizados
}) => {
  const [moduloFiltro, setModuloFiltro] = useState<string>('todos');

  // Filtrados pelo condomínio ativo
  const encs = itensEncomenda.filter((i) => i.condominioId === condominioAtivo.id);
  const custs = custodias.filter((c) => c.condominioId === condominioAtivo.id);
  const chvs = chaves.filter((c) => c.condominioId === condominioAtivo.id);
  const mants = chamados.filter((m) => m.condominioId === condominioAtivo.id);
  const ronds = execucoesRonda.filter((r) => r.condominioId === condominioAtivo.id);
  const ocos = ocorrencias.filter((o) => o.condominioId === condominioAtivo.id);
  const pass = passagens.filter((p) => p.condominioId === condominioAtivo.id);
  const auts = autorizados.filter((a) => a.condominioId === condominioAtivo.id);

  // Função para exportação CSV pura client-side ($0 custo)
  const exportarCSV = () => {
    let linhas: string[] = [];

    if (moduloFiltro === 'todos' || moduloFiltro === 'encomendas') {
      linhas.push('--- ENCOMENDAS ---');
      linhas.push('ID;Lote_RE;Unidade;Morador;Status;Recebido_Em;Operador;Entregue_Para;Data_Entrega');
      encs.forEach((e) => {
        linhas.push(
          `${e.id};${e.codigoRE};${e.unidade};${e.moradorNome};${e.status};${e.dataRecebimento};${e.operadorRecebimentoNome};${e.retiranteNome || ''};${e.dataEntrega || ''}`
        );
      });
      linhas.push('');
    }

    if (moduloFiltro === 'todos' || moduloFiltro === 'ocorrencias') {
      linhas.push('--- OCORRÊNCIAS ---');
      linhas.push('Código;Tipo;Categoria;Severidade;Descrição;Operador;Data_Hora');
      ocos.forEach((o) => {
        linhas.push(
          `${o.codigo};${o.tipo};${o.categoria};${o.severidade || ''};"${o.descricao.replace(/"/g, '""')}";${o.operadorNome};${o.dataHora}`
        );
      });
      linhas.push('');
    }

    if (moduloFiltro === 'todos' || moduloFiltro === 'rondas') {
      linhas.push('--- RONDAS PATRIMONIAIS ---');
      linhas.push('Código;Operador;Início;Fim;Status;Pontos_Lidos;Total_Pontos;Anomalias');
      ronds.forEach((r) => {
        linhas.push(
          `${r.codigoRonda};${r.operadorNome};${r.dataHoraInicio};${r.dataHoraFim || ''};${r.status};${r.pontosLidos};${r.totalPontos};"${r.anomalias.join(' | ')}"`
        );
      });
      linhas.push('');
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(linhas.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `INFPORT_RELATORIO_${condominioAtivo.codigo}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDispararWhatsAppDossie = () => {
    const texto = `📊 *INFPORT — DOSSIÊ GERENCIAL CONSOLIDADO*
Condomínio: ${condominioAtivo.nome}
Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}

📦 *Módulo Encomendas:*
• Total Registradas: ${encs.length}
• Retidas na Portaria: ${encs.filter((e) => e.status === 'retido').length}
• Entregues: ${encs.filter((e) => e.status === 'entregue').length}

🔑 *Módulo Chaves:*
• Chaves Fora do Quadro: ${chvs.filter((c) => c.status === 'retirada').length}
• Chaves Disponíveis: ${chvs.filter((c) => c.status === 'disponivel').length}

🛡️ *Módulo Ronda Patrimonial:*
• Rondas Executadas: ${ronds.length}
• Rondas 100% OK: ${ronds.filter((r) => r.status === 'Concluída 100% OK').length}

🛠️ *Módulo Manutenção:*
• Chamados Abertos: ${mants.filter((m) => m.status !== 'Concluído').length}
• Concluídos: ${mants.filter((m) => m.status === 'Concluído').length}

📋 *Livro de Ocorrências:*
• Total Registradas: ${ocos.length}

🔄 *Passagens de Posto:* ${pass.length} trocas auditadas.
👥 *Autorizados Ativos:* ${auts.length} pré-autorizações vigentes.

Relatório extraído pelo operador: ${operadorAtivo.codigo} - ${operadorAtivo.nome}`;

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, texto);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
              MÓDULO 11
            </span>
            <h1 className="text-lg font-bold text-white">Relatórios & Auditoria Operacional</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Exportação instantânea de auditorias em CSV e envio de dossiê gerencial via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Exportar Planilha (CSV)
          </button>
          <button
            onClick={handleDispararWhatsAppDossie}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/40 active:scale-95"
          >
            <MessageSquare className="w-4 h-4" /> Disparar Dossiê ao Síndico
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Encomendas</span>
          <p className="text-2xl font-black text-amber-400">{encs.length}</p>
          <p className="text-[11px] text-slate-400">{encs.filter((e) => e.status === 'retido').length} retidas na guarita</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Rondas Realizadas</span>
          <p className="text-2xl font-black text-emerald-400">{ronds.length}</p>
          <p className="text-[11px] text-slate-400">100% com GPS e QR Code</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">OSs Manutenção</span>
          <p className="text-2xl font-black text-orange-400">{mants.length}</p>
          <p className="text-[11px] text-slate-400">{mants.filter((m) => m.status === 'Concluído').length} concluídas</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Ocorrências</span>
          <p className="text-2xl font-black text-rose-400">{ocos.length}</p>
          <p className="text-[11px] text-slate-400">Livro de registro auditado</p>
        </div>
      </div>

      {/* Tabela de Amostra de Auditoria */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Pré-Visualização dos Registros Operacionais
          </h2>

          <select
            value={moduloFiltro}
            onChange={(e) => setModuloFiltro(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="todos">Todos os Módulos (Consolidado)</option>
            <option value="encomendas">Módulo 02 - Encomendas</option>
            <option value="ocorrencias">Módulo 08 - Ocorrências</option>
            <option value="rondas">Módulo 07 - Rondas</option>
          </select>
        </div>

        <div className="space-y-2">
          {encs.slice(0, 5).map((e) => (
            <div
              key={e.id}
              className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-mono text-amber-400 font-bold">{e.codigoRE}</span>
                <span className="ml-2 text-white font-bold">{e.unidade} - {e.moradorNome}</span>
                <p className="text-[11px] text-slate-400">Recebido por {e.operadorRecebimentoNome} em {e.dataRecebimento}</p>
              </div>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  e.status === 'entregue'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                }`}
              >
                {e.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
