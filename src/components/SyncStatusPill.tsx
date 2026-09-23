import React, { useState, useRef, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  WifiOff, 
  HardDrive, 
  Check, 
  ArrowUpRight,
  Database
} from 'lucide-react';

export type SyncState = 'synced' | 'syncing' | 'saved_locally' | 'offline';

interface SyncStatusPillProps {
  syncState: SyncState;
  pendingCount?: number;
  lastSyncTime?: Date | null;
  onForceSync?: () => Promise<void> | void;
  isDark?: boolean;
}

export const SyncStatusPill: React.FC<SyncStatusPillProps> = ({
  syncState,
  pendingCount = 0,
  lastSyncTime = null,
  onForceSync,
  isDark = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getPillConfig = () => {
    switch (syncState) {
      case 'syncing':
        return {
          icon: <RefreshCw size={13} className="animate-spin text-blue-500" />,
          label: pendingCount > 1 ? `Sincronizando (${pendingCount})...` : 'Sincronizando...',
          badgeClass: isDark 
            ? 'bg-blue-950/40 border-blue-500/30 text-blue-400' 
            : 'bg-blue-50 border-blue-200 text-blue-700',
          dotColor: 'bg-blue-500 animate-pulse'
        };
      case 'saved_locally':
        return {
          icon: <HardDrive size={13} className="text-cyan-500" />,
          label: pendingCount > 0 ? `Salvo localmente (${pendingCount})` : 'Salvo no dispositivo',
          badgeClass: isDark 
            ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' 
            : 'bg-cyan-50 border-cyan-200 text-cyan-800',
          dotColor: 'bg-cyan-500'
        };
      case 'offline':
        return {
          icon: <WifiOff size={13} className="text-amber-500" />,
          label: 'Modo Offline',
          badgeClass: isDark 
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse' 
            : 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse',
          dotColor: 'bg-amber-500'
        };
      case 'synced':
      default:
        return {
          icon: <CloudCheck size={13} className="text-emerald-500" />,
          label: 'Sincronizado',
          badgeClass: isDark 
            ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-700',
          dotColor: 'bg-emerald-500'
        };
    }
  };

  const config = getPillConfig();

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Agora';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Clickable Pill in Navbar */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer select-none shadow-sm ${config.badgeClass}`}
        title="Status da Sincronização em Segundo Plano (Clique para detalhes)"
      >
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <span className="shrink-0">{config.icon}</span>
        <span className="hidden sm:inline">{config.label}</span>
      </button>

      {/* Discrete Dropdown Panel */}
      {isOpen && (
        <div 
          className={`absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl border p-4 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-150 ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-white shadow-slate-950/80' 
              : 'bg-white border-gray-200 text-gray-900 shadow-gray-200/80'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Cloud size={16} className="text-blue-500" />
              <span className="text-xs font-black uppercase tracking-wider">
                Sincronização em Segundo Plano
              </span>
            </div>
            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
          </div>

          <div className="py-3 space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Estado da Nuvem:</span>
              <span className="font-bold flex items-center gap-1">
                {syncState === 'synced' && <Check size={14} className="text-emerald-500" />}
                {syncState === 'syncing' && 'Sincronizando...'}
                {syncState === 'saved_locally' && 'Preservado Local'}
                {syncState === 'offline' && 'Offline'}
                {syncState === 'synced' && 'Atualizado'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Fila de Envio:</span>
              <span className="font-bold">
                {pendingCount > 0 ? `${pendingCount} laudos pendentes` : 'Tudo em dia (0)'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Último Envio:</span>
              <span className="font-mono text-[11px] font-semibold">
                {formatLastSync(lastSyncTime)}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-[11px] leading-relaxed text-slate-500">
              <p className="flex items-start gap-1.5">
                <Database size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  O CSM:ARGOS salva cada vistoria no <strong>IndexedDB local</strong> instantaneamente e envia para o Firestore de forma transparente, sem travar a tela.
                </span>
              </p>
            </div>
          </div>

          {onForceSync && (
            <button
              type="button"
              onClick={async () => {
                await onForceSync();
                setIsOpen(false);
              }}
              disabled={syncState === 'syncing'}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncState === 'syncing' ? 'animate-spin' : ''} />
              <span>{syncState === 'syncing' ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
              <ArrowUpRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
