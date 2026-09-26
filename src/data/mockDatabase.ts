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
  ContatoEmergencia
} from '../types';

const STORAGE_PREFIX = 'infport_v1_';

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Erro lendo ${key} do localStorage`, e);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Erro gravando ${key} no localStorage`, e);
  }
}

// ----------------- SEEDS INICIAIS -----------------

export const INITIAL_CONDOMINIOS: Condominio[] = [
  {
    id: 'cond_01',
    codigo: 'COND001',
    nome: 'Residencial Vila Suíça',
    cnpj: '12.345.678/0001-90',
    endereco: 'Estrada do Corredor, nº 73, Vila Suíça',
    telefonePortaria: '11940609960',
    nomeSindico: 'Roberto Carlos da Silva',
    telefoneSindico: '11940609960',
    horarioInicioObras: '08:00',
    horarioFimObras: '17:00',
    intervaloRondaMinutos: 60,
    tipoEstrutura: 'Blocos',
    quantidadeBlocos: 2,
    unidadesPorBloco: 80,
    listaBlocos: ['Bloco A', 'Bloco B'],
    locaisArmazenamento: [
      'Portaria - Prateleira A',
      'Portaria - Prateleira B',
      'Armário 01',
      'Armário 02',
      'Bancada Principal',
      'Chão / Caixas Grandes'
    ],
    turnos: {
      diurno: { inicio: '07:00', fim: '19:00', nome: 'Plantão Diurno (07h às 19h)' },
      noturno: { inicio: '19:00', fim: '07:00', nome: 'Plantão Noturno (19h às 07h)' }
    },
    featureFlags: {
      mod02_encomendas: true,
      mod03_custodia: true,
      mod04_materiais: true,
      mod05_chaves: true,
      mod06_manutencao: true,
      mod07_ronda: true,
      mod08_ocorrencias: true,
      mod09_passagem: true,
      mod10_autorizados: true,
    }
  },
  {
    id: 'cond_02',
    codigo: 'COND002',
    nome: 'Condomínio Point Perus',
    cnpj: '98.765.432/0001-11',
    endereco: 'Av. Raimundo Pereira de Magalhães, 1200',
    telefonePortaria: '11988887777',
    nomeSindico: 'Bruno Almeida',
    telefoneSindico: '11988887777',
    horarioInicioObras: '08:30',
    horarioFimObras: '17:30',
    intervaloRondaMinutos: 90,
    tipoEstrutura: 'Torres',
    quantidadeBlocos: 2,
    unidadesPorBloco: 60,
    listaBlocos: ['Torre 1', 'Torre 2'],
    locaisArmazenamento: [
      'Portaria - Escaninho 1',
      'Portaria - Escaninho 2',
      'Armário Encomendas',
      'Bancada Guarita',
      'Chão Lateral'
    ],
    turnos: {
      diurno: { inicio: '06:00', fim: '18:00', nome: 'Plantão Diurno (06h às 18h)' },
      noturno: { inicio: '18:00', fim: '06:00', nome: 'Plantão Noturno (18h às 06h)' }
    },
    featureFlags: {
      mod02_encomendas: true,
      mod03_custodia: true,
      mod04_materiais: false, // Inativo para testar adaptação dinâmica
      mod05_chaves: true,
      mod06_manutencao: false, // Inativo
      mod07_ronda: false, // Inativo (sem vigilante ronda)
      mod08_ocorrencias: true,
      mod09_passagem: true,
      mod10_autorizados: true,
    }
  },
  {
    id: 'cond_03',
    codigo: 'COND003',
    nome: 'Condomínio Residencial Caetano',
    cnpj: '55.666.777/0001-22',
    endereco: 'Rua das Palmeiras, 500, Jardim Caetano',
    telefonePortaria: '11940609960',
    nomeSindico: 'Laurindo Caetano',
    telefoneSindico: '11940609960',
    horarioInicioObras: '08:00',
    horarioFimObras: '18:00',
    intervaloRondaMinutos: 60,
    tipoEstrutura: 'Blocos',
    quantidadeBlocos: 3,
    unidadesPorBloco: 40,
    listaBlocos: ['Bloco A', 'Bloco B', 'Bloco C'],
    locaisArmazenamento: [
      'Armário A (Bloco A)',
      'Armário B (Bloco B)',
      'Armário C (Bloco C)',
      'Prateleira Encomendas',
      'Bancada Guarita',
      'Chão / Caixas Grandes',
      'Geladeira / Perecíveis'
    ],
    turnos: {
      diurno: { inicio: '07:00', fim: '19:00', nome: 'Plantão Diurno (07h às 19h)' },
      noturno: { inicio: '19:00', fim: '07:00', nome: 'Plantão Noturno (19h às 07h)' }
    },
    featureFlags: {
      mod02_encomendas: true,
      mod03_custodia: true,
      mod04_materiais: true,
      mod05_chaves: true,
      mod06_manutencao: true,
      mod07_ronda: true,
      mod08_ocorrencias: true,
      mod09_passagem: true,
      mod10_autorizados: true,
    }
  }
];

export const INITIAL_OPERADORES: Operador[] = [
  {
    id: 'oper_admin',
    codigo: 'ADMIN001',
    nome: 'Desenvolvedor Master',
    login: 'admin',
    pin: '2468',
    cargo: 'Desenvolvedor Master',
    role: 'master',
    condominiosAutorizados: ['cond_01', 'cond_02', 'cond_03']
  },
  {
    id: 'oper_caetano',
    codigo: 'OPER001',
    nome: 'Laurindo Caetano do Carmo',
    login: 'caetano',
    pin: '1234',
    cargo: 'Porteiro',
    role: 'operacional',
    condominiosAutorizados: ['cond_03', 'cond_01']
  },
  {
    id: 'oper_maria',
    codigo: 'OPER002',
    nome: 'Maria José da Silva',
    login: 'maria',
    pin: '1234',
    cargo: 'Supervisor',
    role: 'supervisor',
    condominiosAutorizados: ['cond_01', 'cond_02', 'cond_03']
  },
  {
    id: 'oper_carlos',
    codigo: 'OPER003',
    nome: 'Carlos Eduardo Mendes',
    login: 'carlos',
    pin: '1234',
    cargo: 'Porteiro',
    role: 'operacional',
    condominiosAutorizados: ['cond_01']
  }
];

export const INITIAL_MORADORES: Morador[] = [
  {
    id: 'mor_01',
    codigo: 'MOR001',
    condominioId: 'cond_01',
    unidade: 'Bloco A - Apto 102',
    nomeCompleto: 'Samanta Ramos',
    whatsapp: '11940609960',
    tipoVinculo: 'Proprietário'
  },
  {
    id: 'mor_02',
    codigo: 'MOR002',
    condominioId: 'cond_01',
    unidade: 'Bloco A - Apto 102',
    nomeCompleto: 'Pedro Ramos (Filho)',
    whatsapp: '11940609960',
    tipoVinculo: 'Dependente'
  },
  {
    id: 'mor_03',
    codigo: 'MOR003',
    condominioId: 'cond_01',
    unidade: 'Bloco A - Apto 304',
    nomeCompleto: 'Mariana Duarte',
    whatsapp: '11988884444',
    tipoVinculo: 'Proprietário'
  },
  {
    id: 'mor_04',
    codigo: 'MOR004',
    condominioId: 'cond_01',
    unidade: 'Bloco B - Apto 302',
    nomeCompleto: 'Rodrigo Pires',
    whatsapp: '11977773333',
    tipoVinculo: 'Proprietário'
  },
  {
    id: 'mor_05',
    codigo: 'MOR005',
    condominioId: 'cond_01',
    unidade: 'Bloco B - Apto 502',
    nomeCompleto: 'Fábio de Souza',
    whatsapp: '11966662222',
    tipoVinculo: 'Inquilino'
  }
];

export const INITIAL_ENTREGADORES: Entregador[] = [
  {
    id: 'ent_01',
    codigo: 'ENTR001',
    nome: 'Marcos Antônio Souza',
    documento: '783.871.847-76',
    empresa: 'Mercado Livre'
  },
  {
    id: 'ent_02',
    codigo: 'ENTR002',
    nome: 'Felipe Ribeiro',
    documento: '442.119.823-10',
    empresa: 'Amazon'
  },
  {
    id: 'ent_03',
    codigo: 'ENTR003',
    nome: 'Lucas Gabriel',
    documento: '392.839.102-09',
    empresa: 'Shopee'
  }
];

export const INITIAL_LOTES: LoteEncomenda[] = [
  {
    id: 'lote_01',
    codigoRE: 'RE:230926OPER00101',
    condominioId: 'cond_01',
    entregadorId: 'ent_01',
    entregadorNome: 'Marcos Antônio Souza',
    empresa: 'Mercado Livre',
    quantidadeDeclarada: 5,
    quantidadeTriada: 2,
    operadorId: 'oper_caetano',
    operadorNome: 'Laurindo Caetano',
    dataHora: '2026-09-23 10:15',
    status: 'em_triagem'
  }
];

export const INITIAL_ITENS_ENCOMENDA: ItemEncomenda[] = [
  {
    id: 'enc_01',
    loteId: 'lote_01',
    codigoRE: 'RE:230926OPER00101',
    condominioId: 'cond_01',
    unidade: 'Bloco A - Apto 102',
    moradorId: 'mor_01',
    moradorNome: 'Samanta Ramos',
    moradorWhatsapp: '11940609960',
    codigoRastreio: 'MLBR-9920194',
    fotoEtiquetaUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&auto=format&fit=crop&q=60',
    observacoes: 'Pacote pequeno em envelope amarelo',
    status: 'retido',
    dataRecebimento: '2026-09-23 10:20',
    operadorRecebimentoNome: 'Laurindo Caetano'
  },
  {
    id: 'enc_02',
    loteId: 'lote_01',
    codigoRE: 'RE:230926OPER00101',
    condominioId: 'cond_01',
    unidade: 'Bloco A - Apto 102',
    moradorId: 'mor_01',
    moradorNome: 'Samanta Ramos',
    moradorWhatsapp: '11940609960',
    codigoRastreio: 'MLBR-9920200',
    fotoEtiquetaUrl: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=500&auto=format&fit=crop&q=60',
    observacoes: 'Caixa de papelão canto amassado',
    status: 'retido',
    dataRecebimento: '2026-09-23 10:22',
    operadorRecebimentoNome: 'Laurindo Caetano'
  }
];

export const INITIAL_CUSTODIAS: ItemCustodia[] = [
  {
    id: 'cust_01',
    codigo: 'CUST001',
    condominioId: 'cond_01',
    fluxo: 'morador_morador',
    origemDescricao: 'Bloco A - Apto 102 (Samanta)',
    destinoDescricao: 'Bloco A - Apto 304 (Mariana)',
    descricaoItem: 'Envelope pardo com chave de veículo reserva',
    fotoItemUrl: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=60',
    dataEntrada: '2026-09-20 09:00', // Há mais de 48h! Gera badge de retenção excedida
    operadorEntradaNome: 'Laurindo Caetano',
    status: 'retido'
  },
  {
    id: 'cust_02',
    codigo: 'CUST002',
    condominioId: 'cond_01',
    fluxo: 'morador_terceiro',
    origemDescricao: 'Bloco B - Apto 302 (Rodrigo)',
    destinoDescricao: 'Pedro (Eletricista)',
    descricaoItem: 'Caixa de ferramentas parafusadeira Dewalt',
    fotoItemUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500&auto=format&fit=crop&q=60',
    dataEntrada: '2026-09-23 08:30',
    operadorEntradaNome: 'Laurindo Caetano',
    status: 'retido'
  }
];

export const INITIAL_MATERIAIS: MaterialPosto[] = [
  {
    id: 'mat_01',
    codigo: 'MAT001',
    condominioId: 'cond_01',
    nome: 'Rádio HT Hytera 01',
    propriedade: 'INFPORT',
    categoria: 'Comunicação',
    numeroSerieTag: 'INF-HT-044',
    quantidade: 1,
    estado: 'Operacional',
    fotoUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=500&auto=format&fit=crop&q=60',
    ultimaConferencia: '2026-09-23 07:00'
  },
  {
    id: 'mat_02',
    codigo: 'MAT002',
    condominioId: 'cond_01',
    nome: 'Rádio HT Hytera 02',
    propriedade: 'INFPORT',
    categoria: 'Comunicação',
    numeroSerieTag: 'INF-HT-045',
    quantidade: 1,
    estado: 'Com Avaria',
    fotoUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=500&auto=format&fit=crop&q=60',
    ultimaConferencia: '2026-09-23 07:00',
    observacaoAvaria: 'Antena de borracha trincada e chiado no autofalante'
  },
  {
    id: 'mat_03',
    codigo: 'MAT003',
    condominioId: 'cond_01',
    nome: 'Lanterna Tática Recarregável',
    propriedade: 'CONDOMÍNIO',
    categoria: 'Segurança/Iluminação',
    numeroSerieTag: 'LAN-01',
    quantidade: 2,
    estado: 'Operacional',
    fotoUrl: 'https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=500&auto=format&fit=crop&q=60',
    ultimaConferencia: '2026-09-23 07:00'
  },
  {
    id: 'mat_04',
    codigo: 'MAT004',
    condominioId: 'cond_01',
    nome: 'Controle Remoto Portão Social',
    propriedade: 'CONDOMÍNIO',
    categoria: 'Acessos',
    numeroSerieTag: 'CTRL-09',
    quantidade: 1,
    estado: 'Operacional',
    ultimaConferencia: '2026-09-23 07:00'
  }
];

export const INITIAL_CHAVES: Chave[] = [
  {
    id: 'chv_01',
    codigo: 'CHV001',
    condominioId: 'cond_01',
    etiquetaClaviculario: 'Gancho 01',
    nome: 'Salão de Festas Principal',
    categoria: 'Social / Lazer',
    horarioLimiteDevolucao: '23:00',
    status: 'retirada',
    solicitanteTipo: 'Morador',
    solicitanteNome: 'Samanta Ramos',
    solicitanteDetalhe: 'Bloco A - Apto 102',
    motivoRetirada: 'Preparação do aniversário da filha',
    dataHoraRetirada: '2026-09-23 09:00',
    operadorRetiradaNome: 'Laurindo Caetano'
  },
  {
    id: 'chv_02',
    codigo: 'CHV002',
    condominioId: 'cond_01',
    etiquetaClaviculario: 'Gancho 02',
    nome: 'Casa de Bombas - Subsolo 2',
    categoria: 'Técnica',
    tempoMaximoHoras: 2,
    horarioLimiteDevolucao: '11:00',
    status: 'retirada', // Atrasada!
    solicitanteTipo: 'Terceiro',
    solicitanteNome: 'Marcos Antônio (HidroTech)',
    solicitanteDetalhe: 'RG: 44.382.119-X',
    motivoRetirada: 'Troca de selo mecânico da bomba 01',
    dataHoraRetirada: '2026-09-23 08:30',
    operadorRetiradaNome: 'Laurindo Caetano'
  },
  {
    id: 'chv_03',
    codigo: 'CHV003',
    condominioId: 'cond_01',
    etiquetaClaviculario: 'Gancho 03',
    nome: 'Gerador Principal e Subestação',
    categoria: 'Técnica',
    tempoMaximoHoras: 4,
    status: 'disponivel'
  },
  {
    id: 'chv_04',
    codigo: 'CHV004',
    condominioId: 'cond_01',
    etiquetaClaviculario: 'Gancho 04',
    nome: 'Espaço Gourmet e Churrasqueira',
    categoria: 'Social / Lazer',
    horarioLimiteDevolucao: '22:00',
    status: 'disponivel'
  }
];

export const INITIAL_MANUTENCAO_CONFIG: ItemChecklistConfig[] = [
  { id: 'chk_01', texto: 'Nível de água e medição de pH/Cloro da piscina', frequencia: 'Diário' },
  { id: 'chk_02', texto: 'Verificação de ruídos e vazamento nas bombas de recalque', frequencia: 'Diário' },
  { id: 'chk_03', texto: 'Painel do gerador em modo AUTO e nível de diesel', frequencia: 'Diário' },
  { id: 'chk_04', texto: 'Lâmpadas de emergência das escadarias e halls', frequencia: 'Semanal' },
  { id: 'chk_05', texto: 'Lubrificação das cremalheiras dos portões automáticos', frequencia: 'Semanal' },
  { id: 'chk_06', texto: 'Inspeção e teste de barramento dos para-raios', frequencia: 'Mensal' }
];

export const INITIAL_CHAMADOS: ChamadoManutencao[] = [
  {
    id: 'cham_01',
    codigoOS: 'MANT:230926OPER00101',
    condominioId: 'cond_01',
    origem: 'Abertura Avulsa (Portaria)',
    titulo: 'Vazamento na Bomba 02 do Subsolo',
    categoria: 'Hidráulica',
    localizacao: 'Casa de Bombas - Subsolo 2',
    prioridade: 'Alta',
    descricao: 'Morador relatou poça d’água transbordando pelo ralo do subsolo 2.',
    fotoAntesUrl: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=500&auto=format&fit=crop&q=60',
    status: 'Em Andamento',
    dataAbertura: '2026-09-23 08:30',
    operadorAberturaNome: 'Laurindo Caetano'
  }
];

export const INITIAL_PONTOS_RONDA: PontoRonda[] = [
  {
    id: 'pnt_01',
    codigo: 'PNT001',
    condominioId: 'cond_01',
    nome: 'Ponto 01 - Portão de Serviço Subsolo 2',
    tipoValidacao: 'QR Code',
    codigoHash: 'INF-PNT-01-SUB2',
    latitude: -23.5505,
    longitude: -46.6333,
    perguntas: ['Portão trancado e cadeado no lugar?', 'Iluminação do perímetro acesa?']
  },
  {
    id: 'pnt_02',
    codigo: 'PNT002',
    condominioId: 'cond_01',
    nome: 'Ponto 02 - Casa de Máquinas Torre A',
    tipoValidacao: 'NFC',
    codigoHash: 'INF-PNT-02-MAQ-TA',
    latitude: -23.5506,
    longitude: -46.6334,
    perguntas: ['Porta fechada sem sinais de violação?', 'Cheiro de fumaça ou aquecimento anormal?']
  },
  {
    id: 'pnt_03',
    codigo: 'PNT003',
    condominioId: 'cond_01',
    nome: 'Ponto 03 - Reservatório e Caixa D’Água Superior',
    tipoValidacao: 'QR Code',
    codigoHash: 'INF-PNT-03-RES-SUP',
    latitude: -23.5507,
    longitude: -46.6335,
    perguntas: ['Tampas lacradas?', 'Sem extravasamento pelo ladrão?']
  }
];

export const INITIAL_EXECUCOES_RONDA: ExecucaoRonda[] = [
  {
    id: 'ronda_01',
    codigoRonda: 'ROND:230926OPER00101',
    condominioId: 'cond_01',
    operadorNome: 'Laurindo Caetano',
    dataHoraInicio: '2026-09-23 02:00',
    dataHoraFim: '2026-09-23 02:35',
    status: 'Concluída 100% OK',
    pontosLidos: 3,
    totalPontos: 3,
    anomalias: []
  }
];

export const INITIAL_OCORRENCIAS: Ocorrencia[] = [
  {
    id: 'oco_01',
    codigo: 'OCOR_INT:230926OPER00101',
    condominioId: 'cond_01',
    tipo: 'Interna (Posto)',
    categoria: 'Falha de Equipamento / Sistema',
    severidade: 'Média',
    descricao: 'Instabilidade na fibra óptica da portaria das 09h às 09h30. Sistema operou temporariamente em cache offline.',
    operadorNome: 'Laurindo Caetano',
    dataHora: '2026-09-23 09:35',
    providenciasTomadas: 'Reiniciado roteador secundário com sucesso.'
  },
  {
    id: 'oco_02',
    codigo: 'OCOR_MOR:230926OPER00102',
    condominioId: 'cond_01',
    tipo: 'Morador (Regimento)',
    categoria: 'Som Alto / Perturbação',
    unidadeInfratora: 'Bloco B - Apto 502',
    unidadeReclamante: 'Bloco B - Apto 402',
    descricao: 'Reclamação de música ao vivo com graves fortes após as 22h no sábado.',
    operadorNome: 'Laurindo Caetano',
    dataHora: '2026-09-22 22:15',
    providenciasTomadas: 'Portaria interfonou e morador abaixou imediatamente.'
  }
];

export const INITIAL_AUTORIZADOS: Autorizado[] = [
  {
    id: 'aut_01',
    codigo: 'AUT001',
    condominioId: 'cond_01',
    nome: 'Maria da Penha (Diarista)',
    tipoAutorizacao: 'Diarista',
    unidadeResponsavel: 'Bloco A - Apto 102',
    moradorSolicitanteNome: 'Samanta Ramos',
    vigenciaTipo: 'Permanente',
    dataInicio: '2026-01-10',
    statusAcesso: 'Em Visita (No Condomínio)',
    ultimoCheckin: '2026-09-23 07:45',
    crachaAtual: 'Crachá 04'
  },
  {
    id: 'aut_02',
    codigo: 'AUT002',
    condominioId: 'cond_01',
    nome: 'Rodrigo Mendes (Claro Fibra)',
    tipoAutorizacao: 'Prestador Técnico',
    unidadeResponsavel: 'Bloco B - Apto 302',
    moradorSolicitanteNome: 'Rodrigo Pires',
    vigenciaTipo: 'Hoje',
    dataInicio: '2026-09-23',
    statusAcesso: 'Fora do Posto'
  }
];

export const INITIAL_CONTATOS_EMERGENCIA: ContatoEmergencia[] = [
  {
    id: 'cont_01',
    condominioId: 'cond_01',
    categoria: 'Órgão Público',
    nome: 'Polícia Militar',
    telefone: '190',
    descricao: 'Emergência policial e patrulhamento'
  },
  {
    id: 'cont_02',
    condominioId: 'cond_01',
    categoria: 'Órgão Público',
    nome: 'Corpo de Bombeiros',
    telefone: '193',
    descricao: 'Incêndio, resgate e vazamento de gás'
  },
  {
    id: 'cont_03',
    condominioId: 'cond_01',
    categoria: 'Órgão Público',
    nome: 'SAMU (Ambulância)',
    telefone: '192',
    descricao: 'Atendimento médico de urgência'
  },
  {
    id: 'cont_04',
    condominioId: 'cond_01',
    categoria: 'Supervisão INFPORT',
    nome: 'Central de Apoio 24h INFPORT',
    telefone: '11940609960',
    whatsapp: '11940609960',
    descricao: 'Supervisão de postos e apoio operacional'
  },
  {
    id: 'cont_05',
    condominioId: 'cond_01',
    categoria: 'Gestão Interna',
    nome: 'Roberto Carlos (Síndico)',
    telefone: '11940609960',
    whatsapp: '11940609960',
    descricao: 'Síndico Geral do Residencial'
  },
  {
    id: 'cont_06',
    condominioId: 'cond_01',
    categoria: 'Manutenção Crítica',
    nome: 'Atlas Schindler Elevadores',
    telefone: '08000551010',
    descricao: 'Plantão técnico 24h para resgate de passageiros'
  }
];

// ----------------- STORE HOOKS & PERSISTÊNCIA -----------------

export const mockDb = {
  getCondominios: () => {
    let list = getStored<Condominio[]>('condominios', INITIAL_CONDOMINIOS);
    if (!list.some((c) => c.id === 'cond_03')) {
      const c03 = INITIAL_CONDOMINIOS.find((c) => c.id === 'cond_03');
      if (c03) {
        list.push(c03);
      }
    }
    // Assegura campos locaisArmazenamento e turnos
    let mudou = false;
    list = list.map((c) => {
      const init = INITIAL_CONDOMINIOS.find((ic) => ic.id === c.id);
      let updated = { ...c };
      if (!updated.locaisArmazenamento || updated.locaisArmazenamento.length === 0) {
        updated.locaisArmazenamento = init?.locaisArmazenamento || [
          'Portaria - Prateleira A',
          'Portaria - Prateleira B',
          'Armário 01',
          'Armário 02',
          'Bancada Principal',
          'Chão / Caixas Grandes'
        ];
        mudou = true;
      }
      if (!updated.turnos) {
        updated.turnos = init?.turnos || {
          diurno: { inicio: '07:00', fim: '19:00', nome: 'Plantão Diurno (07h às 19h)' },
          noturno: { inicio: '19:00', fim: '07:00', nome: 'Plantão Noturno (19h às 07h)' }
        };
        mudou = true;
      }
      return updated;
    });
    if (mudou) {
      setStored('condominios', list);
    }
    return list;
  },
  saveCondominios: (data: Condominio[]) => setStored('condominios', data),

  getOperadores: () => {
    const list = getStored<Operador[]>('operadores', INITIAL_OPERADORES);
    const opCaetano = list.find((o) => o.login === 'caetano');
    if (opCaetano && (!opCaetano.condominiosAutorizados || !opCaetano.condominiosAutorizados.includes('cond_03'))) {
      opCaetano.condominiosAutorizados = ['cond_03', 'cond_01'];
      setStored('operadores', list);
    }
    return list;
  },
  saveOperadores: (data: Operador[]) => setStored('operadores', data),

  getMoradores: () => getStored('moradores', INITIAL_MORADORES),
  saveMoradores: (data: Morador[]) => setStored('moradores', data),

  getEntregadores: () => getStored('entregadores', INITIAL_ENTREGADORES),
  saveEntregadores: (data: Entregador[]) => setStored('entregadores', data),

  getLotes: () => getStored('lotes', INITIAL_LOTES),
  saveLotes: (data: LoteEncomenda[]) => setStored('lotes', data),

  getItensEncomenda: () => getStored('itens_encomenda', INITIAL_ITENS_ENCOMENDA),
  saveItensEncomenda: (data: ItemEncomenda[]) => setStored('itens_encomenda', data),

  getCustodias: () => getStored('custodias', INITIAL_CUSTODIAS),
  saveCustodias: (data: ItemCustodia[]) => setStored('custodias', data),

  getMateriais: () => getStored('materiais', INITIAL_MATERIAIS),
  saveMateriais: (data: MaterialPosto[]) => setStored('materiais', data),

  getChaves: () => getStored('chaves', INITIAL_CHAVES),
  saveChaves: (data: Chave[]) => setStored('chaves', data),

  getChecklistConfig: () => getStored('checklist_config', INITIAL_MANUTENCAO_CONFIG),
  saveChecklistConfig: (data: ItemChecklistConfig[]) => setStored('checklist_config', data),

  getChamados: () => getStored('chamados', INITIAL_CHAMADOS),
  saveChamados: (data: ChamadoManutencao[]) => setStored('chamados', data),

  getPontosRonda: () => getStored('pontos_ronda', INITIAL_PONTOS_RONDA),
  savePontosRonda: (data: PontoRonda[]) => setStored('pontos_ronda', data),

  getExecucoesRonda: () => getStored('execucoes_ronda', INITIAL_EXECUCOES_RONDA),
  saveExecucoesRonda: (data: ExecucaoRonda[]) => setStored('execucoes_ronda', data),

  getOcorrencias: () => getStored('ocorrencias', INITIAL_OCORRENCIAS),
  saveOcorrencias: (data: Ocorrencia[]) => setStored('ocorrencias', data),

  getPassagens: () => getStored<PassagemPosto[]>('passagens', []),
  savePassagens: (data: PassagemPosto[]) => setStored('passagens', data),

  getAutorizados: () => getStored('autorizados', INITIAL_AUTORIZADOS),
  saveAutorizados: (data: Autorizado[]) => setStored('autorizados', data),

  getContatosEmergencia: () => getStored('contatos_emergencia', INITIAL_CONTATOS_EMERGENCIA),
  saveContatosEmergencia: (data: ContatoEmergencia[]) => setStored('contatos_emergencia', data)
};

export const mockDatabase = mockDb;
