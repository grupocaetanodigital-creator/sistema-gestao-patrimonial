import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Server,
  ArrowUpRight,
  ArrowDownRight,
  Key,
  Globe,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  syncLocalToSupabase,
  syncSupabaseToLocal,
  ensurePhotoBucketExists
} from '../../lib/supabase';

interface SupabaseTabProps {
  onRefreshData?: () => void;
}

export const SupabaseTab: React.FC<SupabaseTabProps> = ({ onRefreshData }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [loadingTest, setLoadingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [loadingSyncUp, setLoadingSyncUp] = useState(false);
  const [loadingSyncDown, setLoadingSyncDown] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [loadingBucket, setLoadingBucket] = useState(false);
  const [bucketStatus, setBucketStatus] = useState<{ success: boolean; message: string } | null>(null);

  const [copiadoSql, setCopiadoSql] = useState(false);
  const [mostrarSqlPreview, setMostrarSqlPreview] = useState(false);

  useEffect(() => {
    const cfg = getSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
    setIsConfigured(cfg.isConfigured);
  }, []);

  const handleSalvarCredenciais = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    const cfg = getSupabaseConfig();
    setIsConfigured(cfg.isConfigured);
    setTestResult(null);
    setSyncFeedback('Credenciais do Supabase salvas no navegador com sucesso!');
    setTimeout(() => setSyncFeedback(null), 3500);
  };

  const handleLimparCredenciais = () => {
    if (window.confirm('Deseja realmente remover as credenciais do Supabase salvas localmente?')) {
      clearSupabaseConfig();
      setUrl('');
      setAnonKey('');
      setIsConfigured(false);
      setTestResult(null);
      setBucketStatus(null);
      setSyncFeedback('Credenciais removidas.');
      setTimeout(() => setSyncFeedback(null), 3000);
    }
  };

  const handleConfigurarBucket = async () => {
    setLoadingBucket(true);
    setBucketStatus(null);
    try {
      const res = await ensurePhotoBucketExists();
      setBucketStatus(res);
    } catch (err: any) {
      setBucketStatus({ success: false, message: err?.message || 'Erro ao configurar bucket de fotos.' });
    } finally {
      setLoadingBucket(false);
    }
  };

  const handleTestarConexao = async () => {
    setLoadingTest(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Falha ao testar conexão: ${err.message || 'Erro inesperado'}`
      });
    } finally {
      setLoadingTest(false);
    }
  };

  const handleSubirParaSupabase = async () => {
    if (!window.confirm('Tem certeza que deseja enviar todos os registros locais para as tabelas do Supabase?')) {
      return;
    }
    setLoadingSyncUp(true);
    setSyncLog([]);
    setSyncFeedback(null);
    try {
      const res = await syncLocalToSupabase();
      setSyncLog(res.log);
      setSyncFeedback(`Sucesso! ${res.totalRecords} registros enviados e sincronizados no Supabase.`);
    } catch (err: any) {
      setSyncFeedback(`Erro na sincronização: ${err.message}`);
    } finally {
      setLoadingSyncUp(false);
    }
  };

  const handleBaixarDoSupabase = async () => {
    if (!window.confirm('Atenção: Os dados atuais em cache local serão atualizados com o que estiver salvo no Supabase. Continuar?')) {
      return;
    }
    setLoadingSyncDown(true);
    setSyncLog([]);
    setSyncFeedback(null);
    try {
      const res = await syncSupabaseToLocal();
      setSyncLog(res.log);
      setSyncFeedback(`Sucesso! ${res.totalRecords} registros recebidos do Supabase e salvos localmente.`);
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setSyncFeedback(`Erro ao baixar: ${err.message}`);
    } finally {
      setLoadingSyncDown(false);
    }
  };

  const sqlScriptContent = `-- =========================================================================
-- ESQUEMA COMPLETO DE TABELAS PARA SUPABASE (POSTGRESQL)
-- SISTEMA INTEGRADO DE GESTÃO E SEGURANÇA PATRIMONIAL E CONDOMINIAL
-- =========================================================================

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

CREATE INDEX IF NOT EXISTS idx_historico_condominio ON historico_atividades(condominio_id);
CREATE INDEX IF NOT EXISTS idx_historico_categoria ON historico_atividades(categoria);
CREATE INDEX IF NOT EXISTS idx_historico_data ON historico_atividades(data_hora);

-- HABILITAR RLS COM ACESSO PERMISSIVO PARA ANON KEY
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

-- POLÍTICAS DE ACESSO AO BUCKET DE FOTOS (LEITURA E ESCRITA PÚBLICA)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Fotos leitura publica" ON storage.objects;
  CREATE POLICY "Fotos leitura publica" ON storage.objects
    FOR SELECT USING (bucket_id IN ('infport-fotos', 'fotos'));

  DROP POLICY IF EXISTS "Fotos upload anon" ON storage.objects;
  CREATE POLICY "Fotos upload anon" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('infport-fotos', 'fotos'));

  DROP POLICY IF EXISTS "Fotos update anon" ON storage.objects;
  CREATE POLICY "Fotos update anon" ON storage.objects
    FOR UPDATE USING (bucket_id IN ('infport-fotos', 'fotos'));

  DROP POLICY IF EXISTS "Fotos delete anon" ON storage.objects;
  CREATE POLICY "Fotos delete anon" ON storage.objects
    FOR DELETE USING (bucket_id IN ('infport-fotos', 'fotos'));
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Políticas de storage já configuradas.';
END $$;
`;

  const handleCopiarSql = () => {
    navigator.clipboard.writeText(sqlScriptContent);
    setCopiadoSql(true);
    setTimeout(() => setCopiadoSql(false), 3000);
  };

  const handleBaixarSql = () => {
    const blob = new Blob([sqlScriptContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'supabase_schema.sql';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      {/* CABEÇALHO DO PAINEL */}
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl shadow-emerald-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" /> Integração Supabase
              </span>
              <span className="text-xs text-slate-300 font-semibold">
                PostgreSQL em Nuvem & Sincronização em Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Conecte sua conta do Supabase para persistência dos dados em banco de dados relacional (PostgreSQL), backup contínuo e sincronização entre postos.
            </p>
          </div>

          {/* BADGE DE STATUS */}
          <div className="flex items-center gap-2">
            {isConfigured ? (
              <span className="px-3 py-1 bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Supabase Configurado
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" /> Aguardando Conexão
              </span>
            )}
          </div>
        </div>

        {/* FEEDBACK DE AÇÃO */}
        {syncFeedback && (
          <div className="mt-4 p-3 bg-slate-850 border border-slate-700 rounded-xl text-xs text-slate-200 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* COLUNA ESQUERDA: CREDENCIAIS E TESTE (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" /> 1. Conexão com o Supabase
            </h3>

            <form onSubmit={handleSalvarCredenciais} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" /> Project URL (URL do Projeto) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://seu-projeto.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> Anon Public API Key *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300 flex items-center gap-1">
                  Onde encontrar no painel do Supabase:
                </p>
                <p>1. Acesse seu projeto em <strong className="text-emerald-400">supabase.com</strong></p>
                <p>2. Vá em <strong>Project Settings → API</strong></p>
                <p>3. Copie o <strong>Project URL</strong> e o <strong>anon / public key</strong></p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-950/40"
                >
                  Salvar Conexão
                </button>

                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleLimparCredenciais}
                    className="px-3 py-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 text-slate-400 font-semibold text-xs rounded-xl border border-slate-700 transition-all"
                    title="Remover credenciais"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </form>

            {/* TESTE DE CONECTIVIDADE */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <button
                type="button"
                onClick={handleTestarConexao}
                disabled={!isConfigured || loadingTest}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-50 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingTest ? 'animate-spin text-emerald-400' : ''}`} />
                {loadingTest ? 'Verificando Tabelas no Supabase...' : 'Testar Conexão com o Supabase'}
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block font-bold">
                      {testResult.success ? 'Conexão Bem-Sucedida!' : 'Aviso na Conexão:'}
                    </strong>
                    <p className="text-[11px] opacity-90">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SINCRONIZAÇÃO DE DADOS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" /> Sincronização de Registros
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSubirParaSupabase}
                disabled={!isConfigured || loadingSyncUp}
                className="p-3 bg-blue-950/60 hover:bg-blue-900/70 border border-blue-700/50 text-blue-300 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <ArrowUpRight className={`w-4 h-4 ${loadingSyncUp ? 'animate-bounce text-blue-400' : ''}`} />
                <span>Subir para Supabase</span>
                <span className="text-[10px] text-blue-400/80 font-normal">Enviar dados locais</span>
              </button>

              <button
                type="button"
                onClick={handleBaixarDoSupabase}
                disabled={!isConfigured || loadingSyncDown}
                className="p-3 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-700/50 text-emerald-300 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <ArrowDownRight className={`w-4 h-4 ${loadingSyncDown ? 'animate-bounce text-emerald-400' : ''}`} />
                <span>Baixar do Supabase</span>
                <span className="text-[10px] text-emerald-400/80 font-normal">Puxar para este app</span>
              </button>
            </div>

            {syncLog.length > 0 && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl max-h-40 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Registro de Sincronização:</div>
                {syncLog.map((item, idx) => (
                  <div key={idx} className="text-emerald-400">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ARMAZENAMENTO DE FOTOS EM NUVEM (STORAGE) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" /> Storage de Fotos (Nuvem)
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700">
                infport-fotos / fotos
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Armazena fotos das etiquetas de encomendas, vistorias de ronda, anomalias e comprovantes de entrega diretamente no Supabase Storage.
            </p>

            <button
              type="button"
              onClick={handleConfigurarBucket}
              disabled={!isConfigured || loadingBucket}
              className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loadingBucket ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span>Configurar / Verificar Bucket de Fotos</span>
            </button>

            {bucketStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  bucketStatus.success
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                }`}
              >
                {bucketStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{bucketStatus.success ? 'Storage Ativo!' : 'Atenção:'}</p>
                  <p className="text-[11px] opacity-90">{bucketStatus.message}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: CRIAÇÃO DAS TABELAS NO SUPABASE (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" /> 2. Criar Tabelas no Supabase (SQL Editor)
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopiarSql}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    copiadoSql
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Copiar script SQL para a área de transferência"
                >
                  {copiadoSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiadoSql ? 'Copiado!' : 'Copiar SQL'}
                </button>

                <button
                  type="button"
                  onClick={handleBaixarSql}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Baixar arquivo supabase_schema.sql"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" /> .SQL
                </button>
              </div>
            </div>

            {/* GUIA PASSO A PASSO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  Passo 1
                </span>
                <p className="text-xs font-bold text-white mt-1">Acesse o Supabase</p>
                <p className="text-[11px] text-slate-400">
                  Entre no seu projeto no painel do Supabase e clique na aba <strong>SQL Editor</strong> no menu lateral.
                </p>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  Passo 2
                </span>
                <p className="text-xs font-bold text-white mt-1">Cole o Código</p>
                <p className="text-[11px] text-slate-400">
                  Clique no botão <strong>"+ New Query"</strong> e cole o script SQL gerado abaixo.
                </p>
              </div>

              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  Passo 3
                </span>
                <p className="text-xs font-bold text-white mt-1">Execute (RUN)</p>
                <p className="text-[11px] text-slate-400">
                  Clique no botão verde <strong>RUN</strong>. As 16 tabelas e políticas de segurança serão criadas instantaneamente.
                </p>
              </div>
            </div>

            {/* LISTA DAS 16 TABELAS CRIADAS */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Tabelas que serão estruturadas no PostgreSQL:</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  16 Tabelas + RLS + Índices
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-mono text-slate-400">
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ condominios</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ operadores</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ moradores</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ entregadores</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ lotes_encomenda</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ itens_encomenda</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ itens_custodia</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ materiais_posto</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ chaves</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ chamados_manutencao</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ pontos_ronda</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ execucoes_ronda</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ ocorrencias</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ passagens_posto</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ autorizados</span>
                <span className="p-1 bg-slate-900 rounded border border-slate-800">✓ contatos_emergencia</span>
              </div>
            </div>

            {/* PREVIEW DO SCRIPT SQL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMostrarSqlPreview(!mostrarSqlPreview)}
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold"
                >
                  {mostrarSqlPreview ? 'Ocultar Código SQL ▲' : 'Visualizar Código SQL Completo ▼'}
                </button>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                >
                  Abrir Painel do Supabase <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {mostrarSqlPreview && (
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-emerald-300/90 max-h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                  {sqlScriptContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
