import React, { useState } from 'react';
import { ShieldAlert, Plus, Camera, CheckCircle2, Clock, MessageSquare, AlertCircle, Building2, User, Users, Search } from 'lucide-react';
import { Condominio, Operador, Morador, ItemCustodia, FluxoCustodia } from '../../types';
import { buildWhatsAppDeepLink, DEFAULT_WHATSAPP_TEMPLATES, interpolateTemplate } from '../../lib/whatsapp';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';

interface Mod03CustodiaProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  moradores: Morador[];
  custodias: ItemCustodia[];
  onAddCustodia: (item: ItemCustodia) => void;
  onBaixaCustodia: (id: string, retiranteNome: string, fotoUrl: string, doc?: string) => void;
}

export const Mod03Custodia: React.FC<Mod03CustodiaProps> = ({
  condominioAtivo,
  operadorAtivo,
  moradores,
  custodias,
  onAddCustodia,
  onBaixaCustodia
}) => {
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [modalBaixaAberto, setModalBaixaAberto] = useState<ItemCustodia | null>(null);

  // Form Nova Custódia
  const [fluxo, setFluxo] = useState<FluxoCustodia>('morador_morador');
  const [blocoOrigem, setBlocoOrigem] = useState('');
  const [origemTexto, setOrigemTexto] = useState('');
  const [buscaOrigemMorador, setBuscaOrigemMorador] = useState('');

  const [blocoDestino, setBlocoDestino] = useState('');
  const [destinoTexto, setDestinoTexto] = useState('');
  const [buscaDestinoMorador, setBuscaDestinoMorador] = useState('');

  const [descricaoItem, setDescricaoItem] = useState('');
  const [fotoItemUrl, setFotoItemUrl] = useState('');
  const [fotoModalOpen, setFotoModalOpen] = useState(false);

  // Form Baixa
  const [retiranteNome, setRetiranteNome] = useState('');
  const [retiranteDoc, setRetiranteDoc] = useState('');
  const [fotoBaixaUrl, setFotoBaixaUrl] = useState('');
  const [fotoBaixaModalOpen, setFotoBaixaModalOpen] = useState(false);

  const blocosCondominio = condominioAtivo.listaBlocos && condominioAtivo.listaBlocos.length > 0
    ? condominioAtivo.listaBlocos
    : ['Bloco A', 'Bloco B'];

  const custodiasDoCondominio = custodias.filter((c) => c.condominioId === condominioAtivo.id);
  const custodiasRetidas = custodiasDoCondominio.filter((c) => c.status === 'retido');

  // Checar se item está retido há mais de 48h
  const isRetencaoExcedida = (dataEntradaStr: string) => {
    try {
      const entrada = new Date(dataEntradaStr).getTime();
      const agora = Date.now();
      const diffHoras = (agora - entrada) / (1000 * 60 * 60);
      return diffHoras >= 48;
    } catch {
      return false;
    }
  };

  const handleSalvarCustodia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origemTexto.trim() || !destinoTexto.trim() || !descricaoItem.trim()) return;

    const fotoFinal =
      fotoItemUrl ||
      'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=500&auto=format&fit=crop&q=60';

    const novoItem: ItemCustodia = {
      id: `cust_${Date.now()}`,
      codigo: `CUST${String(custodiasDoCondominio.length + 1).padStart(3, '0')}`,
      condominioId: condominioAtivo.id,
      fluxo,
      origemDescricao: origemTexto,
      destinoDescricao: destinoTexto,
      descricaoItem,
      fotoItemUrl: fotoFinal,
      dataEntrada: new Date().toLocaleString('pt-BR'),
      operadorEntradaNome: operadorAtivo.nome,
      status: 'retido'
    };

    onAddCustodia(novoItem);
    setModalNovoAberto(false);

    // Preparar WhatsApp de Entrada ($0)
    const textoWhats = interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.CUSTODIA_ENTRADA, {
      CONDOMINIO: condominioAtivo.nome,
      ORIGEM: novoItem.origemDescricao,
      DESTINO: novoItem.destinoDescricao,
      ITEM_DESCRICAO: novoItem.descricaoItem,
      OPERADOR: operadorAtivo.nome,
      DATA_HORA: novoItem.dataEntrada,
      LINK_FOTO: fotoFinal
    });

    // Se destino for morador, tentar achar telefone
    const moradorDestino = moradores.find(
      (m) =>
        m.condominioId === condominioAtivo.id &&
        (novoItem.destinoDescricao.toLowerCase().includes(m.unidade.toLowerCase()) ||
          novoItem.destinoDescricao.toLowerCase().includes(m.nomeCompleto.toLowerCase()))
    );

    if (moradorDestino?.whatsapp) {
      const url = buildWhatsAppDeepLink(moradorDestino.whatsapp, textoWhats);
      window.open(url, '_blank');
    }

    // Reset
    setOrigemTexto('');
    setDestinoTexto('');
    setDescricaoItem('');
    setFotoItemUrl('');
  };

  const handleEfetivarBaixa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBaixaAberto || !retiranteNome.trim()) return;

    const fotoFinal =
      fotoBaixaUrl ||
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=500&auto=format&fit=crop&q=60';

    onBaixaCustodia(modalBaixaAberto.id, retiranteNome, fotoFinal, retiranteDoc);

    // Notificação de saída para quem deixou o item ou quem era o destino
    const moradorAvisar = moradores.find(
      (m) =>
        m.condominioId === condominioAtivo.id &&
        (modalBaixaAberto.origemDescricao.toLowerCase().includes(m.unidade.toLowerCase()) ||
          modalBaixaAberto.origemDescricao.toLowerCase().includes(m.nomeCompleto.toLowerCase()) ||
          modalBaixaAberto.destinoDescricao.toLowerCase().includes(m.unidade.toLowerCase()))
    );

    if (moradorAvisar?.whatsapp) {
      const textoSaida = `Olá, ${moradorAvisar.nomeCompleto}! Seu item em custódia (${modalBaixaAberto.descricaoItem}) foi retirado por ${retiranteNome} na portaria do ${condominioAtivo.nome} em ${new Date().toLocaleString('pt-BR')}.`;
      const url = buildWhatsAppDeepLink(moradorAvisar.whatsapp, textoSaida);
      window.open(url, '_blank');
    }

    setModalBaixaAberto(null);
    setRetiranteNome('');
    setRetiranteDoc('');
    setFotoBaixaUrl('');
  };

  // Moradores da unidade do item sendo baixado
  const moradoresDaUnidadeBaixa = modalBaixaAberto
    ? moradores.filter((m) => {
        if (m.condominioId !== condominioAtivo.id) return false;
        const texto = `${modalBaixaAberto.origemDescricao} ${modalBaixaAberto.destinoDescricao}`.toLowerCase();
        return texto.includes(m.unidade.toLowerCase()) || texto.includes(m.nomeCompleto.toLowerCase());
      })
    : [];

  return (
    <div className="space-y-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
              CUSTÓDIA DE ITENS
            </span>
            <span className="text-xs text-slate-400">
              Retidos na Guarita: <strong className="text-blue-400">{custodiasRetidas.length} itens</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Guarda auditada de chaves de terceiros, documentos e pertences com alerta de 48h e auto-preenchimento.
          </p>
        </div>

        <button
          onClick={() => {
            setOrigemTexto('');
            setDestinoTexto('');
            setDescricaoItem('');
            setFotoItemUrl('');
            setModalNovoAberto(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-950/40 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Deixar Item em Custódia
        </button>
      </div>

      {/* LISTA DE ITENS EM CUSTÓDIA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {custodiasDoCondominio.map((item) => {
          const retido = item.status === 'retido';
          const alerta48h = retido && isRetencaoExcedida(item.dataEntrada);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                retido
                  ? alerta48h
                    ? 'bg-rose-950/30 border-rose-500/80 shadow-lg shadow-rose-950/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/60 border-slate-850 opacity-75'
              }`}
            >
              {alerta48h && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold pb-2 border-b border-rose-500/30">
                  <AlertCircle className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>ALERTA: RETIDO HÁ MAIS DE 48 HORAS!</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/20">
                  {item.codigo}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    retido
                      ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {retido ? 'Retido na Portaria' : 'Retirado / Baixado'}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{item.descricaoItem}</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Origem: <strong className="text-slate-200">{item.origemDescricao}</strong>
                </p>
                <p className="text-[11px] text-slate-400">
                  Destino: <strong className="text-emerald-400">{item.destinoDescricao}</strong>
                </p>
              </div>

              <div className="text-[11px] text-slate-400 space-y-0.5 pt-2 border-t border-slate-800">
                <p>Entrada: {item.dataEntrada} por {item.operadorEntradaNome}</p>
                {!retido && item.dataSaida && (
                  <p className="text-emerald-400">
                    Retirado: {item.dataSaida} por <strong>{item.retiranteNome}</strong>
                  </p>
                )}
              </div>

              {retido && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRetiranteNome('');
                      setRetiranteDoc('');
                      setFotoBaixaUrl('');
                      setModalBaixaAberto(item);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Dar Baixa / Entregar
                  </button>

                  {alerta48h && (
                    <button
                      onClick={() => {
                        const morador = moradores.find(
                          (m) =>
                            m.condominioId === condominioAtivo.id &&
                            item.destinoDescricao.toLowerCase().includes(m.unidade.toLowerCase())
                        );
                        if (morador?.whatsapp) {
                          const url = buildWhatsAppDeepLink(
                            morador.whatsapp,
                            `Aviso de Custódia Pendente (${condominioAtivo.nome}): Seu item (${item.descricaoItem}) está aguardando retirada há mais de 48h na portaria.`
                          );
                          window.open(url, '_blank');
                        }
                      }}
                      className="p-2 bg-rose-900/60 hover:bg-rose-800 text-rose-300 rounded-xl border border-rose-500/50"
                      title="Cobrar via WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL NOVA CUSTÓDIA COM BLOCO + UNIDADE E AUTO-PREENCHIMENTO */}
      {modalNovoAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-400" />
              Entrada de Item em Custódia
            </h2>

            <form onSubmit={handleSalvarCustodia} className="space-y-3.5">
              {/* Fluxo */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Fluxo da Custódia
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFluxo('morador_morador')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                      fluxo === 'morador_morador'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Morador ➔ Morador
                  </button>
                  <button
                    type="button"
                    onClick={() => setFluxo('morador_terceiro')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                      fluxo === 'morador_terceiro'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Morador ➔ Terceiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setFluxo('terceiro_morador')}
                    className={`py-2 px-1 text-[11px] font-bold rounded-lg border transition-all text-center ${
                      fluxo === 'terceiro_morador'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    Terceiro ➔ Morador
                  </button>
                </div>
              </div>

              {/* ORIGEM COM AUTO-PREENCHIMENTO DE MORADORES */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Origem (Quem está deixando) *
                </label>
                {fluxo !== 'terceiro_morador' && (
                  <div className="grid grid-cols-3 gap-2 mb-1.5">
                    <select
                      value={blocoOrigem}
                      onChange={(e) => setBlocoOrigem(e.target.value)}
                      className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="">Bloco / Quadra</option>
                      {blocosCondominio.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Pesquisar morador/unidade..."
                      value={buscaOrigemMorador}
                      onChange={(e) => setBuscaOrigemMorador(e.target.value)}
                      className="col-span-2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                )}

                {buscaOrigemMorador.length >= 1 && (
                  <div className="mb-2 p-1.5 bg-slate-850 border border-slate-700 rounded-xl max-h-28 overflow-y-auto space-y-1">
                    {moradores
                      .filter(
                        (m) =>
                          m.condominioId === condominioAtivo.id &&
                          (!blocoOrigem || m.unidade.toLowerCase().includes(blocoOrigem.toLowerCase())) &&
                          (m.unidade.toLowerCase().includes(buscaOrigemMorador.toLowerCase()) ||
                            m.nomeCompleto.toLowerCase().includes(buscaOrigemMorador.toLowerCase()))
                      )
                      .map((morador) => (
                        <button
                          key={morador.id}
                          type="button"
                          onClick={() => {
                            setOrigemTexto(`${morador.unidade} — ${morador.nomeCompleto}`);
                            setBuscaOrigemMorador('');
                          }}
                          className="w-full text-left p-1.5 bg-slate-800 hover:bg-blue-950/60 rounded text-xs flex justify-between text-white"
                        >
                          <span className="font-bold text-blue-400">{morador.unidade}</span>
                          <span>{morador.nomeCompleto}</span>
                        </button>
                      ))}
                  </div>
                )}

                <input
                  type="text"
                  required
                  placeholder={
                    fluxo === 'terceiro_morador'
                      ? 'Ex: João (Técnico da Claro) ou Carlos (Marceneiro)'
                      : 'Ex: Bloco A - Apto 102 (Samanta Ramos)'
                  }
                  value={origemTexto}
                  onChange={(e) => setOrigemTexto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* DESTINO COM AUTO-PREENCHIMENTO DE MORADORES */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Destino (Para quem é o item) *
                </label>
                {fluxo !== 'morador_terceiro' && (
                  <div className="grid grid-cols-3 gap-2 mb-1.5">
                    <select
                      value={blocoDestino}
                      onChange={(e) => setBlocoDestino(e.target.value)}
                      className="px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="">Bloco / Quadra</option>
                      {blocosCondominio.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Pesquisar morador/unidade destino..."
                      value={buscaDestinoMorador}
                      onChange={(e) => setBuscaDestinoMorador(e.target.value)}
                      className="col-span-2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                )}

                {buscaDestinoMorador.length >= 1 && (
                  <div className="mb-2 p-1.5 bg-slate-850 border border-slate-700 rounded-xl max-h-28 overflow-y-auto space-y-1">
                    {moradores
                      .filter(
                        (m) =>
                          m.condominioId === condominioAtivo.id &&
                          (!blocoDestino || m.unidade.toLowerCase().includes(blocoDestino.toLowerCase())) &&
                          (m.unidade.toLowerCase().includes(buscaDestinoMorador.toLowerCase()) ||
                            m.nomeCompleto.toLowerCase().includes(buscaDestinoMorador.toLowerCase()))
                      )
                      .map((morador) => (
                        <button
                          key={morador.id}
                          type="button"
                          onClick={() => {
                            setDestinoTexto(`${morador.unidade} — ${morador.nomeCompleto}`);
                            setBuscaDestinoMorador('');
                          }}
                          className="w-full text-left p-1.5 bg-slate-800 hover:bg-blue-950/60 rounded text-xs flex justify-between text-white"
                        >
                          <span className="font-bold text-emerald-400">{morador.unidade}</span>
                          <span>{morador.nomeCompleto}</span>
                        </button>
                      ))}
                  </div>
                )}

                <input
                  type="text"
                  required
                  placeholder={
                    fluxo === 'morador_terceiro'
                      ? 'Ex: Maria (Diarista) ou Engenheiro Rodrigo'
                      : 'Ex: Bloco B - Apto 304 (Carlos Alberto)'
                  }
                  value={destinoTexto}
                  onChange={(e) => setDestinoTexto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* Descrição do Item */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição do Objeto / Item *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Ex: Envelope lacrado com documentos, chave reserva de veículo, caixa de ferramentas..."
                  value={descricaoItem}
                  onChange={(e) => setDescricaoItem(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Foto Obrigatória */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Foto do Objeto na Portaria
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFotoModalOpen(true)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    {fotoItemUrl ? 'Foto Registrada ✓' : 'Capturar Foto do Item'}
                  </button>
                  {fotoItemUrl && (
                    <img
                      src={fotoItemUrl}
                      alt="Item"
                      className="w-10 h-10 rounded-lg object-cover border border-blue-500 shrink-0"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-950/40"
                >
                  Salvar Entrada & Notificar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE BAIXA / RETIRADA COM SELEÇÃO RÁPIDA DE MORADORES */}
      {modalBaixaAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Baixa de Item em Custódia
            </h2>
            <div className="p-2.5 bg-slate-850 rounded-xl text-xs space-y-1">
              <p className="text-white font-bold">{modalBaixaAberto.descricaoItem}</p>
              <p className="text-slate-400">Origem: {modalBaixaAberto.origemDescricao}</p>
              <p className="text-slate-400">Destino: {modalBaixaAberto.destinoDescricao}</p>
            </div>

            {/* SELEÇÃO RÁPIDA DE MORADORES ASSOCIADOS */}
            {moradoresDaUnidadeBaixa.length > 0 && (
              <div className="p-2.5 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
                <span className="text-[10px] font-bold text-slate-300">
                  Moradores associados à unidade (Clique para preencher):
                </span>
                <div className="flex flex-wrap gap-1">
                  {moradoresDaUnidadeBaixa.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRetiranteNome(m.nomeCompleto)}
                      className="px-2 py-1 bg-slate-800 hover:bg-emerald-600 hover:text-white rounded text-[11px] font-bold text-slate-200 border border-slate-700"
                    >
                      {m.nomeCompleto} ({m.unidade})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleEfetivarBaixa} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Retirante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome de quem está retirando..."
                  value={retiranteNome}
                  onChange={(e) => setRetiranteNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Documento (RG ou CPF)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 12.345.678-9"
                  value={retiranteDoc}
                  onChange={(e) => setRetiranteDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Foto do Retirante com o Item
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFotoBaixaModalOpen(true)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    {fotoBaixaUrl ? 'Foto Registrada ✓' : 'Capturar Foto de Entrega'}
                  </button>
                  {fotoBaixaUrl && (
                    <img
                      src={fotoBaixaUrl}
                      alt="Comprovante"
                      className="w-10 h-10 rounded-lg object-cover border border-emerald-500 shrink-0"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalBaixaAberto(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!retiranteNome}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40"
                >
                  Confirmar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CAPTURA DE FOTO */}
      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        presetTheme="documento"
        title="Foto do Item em Custódia"
        subtitle="Registrar evidência do pertence entregue à portaria"
        onCapture={(url) => setFotoItemUrl(url)}
      />

      <PhotoCaptureModal
        isOpen={fotoBaixaModalOpen}
        onClose={() => setFotoBaixaModalOpen(false)}
        presetTheme="entrega"
        title="Foto do Retirante com o Item"
        subtitle="Auditoria de saída de custódia"
        onCapture={(url) => setFotoBaixaUrl(url)}
      />
    </div>
  );
};
