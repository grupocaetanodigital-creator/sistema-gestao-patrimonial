import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { mockDatabase } from '../data/mockDatabase';

const STORAGE_SUPABASE_URL_KEY = 'infport_supabase_url';
const STORAGE_SUPABASE_KEY_KEY = 'infport_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_KEY_KEY) || '' : '';

  const url = (storedUrl || envUrl).trim();
  const anonKey = (storedKey || envKey).trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && url.startsWith('http'))
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
  localStorage.setItem(STORAGE_SUPABASE_KEY_KEY, anonKey.trim());
  cachedClient = null; // Reset cached client
}

export function clearSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
  localStorage.removeItem(STORAGE_SUPABASE_KEY_KEY);
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config.isConfigured) return null;

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
    return cachedClient;
  } catch (error) {
    console.error('Erro ao inicializar Supabase Client:', error);
    return null;
  }
}

/**
 * Testa a conectividade com o Supabase verificando a tabela 'condominios'
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase não configurado. Forneça o URL do projeto e a Chave Pública Anon.'
    };
  }

  try {
    const { data, error } = await client.from('condominios').select('id, codigo, nome').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Conectou ao Supabase, mas as tabelas ainda não foram criadas! Execute o script SQL no SQL Editor do Supabase.',
          details: error
        };
      }
      return {
        success: false,
        message: `Falha ao consultar tabela no Supabase: ${error.message}`,
        details: error
      };
    }
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso! Tabelas acessíveis no Supabase.',
      details: data
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro na requisição: ${err?.message || 'Falha desconhecida'}`,
      details: err
    };
  }
}

/**
 * Sincroniza todos os dados locais do aplicativo para as tabelas do Supabase (Upload)
 */
export async function syncLocalToSupabase(): Promise<{ success: boolean; log: string[]; totalRecords: number }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase não está configurado.');
  }

  const log: string[] = [];
  let totalRecords = 0;

  // 1. Condomínios
  const condominios = mockDatabase.getCondominios();
  if (condominios.length > 0) {
    const payload = condominios.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nome: c.nome,
      cnpj: c.cnpj || null,
      endereco: c.endereco || null,
      telefone_portaria: c.telefonePortaria || null,
      nome_sindico: c.nomeSindico || null,
      telefone_sindico: c.telefoneSindico || null,
      horario_inicio_obras: c.horarioInicioObras || '08:00',
      horario_fim_obras: c.horarioFimObras || '17:00',
      intervalo_ronda_minutos: c.intervaloRondaMinutos || 60,
      tipo_estrutura: c.tipoEstrutura || 'Blocos',
      quantidade_blocos: c.quantidadeBlocos || 2,
      unidades_por_bloco: c.unidadesPorBloco || 40,
      lista_blocos: c.listaBlocos || [],
      locais_armazenamento: c.locaisArmazenamento || [],
      turnos: c.turnos || {},
      feature_flags: c.featureFlags || {}
    }));

    const { error } = await client.from('condominios').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir condomínios: ${error.message}`);
    log.push(`✓ ${condominios.length} Condomínios sincronizados`);
    totalRecords += condominios.length;
  }

  // 2. Operadores
  const operadores = mockDatabase.getOperadores();
  if (operadores.length > 0) {
    const payload = operadores.map((op) => ({
      id: op.id,
      codigo: op.codigo,
      nome: op.nome,
      login: op.login,
      pin: op.pin,
      cargo: op.cargo,
      role: op.role,
      condominios_autorizados: op.condominiosAutorizados || []
    }));
    const { error } = await client.from('operadores').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir operadores: ${error.message}`);
    log.push(`✓ ${operadores.length} Operadores sincronizados`);
    totalRecords += operadores.length;
  }

  // 3. Moradores
  const moradores = mockDatabase.getMoradores();
  if (moradores.length > 0) {
    const payload = moradores.map((m) => ({
      id: m.id,
      codigo: m.codigo,
      condominio_id: m.condominioId,
      unidade: m.unidade,
      nome_completo: m.nomeCompleto,
      whatsapp: m.whatsapp || null,
      tipo_vinculo: m.tipoVinculo || 'Proprietário'
    }));
    const { error } = await client.from('moradores').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir moradores: ${error.message}`);
    log.push(`✓ ${moradores.length} Moradores sincronizados`);
    totalRecords += moradores.length;
  }

  // 4. Entregadores
  const entregadores = mockDatabase.getEntregadores();
  if (entregadores.length > 0) {
    const payload = entregadores.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nome: e.nome,
      documento: e.documento || null,
      empresa: e.empresa || null
    }));
    const { error } = await client.from('entregadores').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir entregadores: ${error.message}`);
    log.push(`✓ ${entregadores.length} Entregadores sincronizados`);
    totalRecords += entregadores.length;
  }

  // 5. Lotes de Encomenda
  const lotes = mockDatabase.getLotes();
  if (lotes.length > 0) {
    const payload = lotes.map((l) => ({
      id: l.id,
      codigo_re: l.codigoRE,
      condominio_id: l.condominioId,
      entregador_id: l.entregadorId || null,
      entregador_nome: l.entregadorNome,
      empresa: l.empresa,
      quantidade_declarada: l.quantidadeDeclarada,
      quantidade_triada: l.quantidadeTriada,
      operador_id: l.operadorId,
      operador_nome: l.operadorNome,
      data_hora: l.dataHora,
      status: l.status
    }));
    const { error } = await client.from('lotes_encomenda').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir lotes: ${error.message}`);
    log.push(`✓ ${lotes.length} Lotes de encomenda sincronizados`);
    totalRecords += lotes.length;
  }

  // 6. Itens de Encomenda
  const itens = mockDatabase.getItensEncomenda();
  if (itens.length > 0) {
    const payload = itens.map((i) => ({
      id: i.id,
      lote_id: i.loteId,
      codigo_re: i.codigoRE,
      condominio_id: i.condominioId,
      unidade: i.unidade,
      morador_id: i.moradorId || null,
      morador_nome: i.moradorNome,
      morador_whatsapp: i.moradorWhatsapp || null,
      codigo_rastreio: i.codigoRastreio || null,
      foto_etiqueta_url: i.fotoEtiquetaUrl || '',
      observacoes: i.observacoes || null,
      local_armazenamento: i.localArmazenamento || null,
      status: i.status,
      data_recebimento: i.dataRecebimento,
      operador_recebimento_nome: i.operadorRecebimentoNome,
      data_entrega: i.dataEntrega || null,
      retirante_nome: i.retiranteNome || null,
      foto_comprovante_url: i.fotoComprovanteUrl || null,
      operador_entrega_nome: i.operadorEntregaNome || null
    }));
    const { error } = await client.from('itens_encomenda').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir encomendas: ${error.message}`);
    log.push(`✓ ${itens.length} Itens de encomenda sincronizados`);
    totalRecords += itens.length;
  }

  // 7. Custódia
  const custodias = mockDatabase.getCustodias();
  if (custodias.length > 0) {
    const payload = custodias.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      condominio_id: c.condominioId,
      fluxo: c.fluxo,
      origem_descricao: c.origemDescricao,
      destino_descricao: c.destinoDescricao,
      descricao_item: c.descricaoItem,
      foto_item_url: c.fotoItemUrl || '',
      data_entrada: c.dataEntrada,
      operador_entrada_nome: c.operadorEntradaNome,
      status: c.status,
      data_saida: c.dataSaida || null,
      retirante_nome: c.retiranteNome || null,
      retirante_documento: c.retiranteDocumento || null,
      foto_baixa_url: c.fotoBaixaUrl || null,
      operador_saida_nome: c.operadorSaidaNome || null
    }));
    const { error } = await client.from('itens_custodia').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir custódias: ${error.message}`);
    log.push(`✓ ${custodias.length} Itens em custódia sincronizados`);
    totalRecords += custodias.length;
  }

  // 8. Materiais
  const materiais = mockDatabase.getMateriais();
  if (materiais.length > 0) {
    const payload = materiais.map((m) => ({
      id: m.id,
      codigo: m.codigo,
      condominio_id: m.condominioId,
      nome: m.nome,
      propriedade: m.propriedade,
      categoria: m.categoria,
      numero_serie_tag: m.numeroSerieTag || null,
      quantidade: m.quantidade,
      estado: m.estado,
      foto_url: m.fotoUrl || null,
      ultima_conferencia: m.ultimaConferencia || null,
      observacao_avaria: m.observacaoAvaria || null,
      foto_avaria_url: m.fotoAvariaUrl || null
    }));
    const { error } = await client.from('materiais_posto').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir materiais: ${error.message}`);
    log.push(`✓ ${materiais.length} Materiais de posto sincronizados`);
    totalRecords += materiais.length;
  }

  // 9. Chaves
  const chaves = mockDatabase.getChaves();
  if (chaves.length > 0) {
    const payload = chaves.map((k) => ({
      id: k.id,
      codigo: k.codigo,
      condominio_id: k.condominioId,
      etiqueta_claviculario: k.etiquetaClaviculario,
      nome: k.nome,
      categoria: k.categoria,
      tempo_maximo_horas: k.tempoMaximoHoras || null,
      horario_limite_devolucao: k.horarioLimiteDevolucao || null,
      status: k.status,
      foto_chave_url: k.fotoChaveUrl || null,
      solicitante_tipo: k.solicitanteTipo || null,
      solicitante_nome: k.solicitanteNome || null,
      solicitante_detalhe: k.solicitanteDetalhe || null,
      solicitante_documento_foto_url: k.solicitanteDocumentoFotoUrl || null,
      motivo_retirada: k.motivoRetirada || null,
      data_hora_retirada: k.dataHoraRetirada || null,
      previsao_devolucao: k.previsaoDevolucao || null,
      operador_retirada_nome: k.operadorRetiradaNome || null
    }));
    const { error } = await client.from('chaves').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir chaves: ${error.message}`);
    log.push(`✓ ${chaves.length} Chaves sincronizadas`);
    totalRecords += chaves.length;
  }

  // 10. Manutenção
  const chamados = mockDatabase.getChamados();
  if (chamados.length > 0) {
    const payload = chamados.map((c) => ({
      id: c.id,
      codigo_os: c.codigoOS,
      condominio_id: c.condominioId,
      origem: c.origem,
      titulo: c.titulo,
      categoria: c.categoria,
      localizacao: c.localizacao,
      prioridade: c.prioridade,
      descricao: c.descricao,
      foto_antes_url: c.fotoAntesUrl || '',
      status: c.status,
      data_abertura: c.dataAbertura,
      operador_abertura_nome: c.operadorAberturaNome,
      data_conclusao: c.dataConclusao || null,
      solucao_descricao: c.solucaoDescricao || null,
      foto_depois_url: c.fotoDepoisUrl || null,
      operador_conclusao_nome: c.operadorConclusaoNome || null
    }));
    const { error } = await client.from('chamados_manutencao').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir chamados: ${error.message}`);
    log.push(`✓ ${chamados.length} Chamados de manutenção sincronizados`);
    totalRecords += chamados.length;
  }

  // 11. Pontos de Ronda
  const pontosRonda = mockDatabase.getPontosRonda();
  if (pontosRonda.length > 0) {
    const payload = pontosRonda.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      condominio_id: p.condominioId,
      nome: p.nome,
      tipo_validacao: p.tipoValidacao,
      codigo_hash: p.codigoHash,
      codigo_identificador: p.codigoIdentificador || null,
      latitude: p.latitude || null,
      longitude: p.longitude || null,
      perguntas: p.perguntas || []
    }));
    const { error } = await client.from('pontos_ronda').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir pontos de ronda: ${error.message}`);
    log.push(`✓ ${pontosRonda.length} Pontos de ronda sincronizados`);
    totalRecords += pontosRonda.length;
  }

  // 12. Execuções de Ronda
  const execucoes = mockDatabase.getExecucoesRonda();
  if (execucoes.length > 0) {
    const payload = execucoes.map((r) => ({
      id: r.id,
      codigo_ronda: r.codigoRonda,
      condominio_id: r.condominioId,
      operador_nome: r.operadorNome,
      turno: r.turno || null,
      data_hora_inicio: r.dataHoraInicio,
      data_hora_fim: r.dataHoraFim || null,
      status: r.status,
      pontos_lidos: r.pontosLidos,
      total_pontos: r.totalPontos,
      anomalias: r.anomalias || []
    }));
    const { error } = await client.from('execucoes_ronda').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir rondas: ${error.message}`);
    log.push(`✓ ${execucoes.length} Registros de ronda sincronizados`);
    totalRecords += execucoes.length;
  }

  // 13. Ocorrências
  const ocorrencias = mockDatabase.getOcorrencias();
  if (ocorrencias.length > 0) {
    const payload = ocorrencias.map((o) => ({
      id: o.id,
      codigo: o.codigo,
      condominio_id: o.condominioId,
      tipo: o.tipo,
      categoria: o.categoria,
      severidade: o.severidade || 'Média',
      unidade_infratora: o.unidadeInfratora || null,
      unidade_reclamante: o.unidadeReclamante || null,
      descricao: o.descricao,
      foto_url: o.fotoUrl || null,
      audio_url: o.audioUrl || null,
      data_hora: o.dataHora,
      operador_nome: o.operadorNome,
      providencias_tomadas: o.providenciasTomadas || null,
      status_ocorrencia: o.statusOcorrencia || 'Pendente',
      observacao_resolucao: o.observacaoResolucao || null,
      resolvido_por: o.resolvidoPor || null,
      data_resolucao: o.dataResolucao || null
    }));
    const { error } = await client.from('ocorrencias').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir ocorrências: ${error.message}`);
    log.push(`✓ ${ocorrencias.length} Ocorrências sincronizadas`);
    totalRecords += ocorrencias.length;
  }

  // 14. Passagens de Posto
  const passagens = mockDatabase.getPassagens();
  if (passagens.length > 0) {
    const payload = passagens.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      condominio_id: p.condominioId,
      operador_sainte_nome: p.operadorSainteNome,
      operador_entrante_nome: p.operadorEntranteNome,
      data_hora: p.dataHora,
      status: p.status,
      resumo_chaves_retidas: p.resumoChavesRetidas,
      resumo_materiais_ok: p.resumoMateriaisOk,
      resumo_manutencoes_abertas: p.resumoManutencoesAbertas,
      resumo_ocorrencias_abertas: p.resumoOcorrenciasAbertas,
      resumo_encomendas_retidas: p.resumoEncomendasRetidas,
      resumo_custodia_pendentes: p.resumoCustodiaPendentes || 0,
      resumo_rondas_feitas: p.resumoRondasFeitas || 0,
      resumo_materiais_com_defeito: p.resumoMateriaisComDefeito || 0,
      resumo_autorizados_no_condominio: p.resumoAutorizadosNoCondominio || 0,
      resumo_lotes_pendentes_triagem: p.resumoLotesPendentesTriagem || 0,
      resumo_encomendas_faltam_triar: p.resumoEncomendasFaltamTriar || 0,
      recados_turno: p.recadosTurno || null,
      divergencias: p.divergencias || null,
      assinatura_sainte_confirmada: p.assinaturaSainteConfirmada,
      assinatura_entrante_confirmada: p.assinaturaEntranteConfirmada
    }));
    const { error } = await client.from('passagens_posto').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir passagens: ${error.message}`);
    log.push(`✓ ${passagens.length} Passagens de posto sincronizadas`);
    totalRecords += passagens.length;
  }

  // 15. Autorizados
  const autorizados = mockDatabase.getAutorizados();
  if (autorizados.length > 0) {
    const payload = autorizados.map((a) => ({
      id: a.id,
      codigo: a.codigo,
      condominio_id: a.condominioId,
      nome: a.nome,
      tipo_autorizacao: a.tipoAutorizacao,
      unidade_responsavel: a.unidadeResponsavel,
      morador_solicitante_nome: a.moradorSolicitanteNome,
      vigencia_tipo: a.vigenciaTipo,
      data_inicio: a.dataInicio,
      data_fim: a.dataFim || null,
      status_acesso: a.statusAcesso,
      ultimo_checkin: a.ultimoCheckin || null,
      ultimo_checkout: a.ultimoCheckout || null,
      cracha_atual: a.crachaAtual || null
    }));
    const { error } = await client.from('autorizados').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir autorizados: ${error.message}`);
    log.push(`✓ ${autorizados.length} Autorizados sincronizados`);
    totalRecords += autorizados.length;
  }

  // 16. Contatos de Emergência
  const contatos = mockDatabase.getContatosEmergencia();
  if (contatos.length > 0) {
    const payload = contatos.map((c) => ({
      id: c.id,
      condominio_id: c.condominioId,
      categoria: c.categoria,
      nome: c.nome,
      telefone: c.telefone,
      whatsapp: c.whatsapp || null,
      descricao: c.descricao || null
    }));
    const { error } = await client.from('contatos_emergencia').upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(`Erro ao subir contatos de emergência: ${error.message}`);
    log.push(`✓ ${contatos.length} Contatos de emergência sincronizados`);
    totalRecords += contatos.length;
  }

  return {
    success: true,
    log,
    totalRecords
  };
}

/**
 * Baixa dados do Supabase e salva no banco local do app (Download/Pull)
 */
export async function syncSupabaseToLocal(): Promise<{ success: boolean; log: string[]; totalRecords: number }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase não está configurado.');
  }

  const log: string[] = [];
  let totalRecords = 0;

  // 1. Condomínios
  const { data: condData, error: condError } = await client.from('condominios').select('*');
  if (condError) throw new Error(`Erro baixando condomínios: ${condError.message}`);
  if (condData && condData.length > 0) {
    const mapeados = condData.map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      nome: c.nome,
      cnpj: c.cnpj || '',
      endereco: c.endereco || '',
      telefonePortaria: c.telefone_portaria || '',
      nomeSindico: c.nome_sindico || '',
      telefoneSindico: c.telefone_sindico || '',
      horarioInicioObras: c.horario_inicio_obras || '08:00',
      horarioFimObras: c.horario_fim_obras || '17:00',
      intervaloRondaMinutos: c.intervalo_ronda_minutos || 60,
      tipoEstrutura: c.tipo_estrutura || 'Blocos',
      quantidadeBlocos: c.quantidade_blocos || 2,
      unidadesPorBloco: c.unidades_por_bloco || 40,
      listaBlocos: c.lista_blocos || [],
      locaisArmazenamento: c.locais_armazenamento || [],
      turnos: c.turnos,
      featureFlags: c.feature_flags
    }));
    mockDatabase.saveCondominios(mapeados);
    log.push(`✓ ${mapeados.length} Condomínios baixados`);
    totalRecords += mapeados.length;
  }

  // 2. Operadores
  const { data: operData, error: operError } = await client.from('operadores').select('*');
  if (operError) throw new Error(`Erro baixando operadores: ${operError.message}`);
  if (operData && operData.length > 0) {
    const mapeados = operData.map((op: any) => ({
      id: op.id,
      codigo: op.codigo,
      nome: op.nome,
      login: op.login,
      pin: op.pin,
      cargo: op.cargo,
      role: op.role,
      condominiosAutorizados: op.condominios_autorizados || []
    }));
    mockDatabase.saveOperadores(mapeados);
    log.push(`✓ ${mapeados.length} Operadores baixados`);
    totalRecords += mapeados.length;
  }

  // 3. Moradores
  const { data: morData, error: morError } = await client.from('moradores').select('*');
  if (morError) throw new Error(`Erro baixando moradores: ${morError.message}`);
  if (morData && morData.length > 0) {
    const mapeados = morData.map((m: any) => ({
      id: m.id,
      codigo: m.codigo,
      condominioId: m.condominio_id,
      unidade: m.unidade,
      nomeCompleto: m.nome_completo,
      whatsapp: m.whatsapp || '',
      tipoVinculo: m.tipo_vinculo || 'Proprietário'
    }));
    mockDatabase.saveMoradores(mapeados);
    log.push(`✓ ${mapeados.length} Moradores baixados`);
    totalRecords += mapeados.length;
  }

  // 4. Entregadores
  const { data: entData, error: entError } = await client.from('entregadores').select('*');
  if (entError) throw new Error(`Erro baixando entregadores: ${entError.message}`);
  if (entData && entData.length > 0) {
    const mapeados = entData.map((e: any) => ({
      id: e.id,
      codigo: e.codigo,
      nome: e.nome,
      documento: e.documento || '',
      empresa: e.empresa || ''
    }));
    mockDatabase.saveEntregadores(mapeados);
    log.push(`✓ ${mapeados.length} Entregadores baixados`);
    totalRecords += mapeados.length;
  }

  // 5. Lotes
  const { data: lotesData, error: lotesError } = await client.from('lotes_encomenda').select('*');
  if (lotesError) throw new Error(`Erro baixando lotes: ${lotesError.message}`);
  if (lotesData && lotesData.length > 0) {
    const mapeados = lotesData.map((l: any) => ({
      id: l.id,
      codigoRE: l.codigo_re,
      condominioId: l.condominio_id,
      entregadorId: l.entregador_id || '',
      entregadorNome: l.entregador_nome,
      empresa: l.empresa,
      quantidadeDeclarada: l.quantidade_declarada,
      quantidadeTriada: l.quantidade_triada,
      operadorId: l.operador_id,
      operadorNome: l.operador_nome,
      dataHora: l.data_hora,
      status: l.status
    }));
    mockDatabase.saveLotes(mapeados);
    log.push(`✓ ${mapeados.length} Lotes de encomenda baixados`);
    totalRecords += mapeados.length;
  }

  // 6. Itens de Encomenda
  const { data: itensData, error: itensError } = await client.from('itens_encomenda').select('*');
  if (itensError) throw new Error(`Erro baixando itens: ${itensError.message}`);
  if (itensData && itensData.length > 0) {
    const mapeados = itensData.map((i: any) => ({
      id: i.id,
      loteId: i.lote_id,
      codigoRE: i.codigo_re,
      condominioId: i.condominio_id,
      unidade: i.unidade,
      moradorId: i.morador_id,
      moradorNome: i.morador_nome,
      moradorWhatsapp: i.morador_whatsapp || '',
      codigoRastreio: i.codigo_rastreio,
      fotoEtiquetaUrl: i.foto_etiqueta_url,
      observacoes: i.observacoes,
      localArmazenamento: i.local_armazenamento,
      status: i.status,
      dataRecebimento: i.data_recebimento,
      operadorRecebimentoNome: i.operador_recebimento_nome,
      dataEntrega: i.data_entrega,
      retiranteNome: i.retirante_nome,
      fotoComprovanteUrl: i.foto_comprovante_url,
      operadorEntregaNome: i.operador_entrega_nome
    }));
    mockDatabase.saveItensEncomenda(mapeados);
    log.push(`✓ ${mapeados.length} Itens de encomenda baixados`);
    totalRecords += mapeados.length;
  }

  // 7. Custódia
  const { data: custData, error: custError } = await client.from('itens_custodia').select('*');
  if (custError) throw new Error(`Erro baixando custódias: ${custError.message}`);
  if (custData && custData.length > 0) {
    const mapeados = custData.map((c: any) => ({
      id: c.id,
      codigo: c.codigo,
      condominioId: c.condominio_id,
      fluxo: c.fluxo,
      origemDescricao: c.origem_descricao,
      destinoDescricao: c.destino_descricao,
      descricaoItem: c.descricao_item,
      fotoItemUrl: c.foto_item_url,
      dataEntrada: c.data_entrada,
      operadorEntradaNome: c.operador_entrada_nome,
      status: c.status,
      dataSaida: c.data_saida,
      retiranteNome: c.retirante_nome,
      retiranteDocumento: c.retirante_documento,
      fotoBaixaUrl: c.foto_baixa_url,
      operadorSaidaNome: c.operador_saida_nome
    }));
    mockDatabase.saveCustodias(mapeados);
    log.push(`✓ ${mapeados.length} Itens em custódia baixados`);
    totalRecords += mapeados.length;
  }

  // 8. Materiais
  const { data: matData, error: matError } = await client.from('materiais_posto').select('*');
  if (matError) throw new Error(`Erro baixando materiais: ${matError.message}`);
  if (matData && matData.length > 0) {
    const mapeados = matData.map((m: any) => ({
      id: m.id,
      codigo: m.codigo,
      condominioId: m.condominio_id,
      nome: m.nome,
      propriedade: m.propriedade,
      categoria: m.categoria,
      numeroSerieTag: m.numero_serie_tag,
      quantidade: m.quantidade,
      estado: m.estado,
      fotoUrl: m.foto_url,
      ultimaConferencia: m.ultima_conferencia,
      observacaoAvaria: m.observacao_avaria,
      fotoAvariaUrl: m.foto_avaria_url
    }));
    mockDatabase.saveMateriais(mapeados);
    log.push(`✓ ${mapeados.length} Materiais de posto baixados`);
    totalRecords += mapeados.length;
  }

  // 9. Chaves
  const { data: chavesData, error: chavesError } = await client.from('chaves').select('*');
  if (chavesError) throw new Error(`Erro baixando chaves: ${chavesError.message}`);
  if (chavesData && chavesData.length > 0) {
    const mapeados = chavesData.map((k: any) => ({
      id: k.id,
      codigo: k.codigo,
      condominioId: k.condominio_id,
      etiquetaClaviculario: k.etiqueta_claviculario,
      nome: k.nome,
      categoria: k.categoria,
      tempoMaximoHoras: k.tempo_maximo_horas,
      horarioLimiteDevolucao: k.horario_limite_devolucao,
      status: k.status,
      fotoChaveUrl: k.foto_chave_url,
      solicitanteTipo: k.solicitante_tipo,
      solicitanteNome: k.solicitante_nome,
      solicitanteDetalhe: k.solicitante_detalhe,
      solicitanteDocumentoFotoUrl: k.solicitante_documento_foto_url,
      motivoRetirada: k.motivo_retirada,
      dataHoraRetirada: k.data_hora_retirada,
      previsaoDevolucao: k.previsao_devolucao,
      operadorRetiradaNome: k.operador_retirada_nome
    }));
    mockDatabase.saveChaves(mapeados);
    log.push(`✓ ${mapeados.length} Chaves baixadas`);
    totalRecords += mapeados.length;
  }

  // 10. Chamados
  const { data: chamadosData, error: chamadosError } = await client.from('chamados_manutencao').select('*');
  if (chamadosError) throw new Error(`Erro baixando chamados: ${chamadosError.message}`);
  if (chamadosData && chamadosData.length > 0) {
    const mapeados = chamadosData.map((c: any) => ({
      id: c.id,
      codigoOS: c.codigo_os,
      condominioId: c.condominio_id,
      origem: c.origem,
      titulo: c.titulo,
      categoria: c.categoria,
      localizacao: c.localizacao,
      prioridade: c.prioridade,
      descricao: c.descricao,
      fotoAntesUrl: c.foto_antes_url,
      status: c.status,
      dataAbertura: c.data_abertura,
      operadorAberturaNome: c.operador_abertura_nome,
      dataConclusao: c.data_conclusao,
      solucaoDescricao: c.solucao_descricao,
      fotoDepoisUrl: c.foto_depois_url,
      operadorConclusaoNome: c.operador_conclusao_nome
    }));
    mockDatabase.saveChamados(mapeados);
    log.push(`✓ ${mapeados.length} Chamados baixados`);
    totalRecords += mapeados.length;
  }

  // 11. Pontos de Ronda
  const { data: pontosData, error: pontosError } = await client.from('pontos_ronda').select('*');
  if (pontosError) throw new Error(`Erro baixando pontos de ronda: ${pontosError.message}`);
  if (pontosData && pontosData.length > 0) {
    const mapeados = pontosData.map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      condominioId: p.condominio_id,
      nome: p.nome,
      tipoValidacao: p.tipo_validacao,
      codigoHash: p.codigo_hash,
      codigoIdentificador: p.codigo_identificador,
      latitude: p.latitude,
      longitude: p.longitude,
      perguntas: p.perguntas || []
    }));
    mockDatabase.savePontosRonda(mapeados);
    log.push(`✓ ${mapeados.length} Pontos de ronda baixados`);
    totalRecords += mapeados.length;
  }

  // 12. Execuções de Ronda
  const { data: execData, error: execError } = await client.from('execucoes_ronda').select('*');
  if (execError) throw new Error(`Erro baixando execuções: ${execError.message}`);
  if (execData && execData.length > 0) {
    const mapeados = execData.map((r: any) => ({
      id: r.id,
      codigoRonda: r.codigo_ronda,
      condominioId: r.condominio_id,
      operadorNome: r.operador_nome,
      turno: r.turno,
      dataHoraInicio: r.data_hora_inicio,
      dataHoraFim: r.data_hora_fim,
      status: r.status,
      pontosLidos: r.pontos_lidos,
      totalPontos: r.total_pontos,
      anomalias: r.anomalias || []
    }));
    mockDatabase.saveExecucoesRonda(mapeados);
    log.push(`✓ ${mapeados.length} Execuções de ronda baixadas`);
    totalRecords += mapeados.length;
  }

  // 13. Ocorrências
  const { data: ocoData, error: ocoError } = await client.from('ocorrencias').select('*');
  if (ocoError) throw new Error(`Erro baixando ocorrências: ${ocoError.message}`);
  if (ocoData && ocoData.length > 0) {
    const mapeados = ocoData.map((o: any) => ({
      id: o.id,
      codigo: o.codigo,
      condominioId: o.condominio_id,
      tipo: o.tipo,
      categoria: o.categoria,
      severidade: o.severidade,
      unidadeInfratora: o.unidade_infratora,
      unidadeReclamante: o.unidade_reclamante,
      descricao: o.descricao,
      fotoUrl: o.foto_url,
      audioUrl: o.audio_url,
      dataHora: o.data_hora,
      operadorNome: o.operador_nome,
      providenciasTomadas: o.providencias_tomadas,
      statusOcorrencia: o.status_ocorrencia,
      observacaoResolucao: o.observacao_resolucao,
      resolvidoPor: o.resolvido_por,
      dataResolucao: o.data_resolucao
    }));
    mockDatabase.saveOcorrencias(mapeados);
    log.push(`✓ ${mapeados.length} Ocorrências baixadas`);
    totalRecords += mapeados.length;
  }

  // 14. Passagens de Posto
  const { data: pasData, error: pasError } = await client.from('passagens_posto').select('*');
  if (pasError) throw new Error(`Erro baixando passagens: ${pasError.message}`);
  if (pasData && pasData.length > 0) {
    const mapeados = pasData.map((p: any) => ({
      id: p.id,
      codigo: p.codigo,
      condominioId: p.condominio_id,
      operadorSainteNome: p.operador_sainte_nome,
      operadorEntranteNome: p.operador_entrante_nome,
      dataHora: p.data_hora,
      status: p.status,
      resumoChavesRetidas: p.resumo_chaves_retidas,
      resumoMateriaisOk: p.resumo_materiais_ok,
      resumoManutencoesAbertas: p.resumo_manutencoes_abertas,
      resumoOcorrenciasAbertas: p.resumo_ocorrencias_abertas,
      resumoEncomendasRetidas: p.resumo_encomendas_retidas,
      resumoCustodiaPendentes: p.resumo_custodia_pendentes,
      resumoRondasFeitas: p.resumo_rondas_feitas,
      resumoMateriaisComDefeito: p.resumo_materiais_com_defeito,
      resumoAutorizadosNoCondominio: p.resumo_autorizados_no_condominio,
      resumoLotesPendentesTriagem: p.resumo_lotes_pendentes_triagem,
      resumoEncomendasFaltamTriar: p.resumo_encomendas_faltam_triar,
      recadosTurno: p.recados_turno || '',
      divergencias: p.divergencias || '',
      assinaturaSainteConfirmada: p.assinatura_sainte_confirmada,
      assinaturaEntranteConfirmada: p.assinatura_entrante_confirmada
    }));
    mockDatabase.savePassagens(mapeados);
    log.push(`✓ ${mapeados.length} Passagens de posto baixadas`);
    totalRecords += mapeados.length;
  }

  // 15. Autorizados
  const { data: autData, error: autError } = await client.from('autorizados').select('*');
  if (autError) throw new Error(`Erro baixando autorizados: ${autError.message}`);
  if (autData && autData.length > 0) {
    const mapeados = autData.map((a: any) => ({
      id: a.id,
      codigo: a.codigo,
      condominioId: a.condominio_id,
      nome: a.nome,
      tipoAutorizacao: a.tipo_autorizacao,
      unidadeResponsavel: a.unidade_responsavel,
      moradorSolicitanteNome: a.morador_solicitante_nome,
      vigenciaTipo: a.vigencia_tipo,
      dataInicio: a.data_inicio,
      dataFim: a.data_fim,
      statusAcesso: a.status_acesso,
      ultimoCheckin: a.ultimo_checkin,
      ultimoCheckout: a.ultimo_checkout,
      crachaAtual: a.cracha_atual
    }));
    mockDatabase.saveAutorizados(mapeados);
    log.push(`✓ ${mapeados.length} Autorizados baixados`);
    totalRecords += mapeados.length;
  }

  // 16. Contatos de Emergência
  const { data: contData, error: contError } = await client.from('contatos_emergencia').select('*');
  if (contError) throw new Error(`Erro baixando contatos: ${contError.message}`);
  if (contData && contData.length > 0) {
    const mapeados = contData.map((c: any) => ({
      id: c.id,
      condominioId: c.condominio_id,
      categoria: c.categoria,
      nome: c.nome,
      telefone: c.telefone,
      whatsapp: c.whatsapp,
      descricao: c.descricao
    }));
    mockDatabase.saveContatosEmergencia(mapeados);
    log.push(`✓ ${mapeados.length} Contatos de emergência baixados`);
    totalRecords += mapeados.length;
  }

  return {
    success: true,
    log,
    totalRecords
  };
}

/**
 * Garante que o bucket de armazenamento de fotos existe e é público no Supabase
 */
export async function ensurePhotoBucketExists(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase não está conectado. Configure URL e chave primeiro.' };

  try {
    const { data: buckets, error: listErr } = await client.storage.listBuckets();
    if (!listErr && buckets) {
      const hasInfport = buckets.some((b) => b.name === 'infport-fotos');
      const hasFotos = buckets.some((b) => b.name === 'fotos');
      if (hasInfport || hasFotos) {
        return {
          success: true,
          message: `Bucket ativo no Supabase (${hasInfport ? 'infport-fotos' : 'fotos'}) com permissão pública.`
        };
      }
    }

    const { error: createErr } = await client.storage.createBucket('infport-fotos', {
      public: true,
      fileSizeLimit: 10485760
    });

    if (createErr && !createErr.message.toLowerCase().includes('already exists')) {
      return {
        success: false,
        message: `Não foi possível criar o bucket automaticamente (${createErr.message}). Execute o script SQL no Supabase SQL Editor para conceder as permissões de storage.`
      };
    }

    return {
      success: true,
      message: 'Bucket "infport-fotos" configurado com sucesso para armazenamento público!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao verificar storage do Supabase: ${err?.message || err}`
    };
  }
}

/**
 * Upload de fotos para o Supabase Storage (Bucket infport-fotos com fallback para fotos)
 * Retorna a URL pública da foto se o Supabase estiver conectado.
 * Caso contrário, retorna a própria imagem compactada para funcionamento local/offline.
 */
export async function uploadPhotoToSupabase(
  dataUrlOrFile: string | Blob,
  folder: 'encomendas' | 'custodia' | 'manutencao' | 'ocorrencias' | 'chaves' | 'materiais' | 'moradores' | 'ronda' = 'encomendas',
  customPrefix?: string
): Promise<string> {
  const client = getSupabaseClient();
  if (!client) {
    return typeof dataUrlOrFile === 'string' ? dataUrlOrFile : '';
  }

  try {
    let blob: Blob;
    let contentType = 'image/jpeg';

    if (typeof dataUrlOrFile === 'string') {
      if (dataUrlOrFile.startsWith('http://') || dataUrlOrFile.startsWith('https://')) {
        return dataUrlOrFile;
      }
      const parts = dataUrlOrFile.split(',');
      const mimeMatch = parts[0]?.match(/:(.*?);/);
      if (mimeMatch) contentType = mimeMatch[1];
      const binaryStr = atob(parts[1] || parts[0]);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: contentType });
    } else {
      blob = dataUrlOrFile;
    }

    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const prefix = customPrefix ? `${customPrefix}_` : '';
    const filePath = `${folder}/${prefix}${timestamp}_${randomSuffix}.${ext}`;

    // Tentar infport-fotos primeiro
    let bucketName = 'infport-fotos';
    let uploadRes = await client.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType,
        upsert: true
      });

    // Se falhar por bucket não encontrado, tenta criar ou usar fotos
    if (uploadRes.error && uploadRes.error.message.toLowerCase().includes('bucket not found')) {
      try {
        await client.storage.createBucket('infport-fotos', { public: true });
        uploadRes = await client.storage
          .from('infport-fotos')
          .upload(filePath, blob, { contentType, upsert: true });
      } catch {
        bucketName = 'fotos';
        uploadRes = await client.storage
          .from('fotos')
          .upload(filePath, blob, { contentType, upsert: true });
      }
    }

    if (uploadRes.error) {
      console.warn('Erro ao fazer upload da imagem no Supabase Storage:', uploadRes.error.message);
      return typeof dataUrlOrFile === 'string' ? dataUrlOrFile : '';
    }

    const { data: publicUrlData } = client.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl || (typeof dataUrlOrFile === 'string' ? dataUrlOrFile : '');
  } catch (err) {
    console.warn('Exceção no upload para Supabase Storage:', err);
    return typeof dataUrlOrFile === 'string' ? dataUrlOrFile : '';
  }
}
