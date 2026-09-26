/**
 * Web Audio API synthesizer - $0 cost, client-side, zero MP3 downloads.
 * Emits alert beeps for grouping of packages, urgent notifications, and patrol timers.
 */
class AudioAlertService {
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        try {
          if (!this.audioCtx) {
            this.getContext();
          } else if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
        } catch (e) {
          console.warn('Audio unlock warning:', e);
        }
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Alerta sonoro de agrupamento de pacotes (bip duplo de alta atenção)
   */
  playGroupingAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Primeiro tom
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // Nota Lá (A5)
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // Segundo tom (mais agudo para despertar atenção)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174, now + 0.2); // Nota Ré (D6)
      gain2.gain.setValueAtTime(0.35, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.4);
    } catch (err) {
      console.warn('Erro ao emitir agrupamento sonoro:', err);
    }
  }

  /**
   * Bip sutil de sucesso / leitura de código
   */
  playSuccessBeep() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987, now); // B5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (err) {
      console.warn('Erro ao emitir sucesso sonoro:', err);
    }
  }

  /**
   * Alerta de chave atrasada ou emergência
   */
  playWarningAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch (err) {
      console.warn('Erro ao emitir aviso sonoro:', err);
    }
  }

  /**
   * Alerta sonoro de Timer de Ronda (sirene/tríade de atenção patrimonial)
   * Disparado quando a ronda periódica atinge o horário ou está atrasada
   */
  playRondaTimerAlert() {
    // Vibração tátil no celular caso disponível
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch (e) {
        // Ignora caso restrito por política do browser
      }
    }

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Sequência de bips de atenção patrimonial (dois bips agudos e um acorde final)
      const freqs = [950, 1250, 950, 1250, 1500];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.14;
        const stopTime = startTime + 0.11;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, stopTime);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(stopTime);
      });
    } catch (err) {
      console.warn('Erro ao emitir alerta sonoro de ronda:', err);
    }
  }
}

export const audioAlert = new AudioAlertService();
