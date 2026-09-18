import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { 
  Camera, 
  Upload, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Search, 
  FileText, 
  Flashlight, 
  QrCode, 
  ScanLine,
  AlertCircle
} from 'lucide-react';
import { Vehicle } from '../types';

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles?: Vehicle[];
  inspectedPlacas?: string[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
  onSelectText?: (text: string, type: 'placa' | 'chassi' | 'qr') => void;
  onDetected?: (result: { text: string; type: 'PLATE' | 'CHASSIS' | 'QR' }) => void;
  isDark?: boolean;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  vehicles = [],
  inspectedPlacas = [],
  onSelectVehicle,
  onSelectText,
  onDetected,
  isDark = false
}) => {
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [scanStatusMessage, setScanStatusMessage] = useState<string>('Aponte para a placa, chassi ou QR Code');
  
  // Results
  const [detectedText, setDetectedText] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<'placa' | 'chassi' | 'qr' | null>(null);
  const [matchedVehicle, setMatchedVehicle] = useState<Vehicle | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      setScanStatusMessage('Iniciando câmera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setScanStatusMessage('Câmera ativa. Enquadre a placa, chassi ou QR Code.');
    } catch (err) {
      console.warn('Erro ao acessar câmera:', err);
      setScanStatusMessage('Não foi possível acessar a câmera. Você pode enviar uma foto.');
      setMode('file');
    }
  }, [facingMode, stopCamera]);

  // Handle detection analysis against vehicles list
  const analyzeDetection = useCallback((raw: string, typeHint?: 'placa' | 'chassi' | 'qr') => {
    const cleaned = raw.toUpperCase().trim();
    
    // 1. Try Brazilian Plate pattern: AAA-0000 or AAA0A00 (Mercosul)
    const plateMatch = cleaned.match(/[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}/);
    // 2. Try Chassi pattern: 17 alphanumeric chars
    const chassiMatch = cleaned.match(/[A-HJ-NPR-Z0-9]{17}/);

    let type: 'placa' | 'chassi' | 'qr' = typeHint || 'qr';
    let target = cleaned;

    if (plateMatch) {
      target = plateMatch[0].replace('-', '');
      // Format as standard AAA-0000 / AAA0A00
      if (target.length === 7) {
        target = `${target.slice(0, 3)}-${target.slice(3)}`;
      }
      type = 'placa';
    } else if (chassiMatch) {
      target = chassiMatch[0];
      type = 'chassi';
    }

    setDetectedText(target);
    setDetectedType(type);

    // Search match in vehicles
    const normalizedTarget = target.replace(/[^A-Z0-9]/g, '');
    const found = vehicles.find(v => {
      const vPlate = (v.placa || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
      const vChassi = (v.chassi || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
      return vPlate === normalizedTarget || vChassi === normalizedTarget || (v.id && cleaned.includes(v.id));
    });

    if (found) {
      setMatchedVehicle(found);
      setScanStatusMessage(`Veículo identificado: ${found.placa} - ${found.modelo}`);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else {
      setMatchedVehicle(null);
      setScanStatusMessage(`Texto identificado: ${target}`);
      if (navigator.vibrate) navigator.vibrate(100);
    }
  }, [vehicles]);

  // Live QR Code scanning loop
  const scanQRCodeLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    scanQRCodeLoopRef.current = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        animFrameIdRef.current = requestAnimationFrame(() => scanQRCodeLoopRef.current());
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          // QR Code detected!
          analyzeDetection(code.data, 'qr');
          return;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(() => scanQRCodeLoopRef.current());
    };
  }, [analyzeDetection]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const capabilities = (track.getCapabilities?.() || {}) as { torch?: boolean };
        if (capabilities.torch) {
          const nextState = !torchOn;
          const trackWithConstraints = track as MediaStreamTrack & {
            applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
          };
          if (trackWithConstraints.applyConstraints) {
            await trackWithConstraints.applyConstraints({
              advanced: [{ torch: nextState } as MediaTrackConstraintSet]
            });
          }
          setTorchOn(nextState);
        } else {
          setScanStatusMessage('Lanterna não suportada neste dispositivo.');
        }
      } catch (e) {
        console.warn('Torch error:', e);
      }
    }
  };

  // Switch between front and rear camera
  const switchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Perform OCR on current frame or captured image
  const captureAndRunOCR = async (imageSrc?: string) => {
    setIsScanningOCR(true);
    setOcrProgress(10);
    setScanStatusMessage('Preparando leitor óptico (OCR)...');

    try {
      let dataUrl = imageSrc;
      if (!dataUrl && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          setCapturedImage(dataUrl);
        }
      }

      if (!dataUrl) {
        throw new Error('Nenhuma imagem disponível para leitura');
      }

      setScanStatusMessage('Processando caracteres com Tesseract OCR...');
      const worker = await createWorker('por');
      setOcrProgress(40);
      
      // Configure whitelist for faster alphanumeric recognition
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- '
      });
      setOcrProgress(60);

      const ret = await worker.recognize(dataUrl);
      setOcrProgress(90);
      await worker.terminate();

      const text = ret.data.text || '';
      setOcrProgress(100);

      if (text.trim().length > 0) {
        analyzeDetection(text);
      } else {
        setScanStatusMessage('Nenhum texto alfanumérico nítido reconhecido. Aproxime mais e mantenha estável.');
      }
    } catch (e: unknown) {
      console.warn('OCR error:', e);
      const errMsg = e instanceof Error ? e.message : 'Falha no leitor óptico';
      setScanStatusMessage(`Erro no OCR: ${errMsg}`);
    } finally {
      setIsScanningOCR(false);
    }
  };

  // Handle uploaded photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (src) {
        setCapturedImage(src);
        setScanStatusMessage('Foto carregada. Analisando...');
        
        // Also check QR on image
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, c.width, c.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height);
            if (qr && qr.data) {
              analyzeDetection(qr.data, 'qr');
              return;
            }
          }
          // If no QR, run OCR
          captureAndRunOCR(src);
        };
        img.src = src;
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset to scan again
  const handleReset = useCallback(() => {
    setDetectedText(null);
    setDetectedType(null);
    setMatchedVehicle(null);
    setCapturedImage(null);
    setScanStatusMessage('Aponte para a placa, chassi ou QR Code');
    if (mode === 'camera') {
      startCamera();
    }
  }, [mode, startCamera]);

  // Manage open/close lifecycle
  useEffect(() => {
    let active = true;
    if (isOpen) {
      if (mode === 'camera') {
        const timer = setTimeout(() => {
          if (active) startCamera();
        }, 50);
        return () => {
          active = false;
          clearTimeout(timer);
          stopCamera();
        };
      }
    } else {
      stopCamera();
      const timer = setTimeout(() => {
        if (active) handleReset();
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera, handleReset]);

  // Start QR loop when video starts playing
  useEffect(() => {
    if (isOpen && mode === 'camera' && !detectedText) {
      animFrameIdRef.current = requestAnimationFrame(() => scanQRCodeLoopRef.current());
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isOpen, mode, detectedText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-xl rounded-3xl border overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-5 flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
              <QrCode size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Leitor Automático de Veículo
              </h2>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                OCR Embarcado &bull; Placa, Chassi e QR Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className={`flex border-b px-4 py-2 gap-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-gray-100 bg-gray-50'}`}>
          <button
            onClick={() => { setMode('camera'); setCapturedImage(null); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              mode === 'camera'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera size={15} />
            <span>Câmera ao Vivo</span>
          </button>
          <button
            onClick={() => { setMode('file'); stopCamera(); fileInputRef.current?.click(); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
              mode === 'file'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload size={15} />
            <span>Carregar Foto</span>
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {mode === 'camera' ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center shadow-inner">
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder Reticle & Scanline */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="w-full max-w-[320px] aspect-[16/9] border-2 border-dashed border-blue-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  {/* Corner marks */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                  {/* Animated laser scan line */}
                  <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_10px_#60a5fa] animate-bounce duration-1000" />

                  <div className="absolute -bottom-8 inset-x-0 text-center">
                    <span className="bg-black/75 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                      Enquadre a Placa, Chassi ou QR
                    </span>
                  </div>
                </div>
              </div>

              {/* Camera Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <button
                  onClick={toggleTorch}
                  className={`p-2.5 rounded-full backdrop-blur-md transition-all ${
                    torchOn ? 'bg-amber-400 text-slate-950 shadow-lg' : 'bg-black/50 text-white hover:bg-black/70'
                  }`}
                  title="Alternar Lanterna"
                >
                  <Flashlight size={18} />
                </button>
                <button
                  onClick={switchCamera}
                  className="p-2.5 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-all"
                  title="Inverter Câmera (Frontal/Traseira)"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              {capturedImage ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-slate-700">
                  <img src={capturedImage} alt="Foto para leitura" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDark ? 'border-slate-700 hover:border-blue-500 bg-slate-800/40' : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                  }`}
                >
                  <Upload size={36} className="mx-auto text-blue-500 mb-3 animate-pulse" />
                  <p className="text-sm font-bold">Toque para selecionar uma foto</p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Fotografe a placa, decalque do chassi ou etiqueta de QR Code
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Buttons for OCR */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => captureAndRunOCR()}
              disabled={isScanningOCR}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 ${
                isScanningOCR
                  ? 'bg-blue-400 text-white cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
              }`}
            >
              <ScanLine size={18} className={isScanningOCR ? 'animate-spin' : ''} />
              <span>{isScanningOCR ? `Lendo Caracteres (${ocrProgress}%)...` : 'Capturar & Ler OCR'}</span>
            </button>

            {detectedText && (
              <button
                onClick={handleReset}
                className={`py-3 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Escanear Novamente
              </button>
            )}
          </div>

          {/* Status banner */}
          <div className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            isDark ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' : 'bg-blue-50/70 border-blue-100 text-blue-900'
          }`}>
            <AlertCircle size={16} className="text-blue-500 shrink-0" />
            <span className="truncate">{scanStatusMessage}</span>
          </div>

          {/* Detection Match Result Card */}
          {detectedText && (
            <div 
              className={`p-4 rounded-2xl border transition-all animate-in zoom-in-95 duration-200 ${
                matchedVehicle
                  ? isDark ? 'bg-emerald-950/30 border-emerald-800/80' : 'bg-emerald-50 border-emerald-200'
                  : isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 size={18} className={matchedVehicle ? 'text-emerald-500' : 'text-blue-500'} />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                      {detectedType === 'placa' ? 'Placa Reconhecida' : detectedType === 'chassi' ? 'Chassi Reconhecido' : 'Código Lido'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black tracking-tight mt-0.5">{detectedText}</h3>
                </div>

                {matchedVehicle && (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    inspectedPlacas.includes(matchedVehicle.placa)
                      ? 'bg-blue-500 text-white'
                      : 'bg-amber-500 text-slate-950'
                  }`}>
                    {inspectedPlacas.includes(matchedVehicle.placa) ? 'Já Vistoriado' : 'Vistoria Pendente'}
                  </span>
                )}
              </div>

              {matchedVehicle ? (
                <div className="space-y-2 mb-4 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Modelo</p>
                      <p className="font-black truncate">{matchedVehicle.modelo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Pátio / Local</p>
                      <p className="font-black truncate">{matchedVehicle.municipio || 'Não Informado'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Ano / Combustível</p>
                      <p className="font-semibold">{matchedVehicle.ano} &bull; {matchedVehicle.comb || 'FLEX'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500">Chassi</p>
                      <p className="font-mono text-[11px] truncate">{matchedVehicle.chassi}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    {onSelectVehicle && (
                      <button
                        onClick={() => {
                          if (onDetected && detectedText) {
                            onDetected({ 
                              text: detectedText, 
                              type: detectedType === 'placa' ? 'PLATE' : detectedType === 'chassi' ? 'CHASSIS' : 'QR' 
                            });
                          }
                          onSelectVehicle(matchedVehicle);
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                      >
                        <FileText size={16} />
                        <span>{inspectedPlacas.includes(matchedVehicle.placa) ? 'Visualizar / Editar Laudo' : 'Iniciar Vistoria Deste Veículo'}</span>
                      </button>
                    )}
                    {onDetected && !onSelectVehicle && (
                      <button
                        onClick={() => {
                          if (detectedText) {
                            onDetected({ 
                              text: detectedText, 
                              type: detectedType === 'placa' ? 'PLATE' : detectedType === 'chassi' ? 'CHASSIS' : 'QR' 
                            });
                          }
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>Aplicar Dados do Veículo</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Este registro não foi encontrado na frota ativa cadastrada. Você pode utilizá-lo como busca ou preenchimento direto.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {onDetected && (
                      <button
                        onClick={() => {
                          if (detectedText) {
                            onDetected({ 
                              text: detectedText, 
                              type: detectedType === 'placa' ? 'PLATE' : detectedType === 'chassi' ? 'CHASSIS' : 'QR' 
                            });
                          }
                          if (onSelectText && detectedText) {
                            onSelectText(detectedText, detectedType || 'placa');
                          }
                          onClose();
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 size={16} />
                        <span>Aplicar Leitura &quot;{detectedText}&quot;</span>
                      </button>
                    )}
                    {onSelectText && !onDetected && (
                      <button
                        onClick={() => {
                          onSelectText(detectedText, detectedType || 'placa');
                          onClose();
                        }}
                        className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <Search size={16} />
                        <span>Filtrar ou Aplicar &quot;{detectedText}&quot;</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
