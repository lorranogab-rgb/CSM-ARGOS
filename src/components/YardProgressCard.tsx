import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  TrendingUp,
  Camera
} from 'lucide-react';

export type YardProgressFilter = 'ALL' | 'PENDING' | 'INSPECTED' | 'IMPEDIMENTS';

export interface YardProgressCardProps {
  yardName?: string;
  yardAddress?: string;
  total?: number;
  totalVehicles?: number;
  inspected?: number;
  inspectedCount?: number;
  pendingCount?: number;
  impediments?: number;
  impedimentsCount?: number;
  filterStatus?: YardProgressFilter;
  activeFilter?: string;
  onFilterChange?: (status: YardProgressFilter) => void;
  onScanClick?: () => void;
  isDark?: boolean;
}

export const YardProgressCard: React.FC<YardProgressCardProps> = ({
  yardName,
  yardAddress,
  total,
  totalVehicles,
  inspected,
  inspectedCount,
  pendingCount,
  impediments,
  impedimentsCount,
  filterStatus,
  activeFilter,
  onFilterChange,
  onScanClick,
  isDark = false
}) => {
  const finalTotal = totalVehicles ?? total ?? 0;
  const finalInspected = inspectedCount ?? inspected ?? 0;
  const finalImpediments = impedimentsCount ?? impediments ?? 0;
  const finalPending = pendingCount ?? Math.max(0, finalTotal - finalInspected - finalImpediments);
  const currentFilter: YardProgressFilter = (activeFilter as YardProgressFilter) || filterStatus || 'ALL';
  const percent = finalTotal > 0 ? Math.round((finalInspected / finalTotal) * 100) : 0;
  const isComplete = finalTotal > 0 && finalInspected >= finalTotal;

  return (
    <div 
      className={`rounded-3xl border p-5 sm:p-6 transition-all duration-300 shadow-xl relative overflow-hidden ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800 text-white shadow-slate-950/50' 
          : 'bg-white border-blue-100/80 text-gray-900 shadow-blue-900/5'
      }`}
    >
      {/* Background ambient glow */}
      <div 
        className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isComplete ? 'bg-emerald-500' : 'bg-blue-500'
        }`} 
      />

      <div className="relative z-10 space-y-4">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div 
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isComplete 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30' 
                  : 'bg-blue-600 text-white shadow-blue-600/30'
              }`}
            >
              <MapPin size={22} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight uppercase leading-tight">
                  {yardName || 'Progresso Geral dos Pátios'}
                </h3>
                {isComplete && (
                  <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    100% Concluído
                  </span>
                )}
              </div>
              <p className={`text-xs truncate max-w-md ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {yardAddress || 'Acompanhamento em tempo real da meta pericial da frota'}
              </p>
            </div>
          </div>

          {/* Action and Percentage badge */}
          <div className="flex items-center space-x-3 self-start sm:self-auto">
            {onScanClick && (
              <button
                type="button"
                onClick={onScanClick}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
                title="Abrir Leitor de Placa, Chassi e QR Code via Câmera"
              >
                <Camera size={15} />
                <span className="hidden sm:inline">Scanner</span>
              </button>
            )}
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black tracking-tight">
                {percent}%
              </span>
              <span className={`block text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                Evolução
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className={`h-3 w-full rounded-full overflow-hidden p-0.5 border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-gray-100 border-gray-200'
          }`}>
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 shadow-sm shadow-blue-500/50'
              }`}
              style={{ width: `${Math.min(100, Math.max(percent, finalTotal > 0 ? 3 : 0))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider px-1">
            <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
              {finalInspected} de {finalTotal} vistoriados
            </span>
            <span className={isDark ? 'text-slate-500' : 'text-gray-400'}>
              {finalPending} restantes
            </span>
          </div>
        </div>

        {/* Breakdown Metric Tiles with optional Interactive Filter */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {/* Vistoriados */}
          <button
            type="button"
            onClick={() => onFilterChange?.(currentFilter === 'INSPECTED' ? 'ALL' : 'INSPECTED')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 ${
              currentFilter === 'INSPECTED'
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : isDark 
                  ? 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300' 
                  : 'bg-gray-50/80 border-gray-200/70 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Concluídos
              </span>
            </div>
            <p className="text-xl font-black">{finalInspected}</p>
            <p className="text-[10px] font-semibold opacity-70">
              {percent}% do pátio
            </p>
          </button>

          {/* Pendentes */}
          <button
            type="button"
            onClick={() => onFilterChange?.(currentFilter === 'PENDING' ? 'ALL' : 'PENDING')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 ${
              currentFilter === 'PENDING'
                ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                : isDark 
                  ? 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 text-slate-300' 
                  : 'bg-gray-50/80 border-gray-200/70 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">
                <Clock size={12} />
                Pendentes
              </span>
            </div>
            <p className="text-xl font-black">{finalPending}</p>
            <p className="text-[10px] font-semibold opacity-70">
              Faltam avaliar
            </p>
          </button>

          {/* Bloqueios / Impedimentos */}
          <button
            type="button"
            onClick={() => onFilterChange?.(currentFilter === 'IMPEDIMENTS' ? 'ALL' : 'IMPEDIMENTS')}
            className={`p-3 rounded-2xl border text-left transition-all duration-200 ${
              currentFilter === 'IMPEDIMENTS'
                ? 'bg-red-500/15 border-red-500 text-red-600 dark:text-red-400 shadow-sm'
                : finalImpediments > 0
                  ? isDark ? 'bg-red-950/20 border-red-900/50 text-red-400' : 'bg-red-50/80 border-red-200 text-red-700'
                  : isDark ? 'bg-slate-950/50 border-slate-800/80 text-slate-400' : 'bg-gray-50/80 border-gray-200/70 text-gray-500'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${
                finalImpediments > 0 ? 'text-red-500' : 'text-slate-400'
              }`}>
                <AlertTriangle size={12} />
                Impedimentos
              </span>
            </div>
            <p className="text-xl font-black">{finalImpediments}</p>
            <p className="text-[10px] font-semibold opacity-70">
              {finalImpediments > 0 ? 'Atenção pericial' : 'Nenhum bloqueio'}
            </p>
          </button>
        </div>

        {/* Active filter helper tag */}
        {currentFilter !== 'ALL' && onFilterChange && (
          <div className="flex items-center justify-between text-xs px-1 pt-1">
            <span className="text-[11px] font-bold text-blue-500 flex items-center gap-1.5">
              <TrendingUp size={13} />
              Filtrando veículos: <strong>{currentFilter === 'PENDING' ? 'Apenas Pendentes' : currentFilter === 'INSPECTED' ? 'Apenas Vistoriados' : 'Apenas Impedidos'}</strong>
            </span>
            <button
              onClick={() => onFilterChange('ALL')}
              className="text-[10px] font-black uppercase underline hover:text-blue-600 transition-colors cursor-pointer"
            >
              Mostrar Todos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

