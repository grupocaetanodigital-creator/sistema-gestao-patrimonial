import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  QrCode,
  MapPin,
  Play,
  Square,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Compass,
  Radio,
  Camera,
  Sparkles,
  Sun,
  Moon,
  Check,
  X,
  ExternalLink,
  Navigation,
  Loader2,
  Smartphone,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Condominio, Operador, PontoRonda, ExecucaoRonda, RegistroPontoLido, getTurnoAtual } from '../../types';
import {
  buildWhatsAppDeepLink,
  DEFAULT_WHATSAPP_TEMPLATES,
  interpolateTemplate,
  formatWhatsAppPhotoLink
} from '../../lib/whatsapp';
import { audioAlert } from '../../lib/audioAlert';
import { PhotoCaptureModal } from '../common/PhotoCaptureModal';
import { PhotoViewerModal } from '../common/PhotoViewerModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

interface Mod07RondaProps {
  condominioAtivo: Condominio;
  operadorAtivo: Operador;
  pontosRonda: PontoRonda[];
  execucoesRonda: ExecucaoRonda[];
  onAddPonto: (ponto: PontoRonda) => void;
  onSalvarExecucao: (exec: ExecucaoRonda) => void;
}

// Cálculo de distância precisa em metros pela fórmula de Haversine
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const Mod07Ronda: React.FC<Mod07RondaProps> = ({
  condominioAtivo,
  operadorAtivo,
  pontosRonda,
  execucoesRonda,
  onAddPonto,
  onSalvarExecucao
}) => {
  const [tab, setTab] = useState<'operacao' | 'pontos' | 'historico'>('operacao');

  // Turno Vigente do Condomínio (configurado em Cadastros)
  const turnoVigente = getTurnoAtual(condominioAtivo);

  // Ronda Ativa em Andamento
  const [rondaEmAndamento, setRondaEmAndamento] = useState<ExecucaoRonda | null>(null);
  const [pontosLidosIds, setPontosLidosIds] = useState<string[]>([]);
  const [detalhesPontosLidos, setDetalhesPontosLidos] = useState<RegistroPontoLido[]>([]);

  // Ponto sendo validado no momento
  const [pontoEmValidacao, setPontoEmValidacao] = useState<PontoRonda | null>(null);
  const [checklistRespostas, setChecklistRespostas] = useState<Record<string, boolean>>({});
  const [leituraCodigoAtual, setLeituraCodigoAtual] = useState<string | null>(null);
  const [leituraGpsAtual, setLeituraGpsAtual] = useState<{ lat: number; lng: number; accuracy: number; dist: number } | null>(null);
  const [validandoGps, setValidandoGps] = useState(false);
  const [erroGpsBloqueio, setErroGpsBloqueio] = useState<string | null>(null);
  const [erroCodigoBloqueio, setErroCodigoBloqueio] = useState<string | null>(null);

  // Modal Scanner Câmera QR / Tag
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'cadastro' | 'ponto_especifico'>('ponto_especifico');

  // Modal NFC
  const [modalNfcManual, setModalNfcManual] = useState(false);
  const [nfcInputManual, setNfcInputManual] = useState('');

  // Foto de Anomalia
  const [fotoModalOpen, setFotoModalOpen] = useState(false);
  const [anomaliaFotoUrl, setAnomaliaFotoUrl] = useState<string>('');
  const [fotoVisualizarUrl, setFotoVisualizarUrl] = useState<string | null>(null);
  const [fotoVisualizarTitulo, setFotoVisualizarTitulo] = useState<string>('');

  // Timer Regressivo para a Próxima Ronda (ex: 60 minutos configuráveis)
  const intervaloMinutos = condominioAtivo.intervaloRondaMinutos || 60;
  const [segundosProximaRonda, setSegundosProximaRonda] = useState<number>(intervaloMinutos * 60);

  // Form Novo Ponto (ADM/Supervisor)
  const [modalNovoPonto, setModalNovoPonto] = useState(false);
  const [novoNomePonto, setNovoNomePonto] = useState('');
  const [novoTipoValidacao, setNovoTipoValidacao] = useState<'QR Code' | 'NFC'>('QR Code');
  const [novoCodigoIdentificador, setNovoCodigoIdentificador] = useState('');
  const [novoPontoLat, setNovoPontoLat] = useState<number | null>(null);
  const [novoPontoLng, setNovoPontoLng] = useState<number | null>(null);
  const [novoPontoPrecisao, setNovoPontoPrecisao] = useState<number | null>(null);
  const [novoRaioTolerancia, setNovoRaioTolerancia] = useState<number>(40);
  const [capturandoGpsCadastro, setCapturandoGpsCadastro] = useState(false);
  const [lendoNfcCadastro, setLendoNfcCadastro] = useState(false);
  const [perguntasPonto, setPerguntasPonto] = useState<string[]>(['Porta trancada e sem violação?']);
  const [novaPergunta, setNovaPergunta] = useState('');

  const pontosDoCondominio = pontosRonda.filter((p) => p.condominioId === condominioAtivo.id);
  const historicoDoCondominio = execucoesRonda.filter((e) => e.condominioId === condominioAtivo.id);

  // Leitura NFC no Cadastro de Ponto
  const handleLerNfcCadastro = async () => {
    setLendoNfcCadastro(true);
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        const NDEFReaderClass = (window as any).NDEFReader;
        const ndef = new NDEFReaderClass();
        await ndef.scan();
        ndef.onreading = (event: any) => {
          const serial = event.serialNumber || `NFC-${Date.now().toString().slice(-6)}`;
          setNovoCodigoIdentificador(serial);
          setLendoNfcCadastro(false);
          audioAlert.playSuccessBeep();
        };
      } catch (err) {
        console.warn('Web NFC erro no cadastro:', err);
        setLendoNfcCadastro(false);
        const manual = window.prompt('Digite ou aproxime a Tag NFC / RFID:');
        if (manual) {
          setNovoCodigoIdentificador(manual.trim());
          audioAlert.playSuccessBeep();
        }
      }
    } else {
      setLendoNfcCadastro(false);
      const manual = window.prompt('Digite ou aproxime a Tag NFC / RFID:');
      if (manual) {
        setNovoCodigoIdentificador(manual.trim());
        audioAlert.playSuccessBeep();
      }
    }
  };

  // Timer para próxima ronda
  useEffect(() => {
    const interval = setInterval(() => {
      setSegundosProximaRonda((prev) => {
        if (prev <= 1) {
          audioAlert.playWarningAlert();
          return intervaloMinutos * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [intervaloMinutos]);

  const formatarTempo = (totalSeg: number) => {
    const m = Math.floor(totalSeg / 60);
    const s = totalSeg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Iniciar Ronda
  const handleIniciarRonda = () => {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const aa = String(agora.getFullYear()).slice(-2);
    const seq = String(historicoDoCondominio.length + 1).padStart(2, '0');

    const nova: ExecucaoRonda = {
      id: `ronda_${Date.now()}`,
      codigoRonda: `ROND:${dd}${mm}${aa}${operadorAtivo.codigo}${seq}`,
      condominioId: condominioAtivo.id,
      operadorNome: operadorAtivo.nome,
      turno: turnoVigente.nome,
      dataHoraInicio: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'Em Andamento',
      pontosLidos: 0,
      totalPontos: pontosDoCondominio.length,
      anomalias: []
    };

    setRondaEmAndamento(nova);
    setPontosLidosIds([]);
    setDetalhesPontosLidos([]);
    audioAlert.playSuccessBeep();
  };

  // 1. AÇÃO DO OPERADOR AO CLICAR EM "VALIDAR PONTO"
  // Não confirma de imediato! Aciona a câmera para QR Code ou o leitor NFC
  const handleIniciarValidacaoPonto = (ponto: PontoRonda) => {
    setPontoEmValidacao(ponto);
    setChecklistRespostas({});
    setLeituraCodigoAtual(null);
    setLeituraGpsAtual(null);
    setErroGpsBloqueio(null);
    setErroCodigoBloqueio(null);
    setAnomaliaFotoUrl('');

    if (ponto.tipoValidacao === 'QR Code') {
      setScannerTarget('ponto_especifico');
      setScannerModalOpen(true);
    } else {
      // Tentar leitura Web NFC nativa se disponível no navegador
      iniciarLeituraNfcNativa(ponto);
    }
  };

  const iniciarLeituraNfcNativa = async (ponto: PontoRonda) => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      try {
        const NDEFReaderClass = (window as any).NDEFReader;
        const ndef = new NDEFReaderClass();
        await ndef.scan();
        ndef.onreading = (event: any) => {
          const serial = event.serialNumber || `NFC-${Date.now().toString().slice(-6)}`;
          processarValidacaoCodigoPonto(serial, ponto);
        };
      } catch (err) {
        console.warn('Web NFC não disponível ou não autorizado:', err);
        setModalNfcManual(true);
      }
    } else {
      setModalNfcManual(true);
    }
  };

  // 2. PROCESSAMENTO DO CÓDIGO LIDO (QR OU NFC) + CONFERÊNCIA OBRIGATÓRIA DE GPS
  const processarValidacaoCodigoPonto = (code: string, pontoAlvo: PontoRonda) => {
    const codeLimpo = code.trim().toLowerCase();
    const esperadoId = (pontoAlvo.codigoIdentificador || '').trim().toLowerCase();
    const esperadoHash = (pontoAlvo.codigoHash || '').trim().toLowerCase();
    const esperadoCod = pontoAlvo.codigo.trim().toLowerCase();

    const coincide =
      codeLimpo === esperadoId ||
      codeLimpo === esperadoHash ||
      codeLimpo === esperadoCod ||
      codeLimpo.includes(esperadoId) ||
      codeLimpo.includes(esperadoCod);

    if (!coincide) {
      audioAlert.playWarningAlert();
      setErroCodigoBloqueio(
        `❌ Código Inválido! O código lido ("${code}") não corresponde ao ponto "${pontoAlvo.nome}". Aponte para o QR Code / Tag correto deste local.`
      );
      setLeituraCodigoAtual(null);
      return;
    }

    setErroCodigoBloqueio(null);
    setLeituraCodigoAtual(code);

    // Conferência OBRIGATÓRIA de GPS no local
    setValidandoGps(true);
    setErroGpsBloqueio(null);

    if (!navigator.geolocation) {
      setValidandoGps(false);
      setLeituraGpsAtual({ lat: 0, lng: 0, accuracy: 0, dist: 0 });
      audioAlert.playSuccessBeep();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValidandoGps(false);
        const latAtual = pos.coords.latitude;
        const lngAtual = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        // Se o ponto possui GPS cadastrado, valida distância máxima permitida rigorosamente
        if (pontoAlvo.latitude && pontoAlvo.longitude) {
          const dist = calculateDistanceMeters(
            latAtual,
            lngAtual,
            pontoAlvo.latitude,
            pontoAlvo.longitude
          );

          const raioMaximo = pontoAlvo.raioToleranciaMetros || 50;

          if (dist > raioMaximo) {
            audioAlert.playWarningAlert();
            setErroGpsBloqueio(
              `❌ FORA DO LOCAL CADASTRADO! Você está a ${dist}m de distância do ponto físico (${pontoAlvo.nome}). O limite tolerado é de até ${raioMaximo}m. Desloque-se até o local para validar a ronda.`
            );
            setLeituraGpsAtual(null);
            return;
          }

          setLeituraGpsAtual({ lat: latAtual, lng: lngAtual, accuracy, dist });
          audioAlert.playSuccessBeep();
        } else {
          // Ponto não tinha GPS prévio: adota a coordenada atual como ponto de referência
          setLeituraGpsAtual({ lat: latAtual, lng: lngAtual, accuracy, dist: 0 });
          audioAlert.playSuccessBeep();
        }
      },
      (err) => {
        setValidandoGps(false);
        console.warn('Erro ao obter GPS:', err);
        setErroGpsBloqueio(
          `❌ GPS Obrigatório: Não foi possível obter o sinal de satélite (${err.message}). Ative o GPS e a localização de alta precisão no celular para validar a ronda.`
        );
        setLeituraGpsAtual(null);
        audioAlert.playWarningAlert();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Callback do BarcodeScannerModal (Câmera QR)
  const handleScanComplete = (code: string) => {
    if (scannerTarget === 'cadastro') {
      setNovoCodigoIdentificador(code);
      audioAlert.playSuccessBeep();
    } else if (pontoEmValidacao) {
      processarValidacaoCodigoPonto(code, pontoEmValidacao);
    }
  };

  // 3. CONFIRMAR E SALVAR O PONTO NA RONDA (Somente permitido se QR/NFC bater e GPS estiver no local)
  const handleConfirmarPontoNaRonda = () => {
    if (!pontoEmValidacao || !rondaEmAndamento) return;
    if (!leituraCodigoAtual) {
      alert('É obrigatório ler o QR Code ou aproximar a Tag NFC do ponto!');
      return;
    }
    if (erroGpsBloqueio || !leituraGpsAtual) {
      alert('Bloqueio de GPS: você deve estar no local físico cadastrado do ponto para confirmar!');
      return;
    }

    const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Checagem de anomalias
    const anomalias = Object.entries(checklistRespostas)
      .filter(([, ok]) => !ok)
      .map(([pergunta]) => `${pontoEmValidacao.nome}: ${pergunta}`);

    const mapsUrl =
      leituraGpsAtual.lat && leituraGpsAtual.lng
        ? `https://maps.google.com/?q=${leituraGpsAtual.lat},${leituraGpsAtual.lng}`
        : undefined;

    const registro: RegistroPontoLido = {
      pontoId: pontoEmValidacao.id,
      pontoNome: pontoEmValidacao.nome,
      tipoValidacao: pontoEmValidacao.tipoValidacao,
      codigoLido: leituraCodigoAtual,
      dataHora: agora,
      latitude: leituraGpsAtual.lat || undefined,
      longitude: leituraGpsAtual.lng || undefined,
      distanciaMetros: leituraGpsAtual.dist,
      gpsValido: !erroGpsBloqueio,
      respostasChecklist: checklistRespostas,
      fotoAnomaliaUrl: anomaliaFotoUrl || undefined,
      mapsUrl
    };

    const novosPontosLidosIds = [...pontosLidosIds, pontoEmValidacao.id];
    const novosDetalhes = [...detalhesPontosLidos, registro];

    setPontosLidosIds(novosPontosLidosIds);
    setDetalhesPontosLidos(novosDetalhes);

    setRondaEmAndamento({
      ...rondaEmAndamento,
      pontosLidos: novosPontosLidosIds.length,
      anomalias: [...rondaEmAndamento.anomalias, ...anomalias],
      detalhesPontosLidos: novosDetalhes
    });

    setPontoEmValidacao(null);
    setLeituraCodigoAtual(null);
    setLeituraGpsAtual(null);
    setErroGpsBloqueio(null);
    setErroCodigoBloqueio(null);
    setAnomaliaFotoUrl('');
    audioAlert.playSuccessBeep();
  };

  // 4. FINALIZAR RONDA E DISPARAR RELATÓRIO COM TODOS OS DADOS E MAPAS VIA WHATSAPP
  const handleFinalizarRonda = () => {
    if (!rondaEmAndamento) return;

    const fim = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const temAnomalia = rondaEmAndamento.anomalias.length > 0;
    const todosLidos = pontosLidosIds.length >= pontosDoCondominio.length;

    const statusFinal: ExecucaoRonda['status'] =
      !todosLidos
        ? 'Atrasada'
        : temAnomalia
        ? 'Concluída com Anomalias'
        : 'Concluída 100% OK';

    const execucaoFinal: ExecucaoRonda = {
      ...rondaEmAndamento,
      dataHoraFim: fim,
      status: statusFinal,
      detalhesPontosLidos: detalhesPontosLidos
    };

    onSalvarExecucao(execucaoFinal);
    setRondaEmAndamento(null);
    setSegundosProximaRonda(intervaloMinutos * 60);

    // Formatação rica dos pontos com conferência de GPS e Link do Google Maps
    const listaCheckpointsFormatada = detalhesPontosLidos
      .map((p, idx) => {
        const coordsStr =
          p.latitude && p.longitude && p.latitude !== 0
            ? `${p.latitude.toFixed(6)}, ${p.longitude.toFixed(6)}`
            : 'Coordenadas locais';
        const distStr = p.distanciaMetros !== undefined ? `(${p.distanciaMetros}m do ponto)` : '';
        const mapsLink =
          p.mapsUrl ||
          (p.latitude && p.longitude && p.latitude !== 0
            ? `https://maps.google.com/?q=${p.latitude},${p.longitude}`
            : '');
        const fotoStr = p.fotoAnomaliaUrl
          ? `\n  • Foto do Ponto: ${formatWhatsAppPhotoLink(p.fotoAnomaliaUrl)}`
          : '';

        return `📍 *Check ${idx + 1}: ${p.pontoNome}*
  • Horário: ${p.dataHora}
  • Leitura: ${p.tipoValidacao} [${p.codigoLido}]
  • GPS: ${coordsStr} ${distStr}
  ${mapsLink ? `• Mapa: ${mapsLink}` : ''}${fotoStr}`;
      })
      .join('\n\n');

    // Mensagem de WhatsApp
    const textoMsg = `🛡️ *RELATÓRIO DE RONDA PATRIMONIAL*
Condomínio: *${condominioAtivo.nome}* (${condominioAtivo.codigo})
Código da Ronda: ${execucaoFinal.codigoRonda}
Turno: ${execucaoFinal.turno}
Vigilante / Ronda: ${operadorAtivo.codigo} - ${operadorAtivo.nome}

• Status: *${statusFinal}*
• Pontos Vistoriados: ${execucaoFinal.pontosLidos} de ${execucaoFinal.totalPontos}
• Horário: ${execucaoFinal.dataHoraInicio} às ${execucaoFinal.dataHoraFim}

${listaCheckpointsFormatada || 'Nenhum ponto registrado.'}

${temAnomalia ? `\n⚠️ *ANOMALIAS REGISTRADAS:* \n${execucaoFinal.anomalias.join('\n')}` : '\n✓ Posto em perfeita ordem, sem violações físicas.'}

_Relatório auditado e validado pelo sistema INFPORT._`;

    if (condominioAtivo.telefoneSindico) {
      const url = buildWhatsAppDeepLink(condominioAtivo.telefoneSindico, textoMsg);
      window.open(url, '_blank');
    }
  };

  // 5. CAPTURA DE GPS NO CADASTRO DO PONTO
  const handleCapturarGpsCadastro = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada no seu navegador.');
      return;
    }
    setCapturandoGpsCadastro(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNovoPontoLat(pos.coords.latitude);
        setNovoPontoLng(pos.coords.longitude);
        setNovoPontoPrecisao(Math.round(pos.coords.accuracy));
        setCapturandoGpsCadastro(false);
        audioAlert.playSuccessBeep();
      },
      (err) => {
        setCapturandoGpsCadastro(false);
        alert(`Não foi possível obter o GPS: ${err.message}. Verifique a permissão de localização do navegador.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Salvar Novo Ponto
  const handleSalvarNovoPonto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNomePonto) return;

    const sugerido =
      novoTipoValidacao === 'QR Code'
        ? `QR-${condominioAtivo.codigo || 'COND'}-PNT${pontosDoCondominio.length + 1}`
        : `TAG-NFC-${Date.now().toString().slice(-6)}`;

    const idFinal = novoCodigoIdentificador.trim() || sugerido;

    const novo: PontoRonda = {
      id: `pnt_${Date.now()}`,
      codigo: `PNT${String(pontosDoCondominio.length + 1).padStart(3, '0')}`,
      condominioId: condominioAtivo.id,
      nome: novoNomePonto,
      tipoValidacao: novoTipoValidacao,
      codigoIdentificador: idFinal,
      codigoHash: idFinal,
      latitude: novoPontoLat || undefined,
      longitude: novoPontoLng || undefined,
      precisaoMetros: novoPontoPrecisao || undefined,
      raioToleranciaMetros: novoRaioTolerancia || 40,
      perguntas: perguntasPonto
    };

    onAddPonto(novo);
    setModalNovoPonto(false);
    setNovoNomePonto('');
    setNovoCodigoIdentificador('');
    setNovoPontoLat(null);
    setNovoPontoLng(null);
    setNovoPontoPrecisao(null);
    setPerguntasPonto(['Porta trancada e sem violação?']);
    audioAlert.playSuccessBeep();
  };

  return (
    <div className="space-y-4">
      {/* HEADER DE STATUS DO TURNO E RONDA */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Módulo 07 • Rondas com Validação Obrigatória
            </span>
            <span className="text-xs text-slate-300 font-bold">
              {condominioAtivo.nome} ({condominioAtivo.codigo})
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-750">
              {turnoVigente.tipo === 'Diurno' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-400" />}
              {turnoVigente.nome} ({turnoVigente.inicio} às {turnoVigente.fim})
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Ciclo: a cada <strong className="text-white">{intervaloMinutos} min</strong>
            </span>
          </div>
        </div>

        {/* TIMER E CONTROLE DA RONDA */}
        <div className="flex items-center gap-2">
          {!rondaEmAndamento ? (
            <button
              onClick={handleIniciarRonda}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" /> Iniciar Ronda Agora
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-500/50 p-2.5 rounded-xl">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  Ronda em Andamento
                </p>
                <p className="text-xs font-bold text-white">
                  {pontosLidosIds.length} de {pontosDoCondominio.length} pontos validados
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          onClick={() => setTab('operacao')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tab === 'operacao' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" /> Ronda Ativa
        </button>
        <button
          onClick={() => setTab('pontos')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tab === 'pontos' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" /> Pontos ({pontosDoCondominio.length})
        </button>
        <button
          onClick={() => setTab('historico')}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            tab === 'historico' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Histórico
        </button>
      </div>

      {/* ---------------- ABA 1: OPERAÇÃO DA RONDA ATIVA ---------------- */}
      {tab === 'operacao' && (
        <div className="space-y-4">
          {!rondaEmAndamento ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <Compass className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-white">Nenhuma Ronda em Andamento</h3>
                <p className="text-xs text-slate-400">
                  Próxima ronda programada em <strong>{formatarTempo(segundosProximaRonda)}</strong>. Toque no botão abaixo para iniciar a rota e realizar a leitura física dos pontos.
                </p>
              </div>
              <button
                onClick={handleIniciarRonda}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl inline-flex items-center gap-2 shadow-xl shadow-emerald-950/40 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" /> Iniciar Ronda ({turnoVigente.nome})
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Barra de Progresso */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Progresso da Rota</span>
                  <span className="text-emerald-400 font-mono">
                    {Math.round((pontosLidosIds.length / Math.max(pontosDoCondominio.length, 1)) * 100)}% Concluído
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${(pontosLidosIds.length / Math.max(pontosDoCondominio.length, 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* LISTA DE PONTOS DA ROTA */}
              <div className="space-y-2">
                {pontosDoCondominio.map((ponto, idx) => {
                  const lido = pontosLidosIds.includes(ponto.id);
                  const detalhe = detalhesPontosLidos.find((d) => d.pontoId === ponto.id);

                  return (
                    <div
                      key={ponto.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        lido
                          ? 'bg-emerald-950/30 border-emerald-500/50'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            lido ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {lido ? <Check className="w-5 h-5" /> : idx + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{ponto.nome}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1 font-semibold text-slate-300">
                              {ponto.tipoValidacao === 'QR Code' ? <QrCode className="w-3 h-3 text-emerald-400" /> : <Radio className="w-3 h-3 text-blue-400" />}
                              {ponto.tipoValidacao}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-emerald-400">{ponto.codigoIdentificador || ponto.codigo}</span>
                            {ponto.latitude && ponto.longitude && (
                              <>
                                <span>•</span>
                                <span className="text-slate-400 flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-emerald-400" /> GPS Fixado
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="self-end sm:self-auto">
                        {!lido ? (
                          <button
                            onClick={() => handleIniciarValidacaoPonto(ponto)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Validar Leitura
                          </button>
                        ) : (
                          <div className="flex flex-col sm:items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Lido às {detalhe?.dataHora || 'OK'}
                              </span>
                              {detalhe?.fotoAnomaliaUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFotoVisualizarUrl(detalhe.fotoAnomaliaUrl || '');
                                    setFotoVisualizarTitulo(`Foto da Vistoria - ${ponto.nome}`);
                                  }}
                                  className="w-7 h-7 rounded-lg overflow-hidden border border-amber-500/60 shrink-0 bg-black cursor-pointer shadow hover:scale-105 transition-transform"
                                  title="Ver foto do ponto / anomalia"
                                >
                                  <img
                                    src={detalhe.fotoAnomaliaUrl}
                                    alt="Foto"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              {detalhe?.distanciaMetros !== undefined && (
                                <span>A {detalhe.distanciaMetros}m do local</span>
                              )}
                              {condominioAtivo.telefoneSindico && (
                                <a
                                  href={buildWhatsAppDeepLink(
                                    condominioAtivo.telefoneSindico,
                                    interpolateTemplate(DEFAULT_WHATSAPP_TEMPLATES.RONDA_CHECKPOINT, {
                                      CONDOMINIO: condominioAtivo.nome,
                                      PONTO_NOME: ponto.nome,
                                      TIPO_VALIDACAO: ponto.tipoValidacao,
                                      CODIGO_LIDO: detalhe?.codigoLido || ponto.codigo,
                                      STATUS_GPS: detalhe?.gpsValido ? 'Conferido no perímetro' : 'Alerta GPS',
                                      DISTANCIA: detalhe?.distanciaMetros ?? 0,
                                      COORDENADAS:
                                        detalhe?.latitude && detalhe?.longitude
                                          ? `${detalhe.latitude.toFixed(6)}, ${detalhe.longitude.toFixed(6)}`
                                          : 'Local',
                                      LINK_MAPA:
                                        detalhe?.latitude && detalhe?.longitude
                                          ? `• Mapa: https://maps.google.com/?q=${detalhe.latitude},${detalhe.longitude}`
                                          : '',
                                      OPERADOR: `${operadorAtivo.codigo} - ${operadorAtivo.nome}`,
                                      DATA_HORA: detalhe?.dataHora || new Date().toLocaleTimeString('pt-BR')
                                    })
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-0.5 hover:underline"
                                >
                                  <MessageSquare className="w-3 h-3" /> WhatsApp
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOTÃO PARA FINALIZAR RONDA */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={handleFinalizarRonda}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-black rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-red-950/40 transition-all active:scale-95 uppercase tracking-wider"
                >
                  <Square className="w-4 h-4 fill-white" /> Finalizar Ronda & Enviar Relatório WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------- ABA 2: CADASTRO DE PONTOS DA ROTA ---------------- */}
      {tab === 'pontos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Checkpoints Cadastrados ({condominioAtivo.nome})
              </h3>
              <p className="text-xs text-slate-400">
                Defina os locais de passagem, tags NFC ou QR Codes impressos e posições GPS exatas.
              </p>
            </div>
            <button
              onClick={() => setModalNovoPonto(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> + Novo Ponto
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pontosDoCondominio.map((p, idx) => (
              <div
                key={p.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
                    {p.codigo}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                    {p.tipoValidacao === 'QR Code' ? <QrCode className="w-3.5 h-3.5 text-emerald-400" /> : <Radio className="w-3.5 h-3.5 text-blue-400" />}
                    {p.tipoValidacao}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">{p.nome}</h4>

                <div className="p-2 bg-slate-850 rounded-xl font-mono text-[11px] text-slate-300 flex items-center justify-between">
                  <span className="text-slate-400">Código:</span>
                  <span className="text-emerald-400 font-bold">{p.codigoIdentificador || p.codigoHash}</span>
                </div>

                {p.latitude && p.longitude ? (
                  <div className="p-2 bg-slate-850 rounded-xl text-[11px] text-slate-300 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-400" /> GPS:
                    </span>
                    <span className="font-mono text-slate-200">
                      {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                    </span>
                  </div>
                ) : (
                  <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" /> Sem GPS gravado no cadastro
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- ABA 3: HISTÓRICO DE RONDAS ---------------- */}
      {tab === 'historico' && (
        <div className="space-y-2">
          {historicoDoCondominio.length === 0 ? (
            <p className="p-8 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              Nenhuma ronda concluída registrada neste condomínio ainda.
            </p>
          ) : (
            historicoDoCondominio.map((h) => (
              <div
                key={h.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-mono text-emerald-400 font-bold">{h.codigoRonda}</span>
                  <p className="text-white font-medium text-xs mt-0.5">
                    {h.operadorNome} • {h.dataHoraInicio} às {h.dataHoraFim || '...'} ({h.turno || 'Turno'})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pontos lidos: <strong>{h.pontosLidos} de {h.totalPontos}</strong>
                  </p>
                  {h.anomalias.length > 0 && (
                    <p className="text-rose-400 font-semibold mt-1">⚠️ {h.anomalias.join('; ')}</p>
                  )}
                </div>
                <span
                  className={`font-bold px-3 py-1 rounded-xl text-xs self-start sm:self-auto ${
                    h.status === 'Concluída 100% OK'
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {h.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CHECKLIST E CONFIRMAÇÃO DO PONTO LIDO                            */}
      {/* ========================================================================= */}
      {pontoEmValidacao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-emerald-400 font-bold">{pontoEmValidacao.codigo}</span>
                <h2 className="text-sm sm:text-base font-bold text-white">{pontoEmValidacao.nome}</h2>
              </div>
              <button
                onClick={() => {
                  setPontoEmValidacao(null);
                  setLeituraCodigoAtual(null);
                  setLeituraGpsAtual(null);
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ETAPA 1: STATUS DA LEITURA DO QR CODE / NFC */}
            <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  {pontoEmValidacao.tipoValidacao === 'QR Code' ? <QrCode className="w-4 h-4 text-emerald-400" /> : <Radio className="w-4 h-4 text-blue-400" />}
                  Leitura Física Obrigatória:
                </span>
                {leituraCodigoAtual ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                    LIDO ✓
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/40">
                    PENDENTE
                  </span>
                )}
              </div>

              {leituraCodigoAtual ? (
                <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 font-mono flex items-center justify-between">
                  <span>Código Lido: {leituraCodigoAtual}</span>
                  <Check className="w-4 h-4 text-emerald-400" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {pontoEmValidacao.tipoValidacao === 'QR Code' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('ponto_especifico');
                        setScannerModalOpen(true);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow"
                    >
                      <Camera className="w-4 h-4" /> Abrir Câmera para Ler QR Code
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalNfcManual(true)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow"
                    >
                      <Radio className="w-4 h-4" /> Aproximar Tag NFC
                    </button>
                  )}
                </div>
              )}

              {erroCodigoBloqueio && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-lg text-xs text-rose-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{erroCodigoBloqueio}</span>
                </div>
              )}
            </div>

            {/* ETAPA 2: VALIDAÇÃO DE COORDENADAS GPS */}
            <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-400" /> Validação de GPS:
                </span>
                {validandoGps ? (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Verificando satélites...
                  </span>
                ) : leituraGpsAtual && !erroGpsBloqueio ? (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                    GPS VALIDADO ✓
                  </span>
                ) : erroGpsBloqueio ? (
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40">
                    BLOQUEADO
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Aguardando leitura do ponto</span>
                )}
              </div>

              {leituraGpsAtual && !erroGpsBloqueio && (
                <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center justify-between">
                    <span>Posição Confirmada no Local</span>
                    <span className="font-mono text-[11px]">{leituraGpsAtual.dist}m de distância</span>
                  </p>
                  <p className="font-mono text-[10px] text-emerald-400/80">
                    Lat: {leituraGpsAtual.lat.toFixed(5)}, Long: {leituraGpsAtual.lng.toFixed(5)}
                  </p>
                </div>
              )}

              {erroGpsBloqueio && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-500/50 rounded-lg text-xs text-rose-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{erroGpsBloqueio}</span>
                </div>
              )}
            </div>

            {/* ETAPA 3: MICRO-CHECKLIST DE VERIFICAÇÃO */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">Conferência Física do Ponto:</p>
              {pontoEmValidacao.perguntas.map((pergunta, i) => {
                const resp = checklistRespostas[pergunta];
                return (
                  <div
                    key={i}
                    className="p-3 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between text-xs gap-2"
                  >
                    <span className="text-white font-medium">{pergunta}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setChecklistRespostas({ ...checklistRespostas, [pergunta]: true })}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                          resp === true ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        SIM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setChecklistRespostas({ ...checklistRespostas, [pergunta]: false });
                          setFotoModalOpen(true);
                        }}
                        className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                          resp === false ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        NÃO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPontoEmValidacao(null);
                  setLeituraCodigoAtual(null);
                  setLeituraGpsAtual(null);
                }}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!leituraCodigoAtual || Boolean(erroGpsBloqueio)}
                onClick={handleConfirmarPontoNaRonda}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
              >
                Confirmar e Gravar Ponto Lido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENTRADA NFC MANUAL / APROXIMAÇÃO */}
      {modalNfcManual && pontoEmValidacao && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" /> Leitura da Tag NFC
              </h3>
              <button onClick={() => setModalNfcManual(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-xl text-center space-y-2">
              <Radio className="w-8 h-8 text-blue-400 mx-auto animate-pulse" />
              <p className="text-xs font-semibold text-slate-200">
                Aproxime a Tag NFC ou digite o UID da Tag:
              </p>
              <input
                type="text"
                autoFocus
                placeholder="Ex: TAG-NFC-001"
                value={nfcInputManual}
                onChange={(e) => setNfcInputManual(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white text-center font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (nfcInputManual.trim()) {
                  processarValidacaoCodigoPonto(nfcInputManual.trim(), pontoEmValidacao);
                  setModalNfcManual(false);
                  setNfcInputManual('');
                }
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow"
            >
              Validar Tag NFC
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL NOVO PONTO COM CAPTURA DE COORDENADAS GPS NO LOCAL                  */}
      {/* ========================================================================= */}
      {modalNovoPonto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" /> Cadastrar Checkpoint de Ronda
              </h3>
              <button onClick={() => setModalNovoPonto(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovoPonto} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Ponto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Portão da Garagem Subsolo 02"
                  value={novoNomePonto}
                  onChange={(e) => setNovoNomePonto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tipo de Validação *</label>
                  <select
                    value={novoTipoValidacao}
                    onChange={(e) => setNovoTipoValidacao(e.target.value as 'QR Code' | 'NFC')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="QR Code">QR Code</option>
                    <option value="NFC">Tag NFC / RFID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código Identificador *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder={novoTipoValidacao === 'QR Code' ? 'Ex: QR-COND-PNT1' : 'Ex: TAG-NFC-001'}
                      value={novoCodigoIdentificador}
                      onChange={(e) => setNovoCodigoIdentificador(e.target.value)}
                      className="w-full px-3 py-2 pr-9 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 font-bold"
                    />
                    {novoTipoValidacao === 'QR Code' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget('cadastro');
                          setScannerModalOpen(true);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-slate-700/60 rounded-lg transition-colors"
                        title="Escanear QR Code com a Câmera"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLerNfcCadastro}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-blue-400 hover:text-blue-300 hover:bg-slate-700/60 rounded-lg transition-colors"
                        title="Ler Código da Tag NFC"
                      >
                        <Radio className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* BOTÃO EM DESTAQUE CONFORME SOLICITADO NO PRINT */}
                  {novoTipoValidacao === 'QR Code' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('cadastro');
                        setScannerModalOpen(true);
                      }}
                      className="mt-1.5 w-full py-2 px-2.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>[ BOTÃO: ESCANEAR O QR CODE ]</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLerNfcCadastro}
                      disabled={lendoNfcCadastro}
                      className="mt-1.5 w-full py-2 px-2.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>{lendoNfcCadastro ? 'Aproximando Tag...' : '[ BOTÃO: LER CÓDIGO TAG NFC ]'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* CAPTURA OBRIGATÓRIA DE GPS NO LOCAL */}
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
                <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" /> Coordenadas GPS do Ponto Físico
                </label>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Para evitar fraudes e validar se a ronda ocorre realmente no local, capture a posição GPS no ponto exato onde a placa ou tag foi afixada:
                </p>

                {novoPontoLat && novoPontoLng ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs font-mono text-emerald-300 flex items-center justify-between">
                      <span>
                        Lat: {novoPontoLat.toFixed(5)}, Long: {novoPontoLng.toFixed(5)} ({novoPontoPrecisao}m)
                      </span>
                      <button
                        type="button"
                        onClick={handleCapturarGpsCadastro}
                        className="text-[10px] text-emerald-400 underline font-bold"
                      >
                        Recapturar
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Raio de Tolerância Permitido:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          min={15}
                          max={150}
                          value={novoRaioTolerancia}
                          onChange={(e) => setNovoRaioTolerancia(Number(e.target.value))}
                          className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-center text-white font-bold"
                        />
                        <span className="text-[11px] text-slate-400">metros</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCapturarGpsCadastro}
                    disabled={capturandoGpsCadastro}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow"
                  >
                    {capturandoGpsCadastro ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Capturando satélites GPS...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Capturar Localização GPS Atual no Local
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Micro-Checklist do Ponto */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Perguntas de Inspeção do Ponto</label>
                <div className="space-y-1.5 mb-2 max-h-24 overflow-y-auto">
                  {perguntasPonto.map((perg, i) => (
                    <div key={i} className="flex items-center justify-between p-1.5 bg-slate-800 rounded-lg text-xs text-white">
                      <span>• {perg}</span>
                      <button
                        type="button"
                        onClick={() => setPerguntasPonto(perguntasPonto.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Adicionar pergunta (ex: Câmera sem avaria?)"
                    value={novaPergunta}
                    onChange={(e) => setNovaPergunta(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (novaPergunta.trim()) {
                        setPerguntasPonto([...perguntasPonto, novaPergunta.trim()]);
                        setNovaPergunta('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-750 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalNovoPonto(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow"
                >
                  Salvar Checkpoint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCANNER DE CÂMERA (HTML5 QRCODE) */}
      <BarcodeScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        title={
          scannerTarget === 'cadastro'
            ? 'Ler Código para Cadastro do Ponto'
            : `Escanear QR Code: ${pontoEmValidacao?.nome || 'Ponto da Ronda'}`
        }
        onScan={handleScanComplete}
      />

      {/* MODAL DE FOTO DE ANOMALIA */}
      <PhotoCaptureModal
        isOpen={fotoModalOpen}
        onClose={() => setFotoModalOpen(false)}
        folder="ronda"
        title="Foto da Anomalia do Ponto de Ronda"
        subtitle="Fotografe a avaria ou irregularidade identificada na vistoria"
        onCapture={(url) => {
          setAnomaliaFotoUrl(url);
        }}
      />

      {/* MODAL VISUALIZADOR DE FOTO */}
      <PhotoViewerModal
        isOpen={Boolean(fotoVisualizarUrl)}
        onClose={() => setFotoVisualizarUrl(null)}
        photoUrl={fotoVisualizarUrl || ''}
        title={fotoVisualizarTitulo}
      />
    </div>
  );
};
