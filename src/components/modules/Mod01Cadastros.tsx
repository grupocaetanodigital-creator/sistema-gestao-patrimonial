import React, { useState } from 'react';
import {
  Building2,
  Users,
  Home,
  Plus,
  Search,
  Check,
  ShieldCheck,
  Edit2,
  Sliders,
  MessageSquare,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
  X,
  Phone,
  UserCheck,
  Database,
  Download,
  Trash2,
  Clock,
  MapPin,
  Package,
  FileDown,
  Lock,
  CheckCircle2,
  Cloud,
  FileSpreadsheet
} from 'lucide-react';
import { Condominio, Operador, Morador, FeatureFlags, getTurnoAtual } from '../../types';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../../lib/whatsapp';
import { mockDb } from '../../data/mockDatabase';
import { SupabaseTab } from './SupabaseTab';

interface Mod01CadastrosProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  condominios: Condominio[];
  operadores: Operador[];
  moradores: Morador[];
  onAddCondominio: (cond: Condominio) => void;
  onUpdateCondominio: (cond: Condominio) => void;
  onAddOperador: (op: Operador) => void;
  onUpdateOperador: (op: Operador) => void;
  onAddMorador: (morador: Morador) => void;
  onUpdateMorador: (morador: Morador) => void;
}

export const Mod01Cadastros: React.FC<Mod01CadastrosProps> = ({
  condominioAtivo,
  operadorAtivo,
  condominios,
  operadores,
  moradores,
  onAddCondominio,
  onUpdateCondominio,
  onAddOperador,
  onUpdateOperador,
  onAddMorador,
  onUpdateMorador
}) => {
  const cargoLower = operadorAtivo.cargo?.toLowerCase() || '';

  // 1. Desenvolvedor Master / Admin Geral (acesso irrestrito incluindo Supabase)
  const isMasterDev =
    operadorAtivo.login === 'admin' ||
    operadorAtivo.role === 'master' ||
    operadorAtivo.cargo === 'Desenvolvedor Master' ||
    cargoLower.includes('desenvolvedor');

  // 2. Supervisor / Diretor / Adm Operacional (gestão de postos e moradores, SEM ACESSO AO SUPABASE)
  const isSupervisorOrAdmin =
    !isMasterDev &&
    (operadorAtivo.role === 'supervisor' ||
     operadorAtivo.role === 'admin' ||
     cargoLower.includes('supervisor') ||
     cargoLower.includes('diretor') ||
     cargoLower.includes('admin'));

  // 3. Vigilante / Ronda e Manutencionista (NÃO PODEM TER ACESSO À ABA CADASTROS)
  const isVigilanteOuManutencao =
    cargoLower.includes('ronda') ||
    cargoLower.includes('vigilante') ||
    cargoLower.includes('manuten');

  // 4. Porteiro (SÓ PODE TER ACESSO À ABA DE CADASTRO DE MORADORES DO CONDOMÍNIO QUE TRABALHA)
  const isPorteiro = !isMasterDev && !isSupervisorOrAdmin && !isVigilanteOuManutencao;

  // Abas conforme especificação:
  // (1) DADOS CONDOMÍNIO  (2) OPERADORES & RBAC  (3) FEATURE FLAGS  (4) WHATSAPP TEMPLATES  (5) MORADORES  (6) BACKUP  (7) SUPABASE
  const [tabAtiva, setTabAtiva] = useState<
    'condominio' | 'operadores' | 'flags' | 'whatsapp' | 'moradores' | 'backup' | 'supabase'
  >(isPorteiro ? 'moradores' : 'condominio');

  // Assegura que o Porteiro permaneça fixo em moradores e o Supervisor não caia no Supabase
  React.useEffect(() => {
    if (isPorteiro && tabAtiva !== 'moradores') {
      setTabAtiva('moradores');
    } else if (isSupervisorOrAdmin && tabAtiva === 'supabase') {
      setTabAtiva('condominio');
    }
  }, [isPorteiro, isSupervisorOrAdmin, tabAtiva]);

  // ---------- ESTADO DE EDIÇÃO DO CONDOMÍNIO ----------
  const [condNome, setCondNome] = useState(condominioAtivo.nome);
  const [condCnpj, setCondCnpj] = useState(condominioAtivo.cnpj);
  const [condEndereco, setCondEndereco] = useState(condominioAtivo.endereco);
  const [condTelPortaria, setCondTelPortaria] = useState(condominioAtivo.telefonePortaria);
  const [condSindico, setCondSindico] = useState(condominioAtivo.nomeSindico);
  const [condTelSindico, setCondTelSindico] = useState(condominioAtivo.telefoneSindico);
  const [condInicioObras, setCondInicioObras] = useState(condominioAtivo.horarioInicioObras);
  const [condFimObras, setCondFimObras] = useState(condominioAtivo.horarioFimObras);
  const [condIntervaloRonda, setCondIntervaloRonda] = useState(condominioAtivo.intervaloRondaMinutos);
  const [condTipoEstrutura, setCondTipoEstrutura] = useState<Condominio['tipoEstrutura']>(
    condominioAtivo.tipoEstrutura || 'Blocos'
  );
  const [condQtdBlocos, setCondQtdBlocos] = useState<number>(condominioAtivo.quantidadeBlocos || 2);
  const [condUnidadesPorBloco, setCondUnidadesPorBloco] = useState<number>(
    condominioAtivo.unidadesPorBloco || 40
  );
  const [condListaBlocos, setCondListaBlocos] = useState<string>(
    (condominioAtivo.listaBlocos || ['Bloco A', 'Bloco B']).join(', ')
  );

  // ---------- LOCAIS DE ARMAZENAMENTO DE ENCOMENDAS ----------
  const [locaisArmazenamento, setLocaisArmazenamento] = useState<string[]>(
    condominioAtivo.locaisArmazenamento || [
      'Portaria - Prateleira A',
      'Portaria - Prateleira B',
      'Armário 01',
      'Armário 02',
      'Bancada Principal',
      'Chão / Caixas Grandes'
    ]
  );
  const [novoLocalArmazenamento, setNovoLocalArmazenamento] = useState('');
  const [editandoLocalIdx, setEditandoLocalIdx] = useState<number | null>(null);
  const [editandoLocalTexto, setEditandoLocalTexto] = useState('');

  // ---------- TURNOS DE PLANTÃO DO CONDOMÍNIO ----------
  const [turnoDiurnoNome, setTurnoDiurnoNome] = useState(
    condominioAtivo.turnos?.diurno.nome || 'Plantão Diurno'
  );
  const [turnoDiurnoInicio, setTurnoDiurnoInicio] = useState(
    condominioAtivo.turnos?.diurno.inicio || '07:00'
  );
  const [turnoDiurnoFim, setTurnoDiurnoFim] = useState(
    condominioAtivo.turnos?.diurno.fim || '19:00'
  );

  const [turnoNoturnoNome, setTurnoNoturnoNome] = useState(
    condominioAtivo.turnos?.noturno.nome || 'Plantão Noturno'
  );
  const [turnoNoturnoInicio, setTurnoNoturnoInicio] = useState(
    condominioAtivo.turnos?.noturno.inicio || '19:00'
  );
  const [turnoNoturnoFim, setTurnoNoturnoFim] = useState(
    condominioAtivo.turnos?.noturno.fim || '07:00'
  );

  // ---------- ESTADO DE FEATURE FLAGS ----------
  const [flags, setFlags] = useState<FeatureFlags>(condominioAtivo.featureFlags);
  const [flagsSalvasMsg, setFlagsSalvasMsg] = useState(false);

  // ---------- ESTADO DE BACKUP ----------
  const [condominioBackupId, setCondominioBackupId] = useState(condominioAtivo.id);
  const [backupStatusMsg, setBackupStatusMsg] = useState('');

  // Sincronizar quando mudar o condomínio ativo
  React.useEffect(() => {
    setCondNome(condominioAtivo.nome);
    setCondCnpj(condominioAtivo.cnpj);
    setCondEndereco(condominioAtivo.endereco);
    setCondTelPortaria(condominioAtivo.telefonePortaria);
    setCondSindico(condominioAtivo.nomeSindico);
    setCondTelSindico(condominioAtivo.telefoneSindico);
    setCondInicioObras(condominioAtivo.horarioInicioObras);
    setCondFimObras(condominioAtivo.horarioFimObras);
    setCondIntervaloRonda(condominioAtivo.intervaloRondaMinutos);
    setCondTipoEstrutura(condominioAtivo.tipoEstrutura || 'Blocos');
    setCondQtdBlocos(condominioAtivo.quantidadeBlocos || 2);
    setCondUnidadesPorBloco(condominioAtivo.unidadesPorBloco || 40);
    setCondListaBlocos((condominioAtivo.listaBlocos || ['Bloco A', 'Bloco B']).join(', '));
    setLocaisArmazenamento(
      condominioAtivo.locaisArmazenamento || [
        'Portaria - Prateleira A',
        'Portaria - Prateleira B',
        'Armário 01',
        'Armário 02',
        'Bancada Principal',
        'Chão / Caixas Grandes'
      ]
    );
    setTurnoDiurnoNome(condominioAtivo.turnos?.diurno.nome || 'Plantão Diurno');
    setTurnoDiurnoInicio(condominioAtivo.turnos?.diurno.inicio || '07:00');
    setTurnoDiurnoFim(condominioAtivo.turnos?.diurno.fim || '19:00');
    setTurnoNoturnoNome(condominioAtivo.turnos?.noturno.nome || 'Plantão Noturno');
    setTurnoNoturnoInicio(condominioAtivo.turnos?.noturno.inicio || '19:00');
    setTurnoNoturnoFim(condominioAtivo.turnos?.noturno.fim || '07:00');
    setFlags(condominioAtivo.featureFlags);
    setCondominioBackupId(condominioAtivo.id);
  }, [condominioAtivo]);

  // Handlers para Locais de Armazenamento
  const handleAdicionarLocal = () => {
    const nome = novoLocalArmazenamento.trim();
    if (!nome) return;
    if (locaisArmazenamento.some((l) => l.toLowerCase() === nome.toLowerCase())) {
      alert('Este local já está cadastrado!');
      return;
    }
    const updated = [...locaisArmazenamento, nome];
    setLocaisArmazenamento(updated);
    setNovoLocalArmazenamento('');
  };

  const handleSalvarEdicaoLocal = (index: number) => {
    const nome = editandoLocalTexto.trim();
    if (!nome) return;
    const updated = [...locaisArmazenamento];
    updated[index] = nome;
    setLocaisArmazenamento(updated);
    setEditandoLocalIdx(null);
    setEditandoLocalTexto('');
  };

  const handleExcluirLocal = (index: number) => {
    if (locaisArmazenamento.length <= 1) {
      alert('É necessário ter ao menos um local de armazenamento.');
      return;
    }
    const updated = locaisArmazenamento.filter((_, i) => i !== index);
    setLocaisArmazenamento(updated);
  };

  // Helper para Download de Arquivos
  const handleDownloadArquivo = (conteudo: string, nomeArquivo: string, tipo: string) => {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setBackupStatusMsg(`✓ Arquivo gerado com sucesso: ${nomeArquivo}`);
    setTimeout(() => setBackupStatusMsg(''), 4000);
  };

  const exportarCsv = (itens: any[], prefixo: string) => {
    if (!itens || itens.length === 0) {
      alert('Nenhum dado registrado para este módulo neste condomínio.');
      return;
    }
    const headers = Object.keys(itens[0]).filter((k) => typeof itens[0][k] !== 'object');
    const rows = itens.map((item) =>
      headers
        .map((header) => {
          let val = item[header];
          if (val === undefined || val === null) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(';')
    );
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const condRef = condominios.find((c) => c.id === condominioBackupId) || condominioAtivo;
    const dataStr = new Date().toISOString().slice(0, 10);
    handleDownloadArquivo(
      csvContent,
      `backup_${prefixo}_${condRef.codigo}_${dataStr}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleSalvarCondominio = (e: React.FormEvent) => {
    e.preventDefault();
    const blocosArray = condListaBlocos
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);

    const atualizado: Condominio = {
      ...condominioAtivo,
      nome: condNome,
      cnpj: condCnpj,
      endereco: condEndereco,
      telefonePortaria: condTelPortaria,
      nomeSindico: condSindico,
      telefoneSindico: condTelSindico,
      horarioInicioObras: condInicioObras,
      horarioFimObras: condFimObras,
      intervaloRondaMinutos: Number(condIntervaloRonda),
      tipoEstrutura: condTipoEstrutura,
      quantidadeBlocos: Number(condQtdBlocos),
      unidadesPorBloco: Number(condUnidadesPorBloco),
      listaBlocos: blocosArray.length > 0 ? blocosArray : ['Bloco A', 'Bloco B'],
      locaisArmazenamento:
        locaisArmazenamento.length > 0
          ? locaisArmazenamento
          : ['Portaria - Prateleira A', 'Armário 01', 'Bancada'],
      turnos: {
        diurno: { inicio: turnoDiurnoInicio, fim: turnoDiurnoFim, nome: turnoDiurnoNome },
        noturno: { inicio: turnoNoturnoInicio, fim: turnoNoturnoFim, nome: turnoNoturnoNome }
      },
      featureFlags: flags
    };

    onUpdateCondominio(atualizado);
    setFlagsSalvasMsg(true);
    setTimeout(() => setFlagsSalvasMsg(false), 3000);
  };

  const handleToggleFlag = (key: keyof FeatureFlags) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    const condAtualizado: Condominio = {
      ...condominioAtivo,
      featureFlags: updated
    };
    onUpdateCondominio(condAtualizado);
    setFlagsSalvasMsg(true);
    setTimeout(() => setFlagsSalvasMsg(false), 2500);
  };

  // ---------- MODAL NOVO / EDITAR CONDOMÍNIO ----------
  const [modalNovoCond, setModalNovoCond] = useState(false);
  const [novoCondNome, setNovoCondNome] = useState('');
  const [novoCondCnpj, setNovoCondCnpj] = useState('');
  const [novoCondEndereco, setNovoCondEndereco] = useState('');
  const [novoCondTelPortaria, setNovoCondTelPortaria] = useState('');
  const [novoCondSindico, setNovoCondSindico] = useState('');
  const [novoCondTelSindico, setNovoCondTelSindico] = useState('');
  const [novoCondTipo, setNovoCondTipo] = useState<Condominio['tipoEstrutura']>('Blocos');
  const [novoCondBlocos, setNovoCondBlocos] = useState('Bloco 1, Bloco 2');

  const handleCriarCondominio = (e: React.FormEvent) => {
    e.preventDefault();
    const blocos = novoCondBlocos.split(',').map((b) => b.trim()).filter(Boolean);
    const novo: Condominio = {
      id: `cond_${Date.now()}`,
      codigo: `COND00${condominios.length + 1}`,
      nome: novoCondNome,
      cnpj: novoCondCnpj,
      endereco: novoCondEndereco,
      telefonePortaria: novoCondTelPortaria,
      nomeSindico: novoCondSindico,
      telefoneSindico: novoCondTelSindico,
      horarioInicioObras: '08:00',
      horarioFimObras: '17:00',
      intervaloRondaMinutos: 60,
      tipoEstrutura: novoCondTipo,
      quantidadeBlocos: blocos.length || 1,
      unidadesPorBloco: 40,
      listaBlocos: blocos.length > 0 ? blocos : ['Principal'],
      featureFlags: {
        mod02_encomendas: true,
        mod03_custodia: true,
        mod04_materiais: true,
        mod05_chaves: true,
        mod06_manutencao: true,
        mod07_ronda: true,
        mod08_ocorrencias: true,
        mod09_passagem: true,
        mod10_autorizados: true
      }
    };
    onAddCondominio(novo);
    setModalNovoCond(false);
    setNovoCondNome('');
    setNovoCondCnpj('');
    setNovoCondEndereco('');
  };

  // ---------- OPERADORES (EDIÇÃO & NOVO) ----------
  const [modalOperador, setModalOperador] = useState(false);
  const [operadorEditando, setOperadorEditando] = useState<Operador | null>(null);
  const [opNome, setOpNome] = useState('');
  const [opLogin, setOpLogin] = useState('');
  const [opPin, setOpPin] = useState('');
  const [opCargo, setOpCargo] = useState<Operador['cargo']>('Porteiro');
  const [opCondominiosAutorizados, setOpCondominiosAutorizados] = useState<string[]>([]);
  const [opAcessoTodos, setOpAcessoTodos] = useState(false);
  const [opErroValidacao, setOpErroValidacao] = useState('');
  const [buscaOperador, setBuscaOperador] = useState('');
  const [filtroPostoOperador, setFiltroPostoOperador] = useState<'todos' | 'ativo'>('todos');

  const abrirModalOperador = (op?: Operador) => {
    setOpErroValidacao('');
    if (op) {
      setOperadorEditando(op);
      setOpNome(op.nome);
      setOpLogin(op.login);
      setOpPin(op.pin);
      setOpCargo(op.cargo);
      const isTodos =
        op.cargo === 'Desenvolvedor Master' ||
        op.login === 'admin' ||
        op.condominiosAutorizados?.includes('TODOS');
      setOpAcessoTodos(isTodos);
      setOpCondominiosAutorizados(
        op.condominiosAutorizados && op.condominiosAutorizados.length > 0 && !op.condominiosAutorizados.includes('TODOS')
          ? op.condominiosAutorizados
          : [condominioAtivo.id]
      );
    } else {
      setOperadorEditando(null);
      setOpNome('');
      setOpLogin('');
      setOpPin('');
      setOpCargo('Porteiro');
      setOpAcessoTodos(false);
      setOpCondominiosAutorizados([condominioAtivo.id]);
    }
    setModalOperador(true);
  };

  const handleToggleCondominioOperador = (condId: string) => {
    setOpErroValidacao('');
    if (opCondominiosAutorizados.includes(condId)) {
      if (opCondominiosAutorizados.length === 1) {
        setOpErroValidacao('O operador deve possuir no mínimo 1 condomínio autorizado.');
        return;
      }
      setOpCondominiosAutorizados(opCondominiosAutorizados.filter((id) => id !== condId));
    } else {
      const limite = (opCargo === 'Supervisor' || opCargo === 'Diretor') ? 3 : 3;
      if (opCondominiosAutorizados.length >= limite) {
        setOpErroValidacao(`Limite atingido: Operadores podem ter acesso a no máximo ${limite} condomínios simultâneos.`);
        return;
      }
      setOpCondominiosAutorizados([...opCondominiosAutorizados, condId]);
    }
  };

  const handleSalvarOperador = (e: React.FormEvent) => {
    e.preventDefault();
    setOpErroValidacao('');

    let condominiosFinais: string[] = [];

    if (opCargo === 'Desenvolvedor Master') {
      condominiosFinais = condominios.map((c) => c.id);
    } else if ((opCargo === 'Supervisor' || opCargo === 'Diretor') && opAcessoTodos) {
      condominiosFinais = ['TODOS'];
    } else {
      if (opCondominiosAutorizados.length === 0) {
        setOpErroValidacao('Selecione pelo menos 1 condomínio para este operador.');
        return;
      }
      if (opCondominiosAutorizados.length > 3) {
        setOpErroValidacao('Porteiros e operacionais podem ter no máximo 3 condomínios autorizados.');
        return;
      }
      condominiosFinais = opCondominiosAutorizados;
    }

    if (operadorEditando) {
      const atualizado: Operador = {
        ...operadorEditando,
        nome: opNome,
        login: opLogin,
        pin: opPin,
        cargo: opCargo,
        role: opCargo.includes('Supervisor') || opCargo.includes('Diretor') ? 'supervisor' : opCargo.includes('Desenvolvedor') ? 'master' : 'operacional',
        condominiosAutorizados: condominiosFinais
      };
      onUpdateOperador(atualizado);
    } else {
      const novo: Operador = {
        id: `oper_${Date.now()}`,
        codigo: `OPER00${operadores.length + 1}`,
        nome: opNome,
        login: opLogin,
        pin: opPin,
        cargo: opCargo,
        role: opCargo.includes('Supervisor') || opCargo.includes('Diretor') ? 'supervisor' : opCargo.includes('Desenvolvedor') ? 'master' : 'operacional',
        condominiosAutorizados: condominiosFinais
      };
      onAddOperador(novo);
    }
    setModalOperador(false);
  };

  // ---------- MORADORES (EDIÇÃO & NOVO) ----------
  const [modalMorador, setModalMorador] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);
  const [moradorBloco, setMoradorBloco] = useState('');
  const [moradorUnidade, setMoradorUnidade] = useState('');
  const [moradorNome, setMoradorNome] = useState('');
  const [moradorWhatsapp, setMoradorWhatsapp] = useState('');
  const [moradorVinculo, setMoradorVinculo] = useState<Morador['tipoVinculo']>('Proprietário');
  const [buscaMorador, setBuscaMorador] = useState('');

  const blocosDisponiveis = condominioAtivo.listaBlocos && condominioAtivo.listaBlocos.length > 0
    ? condominioAtivo.listaBlocos
    : ['Bloco A', 'Bloco B'];

  const abrirModalMorador = (m?: Morador) => {
    if (m) {
      setMoradorEditando(m);
      // tentar separar Bloco e Unidade se tiver formato "Bloco X - Apto Y"
      const partes = m.unidade.split(' - ');
      if (partes.length === 2) {
        setMoradorBloco(partes[0].trim());
        setMoradorUnidade(partes[1].replace(/^(Apto|Casa|Lote)\s*/i, '').trim());
      } else {
        setMoradorBloco(blocosDisponiveis[0] || 'Bloco A');
        setMoradorUnidade(m.unidade);
      }
      setMoradorNome(m.nomeCompleto);
      setMoradorWhatsapp(m.whatsapp);
      setMoradorVinculo(m.tipoVinculo);
    } else {
      setMoradorEditando(null);
      setMoradorBloco(blocosDisponiveis[0] || 'Bloco A');
      setMoradorUnidade('');
      setMoradorNome('');
      setMoradorWhatsapp('');
      setMoradorVinculo('Proprietário');
    }
    setModalMorador(true);
  };

  const handleSalvarMorador = (e: React.FormEvent) => {
    e.preventDefault();
    const prefixo = condominioAtivo.tipoEstrutura === 'Casas/Quadras' ? 'Casa' : 'Apto';
    const unidadeFinal = `${moradorBloco} - ${prefixo} ${moradorUnidade.trim()}`;

    if (moradorEditando) {
      const atualizado: Morador = {
        ...moradorEditando,
        unidade: unidadeFinal,
        nomeCompleto: moradorNome,
        whatsapp: moradorWhatsapp.replace(/\D/g, ''),
        tipoVinculo: moradorVinculo
      };
      onUpdateMorador(atualizado);
    } else {
      const novo: Morador = {
        id: `mor_${Date.now()}`,
        codigo: `MOR00${moradores.length + 1}`,
        condominioId: condominioAtivo.id,
        unidade: unidadeFinal,
        nomeCompleto: moradorNome,
        whatsapp: moradorWhatsapp.replace(/\D/g, ''),
        tipoVinculo: moradorVinculo
      };
      onAddMorador(novo);
    }
    setModalMorador(false);
  };

  // Contagem de operadores autorizados neste condomínio
  const operadoresDoPostoCount = operadores.filter((op) => {
    const isMaster = op.cargo === 'Desenvolvedor Master' || op.login === 'admin' || op.role === 'master';
    const isTodos = op.condominiosAutorizados?.includes('TODOS');
    const isVinculado = op.condominiosAutorizados?.includes(condominioAtivo.id);
    return isMaster || isTodos || isVinculado;
  }).length;

  // Filtragem com suporte a filtroPostoOperador e busca textual
  const operadoresDoCondominio = operadores.filter((o) => {
    // 1. Filtro por Posto / Condomínio Ativo
    if (filtroPostoOperador === 'ativo') {
      const isMaster = o.cargo === 'Desenvolvedor Master' || o.login === 'admin' || o.role === 'master';
      const isTodos = o.condominiosAutorizados?.includes('TODOS');
      const isVinculado = o.condominiosAutorizados?.includes(condominioAtivo.id);
      if (!isMaster && !isTodos && !isVinculado) return false;
    }

    // 2. Busca por texto
    if (buscaOperador.trim()) {
      const q = buscaOperador.toLowerCase();
      const matchNome = o.nome.toLowerCase().includes(q);
      const matchLogin = o.login.toLowerCase().includes(q);
      const matchCargo = o.cargo.toLowerCase().includes(q);
      const matchCodigo = o.codigo.toLowerCase().includes(q);
      return matchNome || matchLogin || matchCargo || matchCodigo;
    }

    return true;
  });

  const moradoresDoCondominio = moradores.filter(
    (m) =>
      m.condominioId === condominioAtivo.id &&
      (m.nomeCompleto.toLowerCase().includes(buscaMorador.toLowerCase()) ||
        m.unidade.toLowerCase().includes(buscaMorador.toLowerCase()))
  );

  // Se for Vigilante/Ronda ou Manutencionista, bloqueia o acesso à aba Cadastros por completo
  if (isVigilanteOuManutencao) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-12 shadow-2xl animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Acesso Restrito ao Módulo de Cadastros</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Operadores com cargo de <strong className="text-white">{operadorAtivo.cargo}</strong> não possuem permissão de acesso ao módulo de Cadastros e Configurações de Posto.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER DE COMANDO: CORE ADM & TENANT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                {isPorteiro ? 'PORTARIA • MORADORES' : 'CONFIGURAÇÃO & CADASTROS'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Posto: <strong className="text-white">{condominioAtivo.nome}</strong> ({condominioAtivo.codigo})
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isPorteiro
                ? `Acesso operacional da portaria: Consulta e cadastro de moradores exclusivo para o condomínio ${condominioAtivo.nome}.`
                : 'Gerencie a estrutura física (blocos/casas), locais de armazenamento, turnos de plantão, operadores, módulos e templates do WhatsApp.'}
            </p>
          </div>

          {!isPorteiro && (
            <button
              onClick={() => setModalNovoCond(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all self-start md:self-auto"
            >
              <Plus className="w-4 h-4 text-emerald-400" /> + Novo Condomínio
            </button>
          )}
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS ALINHADA À ESPECIFICAÇÃO */}
        <div className="flex flex-wrap gap-1.5 pt-4 mt-4 border-t border-slate-800">
          {!isPorteiro ? (
            <>
              <button
                onClick={() => setTabAtiva('condominio')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all ${
                  tabAtiva === 'condominio'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800'
                }`}
              >
                (1) Dados Condomínio
              </button>

              <button
                onClick={() => setTabAtiva('operadores')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all ${
                  tabAtiva === 'operadores'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800'
                }`}
              >
                (2) Operadores & RBAC
              </button>

              <button
                onClick={() => setTabAtiva('flags')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all ${
                  tabAtiva === 'flags'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800'
                }`}
              >
                (3) Feature Flags
              </button>

              <button
                onClick={() => setTabAtiva('whatsapp')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all ${
                  tabAtiva === 'whatsapp'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800'
                }`}
              >
                (4) WhatsApp Templates
              </button>

              <button
                onClick={() => setTabAtiva('moradores')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all ${
                  tabAtiva === 'moradores'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800'
                }`}
              >
                (5) Moradores & Unidades
              </button>

              <button
                onClick={() => setTabAtiva('backup')}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
                  tabAtiva === 'backup'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40'
                    : 'text-blue-400 hover:text-white bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/40'
                }`}
              >
                <Database className="w-3.5 h-3.5" /> (6) Backup Dados 🔒
              </button>

              {/* ABA 7: SUPABASE CLOUD - EXCLUSIVO PARA DESENVOLVEDOR MASTER / ADMIN GERAL. SUPERVISOR NÃO PODE TER ACESSO */}
              {isMasterDev && (
                <button
                  onClick={() => setTabAtiva('supabase')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 ${
                    tabAtiva === 'supabase'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                      : 'text-emerald-400 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" /> (7) Supabase Cloud ⚡
                </button>
              )}
            </>
          ) : (
            /* PORTEIROS SÓ PODEM TER ACESSO À ABA DE CADASTRO DE MORADORES DO CONDOMÍNIO QUE TRABALHA */
            <div className="flex items-center gap-2">
              <span className="py-2 px-4 rounded-xl text-xs font-extrabold bg-emerald-600 text-white shadow-md shadow-emerald-950/40 flex items-center gap-2">
                <Users className="w-4 h-4" /> Cadastro de Moradores & Unidades ({condominioAtivo.nome})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* FEEDBACK DE SALVAMENTO */}
      {flagsSalvasMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Configurações salvas e aplicadas com sucesso no condomínio {condominioAtivo.nome}!</span>
        </div>
      )}

      {/* ==================== ABA 1: DADOS DO CONDOMÍNIO & ESTRUTURA ==================== */}
      {tabAtiva === 'condominio' && (
        <form onSubmit={handleSalvarCondominio} className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" /> Painel 1: Cadastrar / Editar Condomínio
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Fantasia / Razão *</label>
                <input
                  type="text"
                  required
                  value={condNome}
                  onChange={(e) => setCondNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">CNPJ *</label>
                <input
                  type="text"
                  required
                  value={condCnpj}
                  onChange={(e) => setCondCnpj(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone da Portaria *</label>
                <input
                  type="text"
                  required
                  value={condTelPortaria}
                  onChange={(e) => setCondTelPortaria(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço Completo *</label>
                <input
                  type="text"
                  required
                  value={condEndereco}
                  onChange={(e) => setCondEndereco(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Síndico / Gestor *</label>
                <input
                  type="text"
                  required
                  value={condSindico}
                  onChange={(e) => setCondSindico(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp do Síndico (Dossiês & Alertas) *</label>
                <input
                  type="text"
                  required
                  value={condTelSindico}
                  onChange={(e) => setCondTelSindico(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Intervalo de Ronda (min)</label>
                <input
                  type="number"
                  value={condIntervaloRonda}
                  onChange={(e) => setCondIntervaloRonda(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* ESTRUTURA DE UNIDADES (BLOCOS, TORRES, CASAS/QUADRAS) */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Estrutura Física do Condomínio (Apartamentos ou Casas)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Estrutura *</label>
                  <select
                    value={condTipoEstrutura}
                    onChange={(e) => setCondTipoEstrutura(e.target.value as Condominio['tipoEstrutura'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Blocos">Blocos (Edifícios Baixos / Conjuntos)</option>
                    <option value="Torres">Torres (Edifícios Altos)</option>
                    <option value="Casas/Quadras">Condomínio Fechado de Casas (Quadras/Lotes)</option>
                    <option value="Unidades Simples">Unidades Diretas (1 a 100)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {condTipoEstrutura === 'Casas/Quadras' ? 'Qtd de Quadras / Ruas' : 'Qtd de Blocos / Torres'}
                  </label>
                  <input
                    type="number"
                    value={condQtdBlocos}
                    onChange={(e) => setCondQtdBlocos(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {condTipoEstrutura === 'Casas/Quadras' ? 'Média de Casas por Quadra' : 'Unidades por Bloco/Torre'}
                  </label>
                  <input
                    type="number"
                    value={condUnidadesPorBloco}
                    onChange={(e) => setCondUnidadesPorBloco(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nomes dos Blocos / Torres / Quadras (Separados por vírgula para seleção rápida na portaria) *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bloco A, Bloco B, Bloco C ou Quadra 01, Quadra 02"
                  value={condListaBlocos}
                  onChange={(e) => setCondListaBlocos(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Estes nomes serão listados automaticamente nos módulos de Encomendas, Custódia e Cadastros.
                </p>
              </div>
            </div>

            {/* SEÇÃO: LOCAIS DE ARMAZENAMENTO DE ENCOMENDAS (CRUD COMPLETO) */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-400" /> Locais de Armazenamento de Encomendas
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Defina e organize as prateleiras, armários ou bancadas físicas da portaria para recebimento e agrupamento.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 self-start sm:self-auto">
                  {locaisArmazenamento.length} local(is) ativo(s)
                </span>
              </div>

              {/* Input para Adicionar Novo Local */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Novo local (ex: Armário C, Gaveta 02, Geladeira...)"
                  value={novoLocalArmazenamento}
                  onChange={(e) => setNovoLocalArmazenamento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdicionarLocal();
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAdicionarLocal}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40"
                >
                  <Plus className="w-4 h-4" /> Adicionar Local
                </button>
              </div>

              {/* Lista e Edição de Locais Cadastrados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                {locaisArmazenamento.map((local, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs group hover:border-slate-600 transition-all"
                  >
                    {editandoLocalIdx === index ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="text"
                          value={editandoLocalTexto}
                          onChange={(e) => setEditandoLocalTexto(e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-900 border border-emerald-500 rounded text-xs text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSalvarEdicaoLocal(index);
                            } else if (e.key === 'Escape') {
                              setEditandoLocalIdx(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSalvarEdicaoLocal(index)}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                          title="Confirmar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoLocalIdx(null)}
                          className="p-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                          <span className="font-semibold text-slate-200 truncate">{local}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoLocalIdx(index);
                              setEditandoLocalTexto(local);
                            }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                            title="Editar nome do local"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluirLocal(index)}
                            className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition-all"
                            title="Excluir local"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO: CONFIGURAÇÃO DE TURNOS DO CONDOMÍNIO */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" /> Configuração de Turnos de Plantão & Rondas
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Defina os horários de início e término dos turnos deste posto (ex: Point Perus 06h-18h / Vila Suíça 07h-19h) para contagem de rondas e controle de plantão.
                  </p>
                </div>
                {/* Badge de Turno Ativo no momento */}
                {(() => {
                  const tAtual = getTurnoAtual({
                    ...condominioAtivo,
                    turnos: {
                      diurno: { inicio: turnoDiurnoInicio, fim: turnoDiurnoFim, nome: turnoDiurnoNome },
                      noturno: { inicio: turnoNoturnoInicio, fim: turnoNoturnoFim, nome: turnoNoturnoNome }
                    }
                  });
                  return (
                    <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/40 px-3 py-1.5 rounded-xl self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[11px] font-bold text-emerald-300">
                        Turno Vigente Agora: <strong>{tAtual.nome}</strong> ({tAtual.inicio} às {tAtual.fim})
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Turno 1 / Diurno */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      ☀️ Turno 1 (Diurno)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      Plantão Dia
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Identificação / Nome do Turno
                    </label>
                    <input
                      type="text"
                      value={turnoDiurnoNome}
                      onChange={(e) => setTurnoDiurnoNome(e.target.value)}
                      placeholder="Ex: Plantão Diurno (07h às 19h)"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hora de Início *</label>
                      <input
                        type="time"
                        required
                        value={turnoDiurnoInicio}
                        onChange={(e) => setTurnoDiurnoInicio(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hora de Término *</label>
                      <input
                        type="time"
                        required
                        value={turnoDiurnoFim}
                        onChange={(e) => setTurnoDiurnoFim(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Turno 2 / Noturno */}
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      🌙 Turno 2 (Noturno)
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      Plantão Noite
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Identificação / Nome do Turno
                    </label>
                    <input
                      type="text"
                      value={turnoNoturnoNome}
                      onChange={(e) => setTurnoNoturnoNome(e.target.value)}
                      placeholder="Ex: Plantão Noturno (19h às 07h)"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hora de Início *</label>
                      <input
                        type="time"
                        required
                        value={turnoNoturnoInicio}
                        onChange={(e) => setTurnoNoturnoInicio(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Hora de Término *</label>
                      <input
                        type="time"
                        required
                        value={turnoNoturnoFim}
                        onChange={(e) => setTurnoNoturnoFim(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" /> Salvar Configurações do Tenant
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================== ABA 2: OPERADORES & RBAC ==================== */}
      {tabAtiva === 'operadores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Operadores & Controle de Acesso (RBAC)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Usuários de guarita, rondas e supervisores autorizados a operar neste posto.
              </p>
            </div>

            <button
              onClick={() => abrirModalOperador()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> + Cadastrar Operador
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar operador por nome, login ou cargo..."
                value={buscaOperador}
                onChange={(e) => setBuscaOperador(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setFiltroPostoOperador('todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  filtroPostoOperador === 'todos'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos os Operadores ({operadores.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroPostoOperador('ativo')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  filtroPostoOperador === 'ativo'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Deste Condomínio ({operadoresDoPostoCount})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {operadoresDoCondominio.map((op) => {
              const isMaster = op.cargo === 'Desenvolvedor Master' || op.login === 'admin';
              const isSupervisorTodos = op.condominiosAutorizados?.includes('TODOS');
              const postosVinculados = isMaster || isSupervisorTodos
                ? condominios
                : condominios.filter((c) => op.condominiosAutorizados?.includes(c.id));

              return (
                <div
                  key={op.id}
                  className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl space-y-3 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                        {op.codigo}
                      </span>
                      <button
                        onClick={() => abrirModalOperador(op)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-emerald-400 text-xs flex items-center gap-1 font-bold"
                        title="Editar Operador e Postos"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Delegar Postos
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{op.nome}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          isMaster
                            ? 'bg-amber-950/60 text-amber-300 border-amber-500/30'
                            : op.cargo.includes('Supervisor')
                            ? 'bg-purple-950/60 text-purple-300 border-purple-500/30'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {op.cargo}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-slate-850 rounded-lg text-[11px] font-mono text-slate-300 space-y-0.5">
                      <p>Login: <strong className="text-white">{op.login}</strong></p>
                      <p>PIN: <strong className="text-emerald-400">{op.pin}</strong></p>
                    </div>
                  </div>

                  {/* DELEGAÇÃO DE POSTOS DO OPERADOR */}
                  <div className="pt-2.5 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-emerald-400" /> Postos Autorizados:
                      </span>
                      {isMaster ? (
                        <span className="font-mono text-[10px] text-amber-400 font-bold">Acesso Total</span>
                      ) : isSupervisorTodos ? (
                        <span className="font-mono text-[10px] text-purple-400 font-bold">Todos</span>
                      ) : (
                        <span className="font-mono text-[10px] text-emerald-400 font-bold">
                          {postosVinculados.length} de 3
                        </span>
                      )}
                    </div>

                    {isMaster ? (
                      <div className="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/20 px-2 py-1 rounded">
                        🌐 Acesso Total a Todos os Postos (Master)
                      </div>
                    ) : isSupervisorTodos ? (
                      <div className="text-[10px] text-purple-300 bg-purple-950/40 border border-purple-500/20 px-2 py-1 rounded">
                        🌐 Supervisão Global de Todos os Postos
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {postosVinculados.length > 0 ? (
                          postosVinculados.map((c) => (
                            <span
                              key={c.id}
                              className={`text-[10px] px-2 py-0.5 rounded border font-medium ${
                                c.id === condominioAtivo.id
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-bold'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              🏢 {c.nome}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-rose-400 italic">Nenhum posto atribuído</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== ABA 3: FEATURE FLAGS (ATIVAÇÃO DE MÓDULOS) ==================== */}
      {tabAtiva === 'flags' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" /> Painel 3: Ativação Dinâmica de Módulos (Feature Flags)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Ative ou desative os módulos contratados pelo condomínio <strong>{condominioAtivo.nome}</strong>. Os módulos desativados não aparecerão na barra de navegação da guarita.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {[
              { key: 'mod02_encomendas', label: 'Módulo Encomendas & Triagem RE', desc: 'Lotes de entregas, leitura de etiquetas e baixa com foto' },
              { key: 'mod03_custodia', label: 'Módulo Custódia de Itens', desc: 'Guarda de chaves, envelopes e pertences de terceiros/moradores com alerta de 48h' },
              { key: 'mod04_materiais', label: 'Módulo Materiais & Inventário do Posto', desc: 'Rádios HT, lanternas, bastões e controles da guarita' },
              { key: 'mod05_chaves', label: 'Módulo Claviculário Digital de Chaves', desc: 'Controle de retirada por morador/terceiro com horário limite de devolução' },
              { key: 'mod06_manutencao', label: 'Módulo Gestão de Manutenção & OS', desc: 'Abertura de chamados com foto antes/depois e checklists diário/semanal/mensal' },
              { key: 'mod07_ronda', label: 'Módulo Ronda Patrimonial (GPS & QR/NFC)', desc: 'Leitura de pontos georreferenciados e alerta sonoro de próxima ronda' },
              { key: 'mod08_ocorrencias', label: 'Módulo Livro de Ocorrências (Foto & Áudio)', desc: 'Registro interno do posto com áudio narrado e fluxo de resolução' },
              { key: 'mod09_passagem', label: 'Módulo Passagem de Posto Auditada', desc: 'Consolidação de pendências de todos os módulos e dupla validação de PIN' },
              { key: 'mod10_autorizados', label: 'Módulo Autorizados (Visitas, Diaristas e Obras)', desc: 'Pré-autorizações com vigência e entrada com 1 toque sem exigência de docs' },
            ].map((m) => {
              const ativo = flags[m.key as keyof FeatureFlags];
              return (
                <div
                  key={m.key}
                  onClick={() => handleToggleFlag(m.key as keyof FeatureFlags)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                    ativo
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/20'
                      : 'bg-slate-850/80 border-slate-750 opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className="pt-0.5">
                    {ativo ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white">{m.label}</h4>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          ativo
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {ativo ? 'ATIVO' : 'DESATIVADO'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== ABA 4: WHATSAPP ENGINE ==================== */}
      {tabAtiva === 'whatsapp' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-emerald-400" /> Painel 4: Engine de Templates do WhatsApp
          </h2>
          <p className="text-xs text-slate-400">
            Mensagens pré-configuradas processadas no navegador via deep link nativo (api.whatsapp.com/send).
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-700 space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Template: Encomenda Disponível</span>
              <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-200 whitespace-pre-wrap">
                {DEFAULT_WHATSAPP_TEMPLATES.ENCOMENDA_DISPONIVEL}
              </pre>
              <p className="text-[11px] text-slate-400">
                Variáveis: {'{condominio}'}, {'{unidade}'}, {'{nome}'}, {'{codigoRE}'}, {'{transportadora}'}, {'{localArmazenamento}'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-700 space-y-2">
              <span className="text-[10px] uppercase font-bold text-amber-400">Template: Custódia Pendente (Alerta 48h)</span>
              <pre className="p-3 bg-slate-900 rounded-lg text-xs font-mono text-slate-200 whitespace-pre-wrap">
                {DEFAULT_WHATSAPP_TEMPLATES.CUSTODIA_ENTRADA}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ABA 5: MORADORES & UNIDADES ==================== */}
      {tabAtiva === 'moradores' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Cadastro de Moradores & Unidades ({condominioAtivo.nome})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Estrutura de blocos/torres e contatos de WhatsApp para disparo com 1 toque.
              </p>
            </div>

            <button
              onClick={() => abrirModalMorador()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> + Cadastrar Morador
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por unidade, bloco ou nome do morador..."
              value={buscaMorador}
              onChange={(e) => setBuscaMorador(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {moradoresDoCondominio.map((m) => (
              <div
                key={m.id}
                className="p-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                    {m.unidade}
                  </span>
                  <button
                    onClick={() => abrirModalMorador(m)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-emerald-400 text-xs flex items-center gap-1"
                    title="Editar Morador"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white">{m.nomeCompleto}</h3>
                  <p className="text-xs text-slate-400">Vínculo: <strong className="text-slate-200">{m.tipoVinculo}</strong></p>
                </div>

                <div className="p-2 bg-slate-850 rounded-lg text-[11px] font-mono text-slate-300 flex items-center justify-between">
                  <span>WhatsApp: {m.whatsapp || 'Não informado'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== ABA 6: BACKUP & EXPORTAÇÃO (MASTER & ADMIN) ==================== */}
      {tabAtiva === 'backup' && (isMasterDev || isSupervisorOrAdmin) && (
        <div className="space-y-4">
          {/* Header e Seleção de Condomínio Alvo */}
          <div className="bg-slate-900 border border-blue-900/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl shadow-blue-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/40 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> RESTRITO: MASTER & ADMIN
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    Mecanismo de Backup & Auditoria de Postos
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Exporte instantaneamente o Snapshot Completo do Posto em formato CSV compatível com Excel ou faça o download de planilhas CSV individuais de cada módulo operacional.
                </p>
              </div>

              {/* Seletor de Condomínio para Backup */}
              <div className="flex items-center gap-2 bg-slate-850 border border-slate-700 px-3 py-1.5 rounded-xl">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Posto Alvo:</span>
                <select
                  value={condominioBackupId}
                  onChange={(e) => setCondominioBackupId(e.target.value)}
                  className="bg-slate-900 text-xs text-white font-bold px-2.5 py-1 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                >
                  {condominios.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mensagem de Feedback de Download */}
            {backupStatusMsg && (
              <div className="p-3 bg-blue-950/70 border border-blue-500/50 rounded-xl text-xs text-blue-300 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>{backupStatusMsg}</span>
              </div>
            )}

            {/* Card Principal: Backup Snapshot Geral em CSV */}
            {(() => {
              const cTarget = condominios.find((c) => c.id === condominioBackupId) || condominioAtivo;
              const handleExportarSnapshotGeralCsv = () => {
                const moradoresC = moradores.filter((m) => m.condominioId === cTarget.id);
                const lotesC = mockDb.getLotes().filter((l) => l.condominioId === cTarget.id);
                const encomendasC = mockDb.getItensEncomenda().filter((i) => i.condominioId === cTarget.id);
                const custodiaC = mockDb.getCustodias().filter((c) => c.condominioId === cTarget.id);
                const materiaisC = mockDb.getMateriais().filter((m) => m.condominioId === cTarget.id);
                const chavesC = mockDb.getChaves().filter((k) => k.condominioId === cTarget.id);
                const chamadosC = mockDb.getChamados().filter((c) => c.condominioId === cTarget.id);
                const pontosC = mockDb.getPontosRonda().filter((p) => p.condominioId === cTarget.id);
                const execucoesC = mockDb.getExecucoesRonda().filter((e) => e.condominioId === cTarget.id);
                const ocorrenciasC = mockDb.getOcorrencias().filter((o) => o.condominioId === cTarget.id);
                const passagensC = mockDb.getPassagens().filter((p) => p.condominioId === cTarget.id);
                const autorizadosC = mockDb.getAutorizados().filter((a) => a.condominioId === cTarget.id);
                const atividadesC = mockDb.getAtividades().filter((a) => a.condominioId === cTarget.id);

                const headers = [
                  'MODULO',
                  'SUBTIPO',
                  'ID_REGISTRO',
                  'REFERENCIA_UNIDADE',
                  'TITULO_DESCRICAO',
                  'STATUS_SITUACAO',
                  'DATA_HORA',
                  'RESPONSAVEL_OPERADOR',
                  'DETALHES_COMPLEMENTARES'
                ];

                const rows: string[][] = [];

                // 1. Dados do Posto
                rows.push([
                  'POSTO',
                  'CADASTRO_CONDOMINIO',
                  cTarget.id,
                  cTarget.codigo,
                  cTarget.nome,
                  'ATIVO',
                  new Date().toLocaleString('pt-BR'),
                  operadorAtivo.nome,
                  `CNPJ: ${cTarget.cnpj || 'N/A'} | Endereço: ${cTarget.endereco || 'N/A'} | Síndico: ${cTarget.nomeSindico || 'N/A'} | Portaria: ${cTarget.telefonePortaria || 'N/A'}`
                ]);

                // 2. Moradores
                moradoresC.forEach((m) => {
                  rows.push([
                    'MORADORES',
                    'RESIDENTE',
                    m.id,
                    `Unidade ${m.unidade}`,
                    m.nomeCompleto,
                    m.tipoVinculo.toUpperCase(),
                    '-',
                    operadorAtivo.nome,
                    `WhatsApp: ${m.whatsapp} | Vínculo: ${m.tipoVinculo}`
                  ]);
                });

                // 3. Encomendas
                encomendasC.forEach((i) => {
                  rows.push([
                    'ENCOMENDAS',
                    'PACOTE',
                    i.id,
                    `Unidade ${i.unidade}`,
                    `${i.codigoRE} - Rastreio: ${i.codigoRastreio || 'S/N'}`,
                    i.status.toUpperCase(),
                    i.dataRecebimento,
                    i.operadorRecebimentoNome || '-',
                    `Morador: ${i.moradorNome} | Armazenamento: ${i.localArmazenamento || 'Guarita'} | Retirado por: ${i.retiranteNome || 'Pendente'} em ${i.dataEntrega || '-'}`
                  ]);
                });

                // 4. Custódia
                custodiaC.forEach((c) => {
                  rows.push([
                    'CUSTODIA',
                    'VOLUME',
                    c.id,
                    `Origem: ${c.origemDescricao}`,
                    `${c.codigo} - ${c.descricaoItem}`,
                    c.status.toUpperCase(),
                    c.dataEntrada,
                    c.operadorEntradaNome || '-',
                    `Destino: ${c.destinoDescricao} | Retirante: ${c.retiranteNome || 'Pendente'} em ${c.dataSaida || '-'} (Doc: ${c.retiranteDocumento || '-'})`
                  ]);
                });

                // 5. Materiais
                materiaisC.forEach((m) => {
                  rows.push([
                    'MATERIAIS',
                    'ATIVO_POSTO',
                    m.id,
                    m.codigo,
                    m.nome,
                    m.estado.toUpperCase(),
                    m.ultimaConferencia || '-',
                    '-',
                    `Propriedade: ${m.propriedade} | Categoria: ${m.categoria} | Qtd: ${m.quantidade} | Tag/Série: ${m.numeroSerieTag || 'N/A'}`
                  ]);
                });

                // 6. Chaves
                chavesC.forEach((k) => {
                  rows.push([
                    'CHAVES',
                    'CLAVICULARIO',
                    k.id,
                    `Chave ${k.codigo}`,
                    `${k.etiquetaClaviculario} - ${k.nome}`,
                    k.status.toUpperCase(),
                    k.dataHoraRetirada || '-',
                    k.operadorRetiradaNome || '-',
                    `Categoria: ${k.categoria} | Solicitante: ${k.solicitanteNome || '-'} (${k.solicitanteTipo || '-'} / ${k.solicitanteDetalhe || '-'}) | Motivo: ${k.motivoRetirada || '-'}`
                  ]);
                });

                // 7. Manutenção
                chamadosC.forEach((c) => {
                  rows.push([
                    'MANUTENCAO',
                    'ORDEM_SERVICO',
                    c.id,
                    c.codigoOS,
                    c.titulo,
                    c.status.toUpperCase(),
                    c.dataAbertura,
                    c.operadorAberturaNome || '-',
                    `Categoria: ${c.categoria} | Prioridade: ${c.prioridade} | Local: ${c.localizacao} | Solução: ${c.solucaoDescricao || 'Pendente'}`
                  ]);
                });

                // 8. Rondas Checkpoints
                pontosC.forEach((p) => {
                  rows.push([
                    'RONDAS',
                    'CHECKPOINT',
                    p.id,
                    p.codigo,
                    p.nome,
                    'ATIVO',
                    '-',
                    '-',
                    `Validação: ${p.tipoValidacao} | Identificador: ${p.codigoIdentificador || '-'} | GPS: ${p.latitude || 'N/A'}, ${p.longitude || 'N/A'} (Raio: ${p.raioToleranciaMetros || 40}m)`
                  ]);
                });

                // 9. Histórico de Rondas
                execucoesC.forEach((e) => {
                  rows.push([
                    'RONDAS',
                    'EXECUCAO',
                    e.id,
                    `Ronda ${e.codigoRonda}`,
                    `Execução (${e.pontosLidos}/${e.totalPontos} pontos)`,
                    e.status.toUpperCase(),
                    e.dataHoraInicio,
                    e.operadorNome,
                    `Turno: ${e.turno || '-'} | Fim: ${e.dataHoraFim || 'Em Andamento'} | Anomalias: ${(e.anomalias || []).join('; ') || 'Nenhuma'}`
                  ]);
                });

                // 10. Ocorrências
                ocorrenciasC.forEach((o) => {
                  rows.push([
                    'OCORRENCIAS',
                    'LIVRO_REGISTRO',
                    o.id,
                    o.codigo,
                    `${o.tipo} - ${o.categoria}`,
                    (o.statusOcorrencia || 'PENDENTE').toUpperCase(),
                    o.dataHora,
                    o.operadorNome,
                    `Severidade: ${o.severidade || '-'} | Providências: ${o.providenciasTomadas || 'N/A'} | Descrição: ${o.descricao.replace(/[\r\n]+/g, ' ')}`
                  ]);
                });

                // 11. Passagens de Posto
                passagensC.forEach((p) => {
                  rows.push([
                    'PASSAGEM_POSTO',
                    'TROCA_TURNO',
                    p.id,
                    p.codigo,
                    'Passagem de Plantão',
                    p.status.toUpperCase(),
                    p.dataHora,
                    p.operadorSainteNome,
                    `Passou: ${p.operadorSainteNome} | Assumiu: ${p.operadorEntranteNome} | Recados: ${p.recadosTurno || 'Nenhum'} | Divergências: ${p.divergencias || 'Nenhuma'}`
                  ]);
                });

                // 12. Autorizados
                autorizadosC.forEach((a) => {
                  rows.push([
                    'AUTORIZADOS',
                    'LIBERACAO_ACESSO',
                    a.id,
                    `Unidade ${a.unidadeResponsavel}`,
                    a.nome,
                    a.statusAcesso.toUpperCase(),
                    a.dataInicio || '-',
                    '-',
                    `Tipo: ${a.tipoAutorizacao} | Solicitante: ${a.moradorSolicitanteNome} | Vigência: ${a.vigenciaTipo} | Último Check-in: ${a.ultimoCheckin || '-'}`
                  ]);
                });

                // 13. Histórico de Atividades & Auditoria (Módulo 12)
                atividadesC.forEach((a) => {
                  rows.push([
                    'HISTORICO_ATIVIDADES',
                    a.categoria.toUpperCase(),
                    a.id,
                    a.codigo || '-',
                    a.acao,
                    a.nivel.toUpperCase(),
                    a.dataHora,
                    a.operadorNome,
                    `Módulo: ${a.moduloOrigem} | Descrição: ${a.descricao.replace(/[\r\n]+/g, ' ')} | Detalhes: ${(a.detalhes || '-').replace(/[\r\n]+/g, ' ')}`
                  ]);
                });

                // Montar CSV com delimitador ; e codificação UTF-8 com BOM
                const csvFormattedRows = rows.map((r) =>
                  r.map((col) => `"${String(col || '').replace(/"/g, '""')}"`).join(';')
                );

                const csvContent =
                  '\uFEFF' + [headers.join(';'), ...csvFormattedRows].join('\r\n');

                const dataStr = new Date().toISOString().slice(0, 10);
                handleDownloadArquivo(
                  csvContent,
                  `backup_SNAPSHOT_COMPLETO_${cTarget.codigo}_${dataStr}.csv`,
                  'text/csv;charset=utf-8;'
                );
              };

              return (
                <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-850 rounded-xl border border-emerald-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        Snapshot Completo do Posto (CSV): {cTarget.nome}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300">
                      Gera uma planilha CSV consolidada (otimizada para Microsoft Excel) contendo todas as configurações, moradores, pacotes, rondas, ocorrências, materiais, chaves e autorizados do condomínio.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportarSnapshotGeralCsv}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/50 shrink-0 self-start md:self-auto transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Baixar Backup Completo do Posto (CSV)
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Grid de Backups Individuais por Módulo */}
          {(() => {
            const cTarget = condominios.find((c) => c.id === condominioBackupId) || condominioAtivo;
            const itensEncomenda = mockDb.getItensEncomenda().filter((i) => i.condominioId === cTarget.id);
            const lotes = mockDb.getLotes().filter((l) => l.condominioId === cTarget.id);
            const custodias = mockDb.getCustodias().filter((c) => c.condominioId === cTarget.id);
            const materiais = mockDb.getMateriais().filter((m) => m.condominioId === cTarget.id);
            const chaves = mockDb.getChaves().filter((k) => k.condominioId === cTarget.id);
            const chamados = mockDb.getChamados().filter((c) => c.condominioId === cTarget.id);
            const pontosRonda = mockDb.getPontosRonda().filter((p) => p.condominioId === cTarget.id);
            const execucoesRonda = mockDb.getExecucoesRonda().filter((e) => e.condominioId === cTarget.id);
            const ocorrencias = mockDb.getOcorrencias().filter((o) => o.condominioId === cTarget.id);
            const passagens = mockDb.getPassagens().filter((p) => p.condominioId === cTarget.id);
            const moradoresCond = moradores.filter((m) => m.condominioId === cTarget.id);
            const autorizados = mockDb.getAutorizados().filter((a) => a.condominioId === cTarget.id);
            const atividadesCond = mockDb.getAtividades().filter((a) => a.condominioId === cTarget.id);

            const modulosBackup = [
              {
                id: 'mod02_encomendas',
                nome: 'Módulo 02: Encomendas & Lotes',
                descricao: 'Histórico de triagem, entregadores e baixas de pacotes',
                qtd: itensEncomenda.length,
                unidadeQtd: 'encomendas',
                dados: itensEncomenda,
                dadosLotes: lotes,
                prefixo: 'MOD02_ENCOMENDAS'
              },
              {
                id: 'mod03_custodia',
                nome: 'Módulo 03: Custódia de Itens',
                descricao: 'Pertences, documentos e cargas sob guarda temporária',
                qtd: custodias.length,
                unidadeQtd: 'itens',
                dados: custodias,
                prefixo: 'MOD03_CUSTODIA'
              },
              {
                id: 'mod04_materiais',
                nome: 'Módulo 04: Materiais do Posto',
                descricao: 'Equipamentos, rádios HT, lanternas e armário do posto',
                qtd: materiais.length,
                unidadeQtd: 'materiais',
                dados: materiais,
                prefixo: 'MOD04_MATERIAIS'
              },
              {
                id: 'mod05_chaves',
                nome: 'Módulo 05: Claviculário de Chaves',
                descricao: 'Chaves de áreas comuns, empréstimos e histórico de devolução',
                qtd: chaves.length,
                unidadeQtd: 'chaves',
                dados: chaves,
                prefixo: 'MOD05_CHAVES'
              },
              {
                id: 'mod06_manutencao',
                nome: 'Módulo 06: Manutenção & Ordens de Serviço',
                descricao: 'Chamados abertos, status, prestadores e vistorias preventivas',
                qtd: chamados.length,
                unidadeQtd: 'chamados',
                dados: chamados,
                prefixo: 'MOD06_MANUTENCAO'
              },
              {
                id: 'mod07_ronda',
                nome: 'Módulo 07: Rondas & Checkpoints',
                descricao: 'Execuções de rondas, leitura de QR/NFC e anomalias registradas',
                qtd: execucoesRonda.length,
                unidadeQtd: 'rondas',
                dados: { execucoes: execucoesRonda, pontos: pontosRonda },
                dadosCsv: execucoesRonda,
                prefixo: 'MOD07_RONDAS'
              },
              {
                id: 'mod08_ocorrencias',
                nome: 'Módulo 08: Livro de Ocorrências',
                descricao: 'Registro formal de eventos, barulho, sinistros e vistorias',
                qtd: ocorrencias.length,
                unidadeQtd: 'ocorrências',
                dados: ocorrencias,
                prefixo: 'MOD08_OCORRENCIAS'
              },
              {
                id: 'mod09_passagem',
                nome: 'Módulo 09: Passagens de Posto',
                descricao: 'Trocas de plantão com checklist de passagem e dossiê',
                qtd: passagens.length,
                unidadeQtd: 'passagens',
                dados: passagens,
                prefixo: 'MOD09_PASSAGENS'
              },
              {
                id: 'moradores',
                nome: 'Cadastros: Moradores & Unidades',
                descricao: 'Base de moradores, números de unidades e contatos de WhatsApp',
                qtd: moradoresCond.length,
                unidadeQtd: 'moradores',
                dados: moradoresCond,
                prefixo: 'CAD_MORADORES'
              },
              {
                id: 'mod10_autorizados',
                nome: 'Módulo 10: Autorizados & Visitantes',
                descricao: 'Liberações de acesso, prestadores autorizados e horários',
                qtd: autorizados.length,
                unidadeQtd: 'autorizados',
                dados: autorizados,
                prefixo: 'MOD10_AUTORIZADOS'
              },
              {
                id: 'mod12_historico',
                nome: 'Módulo 12: Histórico de Atividades & Auditoria',
                descricao: 'Trilha cronológica de auditoria, eventos operacionais e anotações de guarita',
                qtd: atividadesCond.length,
                unidadeQtd: 'atividades',
                dados: atividadesCond,
                prefixo: 'MOD12_HISTORICO_ATIVIDADES'
              }
            ];

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-emerald-400" /> Exportação de Planilhas CSV por Módulo ({modulosBackup.length} módulos)
                  </h3>
                  <span className="text-[11px] text-slate-400">Formato padrão: CSV compatível com Microsoft Excel</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modulosBackup.map((mod) => (
                    <div
                      key={mod.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white">{mod.nome}</h4>
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded">
                            {mod.qtd} {mod.unidadeQtd}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">{mod.descricao}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            const arrCsv = Array.isArray(mod.dados) ? mod.dados : (mod.dadosCsv || []);
                            exportarCsv(arrCsv, mod.prefixo);
                          }}
                          className="w-full py-2 bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-500/40 text-xs font-bold text-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95"
                          title="Baixar planilha em formato CSV compatível com Excel"
                        >
                          <FileDown className="w-4 h-4 text-emerald-400" /> Baixar Planilha CSV (Excel)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================== ABA 7: SUPABASE CLOUD (POSTGRESQL) ==================== */}
      {tabAtiva === 'supabase' && isMasterDev && (
        <SupabaseTab />
      )}

      {/* ==================== MODAL CRIAR CONDOMÍNIO ==================== */}
      {modalNovoCond && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" /> Cadastrar Novo Condomínio
              </h3>
              <button onClick={() => setModalNovoCond(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCriarCondominio} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Condomínio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Residencial Caetano"
                  value={novoCondNome}
                  onChange={(e) => setNovoCondNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">CNPJ *</label>
                  <input
                    type="text"
                    required
                    placeholder="12.345.678/0001-99"
                    value={novoCondCnpj}
                    onChange={(e) => setNovoCondCnpj(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone Posto *</label>
                  <input
                    type="text"
                    required
                    placeholder="11940609960"
                    value={novoCondTelPortaria}
                    onChange={(e) => setNovoCondTelPortaria(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço *</label>
                <input
                  type="text"
                  required
                  placeholder="Rua, número, bairro..."
                  value={novoCondEndereco}
                  onChange={(e) => setNovoCondEndereco(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Síndico *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome do Síndico"
                    value={novoCondSindico}
                    onChange={(e) => setNovoCondSindico(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp Síndico *</label>
                  <input
                    type="text"
                    required
                    placeholder="11940609960"
                    value={novoCondTelSindico}
                    onChange={(e) => setNovoCondTelSindico(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Estrutura *</label>
                  <select
                    value={novoCondTipo}
                    onChange={(e) => setNovoCondTipo(e.target.value as Condominio['tipoEstrutura'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Blocos">Blocos</option>
                    <option value="Torres">Torres</option>
                    <option value="Casas/Quadras">Casas / Quadras</option>
                    <option value="Unidades Simples">Unidades Diretas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Blocos / Quadras (Sep. vírgula)</label>
                  <input
                    type="text"
                    placeholder="Bloco 1, Bloco 2"
                    value={novoCondBlocos}
                    onChange={(e) => setNovoCondBlocos(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNovoCond(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Salvar Condomínio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL OPERADOR (NOVO / EDITAR) ==================== */}
      {modalOperador && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              {operadorEditando ? 'Editar Operador' : 'Novo Operador da Guarita'}
            </h3>

            <form onSubmit={handleSalvarOperador} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Laurindo Caetano"
                  value={opNome}
                  onChange={(e) => setOpNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: caetano"
                    value={opLogin}
                    onChange={(e) => setOpLogin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Senha / PIN *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1234"
                    value={opPin}
                    onChange={(e) => setOpPin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cargo *</label>
                <select
                  value={opCargo}
                  onChange={(e) => setOpCargo(e.target.value as Operador['cargo'])}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  <option value="Porteiro">Porteiro (Acesso de 1 a 3 Condomínios)</option>
                  <option value="Ronda">Vigilante / Ronda (Acesso de 1 a 3 Condomínios)</option>
                  <option value="Manutencionista">Manutencionista (Acesso de 1 a 3 Condomínios)</option>
                  <option value="Supervisor">Supervisor Operacional (1 a 3 ou Todos)</option>
                  <option value="Desenvolvedor Master">Desenvolvedor Master (Acesso Total a Todos)</option>
                </select>
              </div>

              {/* DELEGAÇÃO DE POSTOS / CONDOMÍNIOS AUTORIZADOS */}
              <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Postos / Condomínios Autorizados *
                  </label>
                  {opCargo !== 'Desenvolvedor Master' && !opAcessoTodos && (
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {opCondominiosAutorizados.length} de 3 selecionados
                    </span>
                  )}
                </div>

                {opCargo === 'Desenvolvedor Master' ? (
                  <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                    <span className="text-base shrink-0">👑</span>
                    <div>
                      <p className="font-bold">Acesso Total Irrestrito (Master)</p>
                      <p className="text-[11px] text-amber-400/80 mt-0.5">
                        Administradores e Desenvolvedores Master possuem autorização automática para operar e auditar todos os condomínios cadastrados no sistema.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(opCargo === 'Supervisor' || opCargo === 'Diretor') && (
                      <label className="flex items-center gap-2 p-2 bg-purple-950/40 border border-purple-500/30 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={opAcessoTodos}
                          onChange={(e) => {
                            setOpAcessoTodos(e.target.checked);
                            setOpErroValidacao('');
                          }}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-xs font-bold text-purple-200">
                          Acesso Global a TODOS os Condomínios (Supervisão Geral)
                        </span>
                      </label>
                    )}

                    {(!opAcessoTodos || (opCargo !== 'Supervisor' && opCargo !== 'Diretor')) && (
                      <>
                        <p className="text-[11px] text-slate-400">
                          {opCargo === 'Supervisor'
                            ? 'Ou selecione de 1 até 3 condomínios para supervisão regional:'
                            : 'Selecione os condomínios onde este operador poderá assumir turno (mínimo 1, máximo 3):'}
                        </p>

                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          {condominios.map((c) => {
                            const isChecked = opCondominiosAutorizados.includes(c.id);
                            return (
                              <label
                                key={c.id}
                                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                                    : 'bg-slate-850 border-slate-700/60 text-slate-300 hover:border-slate-600'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleCondominioOperador(c.id)}
                                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="text-xs">
                                  <p className="font-bold text-slate-100">{c.nome}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    {c.codigo} • {c.endereco}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {opErroValidacao && (
                  <p className="text-xs text-rose-300 font-medium bg-rose-950/60 p-2 rounded-lg border border-rose-500/40">
                    ⚠️ {opErroValidacao}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOperador(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Salvar Operador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL MORADOR (NOVO / EDITAR) ==================== */}
      {modalMorador && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-400" />
              {moradorEditando ? 'Editar Morador' : 'Novo Morador & Unidade'}
            </h3>

            <form onSubmit={handleSalvarMorador} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {condominioAtivo.tipoEstrutura === 'Casas/Quadras' ? 'Quadra / Rua *' : 'Bloco / Torre *'}
                  </label>
                  <select
                    value={moradorBloco}
                    onChange={(e) => setMoradorBloco(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    {blocosDisponiveis.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {condominioAtivo.tipoEstrutura === 'Casas/Quadras' ? 'Nº da Casa / Lote *' : 'Nº do Apartamento *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 102 ou 54"
                    value={moradorUnidade}
                    onChange={(e) => setMoradorUnidade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo do Morador *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Samanta Ramos"
                  value={moradorNome}
                  onChange={(e) => setMoradorNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp (com DDD) *</label>
                  <input
                    type="text"
                    required
                    placeholder="11940609960"
                    value={moradorWhatsapp}
                    onChange={(e) => setMoradorWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Vínculo *</label>
                  <select
                    value={moradorVinculo}
                    onChange={(e) => setMoradorVinculo(e.target.value as Morador['tipoVinculo'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Proprietário">Proprietário</option>
                    <option value="Inquilino">Inquilino</option>
                    <option value="Dependente">Dependente</option>
                    <option value="Autorizado">Autorizado</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMorador(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  Salvar Morador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
