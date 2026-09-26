import React, { useState } from 'react';
import { Shield, Plus, Camera, CheckCircle2, AlertTriangle, XCircle, Radio, MessageSquare } from 'lucide-react';
import { Condominio, Operador, MaterialPosto } from '../../types';
import { buildWhatsAppDeepLink } from '../../lib/whatsapp';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';

interface Mod04MateriaisProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  materiais: MaterialPosto[];
  onAddMaterial: (item: MaterialPosto) => void;
  onUpdateStatusMaterial: (id: string, estado: MaterialPosto['estado'], obs?: string, fotoAvaria?: string) => void;
}

export const Mod04Materiais: React.FC<Mod04MateriaisProps> = ({
  condominioAtivo,
  operadorAtivo,
  materiais,
  onAddMaterial,
  onUpdateStatusMaterial
}) => {
  const [modalNovo, setModalNovo] = useState(false);
  const [modalAvaria, setModalAvaria] = useState<MaterialPosto | null>(null);
  const [fotoModalOpen, setFotoModalOpen] = useState(false);

  // Form Novo Equipamento
  const [nome, setNome] = useState('');
  const [propriedade, setPropriedade] = useState<'INFPORT' | 'CONDOMÍNIO'>('INFPORT');
  const [categoria, setCategoria] = useState<MaterialPosto['categoria']>('Comunicação');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  // Form Avaria
  const [obsAvaria, setObsAvaria] = useState('');
  const [fotoAvariaUrl, setFotoAvariaUrl] = useState('');

  const materiaisDoCondominio = materiais.filter((m) => m.condominioId === condominioAtivo.id);

  const handleSalvarEquipamento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome) return;

    const novo: MaterialPosto = {
      id: `mat_${Date.now()}`,
      codigo: `MAT${String(materiaisDoCondominio.length + 1).padStart(3, '0')}`,
      condominioId: condominioAtivo.id,
      nome,
      propriedade,
      categoria,
      numeroSerieTag: numeroSerie,
      quantidade: Number(quantidade),
      estado: 'Operacional',
      ultimaConferencia: new Date().toLocaleString('pt-BR')
    };

    onAddMaterial(novo);
    setNome('');
    setNumeroSerie('');
    setModalNovo(false);
  };

  const handleSalvarAvaria = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalAvaria || !obsAvaria) return;

    const fotoFinal =
      fotoAvariaUrl ||
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60';

    onUpdateStatusMaterial(modalAvaria.id, 'Com Avaria', obsAvaria, fotoFinal);

    // Disparo WhatsApp para Supervisor
    const msg = `⚠️ *ALERTA DE AVARIA EM MATERIAL DO POSTO*
Condomínio: ${condominioAtivo.nome}
Posto: Portaria Principal

• Equipamento: ${modalAvaria.nome}
• Patrimônio/Tag: ${modalAvaria.numeroSerieTag || 'S/N'}
• Propriedade: ${modalAvaria.propriedade}
• Situação: Com Avaria / Defeito
• Detalhes: ${obsAvaria}

Operador: ${operadorAtivo.codigo} - ${operadorAtivo.nome}
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Foto da Avaria: ${fotoFinal}`;

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, msg);
      window.open(url, '_blank');
    }

    setModalAvaria(null);
    setObsAvaria('');
    setFotoAvariaUrl('');
  };

  return (
    <div className="space-y-4">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              MÓDULO 04
            </span>
            <h1 className="text-lg font-bold text-white">Materiais e Inventário do Posto</h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Rádios HT, lanternas, controles e equipamentos sob responsabilidade do plantão.
          </p>
        </div>

        <button
          onClick={() => setModalNovo(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-950/40 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Novo Equipamento
        </button>
      </div>

      {/* Lista de Equipamentos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {materiaisDoCondominio.map((mat) => (
          <div
            key={mat.id}
            className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                {mat.codigo}
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                  mat.estado === 'Operacional'
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                    : mat.estado === 'Com Avaria'
                    ? 'bg-amber-950/60 text-amber-400 border border-amber-500/30'
                    : 'bg-red-950/60 text-red-400 border border-red-500/30'
                }`}
              >
                {mat.estado}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{mat.nome}</h3>
              <p className="text-xs text-slate-400">
                Propriedade: <strong className="text-slate-300">{mat.propriedade}</strong> • Qtd: {mat.quantidade}
              </p>
              {mat.numeroSerieTag && (
                <p className="text-[11px] text-slate-500 font-mono">Tag/Série: {mat.numeroSerieTag}</p>
              )}
            </div>

            {mat.observacaoAvaria && (
              <div className="p-2 bg-amber-950/30 border border-amber-500/30 rounded-lg text-xs text-amber-300">
                ⚠️ {mat.observacaoAvaria}
              </div>
            )}

            {/* Ações Rápidas de Conferência */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
              <button
                onClick={() => onUpdateStatusMaterial(mat.id, 'Operacional')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  mat.estado === 'Operacional'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> OK
              </button>

              <button
                onClick={() => setModalAvaria(mat)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors ${
                  mat.estado === 'Com Avaria'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Avaria
              </button>

              <button
                onClick={() => onUpdateStatusMaterial(mat.id, 'Extraviado')}
                className={`py-1.5 px-2.5 text-xs font-bold rounded-lg flex items-center justify-center transition-colors ${
                  mat.estado === 'Extraviado'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
                title="Marcar como Extraviado / Faltando"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL NOVO EQUIPAMENTO */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" /> Cadastrar Novo Equipamento
            </h2>

            <form onSubmit={handleSalvarEquipamento} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Equipamento *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rádio HT Hytera 03"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Propriedade</label>
                  <select
                    value={propriedade}
                    onChange={(e) => setPropriedade(e.target.value as 'INFPORT' | 'CONDOMÍNIO')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="INFPORT">INFPORT</option>
                    <option value="CONDOMÍNIO">CONDOMÍNIO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as MaterialPosto['categoria'])}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Comunicação">Comunicação (Rádios)</option>
                    <option value="Segurança/Iluminação">Iluminação (Lanternas)</option>
                    <option value="Acessos">Acessos (Controles)</option>
                    <option value="Sinalização">Sinalização (Cones)</option>
                    <option value="Vestuário">Vestuário (Capas)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tag / Patrimônio</label>
                  <input
                    type="text"
                    placeholder="Ex: INF-HT-046"
                    value={numeroSerie}
                    onChange={(e) => setNumeroSerie(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-950/40"
                >
                  Salvar Equipamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE AVARIA */}
      {modalAvaria && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Registrar Avaria em Material
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Equipamento: <strong>{modalAvaria.nome}</strong>
            </p>

            <form onSubmit={handleSalvarAvaria} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Descrição do Defeito *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Botão PTT travado, antena quebrada após o plantão..."
                  value={obsAvaria}
                  onChange={(e) => setObsAvaria(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Foto Comprovante da Avaria</label>
                <button
                  type="button"
                  onClick={() => setFotoModalOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  {fotoAvariaUrl ? 'Foto Registrada ✓' : 'Capturar Foto do Dano'}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAvaria(null)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-950/40"
                >
                  Registrar & Notificar Supervisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        presetTheme="avaria"
        title="Foto da Avaria do Equipamento"
        onCapture={(url) => setFotoAvariaUrl(url)}
      />
    </div>
  );
};
