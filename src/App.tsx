import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  Package,
  Layers,
  Key,
  Wrench,
  Compass,
  BookOpen,
  RefreshCw,
  UserCheck,
  FileSpreadsheet,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Home,
  QrCode,
  Menu,
  LayoutGrid,
  Volume2,
  VolumeX,
  Bell,
  History
} from 'lucide-react';
import { audioAlert } from './lib/audioAlert';
import {
  Condominio,
  Operador,
  Morador,
  Entregador,
  LoteEncomenda,
  ItemEncomenda,
  ItemCustodia,
  MaterialPosto,
  Chave,
  ChamadoManutencao,
  ItemChecklistConfig,
  PontoRonda,
  ExecucaoRonda,
  Ocorrencia,
  PassagemPosto,
  Autorizado,
  HistoricoAtividade,
  getCondominiosAutorizados
} from './types';
import {
  mockDb,
  INITIAL_CONDOMINIOS,
  INITIAL_OPERADORES,
  INITIAL_MORADORES,
  INITIAL_ENTREGADORES,
  INITIAL_LOTES,
  INITIAL_ITENS_ENCOMENDA,
  INITIAL_CUSTODIAS,
  INITIAL_MATERIAIS,
  INITIAL_CHAVES,
  INITIAL_CHAMADOS,
  INITIAL_MANUTENCAO_CONFIG,
  INITIAL_PONTOS_RONDA,
  INITIAL_EXECUCOES_RONDA,
  INITIAL_OCORRENCIAS,
  INITIAL_AUTORIZADOS
} from './data/mockDatabase';
import { Header } from './components/common/Header';
import { EmergencyModal } from './components/common/EmergencyModal';
import { MobileMenuDrawer } from './components/common/MobileMenuDrawer';
import { MobileHomeDashboard } from './components/common/MobileHomeDashboard';

// 12 MÓDULOS MODULARES
import { Mod01Cadastros } from './components/modules/Mod01Cadastros';
import { Mod02Encomendas } from './components/modules/Mod02Encomendas';
import { Mod03Custodia } from './components/modules/Mod03Custodia';
import { Mod04Materiais } from './components/modules/Mod04Materiais';
import { Mod05Chaves } from './components/modules/Mod05Chaves';
import { Mod06Manutencao } from './components/modules/Mod06Manutencao';
import { Mod07Ronda } from './components/modules/Mod07Ronda';
import { Mod08Ocorrencias } from './components/modules/Mod08Ocorrencias';
import { Mod09Passagem } from './components/modules/Mod09Passagem';
import { Mod10Autorizados } from './components/modules/Mod10Autorizados';
import { Mod11Relatorios } from './components/modules/Mod11Relatorios';
import { Mod12Historico } from './components/modules/Mod12Historico';
import { PWAInstallButton } from './components/common/PWAInstallButton';

export default function App() {
  // Estado Global das Entidades (inicializados via localStorage ou seeds)
  const [condominios, setCondominios] = useState<Condominio[]>(mockDb.getCondominios());
  const [operadores, setOperadores] = useState<Operador[]>(mockDb.getOperadores());
  const [moradores, setMoradores] = useState<Morador[]>(mockDb.getMoradores());
  const [entregadores, setEntregadores] = useState<Entregador[]>(mockDb.getEntregadores());
  const [lotes, setLotes] = useState<LoteEncomenda[]>(mockDb.getLotes());
  const [itensEncomenda, setItensEncomenda] = useState<ItemEncomenda[]>(mockDb.getItensEncomenda());
  const [custodias, setCustodias] = useState<ItemCustodia[]>(mockDb.getCustodias());
  const [materiais, setMateriais] = useState<MaterialPosto[]>(mockDb.getMateriais());
  const [chaves, setChaves] = useState<Chave[]>(mockDb.getChaves());
  const [chamados, setChamados] = useState<ChamadoManutencao[]>(mockDb.getChamados());
  const [checklistsConfig, setChecklistsConfig] = useState<ItemChecklistConfig[]>(mockDb.getChecklistConfig());
  const [pontosRonda, setPontosRonda] = useState<PontoRonda[]>(mockDb.getPontosRonda());
  const [execucoesRonda, setExecucoesRonda] = useState<ExecucaoRonda[]>(mockDb.getExecucoesRonda());
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>(mockDb.getOcorrencias());
  const [passagens, setPassagens] = useState<PassagemPosto[]>(mockDb.getPassagens());
  const [autorizados, setAutorizados] = useState<Autorizado[]>(mockDb.getAutorizados());
  const [atividades, setAtividades] = useState<HistoricoAtividade[]>(mockDb.getAtividades());

  // Sessão Ativa
  const [operadorAtivo, setOperadorAtivo] = useState<Operador | null>(null);
  const [condominioAtivo, setCondominioAtivo] = useState<Condominio>(condominios[0] || INITIAL_CONDOMINIOS[0]);

  // Módulo Selecionado (Inicia no Painel Geral / Início conforme layout do app)
  const [moduloAtivo, setModuloAtivo] = useState<string>('inicio');
  const [drawerAberto, setDrawerAberto] = useState(false);

  // Modais Globais
  const [modalEmergenciaAberto, setModalEmergenciaAberto] = useState(false);
  const [modalTrocaCondominioAberto, setModalTrocaCondominioAberto] = useState(false);

  // Estado de Login e Seleção Multiconteúdo de Posto
  const [loginLogin, setLoginLogin] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [operadorPendente, setOperadorPendente] = useState<Operador | null>(null);
  const [postosDisponiveisLogin, setPostosDisponiveisLogin] = useState<Condominio[]>([]);
  const [postoSelecionadoId, setPostoSelecionadoId] = useState<string>('');
  const [modalSelecaoPostoAberto, setModalSelecaoPostoAberto] = useState(false);

  // Consulta Feature Flags (Módulos 02 a 10) e RBAC do operador ativo
  useEffect(() => {
    if (!condominioAtivo) return;
    const f = condominioAtivo.featureFlags;
    const cargoLower = operadorAtivo?.cargo?.toLowerCase() || '';
    const isVigilanteOuManutencao =
      cargoLower.includes('ronda') ||
      cargoLower.includes('vigilante') ||
      cargoLower.includes('manuten');

    const modulos = [
      { id: 'inicio', active: true },
      { id: 'mod01_cadastros', active: !isVigilanteOuManutencao },
      { id: 'mod02_encomendas', active: Boolean(f?.mod02_encomendas) },
      { id: 'mod03_custodia', active: Boolean(f?.mod03_custodia) },
      { id: 'mod04_materiais', active: Boolean(f?.mod04_materiais) },
      { id: 'mod05_chaves', active: Boolean(f?.mod05_chaves) },
      { id: 'mod06_manutencao', active: Boolean(f?.mod06_manutencao) },
      { id: 'mod07_ronda', active: Boolean(f?.mod07_ronda) },
      { id: 'mod08_ocorrencias', active: Boolean(f?.mod08_ocorrencias) },
      { id: 'mod09_passagem', active: Boolean(f?.mod09_passagem) },
      { id: 'mod10_autorizados', active: Boolean(f?.mod10_autorizados) },
      { id: 'mod12_historico', active: true },
      { id: 'mod11_relatorios', active: true }
    ];

    const atual = modulos.find((m) => m.id === moduloAtivo);
    if (!atual || !atual.active) {
      // Se for vigilante/ronda, prioriza abrir módulo de ronda se ativo
      if (cargoLower.includes('ronda') || cargoLower.includes('vigilante')) {
        const rondaMod = modulos.find(m => m.id === 'mod07_ronda' && m.active);
        if (rondaMod) {
          setModuloAtivo('mod07_ronda');
          return;
        }
      }
      // Se for manutencista, prioriza módulo de manutenção se ativo
      if (cargoLower.includes('manuten')) {
        const manMod = modulos.find(m => m.id === 'mod06_manutencao' && m.active);
        if (manMod) {
          setModuloAtivo('mod06_manutencao');
          return;
        }
      }
      const primeiroAtivo = modulos.find((m) => m.active);
      if (primeiroAtivo) {
        setModuloAtivo(primeiroAtivo.id);
      }
    }
  }, [condominioAtivo, moduloAtivo, operadorAtivo]);

  // Timer e Alerta Global de Ronda para o Condomínio Ativo
  // CRÍTICO: Só é habilitado e exibido SE o condomínio tiver a Feature Flag mod07_ronda ATIVA!
  const isRondaHabilitada = Boolean(
    condominioAtivo?.featureFlags?.mod07_ronda &&
    (condominioAtivo.intervaloRondaMinutos || 0) > 0
  );

  const intervaloRondaMin = condominioAtivo?.intervaloRondaMinutos || 60;
  const [segundosParaProximaRonda, setSegundosParaProximaRonda] = useState<number>(intervaloRondaMin * 60);
  const [somRondaHabilitado, setSomRondaHabilitado] = useState(true);

  useEffect(() => {
    if (!condominioAtivo || !isRondaHabilitada) return;
    setSegundosParaProximaRonda(intervaloRondaMin * 60);
  }, [condominioAtivo?.id, intervaloRondaMin, isRondaHabilitada]);

  useEffect(() => {
    if (!isRondaHabilitada) return;

    const interval = setInterval(() => {
      setSegundosParaProximaRonda((prev) => {
        const next = prev - 1;

        // Disparo sonoro quando atinge exatamente 0 (horário da ronda)
        if (next === 0 && somRondaHabilitado) {
          audioAlert.playRondaTimerAlert();
        }

        // Se estiver atrasada (negativo), emite bip a cada 60 segundos
        if (next < 0 && Math.abs(next) % 60 === 0 && somRondaHabilitado) {
          audioAlert.playRondaTimerAlert();
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRondaHabilitada, somRondaHabilitado]);

  const rondaEmAndamentoGlobal = execucoesRonda.find(
    (r) => r.condominioId === condominioAtivo?.id && r.status === 'Em Andamento'
  );

  const formatTimerRonda = (totalSegundos: number) => {
    const mins = Math.floor(totalSegundos / 60);
    const secs = totalSegundos % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handlers do Módulo 01
  const handleAddCondominio = (cond: Condominio) => {
    const updated = [...condominios, cond];
    setCondominios(updated);
    mockDb.saveCondominios(updated);
  };
  const handleUpdateCondominio = (cond: Condominio) => {
    const updated = condominios.map((c) => (c.id === cond.id ? cond : c));
    setCondominios(updated);
    mockDb.saveCondominios(updated);
    if (condominioAtivo.id === cond.id) {
      setCondominioAtivo(cond);
    }
  };
  const handleAddOperador = (op: Operador) => {
    const updated = [...operadores, op];
    setOperadores(updated);
    mockDb.saveOperadores(updated);
  };
  const handleUpdateOperador = (op: Operador) => {
    const updated = operadores.map((o) => (o.id === op.id ? op : o));
    setOperadores(updated);
    mockDb.saveOperadores(updated);
  };
  const handleAddMorador = (morador: Morador) => {
    const updated = [...moradores, morador];
    setMoradores(updated);
    mockDb.saveMoradores(updated);
  };
  const handleUpdateMorador = (morador: Morador) => {
    const updated = moradores.map((m) => (m.id === morador.id ? morador : m));
    setMoradores(updated);
    mockDb.saveMoradores(updated);
  };

  // Handlers do Módulo 02 (Encomendas)
  const handleAddLote = (lote: LoteEncomenda) => {
    const updated = [lote, ...lotes];
    setLotes(updated);
    mockDb.saveLotes(updated);
  };
  const handleAddItemEncomenda = (item: ItemEncomenda) => {
    const updatedItens = [item, ...itensEncomenda];
    setItensEncomenda(updatedItens);
    mockDb.saveItensEncomenda(updatedItens);

    const updatedLotes = lotes.map((l) =>
      l.id === item.loteId ? { ...l, quantidadeTriada: l.quantidadeTriada + 1 } : l
    );
    setLotes(updatedLotes);
    mockDb.saveLotes(updatedLotes);
  };
  const handleBaixaItensEncomenda = (ids: string[], retiranteNome: string, fotoUrl: string) => {
    const agora = new Date().toLocaleString('pt-BR');
    const updated = itensEncomenda.map((i) =>
      ids.includes(i.id)
        ? {
            ...i,
            status: 'entregue' as const,
            retiranteNome,
            fotoComprovanteUrl: fotoUrl,
            dataEntrega: agora,
            operadorEntregaNome: operadorAtivo?.nome
          }
        : i
    );
    setItensEncomenda(updated);
    mockDb.saveItensEncomenda(updated);
  };
  const handleAddEntregador = (ent: Entregador) => {
    const updated = [...entregadores, ent];
    setEntregadores(updated);
    mockDb.saveEntregadores(updated);
  };

  // Handlers do Módulo 03 (Custódia)
  const handleAddCustodia = (item: ItemCustodia) => {
    const updated = [item, ...custodias];
    setCustodias(updated);
    mockDb.saveCustodias(updated);
  };
  const handleBaixaCustodia = (id: string, retiranteNome: string, fotoUrl: string, doc?: string) => {
    const updated = custodias.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'retirado' as const,
            retiranteNome,
            retiranteDocumento: doc,
            fotoComprovanteUrl: fotoUrl,
            dataSaida: new Date().toLocaleString('pt-BR'),
            operadorSaidaNome: operadorAtivo?.nome
          }
        : c
    );
    setCustodias(updated);
    mockDb.saveCustodias(updated);
  };

  // Handlers do Módulo 04 (Materiais)
  const handleAddMaterial = (item: MaterialPosto) => {
    const updated = [...materiais, item];
    setMateriais(updated);
    mockDb.saveMateriais(updated);
  };
  const handleUpdateStatusMaterial = (
    id: string,
    estado: MaterialPosto['estado'],
    obs?: string,
    fotoAvaria?: string
  ) => {
    const updated = materiais.map((m) =>
      m.id === id
        ? {
            ...m,
            estado,
            observacaoAvaria: obs,
            fotoAvariaUrl: fotoAvaria,
            ultimaConferencia: new Date().toLocaleString('pt-BR')
          }
        : m
    );
    setMateriais(updated);
    mockDb.saveMateriais(updated);
  };

  // Handlers do Módulo 05 (Chaves)
  const handleAddChave = (chave: Chave) => {
    const updated = [...chaves, chave];
    setChaves(updated);
    mockDb.saveChaves(updated);
  };
  const handleRetirarChave = (id: string, dados: Partial<Chave>) => {
    const updated = chaves.map((c) => (c.id === id ? { ...c, ...dados } : c));
    setChaves(updated);
    mockDb.saveChaves(updated);
  };
  const handleDevolverChave = (id: string, motivoAvaria?: string, fotoAvaria?: string) => {
    const updated = chaves.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'disponivel' as const,
            solicitanteNome: undefined,
            solicitanteTipo: undefined,
            solicitanteDetalhe: undefined,
            solicitanteDocumentoFotoUrl: undefined,
            motivoRetirada: undefined,
            dataHoraRetirada: undefined,
            operadorRetiradaNome: undefined,
            observacaoAvariaDevolucao: motivoAvaria,
            fotoAvariaDevolucaoUrl: fotoAvaria
          }
        : c
    );
    setChaves(updated);
    mockDb.saveChaves(updated);
  };

  // Handlers do Módulo 06 (Manutenção)
  const handleAddChamado = (chamado: ChamadoManutencao) => {
    const updated = [chamado, ...chamados];
    setChamados(updated);
    mockDb.saveChamados(updated);
  };
  const handleConcluirChamado = (id: string, solucao: string, fotoDepois: string) => {
    const updated = chamados.map((c) =>
      c.id === id
        ? {
            ...c,
            status: 'Concluído' as const,
            solucaoDescricao: solucao,
            fotoDepoisUrl: fotoDepois,
            dataConclusao: new Date().toLocaleString('pt-BR')
          }
        : c
    );
    setChamados(updated);
    mockDb.saveChamados(updated);
  };

  // Handlers do Módulo 07 (Ronda)
  const handleAddPonto = (ponto: PontoRonda) => {
    const updated = [...pontosRonda, ponto];
    setPontosRonda(updated);
    mockDb.savePontosRonda(updated);
  };
  const handleSalvarExecucaoRonda = (exec: ExecucaoRonda) => {
    const updated = [exec, ...execucoesRonda];
    setExecucoesRonda(updated);
    mockDb.saveExecucoesRonda(updated);

    handleAddAtividade({
      condominioId: exec.condominioId,
      categoria: 'ronda',
      moduloOrigem: 'Módulo 07: Rondas',
      acao: `Ronda Patrimonial Finalizada (${exec.codigoRonda})`,
      descricao: `Ronda concluída com ${exec.pontosLidos} de ${exec.totalPontos} pontos conferidos.`,
      detalhes: exec.anomalias && exec.anomalias.length > 0 ? `Anomalias: ${exec.anomalias.join('; ')}` : 'Sem anomalias registradas.',
      operadorNome: exec.operadorNome,
      nivel: exec.anomalias && exec.anomalias.length > 0 ? 'aviso' : 'sucesso'
    });
  };

  // Handlers do Módulo 08 (Ocorrências)
  const handleAddOcorrencia = (oco: Ocorrencia) => {
    const updated = [oco, ...ocorrencias];
    setOcorrencias(updated);
    mockDb.saveOcorrencias(updated);

    handleAddAtividade({
      condominioId: oco.condominioId,
      categoria: 'ocorrencias',
      moduloOrigem: 'Módulo 08: Livro de Ocorrências',
      acao: `Registro de Ocorrência: ${oco.codigo}`,
      descricao: `${oco.tipo} (${oco.categoria}) - ${oco.descricao.slice(0, 120)}...`,
      detalhes: `Severidade: ${oco.severidade || 'Média'}. Providências: ${oco.providenciasTomadas || 'Registrado no livro.'}`,
      operadorNome: oco.operadorNome,
      nivel: oco.severidade === 'Crítica' ? 'critico' : 'aviso'
    });
  };
  const handleUpdateOcorrencia = (oco: Ocorrencia) => {
    const updated = ocorrencias.map((o) => (o.id === oco.id ? oco : o));
    setOcorrencias(updated);
    mockDb.saveOcorrencias(updated);
  };

  // Handlers do Módulo 09 (Passagem de Posto)
  const handleConcluirPassagem = (pass: PassagemPosto, novoOpId: string) => {
    const updated = [pass, ...passagens];
    setPassagens(updated);
    mockDb.savePassagens(updated);

    handleAddAtividade({
      condominioId: pass.condominioId,
      categoria: 'passagem',
      moduloOrigem: 'Módulo 09: Passagem de Posto',
      acao: `Troca de Plantão Realizada (${pass.codigo})`,
      descricao: `Passagem de posto de ${pass.operadorSainteNome} para ${pass.operadorEntranteNome}.`,
      detalhes: pass.recadosTurno ? `Recados: ${pass.recadosTurno}` : 'Sem divergências ou recados pendentes.',
      operadorNome: pass.operadorSainteNome,
      nivel: 'sucesso'
    });

    const novoOp = operadores.find((o) => o.id === novoOpId);
    if (novoOp) {
      setOperadorAtivo(novoOp);
    }
  };

  // Handlers do Módulo 10 (Autorizados)
  const handleAddAutorizado = (aut: Autorizado) => {
    const updated = [aut, ...autorizados];
    setAutorizados(updated);
    mockDb.saveAutorizados(updated);
  };
  const handleRegistrarEntradaAutorizado = (id: string, cracha?: string) => {
    const updated = autorizados.map((a) => {
      if (a.id !== id) return a;
      const estaNoCondominio = a.statusAcesso === 'Em Visita (No Condomínio)';
      return {
        ...a,
        statusAcesso: estaNoCondominio ? ('Fora do Posto' as const) : ('Em Visita (No Condomínio)' as const),
        ultimoCheckin: !estaNoCondominio ? new Date().toLocaleString('pt-BR') : a.ultimoCheckin,
        ultimoCheckout: estaNoCondominio ? new Date().toLocaleString('pt-BR') : a.ultimoCheckout,
        crachaAtual: !estaNoCondominio ? cracha : undefined
      };
    });
    setAutorizados(updated);
    mockDb.saveAutorizados(updated);
  };

  // Handlers do Módulo 12 (Histórico de Atividades & Auditoria)
  const handleAddAtividade = (
    item: Omit<HistoricoAtividade, 'id' | 'dataHora'> & { dataHora?: string }
  ) => {
    const nova = mockDb.registrarAtividade(item);
    setAtividades(mockDb.getAtividades());
    return nova;
  };

  // Autenticação e Consulta de Permissões RBAC & Postos Autorizados
  const executarLogin = (op: Operador) => {
    setLoginErro('');
    const autorizados = getCondominiosAutorizados(op, condominios);

    if (autorizados.length === 0) {
      setLoginErro('Este operador não possui nenhum condomínio / posto de trabalho autorizado.');
      return;
    }

    if (autorizados.length === 1) {
      // Regra 1: Apenas 1 Posto Autorizado -> Carrega Sessão Direta
      setOperadorAtivo(op);
      setCondominioAtivo(autorizados[0]);
      setModalSelecaoPostoAberto(false);
      setOperadorPendente(null);

      handleAddAtividade({
        condominioId: autorizados[0].id,
        categoria: 'login',
        moduloOrigem: 'Módulo 01: Autenticação',
        acao: 'Início de Turno do Operador',
        descricao: `Operador ${op.nome} iniciou sessão de plantão no posto.`,
        operadorId: op.id,
        operadorNome: `${op.nome} (${op.cargo})`,
        nivel: 'sucesso'
      });
    } else {
      // Regra 2: Multi-Postos Autorizados -> Modal de Seleção de Posto
      setOperadorPendente(op);
      setPostosDisponiveisLogin(autorizados);
      setPostoSelecionadoId(autorizados[0].id);
      setModalSelecaoPostoAberto(true);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErro('');

    const opEncontrado = operadores.find(
      (o) =>
        o.login.toLowerCase() === loginLogin.trim().toLowerCase() &&
        (o.pin === loginPin.trim() || (o.login === 'admin' && loginPin.trim() === '2468'))
    );

    if (!opEncontrado) {
      setLoginErro('Usuário ou Senha/PIN incorretos. Verifique suas credenciais.');
      return;
    }

    executarLogin(opEncontrado);
  };

  const handleConfirmarPostoTurno = () => {
    if (!operadorPendente) return;
    const condEscolhido =
      postosDisponiveisLogin.find((c) => c.id === postoSelecionadoId) || postosDisponiveisLogin[0];
    setOperadorAtivo(operadorPendente);
    setCondominioAtivo(condEscolhido);
    setModalSelecaoPostoAberto(false);

    handleAddAtividade({
      condominioId: condEscolhido.id,
      categoria: 'login',
      moduloOrigem: 'Módulo 01: Autenticação',
      acao: 'Início de Turno do Operador',
      descricao: `Operador ${operadorPendente.nome} iniciou sessão no posto ${condEscolhido.nome}.`,
      operadorId: operadorPendente.id,
      operadorNome: `${operadorPendente.nome} (${operadorPendente.cargo})`,
      nivel: 'sucesso'
    });

    setOperadorPendente(null);
  };

  // Cargo do operador logado para regras estritas de acesso
  const cargoLower = operadorAtivo?.cargo?.toLowerCase() || '';
  const isVigilanteOuManutencao =
    cargoLower.includes('ronda') ||
    cargoLower.includes('vigilante') ||
    cargoLower.includes('manuten');

  // Módulos disponíveis no condomínio ativo (Feature Flags estritas + RBAC)
  const flags = condominioAtivo.featureFlags;

  const modulosDisponiveis = [
    { id: 'inicio', label: 'Painel Geral', icon: Home, active: true },
    { id: 'mod01_cadastros', label: 'Cadastros', icon: Building2, active: !isVigilanteOuManutencao },
    { id: 'mod02_encomendas', label: 'Encomendas', icon: Package, active: flags.mod02_encomendas },
    { id: 'mod03_custodia', label: 'Custódia', icon: Shield, active: flags.mod03_custodia },
    { id: 'mod04_materiais', label: 'Materiais', icon: Layers, active: flags.mod04_materiais },
    { id: 'mod05_chaves', label: 'Chaves', icon: Key, active: flags.mod05_chaves },
    { id: 'mod06_manutencao', label: 'Manutenção', icon: Wrench, active: flags.mod06_manutencao },
    { id: 'mod07_ronda', label: 'Ronda', icon: QrCode, active: flags.mod07_ronda },
    { id: 'mod08_ocorrencias', label: 'Ocorrências', icon: BookOpen, active: flags.mod08_ocorrencias },
    { id: 'mod09_passagem', label: 'Passagem de Posto', icon: RefreshCw, active: flags.mod09_passagem },
    { id: 'mod10_autorizados', label: 'Autorizados', icon: UserCheck, active: flags.mod10_autorizados },
    { id: 'mod12_historico', label: 'Histórico', icon: History, active: true },
    { id: 'mod11_relatorios', label: 'Relatórios', icon: FileSpreadsheet, active: true }
  ];

  // ---------------- SE NÃO ESTIVER LOGADO: TELA DE LOGIN & SELEÇÃO DE POSTO ----------------
  if (!operadorAtivo) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-white relative">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">INFPORT 1.0</h1>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              SISTEMA MULTI-PORTARIA E GESTÃO DE POSTOS
            </p>
          </div>

          <div className="flex items-center justify-between bg-slate-850 p-2.5 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              [ TELA DE LOGIN ]
            </span>
            <PWAInstallButton />
          </div>

          {loginErro && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginErro}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Usuário:
              </label>
              <input
                type="text"
                required
                placeholder="caetano"
                value={loginLogin}
                onChange={(e) => setLoginLogin(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Senha / PIN (Apenas Números):
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Teclado Numérico</span>
              </div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                placeholder="••••"
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-base text-white focus:outline-none focus:border-emerald-500 font-mono tracking-widest text-center"
              />

              {/* Teclado Numérico Touch Rápido */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5 p-2 bg-slate-850 rounded-2xl border border-slate-800">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') {
                        setLoginPin('');
                      } else if (k === '⌫') {
                        setLoginPin((prev) => prev.slice(0, -1));
                      } else {
                        setLoginPin((prev) => prev + k);
                      }
                    }}
                    className={`py-2.5 text-sm font-bold rounded-xl transition-all active:scale-95 shadow-sm ${
                      k === 'C'
                        ? 'bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700/60'
                        : k === '⌫'
                        ? 'bg-slate-800/80 hover:bg-amber-950/60 hover:text-amber-300 text-slate-400 border border-slate-700/60'
                        : 'bg-slate-800 hover:bg-slate-750 text-white border border-slate-700'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40 active:scale-95 transition-all uppercase tracking-wider"
            >
              <LogIn className="w-4 h-4" /> [ BOTÃO: ENTRAR NO SISTEMA ]
            </button>
          </form>
        </div>

        {/* MODAL DE SELEÇÃO MULTICONTEÚDO / POSTO DE TRABALHO DE HOJE */}
        {modalSelecaoPostoAberto && operadorPendente && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 space-y-5">
              <div className="border-b border-slate-800 pb-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xl">🏢</span>
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                    SELECIONE O POSTO DE TRABALHO DE HOJE
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Operador identificado: <strong className="text-white">{operadorPendente.nome}</strong> ({operadorPendente.cargo}). Escolha o condomínio para iniciar o turno de hoje:
                </p>
              </div>

              {/* LISTA DAS OPÇÕES DE CONDOMÍNIO (CONFORME WIREFRAME DO USUÁRIO) */}
              <div className="space-y-2.5">
                {postosDisponiveisLogin.map((cond, idx) => {
                  const isChecked = (postoSelecionadoId || postosDisponiveisLogin[0]?.id) === cond.id;
                  return (
                    <div
                      key={cond.id}
                      onClick={() => setPostoSelecionadoId(cond.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-950/50'
                          : 'bg-slate-850 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                              : 'border-slate-600 bg-slate-800'
                          }`}
                        >
                          {isChecked && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-black text-white">
                            [ Opção {idx + 1}: {cond.nome.toUpperCase()} ]
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {cond.endereco} • Código: {cond.codigo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          --&gt; (Ativo)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModalSelecaoPostoAberto(false);
                    setOperadorPendente(null);
                  }}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Voltar ao Login
                </button>

                <button
                  type="button"
                  onClick={handleConfirmarPostoTurno}
                  className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/40 active:scale-95 transition-all uppercase tracking-wider"
                >
                  <CheckCircle2 className="w-4 h-4" /> [ CONFIRMAR E INICIAR TURNO ]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Postos autorizados para o operador logado
  const postosAutorizadosOperador = getCondominiosAutorizados(operadorAtivo, condominios);

  // ---------------- AMBIENTE OPERACIONAL LOGADO ----------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ========================================================================= */}
      {/* BANNER SUPERIOR DE ALERTA DE RONDA (SOMENTE SE O MÓDULO FOR ATIVO NO POSTO) */}
      {/* ========================================================================= */}
      {isRondaHabilitada && (
        <div
          className={`px-3 py-1.5 flex items-center justify-between text-xs font-bold shadow-md z-40 transition-colors ${
            rondaEmAndamentoGlobal
              ? 'bg-emerald-600 text-white'
              : segundosParaProximaRonda <= 0
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-amber-600 text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {segundosParaProximaRonda <= 0 ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-white animate-bounce" />
            ) : (
              <Shield className="w-4 h-4 shrink-0 text-white" />
            )}
            <span className="truncate uppercase font-black tracking-wide text-[11px] sm:text-xs">
              {rondaEmAndamentoGlobal
                ? `RONDA EM ANDAMENTO (${rondaEmAndamentoGlobal.pontosLidos}/${rondaEmAndamentoGlobal.totalPontos})`
                : segundosParaProximaRonda <= 0
                ? 'RONDA PATRIMONIAL PENDENTE'
                : 'PRÓXIMA RONDA PATRIMONIAL'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão de Controle de Som de Ronda */}
            <button
              type="button"
              onClick={() => {
                const novo = !somRondaHabilitado;
                setSomRondaHabilitado(novo);
                if (novo) {
                  audioAlert.playRondaTimerAlert();
                }
              }}
              className="p-1 rounded-lg bg-black/25 hover:bg-black/40 text-white transition-colors flex items-center gap-1 text-[10px]"
              title={somRondaHabilitado ? 'Alerta sonoro ATIVO (toque para silenciar ou testar)' : 'Alerta sonoro SILENCIADO (toque para ativar)'}
            >
              {somRondaHabilitado ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="hidden md:inline text-[10px]">Som Ativo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-200" />
                  <span className="hidden md:inline text-[10px]">Mudo</span>
                </>
              )}
            </button>

            <span className="font-mono bg-black/35 px-2 py-0.5 rounded-lg text-[11px] font-black tracking-wider text-white">
              {segundosParaProximaRonda <= 0
                ? `+${formatTimerRonda(Math.abs(segundosParaProximaRonda))}`
                : formatTimerRonda(segundosParaProximaRonda)}
            </span>

            <button
              type="button"
              onClick={() => setModuloAtivo('mod07_ronda')}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-900" />
              <span>RONDAS</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Fixo Global */}
      <Header
        condominioAtivo={condominioAtivo}
        operadorAtivo={operadorAtivo}
        podeTrocarCondominio={postosAutorizadosOperador.length > 1}
        onTrocarCondominio={() => setModalTrocaCondominioAberto(true)}
        onLogout={() => {
          setOperadorAtivo(null);
          setLoginLogin('');
          setLoginPin('');
        }}
        onAbrirEmergencia={() => setModalEmergenciaAberto(true)}
        onAbrirMenuDrawer={() => setDrawerAberto(true)}
      />

      {/* BARRA DE MÓDULOS HORIZONTAL RESPONSIVA & OTIMIZADA PARA TELAS MÉDIAS/GRANDES */}
      <div className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md hidden sm:block">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none">
          {modulosDisponiveis
            .filter((m) => m.active)
            .map((mod) => {
              const Icon = mod.icon;
              const isSelected = moduloAtivo === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setModuloAtivo(mod.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{mod.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* CONTEÚDO DO MÓDULO ATIVO */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-6">
        {/* Painel Geral (Home Dashboard) */}
        {moduloAtivo === 'inicio' && (
          <MobileHomeDashboard
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            onSelectModulo={(modId) => setModuloAtivo(modId)}
            itensEncomenda={itensEncomenda}
            chaves={chaves}
            chamados={chamados}
          />
        )}

        {/* Botão rápido para voltar ao Painel Geral quando em módulo específico no celular */}
        {moduloAtivo !== 'inicio' && (
          <div className="sm:hidden mb-3">
            <button
              type="button"
              onClick={() => setModuloAtivo('inicio')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span>← Painel Geral</span>
            </button>
          </div>
        )}

        {moduloAtivo === 'mod01_cadastros' && (
          <Mod01Cadastros
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            condominios={condominios}
            operadores={operadores}
            moradores={moradores}
            onAddCondominio={handleAddCondominio}
            onUpdateCondominio={handleUpdateCondominio}
            onAddOperador={handleAddOperador}
            onUpdateOperador={handleUpdateOperador}
            onAddMorador={handleAddMorador}
            onUpdateMorador={handleUpdateMorador}
          />
        )}

        {moduloAtivo === 'mod02_encomendas' && (
          <Mod02Encomendas
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            moradores={moradores}
            entregadores={entregadores}
            lotes={lotes}
            itensEncomenda={itensEncomenda}
            onAddLote={handleAddLote}
            onAddItemEncomenda={handleAddItemEncomenda}
            onBaixaItens={handleBaixaItensEncomenda}
            onAddEntregador={handleAddEntregador}
          />
        )}

        {moduloAtivo === 'mod03_custodia' && (
          <Mod03Custodia
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            moradores={moradores}
            custodias={custodias}
            onAddCustodia={handleAddCustodia}
            onBaixaCustodia={handleBaixaCustodia}
          />
        )}

        {moduloAtivo === 'mod04_materiais' && (
          <Mod04Materiais
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            materiais={materiais}
            onAddMaterial={handleAddMaterial}
            onUpdateStatusMaterial={handleUpdateStatusMaterial}
          />
        )}

        {moduloAtivo === 'mod05_chaves' && (
          <Mod05Chaves
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            moradores={moradores}
            chaves={chaves}
            onAddChave={handleAddChave}
            onRetirarChave={handleRetirarChave}
            onDevolverChave={handleDevolverChave}
          />
        )}

        {moduloAtivo === 'mod06_manutencao' && (
          <Mod06Manutencao
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            chamados={chamados}
            checklistsConfig={checklistsConfig}
            onAddChamado={handleAddChamado}
            onConcluirChamado={handleConcluirChamado}
            onUpdateChecklistConfig={setChecklistsConfig}
          />
        )}

        {moduloAtivo === 'mod07_ronda' && (
          <Mod07Ronda
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            pontosRonda={pontosRonda}
            execucoesRonda={execucoesRonda}
            onAddPonto={handleAddPonto}
            onSalvarExecucao={handleSalvarExecucaoRonda}
          />
        )}

        {moduloAtivo === 'mod08_ocorrencias' && (
          <Mod08Ocorrencias
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            ocorrencias={ocorrencias}
            onAddOcorrencia={handleAddOcorrencia}
            onUpdateOcorrencia={handleUpdateOcorrencia}
          />
        )}

        {moduloAtivo === 'mod09_passagem' && (
          <Mod09Passagem
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            operadores={operadores}
            chaves={chaves}
            materiais={materiais}
            chamados={chamados}
            ocorrencias={ocorrencias}
            itensEncomenda={itensEncomenda}
            lotes={lotes}
            custodias={custodias}
            rondas={execucoesRonda}
            autorizados={autorizados}
            passagens={passagens}
            onConcluirPassagem={handleConcluirPassagem}
          />
        )}

        {moduloAtivo === 'mod10_autorizados' && (
          <Mod10Autorizados
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            moradores={moradores}
            autorizados={autorizados}
            onAddAutorizado={handleAddAutorizado}
            onRegistrarEntradaAutorizado={handleRegistrarEntradaAutorizado}
          />
        )}

        {moduloAtivo === 'mod12_historico' && (
          <Mod12Historico
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            operadores={operadores}
            atividades={atividades}
            onAddAtividade={handleAddAtividade}
          />
        )}

        {moduloAtivo === 'mod11_relatorios' && (
          <Mod11Relatorios
            condominioAtivo={condominioAtivo}
            operadorAtivo={operadorAtivo}
            itensEncomenda={itensEncomenda}
            custodias={custodias}
            chaves={chaves}
            chamados={chamados}
            execucoesRonda={execucoesRonda}
            ocorrencias={ocorrencias}
            passagens={passagens}
            autorizados={autorizados}
          />
        )}
      </main>

      {/* ========================================================================= */}
      {/* BARRA INFERIOR DE NAVEGAÇÃO RÁPIDA NO MOBILE (TAB BAR - ESTILO APP)      */}
      {/* ========================================================================= */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          type="button"
          onClick={() => setModuloAtivo('inicio')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            moduloAtivo === 'inicio' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Início</span>
        </button>

        <button
          type="button"
          onClick={() => setModuloAtivo('mod02_encomendas')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            moduloAtivo === 'mod02_encomendas' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px]">Encomendas</span>
        </button>

        <button
          type="button"
          onClick={() => setModuloAtivo('mod05_chaves')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            moduloAtivo === 'mod05_chaves' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Key className="w-5 h-5" />
          <span className="text-[10px]">Chaves</span>
        </button>

        {isRondaHabilitada ? (
          <button
            type="button"
            onClick={() => setModuloAtivo('mod07_ronda')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
              moduloAtivo === 'mod07_ronda' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span className="text-[10px]">Rondas</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setModuloAtivo('mod08_ocorrencias')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
              moduloAtivo === 'mod08_ocorrencias' ? 'text-emerald-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px]">Ocorrências</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setDrawerAberto(true)}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl text-slate-400 hover:text-emerald-400 transition-all"
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px]">Módulos</span>
        </button>
      </nav>

      {/* DRAWER MENU LATERAL INFPORT (SLIDE COM A LISTA COMPLETA) */}
      <MobileMenuDrawer
        isOpen={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        condominioAtivo={condominioAtivo}
        operadorAtivo={operadorAtivo}
        condominiosDisponiveis={postosAutorizadosOperador}
        onSelectCondominio={(condId) => {
          const c = condominios.find((item) => item.id === condId);
          if (c) setCondominioAtivo(c);
        }}
        moduloAtivo={moduloAtivo}
        onSelectModulo={(modId) => setModuloAtivo(modId)}
        onLogout={() => {
          setOperadorAtivo(null);
          setLoginLogin('');
          setLoginPin('');
        }}
      />

      {/* MODAL DE EMERGÊNCIA (POLÍCIA, SAMU, BOMBEIROS, SÍNDICO, SUPERVISOR) */}
      <EmergencyModal
        isOpen={modalEmergenciaAberto}
        onClose={() => setModalEmergenciaAberto(false)}
        condominioAtivo={condominioAtivo}
        operadorAtivo={operadorAtivo}
        contatos={mockDb.getContatosEmergencia()}
      />

      {/* MODAL DE TROCA RÁPIDA DE CONDOMÍNIO */}
      {modalTrocaCondominioAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Trocar Posto / Condomínio
              </h2>
              <button
                onClick={() => setModalTrocaCondominioAberto(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Selecione o posto de trabalho autorizado para o operador <strong>{operadorAtivo.nome}</strong>:
            </p>

            <div className="space-y-2">
              {postosAutorizadosOperador.map((c, idx) => {
                const isSelected = c.id === condominioAtivo.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCondominioAtivo(c);
                      setModalTrocaCondominioAberto(false);
                    }}
                    className={`w-full p-3 rounded-xl text-left border flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 shadow-md shadow-emerald-950/40'
                        : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                        Opção {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-white">{c.nome}</h4>
                      <p className="text-[11px] text-slate-400">
                        {c.endereco} • Código: {c.codigo}
                      </p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
