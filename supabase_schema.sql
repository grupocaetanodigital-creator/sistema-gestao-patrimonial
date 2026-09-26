-- =========================================================================
-- ESQUEMA COMPLETO DE TABELAS PARA SUPABASE (POSTGRESQL)
-- SISTEMA INTEGRADO DE GESTÃO E SEGURANÇA PATRIMONIAL E CONDOMINIAL
-- =========================================================================
-- Como executar no Supabase:
-- 1. Acesse https://supabase.com e entre no painel do seu projeto.
-- 2. No menu lateral esquerdo, clique em "SQL Editor".
-- 3. Clique em "+ New Query" (Nova Consulta).
-- 4. Cole todo este código SQL e clique no botão verde "RUN" (Executar).
-- =========================================================================

-- Habilitar extensão para geração de UUIDs (caso necessário)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE CONDOMÍNIOS
CREATE TABLE IF NOT EXISTS condominios (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone_portaria TEXT,
  nome_sindico TEXT,
  telefone_sindico TEXT,
  horario_inicio_obras TEXT DEFAULT '08:00',
  horario_fim_obras TEXT DEFAULT '17:00',
  intervalo_ronda_minutos INTEGER DEFAULT 60,
  tipo_estrutura TEXT DEFAULT 'Blocos',
  quantidade_blocos INTEGER DEFAULT 2,
  unidades_por_bloco INTEGER DEFAULT 40,
  lista_blocos JSONB DEFAULT '[]'::jsonb,
  locais_armazenamento JSONB DEFAULT '[]'::jsonb,
  turnos JSONB DEFAULT '{}'::jsonb,
  feature_flags JSONB DEFAULT '{}'::jsonb,
  whatsapp_grupos JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE OPERADORES
CREATE TABLE IF NOT EXISTS operadores (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  login TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL,
  cargo TEXT NOT NULL,
  role TEXT NOT NULL,
  condominios_autorizados JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE MORADORES
CREATE TABLE IF NOT EXISTS moradores (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  whatsapp TEXT,
  tipo_vinculo TEXT DEFAULT 'Proprietário',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE ENTREGADORES
CREATE TABLE IF NOT EXISTS entregadores (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  documento TEXT,
  empresa TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE LOTES DE ENCOMENDAS
CREATE TABLE IF NOT EXISTS lotes_encomenda (
  id TEXT PRIMARY KEY,
  codigo_re TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  entregador_id TEXT,
  entregador_nome TEXT,
  empresa TEXT,
  quantidade_declarada INTEGER DEFAULT 0,
  quantidade_triada INTEGER DEFAULT 0,
  operador_id TEXT,
  operador_nome TEXT,
  data_hora TEXT NOT NULL,
  status TEXT DEFAULT 'aguardando_triagem',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA DE ITENS DE ENCOMENDA
CREATE TABLE IF NOT EXISTS itens_encomenda (
  id TEXT PRIMARY KEY,
  lote_id TEXT,
  codigo_re TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  unidade TEXT NOT NULL,
  morador_id TEXT,
  morador_nome TEXT,
  morador_whatsapp TEXT,
  codigo_rastreio TEXT,
  foto_etiqueta_url TEXT,
  observacoes TEXT,
  local_armazenamento TEXT,
  status TEXT DEFAULT 'retido',
  data_recebimento TEXT NOT NULL,
  operador_recebimento_nome TEXT NOT NULL,
  data_entrega TEXT,
  retirante_nome TEXT,
  foto_comprovante_url TEXT,
  operador_entrega_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE ITENS EM CUSTÓDIA
CREATE TABLE IF NOT EXISTS itens_custodia (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  fluxo TEXT NOT NULL,
  origem_descricao TEXT NOT NULL,
  destino_descricao TEXT NOT NULL,
  descricao_item TEXT NOT NULL,
  foto_item_url TEXT,
  data_entrada TEXT NOT NULL,
  operador_entrada_nome TEXT NOT NULL,
  status TEXT DEFAULT 'retido',
  data_saida TEXT,
  retirante_nome TEXT,
  retirante_documento TEXT,
  foto_baixa_url TEXT,
  operador_saida_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE MATERIAIS E ATIVOS DO POSTO
CREATE TABLE IF NOT EXISTS materiais_posto (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  propriedade TEXT DEFAULT 'CONDOMÍNIO',
  categoria TEXT DEFAULT 'Segurança/Iluminação',
  numero_serie_tag TEXT,
  quantidade INTEGER DEFAULT 1,
  estado TEXT DEFAULT 'Operacional',
  foto_url TEXT,
  ultima_conferencia TEXT,
  observacao_avaria TEXT,
  foto_avaria_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA DE CHAVES / CLAVICULÁRIO
CREATE TABLE IF NOT EXISTS chaves (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  etiqueta_claviculario TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT DEFAULT 'Técnica',
  tempo_maximo_horas INTEGER,
  horario_limite_devolucao TEXT,
  status TEXT DEFAULT 'disponivel',
  foto_chave_url TEXT,
  solicitante_tipo TEXT,
  solicitante_nome TEXT,
  solicitante_detalhe TEXT,
  solicitante_documento_foto_url TEXT,
  motivo_retirada TEXT,
  data_hora_retirada TEXT,
  previsao_devolucao TEXT,
  operador_retirada_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA DE CHAMADOS DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS chamados_manutencao (
  id TEXT PRIMARY KEY,
  codigo_os TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  origem TEXT DEFAULT 'Abertura Avulsa (Portaria)',
  titulo TEXT NOT NULL,
  categoria TEXT DEFAULT 'Geral',
  localizacao TEXT NOT NULL,
  prioridade TEXT DEFAULT 'Média',
  descricao TEXT NOT NULL,
  foto_antes_url TEXT,
  status TEXT DEFAULT 'Aberto',
  data_abertura TEXT NOT NULL,
  operador_abertura_nome TEXT NOT NULL,
  data_conclusao TEXT,
  solucao_descricao TEXT,
  foto_depois_url TEXT,
  operador_conclusao_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA DE PONTOS DE RONDA
CREATE TABLE IF NOT EXISTS pontos_ronda (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_validacao TEXT DEFAULT 'QR Code',
  codigo_hash TEXT NOT NULL,
  codigo_identificador TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  perguntas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABELA DE EXECUÇÕES DE RONDA
CREATE TABLE IF NOT EXISTS execucoes_ronda (
  id TEXT PRIMARY KEY,
  codigo_ronda TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  operador_nome TEXT NOT NULL,
  turno TEXT,
  data_hora_inicio TEXT NOT NULL,
  data_hora_fim TEXT,
  status TEXT DEFAULT 'Em Andamento',
  pontos_lidos INTEGER DEFAULT 0,
  total_pontos INTEGER DEFAULT 0,
  anomalias JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABELA DE LIVRO DE OCORRÊNCIAS
CREATE TABLE IF NOT EXISTS ocorrencias (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  tipo TEXT DEFAULT 'Interna (Posto)',
  categoria TEXT NOT NULL,
  severidade TEXT DEFAULT 'Média',
  unidade_infratora TEXT,
  unidade_reclamante TEXT,
  descricao TEXT NOT NULL,
  foto_url TEXT,
  audio_url TEXT,
  data_hora TEXT NOT NULL,
  operador_nome TEXT NOT NULL,
  providencias_tomadas TEXT,
  status_ocorrencia TEXT DEFAULT 'Pendente',
  observacao_resolucao TEXT,
  resolvido_por TEXT,
  data_resolucao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABELA DE PASSAGEM DE SERVIÇO / POSTO
CREATE TABLE IF NOT EXISTS passagens_posto (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  operador_sainte_nome TEXT NOT NULL,
  operador_entrante_nome TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  status TEXT DEFAULT 'Concluída e Validada',
  resumo_chaves_retidas INTEGER DEFAULT 0,
  resumo_materiais_ok BOOLEAN DEFAULT true,
  resumo_manutencoes_abertas INTEGER DEFAULT 0,
  resumo_ocorrencias_abertas INTEGER DEFAULT 0,
  resumo_encomendas_retidas INTEGER DEFAULT 0,
  resumo_custodia_pendentes INTEGER DEFAULT 0,
  resumo_rondas_feitas INTEGER DEFAULT 0,
  resumo_materiais_com_defeito INTEGER DEFAULT 0,
  resumo_autorizados_no_condominio INTEGER DEFAULT 0,
  resumo_lotes_pendentes_triagem INTEGER DEFAULT 0,
  resumo_encomendas_faltam_triar INTEGER DEFAULT 0,
  recados_turno TEXT,
  divergencias TEXT,
  assinatura_sainte_confirmada BOOLEAN DEFAULT true,
  assinatura_entrante_confirmada BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABELA DE VISITANTES E PRESTADORES AUTORIZADOS
CREATE TABLE IF NOT EXISTS autorizados (
  id TEXT PRIMARY KEY,
  codigo TEXT NOT NULL,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo_autorizacao TEXT DEFAULT 'Visita',
  unidade_responsavel TEXT NOT NULL,
  morador_solicitante_nome TEXT NOT NULL,
  vigencia_tipo TEXT DEFAULT 'Hoje',
  data_inicio TEXT NOT NULL,
  data_fim TEXT,
  status_acesso TEXT DEFAULT 'Fora do Posto',
  ultimo_checkin TEXT,
  ultimo_checkout TEXT,
  cracha_atual TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. TABELA DE CONTATOS DE EMERGÊNCIA
CREATE TABLE IF NOT EXISTS contatos_emergencia (
  id TEXT PRIMARY KEY,
  condominio_id TEXT REFERENCES condominios(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  whatsapp TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. TABELA DE HISTÓRICO DE ATIVIDADES E AUDITORIA (MÓDULO 12)
CREATE TABLE IF NOT EXISTS historico_atividades (
  id TEXT PRIMARY KEY,
  condominio_id TEXT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  codigo TEXT,
  categoria TEXT NOT NULL,
  modulo_origem TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes TEXT,
  operador_id TEXT,
  operador_nome TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'info',
  metadados JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_moradores_condominio ON moradores(condominio_id);
CREATE INDEX IF NOT EXISTS idx_itens_encomenda_condominio ON itens_encomenda(condominio_id);
CREATE INDEX IF NOT EXISTS idx_itens_custodia_condominio ON itens_custodia(condominio_id);
CREATE INDEX IF NOT EXISTS idx_materiais_posto_condominio ON materiais_posto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_chaves_condominio ON chaves(condominio_id);
CREATE INDEX IF NOT EXISTS idx_manutencao_condominio ON chamados_manutencao(condominio_id);
CREATE INDEX IF NOT EXISTS idx_pontos_ronda_condominio ON pontos_ronda(condominio_id);
CREATE INDEX IF NOT EXISTS idx_execucoes_ronda_condominio ON execucoes_ronda(condominio_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_condominio ON ocorrencias(condominio_id);
CREATE INDEX IF NOT EXISTS idx_passagens_condominio ON passagens_posto(condominio_id);
CREATE INDEX IF NOT EXISTS idx_autorizados_condominio ON autorizados(condominio_id);
CREATE INDEX IF NOT EXISTS idx_emergencia_condominio ON contatos_emergencia(condominio_id);
CREATE INDEX IF NOT EXISTS idx_historico_condominio ON historico_atividades(condominio_id);
CREATE INDEX IF NOT EXISTS idx_historico_categoria ON historico_atividades(categoria);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_atividades(data_hora);

-- =========================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS PERMISSIVAS PARA ANON KEY
-- =========================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'condominios', 'operadores', 'moradores', 'entregadores',
      'lotes_encomenda', 'itens_encomenda', 'itens_custodia', 'materiais_posto',
      'chaves', 'chamados_manutencao', 'pontos_ronda', 'execucoes_ronda',
      'ocorrencias', 'passagens_posto', 'autorizados', 'contatos_emergencia',
      'historico_atividades'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Acesso total anon" ON %I;', tbl);
    EXECUTE format('CREATE POLICY "Acesso total anon" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;

-- =========================================================================
-- CRIAR BUCKETS DE ARMAZENAMENTO PARA FOTOS (SUPABASE STORAGE)
-- =========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('infport-fotos', 'infport-fotos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('fotos', 'fotos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- POLÍTICAS DE ACESSO AO BUCKET DE FOTOS PARA ACESSO ANÔNIMO E AUTENTICADO
DO $$
BEGIN
  -- Leitura pública para que links abram no WhatsApp e navegadores
  DROP POLICY IF EXISTS "Fotos leitura publica" ON storage.objects;
  CREATE POLICY "Fotos leitura publica" ON storage.objects
    FOR SELECT USING (bucket_id IN ('infport-fotos', 'fotos'));

  -- Upload público permitido via chave anon do aplicativo
  DROP POLICY IF EXISTS "Fotos upload anon" ON storage.objects;
  CREATE POLICY "Fotos upload anon" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('infport-fotos', 'fotos'));

  -- Atualização
  DROP POLICY IF EXISTS "Fotos update anon" ON storage.objects;
  CREATE POLICY "Fotos update anon" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('infport-fotos', 'fotos'));

  -- Exclusão
  DROP POLICY IF EXISTS "Fotos delete anon" ON storage.objects;
  CREATE POLICY "Fotos delete anon" ON storage.objects
    FOR DELETE USING (bucket_id IN ('infport-fotos', 'fotos'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Políticas de storage já configuradas.';
END $$;
