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
  FileSpreadsheet
} from 'lucide-react';
import {
  Condominio,
  Operador,
  HistoricoAtividade,
  CategoriaAtividade,
  NivelAtividade
} from '../../types';

interface Mod12HistoricoProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  operadores: Operador[];
  atividades: HistoricoAtividade[];
  onAddAtividade: (atividade: Omit<HistoricoAtividade, 'id' | 'dataHora'> & { dataHora?: string }) => void;
}

type PeriodoTipo = 'hoje' | '7dias' | '15dias' | 'mesAtual' | 'todos' | 'personalizado';

export const Mod12Historico: React.FC<Mod12HistoricoProps> = ({
  condominioAtivo,
  operadorAtivo,
  operadores,
  atividades,
  onAddAtividade
}) => {
  // Filtros
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

  // Parser de data flexível (ISO ou pt-BR)
  const parseData = (dataStr: string): Date | null => {
    if (!dataStr) return null;
    if (dataStr.includes('T') || dataStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dataStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const match = dataStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) {
      const [, dia, mes, ano] = match;
      return new Date(Number(ano), Number(mes) - 1, Number(dia));
    }
    const fallback = new Date(dataStr);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  // Cálculo dos limites do período selecionado
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
    } else if (periodo === 'personalizado') {
      const [anoI, mesI, diaI] = (dataInicioCustom || '').split('-').map(Number);
      const [anoF, mesF, diaF] = (dataFimCustom || '').split('-').map(Number);
      ini = new Date(anoI || agora.getFullYear(), (mesI ? mesI - 1 : 0), diaI || 1, 0, 0, 0, 0);
      fim = new Date(anoF || agora.getFullYear(), (mesF ? mesF - 1 : 11), diaF || 28, 23, 59, 59, 999);
      desc = `Personalizado (${ini.toLocaleDateString('pt-BR')} a ${fim.toLocaleDateString('pt-BR')})`;
    } else {
      ini = new Date(2020, 0, 1);
      fim = new Date(2035, 11, 31);
      desc = 'Histórico Geral Completo';
    }

    return { dataInicioLimite: ini, dataFimLimite: fim, periodoDescricao: desc };
  }, [periodo, dataInicioCustom, dataFimCustom]);

  // Filtragem das atividades do condomínio ativo
  const atividadesFiltradas = useMemo(() => {
    return atividades
      .filter((a) => a.condominioId === condominioAtivo.id)
      .filter((a) => {
        // Filtro por Data
        if (periodo !== 'todos') {
          const dt = parseData(a.dataHora);
          if (dt && (dt < dataInicioLimite || dt > dataFimLimite)) {
            return false;
          }
        }
        // Filtro por Categoria
        if (categoriaFiltro !== 'todas' && a.categoria !== categoriaFiltro) {
          return false;
        }
        // Filtro por Nível
        if (nivelFiltro !== 'todos' && a.nivel !== nivelFiltro) {
          return false;
        }
        // Filtro por Operador
        if (operadorFiltro !== 'todos' && a.operadorNome !== operadorFiltro) {
          return false;
        }
        // Busca textual
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
        return dtB - dtA; // Mais recentes primeiro
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

  // Estatísticas
  const stats = useMemo(() => {
    const total = atividadesFiltradas.length;
    const sucessos = atividadesFiltradas.filter((a) => a.nivel === 'sucesso').length;
    const avisos = atividadesFiltradas.filter((a) => a.nivel === 'aviso').length;
    const criticos = atividadesFiltradas.filter((a) => a.nivel === 'critico').length;
    const infos = atividadesFiltradas.filter((a) => a.nivel === 'info').length;

    return { total, sucessos, avisos, criticos, infos };
  }, [atividadesFiltradas]);

  // Helper de ícone por categoria
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

  // Helper de cor por nível
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

  // Exportar histórico filtrado para CSV (compatível com Excel)
  const handleExportarCsv = () => {
    if (atividadesFiltradas.length === 0) {
      alert('Nenhuma atividade disponível para exportação com os filtros atuais.');
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
  };

  // Salvar Nova Anotação Manual
  const handleSalvarNovaAnotacao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAcao.trim() || !novaDescricao.trim()) {
      alert('Por favor, preencha o título e a descrição do evento.');
      return;
    }

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
  };

  return (
    <div className="space-y-4">
      {/* HEADER DO MÓDULO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> MÓDULO 12: HISTÓRICO & AUDITORIA
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Posto: <strong className="text-white">{condominioAtivo.nome}</strong> ({condominioAtivo.codigo})
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
            Histórico Operacional & Trilha de Auditoria
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro cronológico inviolável de todas as movimentações de guarita, encomendas, chaves, rondas e turnos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </div>

      {/* QUADRO DE RESUMO ESTATÍSTICO */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total de Atividades</span>
          <span className="text-xl font-black text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Sucesso / Concluídas</span>
          <span className="text-xl font-black text-emerald-400 mt-1 block">{stats.sucessos}</span>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Avisos & Alertas</span>
          <span className="text-xl font-black text-amber-400 mt-1 block">{stats.avisos}</span>
        </div>
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">Eventos Críticos</span>
          <span className="text-xl font-black text-rose-400 mt-1 block">{stats.criticos}</span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodo === p.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 scale-105'
                  : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Inputs de Data Personalizada */}
        {periodo === 'personalizado' && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-850 rounded-xl border border-slate-750 animate-in fade-in">
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

        {/* Linha de Filtros por Módulo, Nível, Operador e Busca */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Categoria / Módulo */}
          <div className="flex items-center gap-1.5 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold w-full focus:outline-none"
            >
              <option value="todas">Todos os Módulos</option>
              <option value="login">Turno / Autenticação</option>
              <option value="encomendas">Encomendas (Lotes & Pacotes)</option>
              <option value="custodia">Custódia de Pertences</option>
              <option value="chaves">Quadro de Chaves</option>
              <option value="materiais">Materiais do Posto</option>
              <option value="manutencao">Manutenção & O.S.</option>
              <option value="ronda">Rondas Patrimoniais</option>
              <option value="ocorrencias">Livro de Ocorrências</option>
              <option value="passagem">Passagens de Posto</option>
              <option value="autorizados">Autorizados & Visitantes</option>
              <option value="cadastros">Cadastros & Sistema</option>
              <option value="geral">Anotações Gerais</option>
            </select>
          </div>

          {/* Nível de Gravidade */}
          <div className="flex items-center gap-1.5 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={nivelFiltro}
              onChange={(e) => setNivelFiltro(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold w-full focus:outline-none"
            >
              <option value="todos">Todos os Níveis</option>
              <option value="sucesso">Sucesso / Concluído</option>
              <option value="info">Informativo</option>
              <option value="aviso">Atenção / Advertência</option>
              <option value="critico">Crítico / Urgente</option>
            </select>
          </div>

          {/* Operador */}
          <div className="flex items-center gap-1.5 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={operadorFiltro}
              onChange={(e) => setOperadorFiltro(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-semibold w-full focus:outline-none"
            >
              <option value="todos">Todos os Operadores</option>
              {Array.from(new Set(atividades.filter((a) => a.condominioId === condominioAtivo.id).map((a) => a.operadorNome))).map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>

          {/* Busca Textual */}
          <div className="flex items-center gap-1.5 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-700">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Buscar ação, código, relato..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="bg-transparent text-xs text-slate-200 placeholder-slate-500 w-full focus:outline-none"
            />
            {buscaTexto && (
              <button
                type="button"
                onClick={() => setBuscaTexto('')}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FEED DE ATIVIDADES CRONOLÓGICO */}
      <div className="space-y-2.5">
        {atividadesFiltradas.length > 0 ? (
          atividadesFiltradas.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all shadow-sm space-y-2.5 group"
            >
              {/* Linha Superior: Categoria, Data/Hora, Código e Nível */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-800 rounded-lg border border-slate-700">
                    {getIconeCategoria(item.categoria)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {item.acao}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {item.moduloOrigem}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.codigo && (
                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-850 px-2 py-0.5 rounded border border-slate-750">
                      {item.codigo}
                    </span>
                  )}
                  {getNivelBadge(item.nivel)}
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" /> {item.dataHora}
                  </span>
                </div>
              </div>

              {/* Descrição Principal do Fato */}
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                {item.descricao}
              </p>

              {/* Detalhes Complementares (se houver) */}
              {item.detalhes && (
                <div className="p-2.5 bg-slate-850/80 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                  <strong>Detalhes:</strong> {item.detalhes}
                </div>
              )}

              {/* Rodapé do Card: Operador Responsável */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Responsável: <strong className="text-slate-200">{item.operadorNome}</strong></span>
                </div>
                <span className="text-[10px] text-slate-500">INFPORT Audit Trail</span>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
            <History className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhuma atividade encontrada</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Não foram encontrados registros para os filtros selecionados. Tente alterar o período ou a busca textual.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR NOVA ANOTAÇÃO OPERACIONAL MANUAL */}
      {modalNovaAnotacao && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            {/* Header do Modal */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Registrar Anotação Operacional</h3>
                  <p className="text-[11px] text-slate-400">Livro digital de atividades do posto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaAnotacao(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvarNovaAnotacao} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Categoria *</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="geral">Anotação Geral</option>
                    <option value="encomendas">Encomendas</option>
                    <option value="chaves">Chaves</option>
                    <option value="custodia">Custódia</option>
                    <option value="materiais">Materiais</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="ronda">Ronda</option>
                    <option value="ocorrencias">Ocorrência</option>
                    <option value="autorizados">Autorizados</option>
                    <option value="login">Turno</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nível / Prioridade *</label>
                  <select
                    value={novoNivel}
                    onChange={(e) => setNovoNivel(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="info">Informativo</option>
                    <option value="sucesso">Sucesso / Concluído</option>
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
