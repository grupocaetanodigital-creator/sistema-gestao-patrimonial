import React, { useState, useRef } from 'react';
import { Mic, Square, Play, RefreshCw, Check, X, Volume2 } from 'lucide-react';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (audioUrl: string) => void;
  title?: string;
}

export const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Gravar Evidência de Áudio'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const startRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          setRecordedBlobUrl(audioUrl);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setSeconds(0);
        timerRef.current = window.setInterval(() => {
          setSeconds((prev) => {
            if (prev >= 30) {
              stopRecording();
              return 30;
            }
            return prev + 1;
          });
        }, 1000);
      } else {
        simulateRecording();
      }
    } catch {
      simulateRecording();
    }
  };

  const simulateRecording = () => {
    setIsRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev >= 6) {
          stopRecording();
          return 6;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Audio simulado
      setRecordedBlobUrl('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    }
  };

  const handleConfirm = () => {
    if (recordedBlobUrl) {
      onConfirm(recordedBlobUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="flex flex-col items-center justify-center">
            {isRecording ? (
              <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-pulse">
                <Mic className="w-10 h-10 text-red-500 animate-bounce" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <Mic className="w-9 h-9" />
              </div>
            )}
            <div className="mt-3">
              <span className="font-mono text-2xl font-black text-white">
                00:{seconds < 10 ? `0${seconds}` : seconds}
              </span>
              <p className="text-xs text-slate-400 mt-1">Limite: 30 segundos</p>
            </div>
          </div>

          {isRecording ? (
            <button
              onClick={stopRecording}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/40"
            >
              <Square className="w-4 h-4 fill-white" /> Parar Gravação
            </button>
          ) : recordedBlobUrl ? (
            <div className="space-y-3">
              <audio src={recordedBlobUrl} controls className="w-full rounded-lg" />
              <div className="flex items-center gap-2">
                <button
                  onClick={startRecording}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Gravar Novamente
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Check className="w-4 h-4" /> Salvar Áudio
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
            >
              <Play className="w-4 h-4 fill-white" /> Iniciar Gravação
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
