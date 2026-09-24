/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { 
  FolderSearch, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  X, 
  DownloadCloud, 
  FileText, 
  LogIn, 
  Search,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { 
  extractFolderId, 
  listDriveFolderFiles, 
  fetchDriveFileContent, 
  crossReferenceDriveFilesWithFleet, 
  DriveCrossReferenceSummary 
} from '../lib/googleDriveService';
import { getCachedAccessToken, setCachedAccessToken, auth, googleDriveProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Vehicle } from '../types';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  frota: Vehicle[];
  isDark: boolean;
  onImportInspections?: (inspections: any[]) => void;
  defaultFolderUrl?: string;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  frota,
  isDark,
  onImportInspections,
  defaultFolderUrl = 'https://drive.google.com/drive/folders/1iNigBHUvt5JS1t1gDgHY1GPhj3AT7fCA?usp=sharing'
}) => {
  const [folderUrl, setFolderUrl] = useState(defaultFolderUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<DriveCrossReferenceSummary | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [manualTokenRefreshed, setManualTokenRefreshed] = useState(0);

  const hasToken = !!getCachedAccessToken() || manualTokenRefreshed > 0;

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleDriveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setCachedAccessToken(credential.accessToken);
        setManualTokenRefreshed(prev => prev + 1);
        // Auto-executa a leitura
        await executeDriveInspection(credential.accessToken);
      } else {
        throw new Error('Não foi possível obter o token de acesso do Google Drive.');
      }
    } catch (err: any) {
      const errorCode = err?.code || '';
      const errorMessage = err?.message || '';
      const errorStr = String(err);
      if (errorCode === 'auth/popup-closed-by-user' || 
          errorCode === 'auth/cancelled-popup-request' ||
          errorMessage.includes('auth/popup-closed-by-user') ||
          errorMessage.includes('auth/cancelled-popup-request') ||
          errorStr.includes('auth/popup-closed-by-user') ||
          errorStr.includes('auth/cancelled-popup-request')) {
        return;
      }
      console.warn('Aviso de autenticação Google Drive:', err);
      if (errorCode === 'auth/popup-blocked') {
        setError('O pop-up de autorização foi bloqueado pelo navegador. Por favor, habilite pop-ups para esta página.');
      } else {
        setError(err.message || 'Falha na autenticação do Google Drive.');
      }
    } finally {
      setLoading(false);
    }
  };

  const executeDriveInspection = async (token?: string) => {
    const accessToken = token || getCachedAccessToken();
    if (!accessToken) {
      setError('Por favor, autorize o acesso com sua Conta Google para ler os arquivos do Google Drive.');
      return;
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      setError('Por favor, informe uma URL ou ID de pasta válido do Google Drive.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. List files in the Drive folder
      const files = await listDriveFolderFiles(folderId, accessToken);
      
      if (files.length === 0) {
        setError('Nenhum arquivo encontrado na pasta especificada.');
        setReport(null);
        setLoading(false);
        return;
      }

      // 2. Parse JSON files content if present
      for (const file of files) {
        if (file.mimeType === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
          try {
            const content = await fetchDriveFileContent(file.id, accessToken);
            file.parsedData = content;
          } catch (e) {
            console.warn(`Não foi possível ler o conteúdo do arquivo ${file.name}:`, e);
          }
        }
      }

      // 3. Cross-reference with the fleet of 52 vehicles
      const summary = crossReferenceDriveFilesWithFleet(files, frota);
      setReport(summary);
    } catch (err: any) {
      console.error('Erro ao ler pasta do Google Drive:', err);
      if (err.message?.includes('401') || err.message?.includes('403')) {
        setCachedAccessToken(null);
        setManualTokenRefreshed(0);
        setError('Sessão expirada ou sem permissão na pasta. Clique em "Autorizar Acesso ao Google Drive".');
      } else {
        setError(err.message || 'Erro ao processar pasta do Google Drive.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImportMatched = () => {
    if (!report || !onImportInspections) return;
    const validInspections = report.results
      .filter(r => r.status === 'CORRESPONDENCIA_ENCONTRADA' && r.file.parsedData)
      .map(r => r.file.parsedData);
    
    if (validInspections.length > 0) {
      onImportInspections(validInspections);
      onClose();
    }
  };

  const filteredResults = report?.results.filter(item => {
    if (filterTab === 'matched' && item.status !== 'CORRESPONDENCIA_ENCONTRADA') return false;
    if (filterTab === 'unmatched' && item.status === 'CORRESPONDENCIA_ENCONTRADA') return false;
    
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fileName = item.file.name.toLowerCase();
    const placa = item.matchedVehicle?.placa?.toLowerCase() || '';
    const modelo = item.matchedVehicle?.modelo?.toLowerCase() || '';
    const chassi = item.matchedVehicle?.chassi?.toLowerCase() || '';
    return fileName.includes(term) || placa.includes(term) || modelo.includes(term) || chassi.includes(term);
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <FolderSearch size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center space-x-2">
                <span>Leitor e Validador de Laudos no Google Drive</span>
                <span className="text-[10px] uppercase font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-md">
                  ARGOS Sync
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Identificação automática e cruzamento com a base de veículos a avaliar ({frota.length} veículos)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'}`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search & URL Input Box */}
        <div className="p-6 space-y-4 border-b border-slate-200/40 dark:border-slate-800/60">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input 
                type="text"
                value={folderUrl}
                onChange={(e) => setFolderUrl(e.target.value)}
                placeholder="Link da pasta do Google Drive (https://drive.google.com/drive/folders/...)"
                className={`w-full px-4 py-3 rounded-xl border text-xs font-mono transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
            {!hasToken ? (
              <button
                onClick={handleGoogleAuth}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer shrink-0 active:scale-95"
              >
                <LogIn size={16} />
                <span>{loading ? 'Conectando...' : 'Autorizar com Google'}</span>
              </button>
            ) : (
              <button
                onClick={() => executeDriveInspection()}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer shrink-0 active:scale-95"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Lendo Pasta...' : 'Ler e Cruzar Laudos'}</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start space-x-3">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Aviso de Leitura:</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Report Summary Cards */}
        {report && (
          <div className={`px-6 py-4 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'}`}>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total no Drive</div>
              <div className="text-xl font-black mt-1 text-blue-500">{report.totalFiles}</div>
              <div className="text-[10px] text-slate-500">arquivos na pasta</div>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Constam na Base</div>
              <div className="text-xl font-black mt-1 text-emerald-500">{report.matchedCount}</div>
              <div className="text-[10px] text-slate-500">veículos identificados</div>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Não Mapeados</div>
              <div className="text-xl font-black mt-1 text-amber-500">{report.unmatchedCount}</div>
              <div className="text-[10px] text-slate-500">fora da base / anexos</div>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Base Pendente</div>
              <div className="text-xl font-black mt-1 text-slate-300">{report.uninspectedFleetCount}</div>
              <div className="text-[10px] text-slate-500">veículos sem laudo</div>
            </div>
          </div>
        )}

        {/* Results Filters & Search */}
        {report && (
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/40 dark:border-slate-800/60">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'all' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos ({report.results.length})
              </button>
              <button
                onClick={() => setFilterTab('matched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'matched' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Constam na Frota ({report.matchedCount})
              </button>
              <button
                onClick={() => setFilterTab('unmatched')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterTab === 'unmatched' 
                    ? 'bg-amber-600 text-white shadow-sm' 
                    : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Não Localizados ({report.unmatchedCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por placa, chassi..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {!report && !loading && (
            <div className="py-16 text-center space-y-3">
              <Building2 size={48} className="mx-auto text-slate-400/40" />
              <div className="text-sm font-bold text-slate-400">Nenhuma verificação executada</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Clique em &quot;Ler e Cruzar Laudos&quot; para analisar todos os laudos gerados na pasta do Google Drive e identificar quais correspondem aos 52 veículos a avaliar.
              </p>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-4">
              <RefreshCw size={36} className="mx-auto text-blue-500 animate-spin" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Acessando Google Drive e cruzando com o banco de veículos...
              </p>
            </div>
          )}

          {report && filteredResults.length === 0 && !loading && (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum resultado encontrado para o filtro selecionado.
            </div>
          )}

          {report && filteredResults.map((item, idx) => {
            const isMatched = item.status === 'CORRESPONDENCIA_ENCONTRADA';
            return (
              <div 
                key={item.file.id || idx}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isMatched 
                    ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
                    : isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isMatched 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {isMatched ? <CheckCircle2 size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold truncate">{item.file.name}</span>
                      {item.matchKey && (
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Match: {item.matchKey}
                        </span>
                      )}
                    </div>
                    {isMatched && item.matchedVehicle ? (
                      <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Placa: <strong className="font-mono">{item.matchedVehicle.placa}</strong></span>
                        <span>Modelo: {item.matchedVehicle.modelo}</span>
                        {item.matchedVehicle.chassi && <span>Chassi: <span className="font-mono">{item.matchedVehicle.chassi}</span></span>}
                        {item.matchedVehicle.municipio && <span>Pátio: {item.matchedVehicle.municipio}</span>}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {item.file.webViewLink && (
                    <a
                      href={item.file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded-lg border text-xs flex items-center space-x-1.5 transition-colors ${
                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                      }`}
                      title="Abrir no Google Drive"
                    >
                      <ExternalLink size={14} />
                      <span className="hidden sm:inline text-[10px] font-bold">Ver no Drive</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <ShieldCheck size={16} className="text-blue-500" />
            <span>Validação Pericial em conformidade com o Decreto Estadual e Item J</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Fechar
            </button>
            {report && report.matchedCount > 0 && onImportInspections && (
              <button
                onClick={handleImportMatched}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <DownloadCloud size={16} />
                <span>Importar Laudos Validados</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
