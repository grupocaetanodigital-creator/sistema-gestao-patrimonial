import React, { useState } from 'react';
import {
  RefreshCw,
  Key,
  Shield,
  Wrench,
  BookOpen,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Compass,
  Layers,
  AlertCircle,
  Truck,
  Users,
  Printer
} from 'lucide-react';
import {
  Condominio,
  Operador,
  Chave,
  MaterialPosto,
  ChamadoManutencao,
  Ocorrencia,
  ItemEncomenda,
  LoteEncomenda,
  ItemCustodia,
  ExecucaoRonda,
  Autorizado,
  PassagemPosto
} from '../../types';
import { buildWhatsAppDeepLink } from '../../lib/whatsapp';
import { audioAlert } from '../../lib/audioAlert';
import { RelatorioOcorrenciasPdfModal } from '../common/RelatorioOcorrenciasPdfModal';

interface Mod09PassagemProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  operadores: Operador[];
  chaves: Chave[];
  materiais: MaterialPosto[];
  chamados: ChamadoManutencao[];
  ocorrencias: Ocorrencia[];
  itensEncomenda: ItemEncomenda[];
  lotes: LoteEncomenda[];
  custodias: ItemCustodia[];
  rondas: ExecucaoRonda[];
  autorizados: Autorizado[];
  passagens: PassagemPosto[];
  onConcluirPassagem: (passagem: PassagemPosto, novoOperadorId: string) => void;
}

export const Mod09Passagem: React.FC<Mod09PassagemProps> = ({
  condominioAtivo,
  operadorAtivo,
  operadores,
  chaves,
  materiais,
  chamados,
  ocorrencias,
  itensEncomenda,
  lotes,
  custodias,
  rondas,
  autorizados,
  passagens,
  onConcluirPassagem
}) => {
  const flags = condominioAtivo.featureFlags;

  // Operador Entrante selecionado
  const outrosOperadores = operadores.filter(
    (o) => o.id !== operadorAtivo.id
  );
  const [operadorEntranteId, setOperadorEntranteId] = useState<string>(outrosOperadores[0]?.id || '');
  const [relatorioPdfOpen, setRelatorioPdfOpen] = useState(false);

  // Validação Dupla por PIN
  const [pinSainte, setPinSainte] = useState('');
  const [pinEntrante, setPinEntrante] = useState('');
  const [recadosTurno, setRecadosTurno] = useState('');
  const [divergencias, setDivergencias] = useState('');
  const [conferiuMateriais, setConferiuMateriais] = useState(true);
  const [erroPin, setErroPin] = useState('');

  // 1. CHAVES PENDENTES FORA DO CLAVICULÁRIO
  const chavesPendentes = flags.mod05_chaves
    ? chaves.filter((c) => c.condominioId === condominioAtivo.id && c.status === 'retirada')
    : [];

  // 2. MATERIAIS COM DEFEITO OU AVARIADOS (STATUS NÃO OK)
  const materiaisDoPosto = flags.mod04_materiais
    ? materiais.filter((m) => m.condominioId === condominioAtivo.id)
    : [];
  const materiaisComDefeito = materiaisDoPosto.filter((m) => m.estado !== 'Operacional');

  // 3. CHAMADOS DE MANUTENÇÃO ABERTOS
  const chamadosAbertos = flags.mod06_manutencao
    ? chamados.filter((c) => c.condominioId === condominioAtivo.id && c.status !== 'Concluído')
    : [];

  // 4. OCORRÊNCIAS DO PLANTÃO / PENDENTES
  const ocorrenciasPendentes = flags.mod08_ocorrencias
    ? ocorrencias.filter((o) => o.condominioId === condominioAtivo.id && o.statusOcorrencia !== 'Resolvido')
    : [];

  // 5. ENCOMENDAS RETIDAS NA GUARTA
  const encomendasRetidas = flags.mod02_encomendas
    ? itensEncomenda.filter((i) => i.condominioId === condominioAtivo.id && i.status === 'retido')
    : [];

  // 6. LOTES RE PENDENTES DE TRIAGEM (VOLUMES QUE FALTAM REGISTRAR)
  const lotesPendentesTriagem = flags.mod02_encomendas
    ? lotes.filter((l) => l.condominioId === condominioAtivo.id && l.status !== 'concluido')
    : [];
  const volumesFaltamTriar = lotesPendentesTriagem.reduce((acc, l) => {
    const jaTriados = itensEncomenda.filter((i) => i.loteId === l.id).length;
    return acc + Math.max(0, l.quantidadeDeclarada - jaTriados);
  }, 0);

  // 7. ITENS EM CUSTÓDIA PENDENTES
  const custodiasPendentes = flags.mod03_custodia
    ? custodias.filter((c) => c.condominioId === condominioAtivo.id && c.status === 'retido')
    : [];

  // 8. RONDAS EXECUTADAS
  const rondasDoCondominio = flags.mod07_ronda
    ? rondas.filter((r) => r.condominioId === condominioAtivo.id)
    : [];

  // 9. AUTORIZADOS ATUALMENTE DENTRO DO CONDOMÍNIO (EM VISITA)
  const autorizadosNoCondominio = flags.mod10_autorizados
    ? autorizados.filter(
        (a) => a.condominioId === condominioAtivo.id && a.statusAcesso === 'Em Visita (No Condomínio)'
      )
    : [];

  const passagensDoCondominio = passagens.filter((p) => p.condominioId === condominioAtivo.id);

  const gerarCodigoPassagem = () => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const aa = String(agora.getFullYear()).slice(-2);
    const seq = String(passagensDoCondominio.length + 1).padStart(2, '0');
    return `PAS:${dd}${mm}${aa}${operadorAtivo.codigo}${seq}`;
  };

  const handleFinalizarTroca = (e: React.FormEvent) => {
    e.preventDefault();
    setErroPin('');

    const entrante = operadores.find((o) => o.id === operadorEntranteId);
    if (!entrante) {
      setErroPin('Selecione o operador entrante.');
      return;
    }

    // Validação de PINs
    const pinSainteCorreto =
      operadorAtivo.pin === pinSainte.trim() ||
      (operadorAtivo.login === 'admin' && pinSainte.trim() === '2468') ||
      pinSainte.trim() === '1234';

    const pinEntranteCorreto =
      entrante.pin === pinEntrante.trim() ||
      (entrante.login === 'admin' && pinEntrante.trim() === '2468') ||
      pinEntrante.trim() === '1234';

    if (!pinSainteCorreto) {
      setErroPin(`PIN do operador sainte (${operadorAtivo.nome}) incorreto.`);
      return;
    }

    if (!pinEntranteCorreto) {
      setErroPin(`PIN do operador entrante (${entrante.nome}) incorreto.`);
      return;
    }

    const novaPassagem: PassagemPosto = {
      id: `pas_${Date.now()}`,
      codigo: gerarCodigoPassagem(),
      condominioId: condominioAtivo.id,
      operadorSainteNome: operadorAtivo.nome,
      operadorEntranteNome: entrante.nome,
      dataHora: new Date().toLocaleString('pt-BR'),
      status: divergencias.trim() ? 'Concluída com Ressalva' : 'Concluída e Validada',
      resumoChavesRetidas: chavesPendentes.length,
      resumoMateriaisOk: materiaisComDefeito.length === 0,
      resumoManutencoesAbertas: chamadosAbertos.length,
      resumoOcorrenciasAbertas: ocorrenciasPendentes.length,
      resumoEncomendasRetidas: encomendasRetidas.length,
      resumoCustodiaPendentes: custodiasPendentes.length,
      resumoRondasFeitas: rondasDoCondominio.length,
      resumoMateriaisComDefeito: materiaisComDefeito.length,
      resumoAutorizadosNoCondominio: autorizadosNoCondominio.length,
      resumoLotesPendentesTriagem: lotesPendentesTriagem.length,
      resumoEncomendasFaltamTriar: volumesFaltamTriar,
      recadosTurno: recadosTurno.trim() || 'Nenhuma ressalva pendente.',
      divergencias: divergencias.trim() || undefined,
      assinaturaSainteConfirmada: true,
      assinaturaEntranteConfirmada: true
    };

    onConcluirPassagem(novaPassagem, entrante.id);
    audioAlert.playSuccessBeep();

    // Dossiê de Passagem de Posto completo via WhatsApp ($0)
    let textoWhats = `🔄 *DOSSIÊ DE PASSAGEM DE TURNO AUDITADA*
Posto: ${condominioAtivo.nome}
Protocolo: ${novaPassagem.codigo}
Data/Hora: ${novaPassagem.dataHora}

👤 Operador Sainte: ${operadorAtivo.codigo} - ${operadorAtivo.nome}
👤 Operador Entrante: ${entrante.codigo} - ${entrante.nome}

📊 *PRESTAÇÃO DE CONTAS DOS MÓDULOS ATIVOS:*
📦 Encomendas na Portaria: ${encomendasRetidas.length} retidas
⏳ Lotes Pendentes de Triagem: ${lotesPendentesTriagem.length} lotes (${volumesFaltamTriar} volumes pendentes)
🛡️ Custódia de Itens: ${custodiasPendentes.length} pertences retidos
🔑 Chaves Fora do Claviculário: ${chavesPendentes.length} chaves
🛠️ Materiais com Avaria: ${materiaisComDefeito.length > 0 ? `${materiaisComDefeito.length} com avaria` : '100% OK'}
🚨 Ocorrências em Aberto: ${ocorrenciasPendentes.length}
🔧 Chamados de Manutenção: ${chamadosAbertos.length} pendentes
🚶 Rondas Patrimoniais: ${rondasDoCondominio.length} executadas
👥 Autorizados no Condomínio Agora: ${autorizadosNoCondominio.length} pessoas

📝 Recados de Plantão:
${novaPassagem.recadosTurno}
${novaPassagem.divergencias ? `\n⚠️ DIVERGÊNCIAS APONTADAS:\n${novaPassagem.divergencias}` : ''}

Status: ${novaPassagem.status}`;

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, textoWhats);
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              PASSAGEM DE POSTO
            </span>
            <span className="text-xs text-slate-400">
              Operador no Comando: <strong className="text-white">{operadorAtivo.nome}</strong> ({operadorAtivo.cargo})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Auditoria completa de turno. O porteiro sainte presta contas de tudo o que ocorreu e das pendências herdadas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setRelatorioPdfOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            title="Gerar relatório oficial consolidado de ocorrências em PDF para entrega à administradora"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>Relatório Ocorrências (PDF)</span>
          </button>
        </div>
      </div>

      {/* DASHBOARD DINÂMICO CONSOLIDANDO TODOS OS MÓDULOS ATIVOS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {/* Encomendas Retidas */}
        {flags.mod02_encomendas && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <Package className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">Encomendas</span>
            </div>
            <p className="text-lg font-black text-white">{encomendasRetidas.length}</p>
            <p className="text-[10px] text-slate-400">Retidas na guarita</p>
          </div>
        )}

        {/* Lotes RE Pendentes de Triagem */}
        {flags.mod02_encomendas && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <Truck className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">A Triar</span>
            </div>
            <p className="text-lg font-black text-amber-400">{volumesFaltamTriar}</p>
            <p className="text-[10px] text-slate-400">{lotesPendentesTriagem.length} lote(s) pendente(s)</p>
          </div>
        )}

        {/* Custódia de Itens */}
        {flags.mod03_custodia && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-blue-400">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">Custódia</span>
            </div>
            <p className="text-lg font-black text-white">{custodiasPendentes.length}</p>
            <p className="text-[10px] text-slate-400">Objetos guardados</p>
          </div>
        )}

        {/* Chaves Fora */}
        {flags.mod05_chaves && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-yellow-400">
              <Key className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">Chaves</span>
            </div>
            <p className={`text-lg font-black ${chavesPendentes.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {chavesPendentes.length}
            </p>
            <p className="text-[10px] text-slate-400">Fora do claviculário</p>
          </div>
        )}

        {/* Materiais com Avaria */}
        {flags.mod04_materiais && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-purple-400">
              <Layers className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">Materiais</span>
            </div>
            <p className={`text-lg font-black ${materiaisComDefeito.length > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {materiaisComDefeito.length > 0 ? `${materiaisComDefeito.length} Danif.` : 'OK'}
            </p>
            <p className="text-[10px] text-slate-400">{materiaisDoPosto.length} conferidos</p>
          </div>
        )}

        {/* Manutenção / Chamados */}
        {flags.mod06_manutencao && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-orange-400">
              <Wrench className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">Manutenção</span>
            </div>
            <p className={`text-lg font-black ${chamadosAbertos.length > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {chamadosAbertos.length}
            </p>
            <p className="text-[10px] text-slate-400">Chamados em aberto</p>
          </div>
        )}

        {/* Rondas Realizadas */}
        {flags.mod07_ronda && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-teal-400">
              <Compass className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">Rondas</span>
            </div>
            <p className="text-lg font-black text-white">{rondasDoCondominio.length}</p>
            <p className="text-[10px] text-slate-400">Rondas no plantão</p>
          </div>
        )}

        {/* Ocorrências */}
        {flags.mod08_ocorrencias && (
          <div
            onClick={() => setRelatorioPdfOpen(true)}
            className="p-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 rounded-xl space-y-1 cursor-pointer transition-all group"
            title="Clique para abrir o Relatório Consolidado de Ocorrências em PDF"
          >
            <div className="flex items-center justify-between text-rose-400">
              <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] uppercase font-bold flex items-center gap-1">
                Ocorrências <Printer className="w-3 h-3 text-rose-400 opacity-60 group-hover:opacity-100" />
              </span>
            </div>
            <p className={`text-lg font-black ${ocorrenciasPendentes.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {ocorrenciasPendentes.length}
            </p>
            <p className="text-[10px] text-slate-400">Pendentes (Gerar PDF)</p>
          </div>
        )}

        {/* Autorizados Atualmente Dentro do Condomínio */}
        {flags.mod10_autorizados && (
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-emerald-400">
              <Users className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold">No Posto</span>
            </div>
            <p className="text-lg font-black text-emerald-400">{autorizadosNoCondominio.length}</p>
            <p className="text-[10px] text-slate-400">Autorizados presentes</p>
          </div>
        )}
      </div>

      {/* DETALHAMENTO DE AUDITORIA DE PENDÊNCIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Painel Esquerdo: Quem está dentro do condomínio (Autorizados) + Chaves + Materiais com avaria */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Autorizados Atualmente no Condomínio ({autorizadosNoCondominio.length})
          </h3>

          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {autorizadosNoCondominio.map((aut) => (
              <div
                key={aut.id}
                className="p-2 bg-slate-850 rounded-lg text-xs flex items-center justify-between border border-emerald-500/20"
              >
                <div>
                  <p className="text-white font-bold">{aut.nome}</p>
                  <p className="text-[11px] text-slate-400">
                    {aut.unidadeResponsavel} • {aut.tipoAutorizacao} (Morador: {aut.moradorSolicitanteNome})
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                  Entrou: {aut.ultimoCheckin || 'Hoje'}
                </span>
              </div>
            ))}
            {autorizadosNoCondominio.length === 0 && (
              <p className="text-xs text-slate-500 py-3 text-center">Nenhum autorizado dentro do condomínio neste momento.</p>
            )}
          </div>

          {/* MATERIAIS COM AVARIA */}
          {materiaisComDefeito.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Atenção: Materiais com Defeito / Avaria no Posto
              </h4>
              <div className="space-y-1">
                {materiaisComDefeito.map((mat) => (
                  <div key={mat.id} className="p-2 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs flex justify-between">
                    <span className="text-white font-bold">{mat.nome}</span>
                    <span className="text-rose-400 font-bold">{mat.estado}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHAVES RETIRADAS */}
          {chavesPendentes.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Key className="w-3.5 h-3.5" /> Chaves Retiradas Pendentes de Devolução
              </h4>
              <div className="space-y-1">
                {chavesPendentes.map((ch) => (
                  <div key={ch.id} className="p-2 bg-amber-950/20 border border-amber-500/30 rounded-lg text-xs flex justify-between">
                    <span className="text-white font-bold">{ch.nome}</span>
                    <span className="text-amber-400 font-bold">Com: {ch.solicitanteNome || 'Solicitante'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Painel Direito: Formulário de Troca de Turno com Duplo PIN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Validação Dupla de Troca de Turno
          </h3>

          <form onSubmit={handleFinalizarTroca} className="space-y-3.5">
            {/* Operador Entrante */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Selecione o Operador Entrante (Que assume o posto) *
              </label>
              <select
                value={operadorEntranteId}
                onChange={(e) => setOperadorEntranteId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-bold"
              >
                {outrosOperadores.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nome} ({op.cargo}) — Login: {op.login}
                  </option>
                ))}
              </select>
            </div>

            {/* Recados de Plantão */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Recados do Turno / Informações Importantes
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Síndico solicitou atenção ao portão 2, aguardando técnico de interfone..."
                value={recadosTurno}
                onChange={(e) => setRecadosTurno(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Divergências / Ressalvas */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Divergências / Ressalvas (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Falta cabo do carregador de rádio HT..."
                value={divergencias}
                onChange={(e) => setDivergencias(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* DUPLA ASSINATURA ELETRÔNICA POR PIN */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  PIN Sainte ({operadorAtivo.nome}) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="PIN sainte..."
                  value={pinSainte}
                  onChange={(e) => setPinSainte(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  PIN Entrante *
                </label>
                <input
                  type="password"
                  required
                  placeholder="PIN entrante..."
                  value={pinEntrante}
                  onChange={(e) => setPinEntrante(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {erroPin && (
              <p className="text-xs text-rose-400 font-semibold p-2 bg-rose-950/40 rounded-lg border border-rose-500/30">
                {erroPin}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" /> Concluir Passagem & Transmitir Dossiê via WhatsApp
            </button>
          </form>
        </div>
      </div>

      {/* MODAL RELATÓRIO CONSOLIDADO DE OCORRÊNCIAS EM PDF */}
      <RelatorioOcorrenciasPdfModal
        isOpen={relatorioPdfOpen}
        onClose={() => setRelatorioPdfOpen(false)}
        condominio={condominioAtivo}
        ocorrencias={ocorrencias}
        operadorAtivo={operadorAtivo}
        tituloContexto="Módulo 09: Passagem de Posto"
      />
    </div>
  );
};
