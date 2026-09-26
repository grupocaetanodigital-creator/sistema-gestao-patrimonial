export type Role = 'operacional' | 'supervisor' | 'master' | 'admin';

export interface Condominio {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefonePortaria: string;
  nomeSindico: string;
  telefoneSindico: string;
  featureFlags: FeatureFlags;
  horarioInicioObras: string;
  horarioFimObras: string;
  intervaloRondaMinutos: number;
  tipoEstrutura?: 'Blocos' | 'Torres' | 'Casas/Quadras' | 'Unidades Simples';
  quantidadeBlocos?: number;
  unidadesPorBloco?: number;
  listaBlocos?: string[];
  locaisArmazenamento?: string[];
  turnos?: {
    diurno: { inicio: string; fim: string; nome: string };
    noturno: { inicio: string; fim: string; nome: string };
  };
}

export interface FeatureFlags {
  mod02_encomendas: boolean;
  mod03_custodia: boolean;
  mod04_materiais: boolean;
  mod05_chaves: boolean;
  mod06_manutencao: boolean;
  mod07_ronda: boolean;
  mod08_ocorrencias: boolean;
  mod09_passagem: boolean;
  mod10_autorizados: boolean;
}

export interface Operador {
  id: string;
  codigo: string;
  nome: string;
  login: string;
  pin: string;
  cargo: 'Porteiro' | 'Ronda' | 'Manutencionista' | 'Supervisor' | 'Diretor' | 'Desenvolvedor Master';
  role: Role;
  condominiosAutorizados: string[]; // IDs dos condomínios ou ['TODOS']
}

export function getCondominiosAutorizados(operador: Operador | null, todosCondominios: Condominio[]): Condominio[] {
  if (!operador) return [];
  if (operador.login === 'admin' || operador.cargo === 'Desenvolvedor Master' || operador.role === 'master') {
    return todosCondominios;
  }
  if (operador.condominiosAutorizados?.includes('TODOS')) {
    return todosCondominios;
  }
  const autorizadosIds = operador.condominiosAutorizados || [];
  const filtrados = todosCondominios.filter((c) => autorizadosIds.includes(c.id));
  return filtrados.length > 0 ? filtrados : (todosCondominios[0] ? [todosCondominios[0]] : []);
}

export interface Morador {
  id: string;
  codigo: string;
  condominioId: string;
  unidade: string; // Ex: "Bloco A - Apto 102"
  nomeCompleto: string;
  whatsapp: string;
  tipoVinculo: 'Proprietário' | 'Inquilino' | 'Dependente' | 'Autorizado';
}

export interface Entregador {
  id: string;
  codigo: string;
  nome: string;
  documento: string;
  empresa: string;
}

export interface LoteEncomenda {
  id: string;
  codigoRE: string; // RE:DDMMAAOPERNN
  condominioId: string;
  entregadorId: string;
  entregadorNome: string;
  empresa: string;
  quantidadeDeclarada: number;
  quantidadeTriada: number;
  operadorId: string;
  operadorNome: string;
  dataHora: string;
  status: 'aguardando_triagem' | 'em_triagem' | 'concluido';
}

export interface ItemEncomenda {
  id: string;
  loteId: string;
  codigoRE: string;
  condominioId: string;
  unidade: string;
  moradorId?: string;
  moradorNome: string;
  moradorWhatsapp: string;
  codigoRastreio?: string;
  fotoEtiquetaUrl: string;
  observacoes?: string;
  localArmazenamento?: string; // ex: Bancada, Chão, Armário A, etc.
  status: 'retido' | 'entregue';
  dataRecebimento: string;
  operadorRecebimentoNome: string;
  dataEntrega?: string;
  retiranteNome?: string;
  fotoComprovanteUrl?: string;
  operadorEntregaNome?: string;
}

export type FluxoCustodia = 'morador_morador' | 'morador_terceiro' | 'terceiro_morador';

export interface ItemCustodia {
  id: string;
  codigo: string;
  condominioId: string;
  fluxo: FluxoCustodia;
  origemDescricao: string; // Ex: "Apt 102B - Carlos" ou "João (Entregador)"
  destinoDescricao: string; // Ex: "Apt 304A - Mariana" ou "Pedro (Prestador)"
  descricaoItem: string;
  fotoItemUrl: string;
  dataEntrada: string;
  operadorEntradaNome: string;
  status: 'retido' | 'retirado';
  dataSaida?: string;
  retiranteNome?: string;
  retiranteDocumento?: string;
  fotoBaixaUrl?: string;
  operadorSaidaNome?: string;
}

export interface MaterialPosto {
  id: string;
  codigo: string;
  condominioId: string;
  nome: string;
  propriedade: 'INFPORT' | 'CONDOMÍNIO';
  categoria: 'Comunicação' | 'Segurança/Iluminação' | 'Sinalização' | 'Vestuário' | 'Acessos';
  numeroSerieTag?: string;
  quantidade: number;
  estado: 'Operacional' | 'Com Avaria' | 'Extraviado';
  fotoUrl?: string;
  ultimaConferencia?: string;
  observacaoAvaria?: string;
  fotoAvariaUrl?: string;
}

export interface Chave {
  id: string;
  codigo: string;
  condominioId: string;
  etiquetaClaviculario: string; // ex: "Gancho 01-A"
  nome: string;
  categoria: 'Técnica' | 'Social / Lazer' | 'Administrativa';
  tempoMaximoHoras?: number;
  horarioLimiteDevolucao?: string; // ex: "23:00" ou tempo relativo
  status: 'disponivel' | 'retirada';
  fotoChaveUrl?: string;
  // Dados da retirada ativa
  solicitanteTipo?: 'Morador' | 'Colaborador' | 'Terceiro';
  solicitanteNome?: string;
  solicitanteDetalhe?: string; // Unidade, Cargo ou RG
  solicitanteDocumentoFotoUrl?: string;
  motivoRetirada?: string;
  dataHoraRetirada?: string;
  previsaoDevolucao?: string;
  operadorRetiradaNome?: string;
}

export interface ChamadoManutencao {
  id: string;
  codigoOS: string; // MANT:DDMMAAOPERNN
  condominioId: string;
  origem: 'Checklist de Rotina' | 'Abertura Avulsa (Portaria)';
  titulo: string;
  categoria: 'Hidráulica' | 'Elétrica' | 'Portões / Acessos' | 'Piscina' | 'Gerador' | 'Civil / Pintura' | 'Iluminação';
  localizacao: string;
  prioridade: 'Baixa' | 'Média' | 'Alta';
  descricao: string;
  fotoAntesUrl: string;
  status: 'Aberto' | 'Em Andamento' | 'Concluído';
  dataAbertura: string;
  operadorAberturaNome: string;
  dataConclusao?: string;
  solucaoDescricao?: string;
  fotoDepoisUrl?: string;
  operadorConclusaoNome?: string;
}

export interface ItemChecklistConfig {
  id: string;
  texto: string;
  frequencia: 'Diário' | 'Semanal' | 'Mensal';
}

export interface PontoRonda {
  id: string;
  codigo: string;
  condominioId: string;
  nome: string;
  tipoValidacao: 'QR Code' | 'NFC';
  codigoHash: string; // Conteúdo do QR Code ou UID da Tag NFC
  codigoIdentificador?: string; // Código amigável/legível da Tag ou QR
  latitude?: number;
  longitude?: number;
  precisaoMetros?: number;
  raioToleranciaMetros?: number;
  perguntas: string[];
}

export function getTurnoAtual(condominio?: Condominio | null): {
  nome: string;
  inicio: string;
  fim: string;
  tipo: 'Diurno' | 'Noturno';
} {
  const turnos = condominio?.turnos || {
    diurno: { inicio: '07:00', fim: '19:00', nome: 'Plantão Diurno' },
    noturno: { inicio: '19:00', fim: '07:00', nome: 'Plantão Noturno' }
  };
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [dIniH, dIniM] = (turnos.diurno?.inicio || '07:00').split(':').map(Number);
  const [dFimH, dFimM] = (turnos.diurno?.fim || '19:00').split(':').map(Number);
  const diurnoInicioMin = dIniH * 60 + (dIniM || 0);
  const diurnoFimMin = dFimH * 60 + (dFimM || 0);

  let isDiurno = false;
  if (diurnoInicioMin < diurnoFimMin) {
    isDiurno = currentMinutes >= diurnoInicioMin && currentMinutes < diurnoFimMin;
  } else {
    isDiurno = currentMinutes >= diurnoInicioMin || currentMinutes < diurnoFimMin;
  }

  if (isDiurno) {
    return {
      nome: turnos.diurno?.nome || 'Plantão Diurno',
      inicio: turnos.diurno?.inicio || '07:00',
      fim: turnos.diurno?.fim || '19:00',
      tipo: 'Diurno'
    };
  } else {
    return {
      nome: turnos.noturno?.nome || 'Plantão Noturno',
      inicio: turnos.noturno?.inicio || '19:00',
      fim: turnos.noturno?.fim || '07:00',
      tipo: 'Noturno'
    };
  }
}

export interface RegistroPontoLido {
  pontoId: string;
  pontoNome: string;
  tipoValidacao: 'QR Code' | 'NFC';
  codigoLido: string;
  dataHora: string;
  latitude?: number;
  longitude?: number;
  distanciaMetros?: number;
  gpsValido: boolean;
  respostasChecklist?: Record<string, boolean>;
  fotoAnomaliaUrl?: string;
  mapsUrl?: string;
}

export interface ExecucaoRonda {
  id: string;
  codigoRonda: string; // ROND:DDMMAAOPERNN
  condominioId: string;
  operadorNome: string;
  turno?: string; // Ex: 'Plantão Diurno (07:00 às 19:00)'
  dataHoraInicio: string;
  dataHoraFim?: string;
  status: 'Em Andamento' | 'Concluída 100% OK' | 'Concluída com Anomalias' | 'Atrasada';
  pontosLidos: number;
  totalPontos: number;
  anomalias: string[];
  detalhesPontosLidos?: RegistroPontoLido[];
}

export interface Ocorrencia {
  id: string;
  codigo: string; // OCOR_INT:... ou OCOR_MOR:...
  condominioId: string;
  tipo: 'Interna (Posto)' | 'Morador (Regimento)';
  categoria: string;
  severidade?: 'Baixa' | 'Média' | 'Crítica';
  unidadeInfratora?: string;
  unidadeReclamante?: string;
  descricao: string;
  fotoUrl?: string;
  audioUrl?: string;
  dataHora: string;
  operadorNome: string;
  providenciasTomadas?: string;
  statusOcorrencia?: 'Pendente' | 'Em Análise' | 'Visto' | 'Resolvido';
  observacaoResolucao?: string;
  resolvidoPor?: string;
  dataResolucao?: string;
}

export interface PassagemPosto {
  id: string;
  codigo: string; // PAS:DDMMAAOPERNN
  condominioId: string;
  operadorSainteNome: string;
  operadorEntranteNome: string;
  dataHora: string;
  status: 'Concluída e Validada' | 'Concluída com Ressalva';
  resumoChavesRetidas: number;
  resumoMateriaisOk: boolean;
  resumoManutencoesAbertas: number;
  resumoOcorrenciasAbertas: number;
  resumoEncomendasRetidas: number;
  resumoCustodiaPendentes?: number;
  resumoRondasFeitas?: number;
  resumoMateriaisComDefeito?: number;
  resumoAutorizadosNoCondominio?: number;
  resumoLotesPendentesTriagem?: number;
  resumoEncomendasFaltamTriar?: number;
  recadosTurno: string;
  divergencias?: string;
  assinaturaSainteConfirmada: boolean;
  assinaturaEntranteConfirmada: boolean;
}

export interface Autorizado {
  id: string;
  codigo: string;
  condominioId: string;
  nome: string;
  tipoAutorizacao: 'Visita' | 'Diarista' | 'Obras/Reformas' | 'Prestador Técnico' | 'Outro';
  unidadeResponsavel: string;
  moradorSolicitanteNome: string;
  vigenciaTipo: 'Hoje' | 'Amanhã' | 'Intervalo' | 'Permanente';
  dataInicio: string;
  dataFim?: string;
  statusAcesso: 'Fora do Posto' | 'Em Visita (No Condomínio)';
  ultimoCheckin?: string;
  ultimoCheckout?: string;
  crachaAtual?: string;
}

export interface ContatoEmergencia {
  id: string;
  condominioId: string;
  categoria: 'Órgão Público' | 'Gestão Interna' | 'Supervisão INFPORT' | 'Manutenção Crítica';
  nome: string;
  telefone: string;
  whatsapp?: string;
  descricao?: string;
}
