/**
 * Deep Link nativo WhatsApp ($0 cost)
 * Cria URL direta para api.whatsapp.com/send
 */
export function formatWhatsAppPhone(phone: string): string {
  // Remove tudo que não for dígito
  const digits = phone.replace(/\D/g, '');
  // Se não tiver o 55 (Brasil) e tiver 10 ou 11 dígitos, adiciona
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function formatWhatsAppPhotoLink(photoUrl?: string): string {
  if (!photoUrl) return 'Sem anexo fotográfico';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  // Se for base64 ou blob local, não quebrar a URL do WhatsApp com 150 mil caracteres
  return '📸 Foto registrada e arquivada no sistema da portaria';
}

export function buildWhatsAppDeepLink(phone: string, text: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(text);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

export function interpolateTemplate(template: string, variables: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    result = result.replace(regex, String(value));
  }
  return result;
}

export const DEFAULT_WHATSAPP_TEMPLATES = {
  LOTE_RECEBIDO: `📦 *NOVO LOTE DE ENCOMENDAS RECEBIDO (RE)*
Condomínio: {CONDOMINIO}
Lote: {LOTE_RE}
Transportadora: {EMPRESA}
Entregador: {ENTREGADOR}
Volumes Declarados: {QTD_VOLUMES} pacotes

Operador Responsável: {OPERADOR}
Data/Hora: {DATA_HORA}`,

  ENCOMENDA_DISPONIVEL: `Olá, {UNIDADE} - {MORADOR}! 📦
Sua encomenda chegou na Portaria do {CONDOMINIO}.

• Transportadora: {EMPRESA}
• Lote/RE: {LOTE_RE}
• Local: {LOCAL}
• Observação: {OBSERVACOES}
• Porteiro: {OPERADOR}
• Data/Hora: {DATA_HORA}
• Foto da Etiqueta: {LINK_FOTO}

Por favor, retire na portaria assim que possível.`,

  CONFIRMACAO_RETIRADA: `✅ *CONFIRMAÇÃO DE RETIRADA DE ENCOMENDA*
Condomínio: {CONDOMINIO}
Unidade: {UNIDADE}

Informamos que o(s) pacote(s) abaixo foram RETIRADOS da portaria:
• Qtd de Volumes: {QTD_RETIRADA}
• Quem Retirou: {RETIRANTE}
• Comprovante da Entrega: {LINK_FOTO}

Operador Responsável: {OPERADOR}
Data/Hora: {DATA_HORA}`,

  CUSTODIA_ENTRADA: `Olá! Você possui um item sob custódia deixado na portaria do {CONDOMINIO}.

• ORIGEM: {ORIGEM}
• DESTINO: {DESTINO}
• ITEM/OBS: {ITEM_DESCRICAO}
• OPERADOR: {OPERADOR}
• DATA E HORA: {DATA_HORA}
• FOTO DO ITEM: {LINK_FOTO}

Por favor, retire na portaria assim que possível.`,

  CHAVE_ATRASADA: `🚨 *ALERTA DE RETENÇÃO DE CHAVE EXCEDIDA (ATRASO)*
Condomínio: {CONDOMINIO}

• Chave Pendente: {CHAVE_NOME} (Posição: {POSICAO})
• Solicitante: {SOLICITANTE}
• Horário Limite: {HORARIO_LIMITE}
• Situação: TEMPO DE RETENÇÃO ULTRAPASSADO

Solicitamos a devolução imediata da chave na portaria principal.`,

  MANUTENCAO_ABERTA: `🛠️ *NOVO CHAMADO DE MANUTENÇÃO ABERTO*
Condomínio: {CONDOMINIO}
Código: {CODIGO_OS}

• Item/Problema: {TITULO}
• Categoria: {CATEGORIA}
• Local: {LOCAL}
• Prioridade: {PRIORIDADE}
• Descrição: {DESCRICAO}

Responsável: {OPERADOR}
Data/Hora: {DATA_HORA}
Foto ("Antes"): {LINK_FOTO}`,

  AUTORIZADO_ENTRADA: `👷‍♂️ *ENTRADA DE PESSOA AUTORIZADA LIBERADA*
Condomínio: {CONDOMINIO}
Unidade: {UNIDADE}

• Nome: {NOME}
• Tipo: {TIPO_AUTORIZACAO}
• Crachá: {CRACHA}
• Operador: {OPERADOR}
• Horário: {DATA_HORA}`,

  RONDA_CHECKPOINT: `🛡️ *CHECKPOINT DE RONDA REGISTRADO*
Condomínio: {CONDOMINIO}
Ponto: {PONTO_NOME}
Validação: {TIPO_VALIDACAO} [{CODIGO_LIDO}]
GPS: {STATUS_GPS} ({DISTANCIA}m do ponto)
Coordenadas: {COORDENADAS}
{LINK_MAPA}
Vigilante: {OPERADOR}
Horário: {DATA_HORA}`,

  OCORRENCIA_REGISTRADA: `⚠️ *LIVRO DE OCORRÊNCIAS - NOVO REGISTRO*
Condomínio: {CONDOMINIO}
Código: {CODIGO}
Tipo: {TIPO} | Categoria: {CATEGORIA} | Severidade: {SEVERIDADE}
Unidade Infratora: {UNIDADE_INFRATORA}
Unidade Reclamante: {UNIDADE_RECLAMANTE}

Descrição:
{DESCRICAO}

Providências:
{PROVIDENCIAS}

Operador: {OPERADOR}
Data/Hora: {DATA_HORA}
Foto do Fato: {LINK_FOTO}`,

  ALERTA_PANICO: `🚨 *ALERTA DE EMERGÊNCIA / PÂNICO ACIONADO NA GUARITA*
Condomínio: {CONDOMINIO}
Posto: Portaria Principal

• Acionado por: {OPERADOR}
• Data/Hora: {DATA_HORA}

Central e supervisão notificadas! Favor entrar em contato urgente com o posto!`
};
