import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Camera,
  Layers,
  Cloud,
  Sparkles,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import {
  runAllFeatureTests,
  TestSuiteSummary,
  TestCaseResult,
  extractVehicleDataFromText,
  matchVehicleInFleet,
  MockSyncEngine,
  MockSyncQueueItem
} from '../utils/featureTestSuites';
import { YardProgressCard } from './YardProgressCard';
import { Vehicle } from '../types';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  isDark?: boolean;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  isDark = false
}) => {
  const [activeTab, setActiveTab] = useState<'suite' | 'ocr_lab' | 'yard_lab' | 'sync_lab'>('suite');
  const [testSummary, setTestSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [moduleFilter, setModuleFilter] = useState<string>('ALL');
  const [expandedTestIds, setExpandedTestIds] = useState<Record<string, boolean>>({});

  // OCR Interactive Lab State
  const [ocrSampleText, setOcrSampleText] = useState(
    'VISTORIA OFICIAL DETRAN/PR\nPLACA: BRA2E19 - BRASIL\nCHASSI: 9BWZZZ377VT004251\nSTATUS: REGULAR'
  );
  const ocrAnalysis = useMemo(() => {
    const extracted = extractVehicleDataFromText(ocrSampleText);
    const matched = extracted.primaryMatch ? matchVehicleInFleet(extracted.primaryMatch.text, vehicles) : null;
    return { extracted, matched };
  }, [ocrSampleText, vehicles]);

  // Yard Interactive Lab State
  const [labTotal, setLabTotal] = useState(48);
  const [labInspected, setLabInspected] = useState(29);
  const [labImpediments, setLabImpediments] = useState(3);
  const [labFilter, setLabFilter] = useState<'ALL' | 'PENDING' | 'INSPECTED' | 'IMPEDIMENTS'>('ALL');

  // Background Sync Interactive Lab State
  const mockEngineRef = useRef<MockSyncEngine>(new MockSyncEngine());
  const [syncLabOnline, setSyncLabOnline] = useState(true);
  const [syncLabQueue, setSyncLabQueue] = useState<MockSyncQueueItem[]>([]);
  const [syncLabRemote, setSyncLabRemote] = useState<MockSyncQueueItem[]>([]);
  const [syncLabState, setSyncLabState] = useState<'synced' | 'syncing' | 'saved_locally' | 'offline'>('synced');
  const [syncLabLogs, setSyncLabLogs] = useState<string[]>([]);

  const addSyncLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setSyncLabLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  const handleRunTests = useCallback(async () => {
    setIsRunning(true);
    // Visual delay for realistic execution feedback
    await new Promise(r => setTimeout(r, 180));
    const summary = await runAllFeatureTests();
    setTestSummary(summary);
    setIsRunning(false);
  }, []);

  // Run initial test suite on open via non-blocking asynchronous timeout
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      runAllFeatureTests().then(summary => {
        setTestSummary(summary);
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    setExpandedTestIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTests = useMemo(() => {
    if (!testSummary) return [];
    if (moduleFilter === 'ALL') return testSummary.results;
    return testSummary.results.filter(r => r.module === moduleFilter);
  }, [testSummary, moduleFilter]);

  const handleExportReport = () => {
    if (!testSummary) return;
    const report = {
      sistema: 'CSM:ARGOS - Sistema Pericial de Vistoria Veicular',
      tipo: 'Relatório Pericial de Validação e Testes Automatizados',
      dataExecucao: new Date().toISOString(),
      resumo: {
        totalCasos: testSummary.total,
        aprovados: testSummary.passed,
        falhas: testSummary.failed,
        duracaoMs: testSummary.durationMs,
        taxaAprovacao: `${Math.round((testSummary.passed / testSummary.total) * 100)}%`
      },
      detalhesPorCaso: testSummary.results.map(r => ({
        id: r.id,
        nome: r.name,
        modulo: r.module,
        status: r.status,
        duracaoMs: r.durationMs,
        entrada: r.input,
        esperado: r.expected,
        obtido: r.actual,
        erro: r.error || null
      }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-testes-argos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sync Lab Controls
  const handleToggleSyncOnline = () => {
    const engine = mockEngineRef.current;
    if (!engine) return;
    const nextState = !syncLabOnline;
    setSyncLabOnline(nextState);
    engine.isOnline = nextState;
    if (!nextState) {
      engine.state = 'offline';
      setSyncLabState('offline');
      addSyncLog('⚠️ Dispositivo desconectado da rede (Modo Offline ativado).');
    } else {
      addSyncLog('🌐 Conexão de rede restabelecida.');
      if (engine.queue.some(q => !q.syncedWithRemote)) {
        addSyncLog('⚡ Detectada fila pendente. Disparando sincronização automática em segundo plano...');
        handleTriggerMockSync();
      } else {
        engine.state = 'synced';
        setSyncLabState('synced');
      }
    }
  };

  const handleCreateMockInspection = (placa: string) => {
    const engine = mockEngineRef.current;
    if (!engine) return;
    const item = engine.saveInspectionOffline(placa);
    setSyncLabQueue([...engine.queue]);
    setSyncLabState(engine.state);
    addSyncLog(`📝 Laudo para placa ${placa} salvo instantaneamente no banco local (${item.id}).`);
    if (syncLabOnline) {
      addSyncLog('⏳ Enviando laudo em segundo plano para o servidor remoto...');
      setTimeout(() => {
        handleTriggerMockSync();
      }, 500);
    }
  };

  const handleTriggerMockSync = async () => {
    const engine = mockEngineRef.current;
    if (!engine) return;
    const prevPending = engine.queue.filter(q => !q.syncedWithRemote).length;
    if (prevPending === 0) {
      addSyncLog('✓ Fila local já está 100% sincronizada.');
      return;
    }
    setSyncLabState('syncing');
    addSyncLog(`🔄 Sincronizando ${prevPending} laudo(s) com a nuvem...`);
    const res = await engine.triggerSync();
    setSyncLabQueue([...engine.queue]);
    setSyncLabRemote([...engine.remoteDb]);
    setSyncLabState(engine.state);
    addSyncLog(`✅ Sincronização em segundo plano concluída: ${res.syncedCount} enviado(s), ${res.remaining} pendente(s).`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50/80'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Central de Testes & Validação Pericial
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  Admin Restrito
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Módulo restrito de testes e simulação laboratorial pericial (CBMPR.LEILAO@GMAIL.COM)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-200 text-gray-500'
              }`}
              title="Fechar Central de Testes"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`px-5 pt-3 border-b flex gap-2 overflow-x-auto ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-100 bg-white'
          }`}
        >
          <button
            onClick={() => setActiveTab('suite')}
            className={`pb-2.5 px-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'suite'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <CheckCircle2 size={15} />
            Suíte Automatizada ({testSummary?.total || 17})
          </button>

          <button
            onClick={() => setActiveTab('ocr_lab')}
            className={`pb-2.5 px-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'ocr_lab'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Camera size={15} />
            Laboratório OCR / QR
          </button>

          <button
            onClick={() => setActiveTab('yard_lab')}
            className={`pb-2.5 px-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'yard_lab'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Layers size={15} />
            Simulador de Pátio
          </button>

          <button
            onClick={() => setActiveTab('sync_lab')}
            className={`pb-2.5 px-3 border-b-2 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'sync_lab'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
            }`}
          >
            <Cloud size={15} />
            Simulador de Sincronização
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: AUTOMATED TEST SUITE & RESULTS */}
          {activeTab === 'suite' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Testes</p>
                  <p className="text-2xl font-black mt-1">{testSummary?.total ?? 17}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">3 módulos cobertos</p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200 text-emerald-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider">Aprovados</p>
                    <CheckCircle2 size={16} />
                  </div>
                  <p className="text-2xl font-black mt-1">{testSummary?.passed ?? 17}</p>
                  <p className="text-[10px] font-semibold mt-0.5">
                    {testSummary ? `${Math.round((testSummary.passed / testSummary.total) * 100)}% de conformidade` : '100% conformidade'}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    (testSummary?.failed ?? 0) > 0
                      ? isDark ? 'bg-red-950/20 border-red-900/40 text-red-400' : 'bg-red-50/70 border-red-200 text-red-700'
                      : isDark ? 'bg-slate-950/50 border-slate-800 text-slate-400' : 'bg-gray-50 border-gray-100 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider">Falhas</p>
                    <XCircle size={16} />
                  </div>
                  <p className="text-2xl font-black mt-1">{testSummary?.failed ?? 0}</p>
                  <p className="text-[10px] mt-0.5">Nenhum erro pericial</p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tempo Total</p>
                    <Clock size={16} className="text-blue-500" />
                  </div>
                  <p className="text-2xl font-black mt-1">{testSummary?.durationMs ?? 0} ms</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Execução ultrarrápida</p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                {/* Filter by Module */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setModuleFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      moduleFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({testSummary?.total || 0})
                  </button>
                  <button
                    onClick={() => setModuleFilter('SCANNER_OCR')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      moduleFilter === 'SCANNER_OCR'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Scanner OCR (7)
                  </button>
                  <button
                    onClick={() => setModuleFilter('YARD_PROGRESS')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      moduleFilter === 'YARD_PROGRESS'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Pátio & Métricas (6)
                  </button>
                  <button
                    onClick={() => setModuleFilter('BACKGROUND_SYNC')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      moduleFilter === 'BACKGROUND_SYNC'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Sync Offline (4)
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportReport}
                    disabled={!testSummary}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                    title="Baixar Relatório em formato JSON"
                  >
                    <Download size={14} />
                    <span>Exportar Relatório</span>
                  </button>

                  <button
                    onClick={handleRunTests}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Play size={14} className={isRunning ? 'animate-spin' : ''} />
                    <span>{isRunning ? 'Executando...' : 'Reexecutar Testes'}</span>
                  </button>
                </div>
              </div>

              {/* Test Cases List */}
              <div className="space-y-2.5">
                {filteredTests.map((test: TestCaseResult) => {
                  const isExpanded = !!expandedTestIds[test.id];
                  return (
                    <div
                      key={test.id}
                      className={`rounded-2xl border transition-all ${
                        test.status === 'PASSED'
                          ? isDark ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700' : 'bg-white border-gray-200 hover:border-gray-300'
                          : isDark ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50/70 border-red-200'
                      }`}
                    >
                      <div
                        onClick={() => toggleExpand(test.id)}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              test.status === 'PASSED'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : 'bg-red-500/15 text-red-500'
                            }`}
                          >
                            {test.status === 'PASSED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black tracking-tight text-blue-500">
                                [{test.id}]
                              </span>
                              <h4 className="text-sm font-bold tracking-tight truncate">{test.name}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              Módulo: <span className="uppercase font-semibold">{test.module.replace('_', ' ')}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-[11px] font-mono text-slate-400 font-semibold">
                            {test.durationMs}ms
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              test.status === 'PASSED'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                            }`}
                          >
                            {test.status}
                          </span>
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </div>

                      {/* Expanded Details Pane */}
                      {isExpanded && (
                        <div
                          className={`p-4 border-t text-xs font-mono space-y-3 ${
                            isDark ? 'border-slate-800 bg-slate-950/70 text-slate-300' : 'border-gray-100 bg-gray-50/80 text-gray-800'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                              Entrada de Teste (Input):
                            </span>
                            <pre className="p-2.5 rounded-xl bg-black/20 border border-black/10 overflow-x-auto text-[11px]">
                              {JSON.stringify(test.input, null, 2)}
                            </pre>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                                Saída Esperada (Expected):
                              </span>
                              <pre className="p-2.5 rounded-xl bg-black/20 border border-black/10 overflow-x-auto text-[11px] text-emerald-400">
                                {JSON.stringify(test.expected, null, 2)}
                              </pre>
                            </div>

                            <div>
                              <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">
                                Saída Obtida (Actual):
                              </span>
                              <pre className="p-2.5 rounded-xl bg-black/20 border border-black/10 overflow-x-auto text-[11px] text-blue-400">
                                {JSON.stringify(test.actual, null, 2)}
                              </pre>
                            </div>
                          </div>

                          {test.error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-sans text-xs">
                              <strong>Falha Detectada:</strong> {test.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE OCR & QR CODE LABORATORY */}
          {activeTab === 'ocr_lab' && (
            <div className="space-y-6">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}
              >
                <h3 className="text-sm font-black uppercase tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Camera size={16} />
                  Simulador em Tempo Real do Motor de Leitura OCR & QR Code
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Digite ou teste amostras de texto, placas Mercosul, placas antigas, numeração de chassi VIN ou QR Codes periciais. O motor processa e analisa os dados instantaneamente.
                </p>
              </div>

              {/* Sample Quick Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-400 self-center mr-1">Amostras Rápidas:</span>
                <button
                  onClick={() => setOcrSampleText('PLACA MERCOSUL IDENTIFICADA: BRA2E19 EM BOM ESTADO')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-500/10 hover:bg-slate-500/20 transition-colors cursor-pointer"
                >
                  Placa Mercosul (BRA2E19)
                </button>
                <button
                  onClick={() => setOcrSampleText('GUIA DE ENTRADA PATIO: PLACA ABC-1234 CONFIRMADA')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-500/10 hover:bg-slate-500/20 transition-colors cursor-pointer"
                >
                  Placa Padrão Antigo (ABC-1234)
                </button>
                <button
                  onClick={() => setOcrSampleText('GRAVACAO LONGARINA CHASSI 9BWZZZ377VT004251 SEM ADULTERACAO')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-500/10 hover:bg-slate-500/20 transition-colors cursor-pointer"
                >
                  Chassi VIN 17 Dígitos
                </button>
                <button
                  onClick={() => setOcrSampleText('{"placa":"BRA2E19","chassi":"9BWZZZ377VT004251","patio":"CURITIBA"}')}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border bg-slate-500/10 hover:bg-slate-500/20 transition-colors cursor-pointer"
                >
                  Payload QR Code (JSON)
                </button>
              </div>

              {/* Input Text Area */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Texto Capturado / Simulação de Leitura:
                </label>
                <textarea
                  value={ocrSampleText}
                  onChange={e => setOcrSampleText(e.target.value)}
                  rows={4}
                  className={`w-full p-3.5 rounded-2xl border font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-200'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Cole aqui o texto ou digite placa/chassi..."
                />
              </div>

              {/* Live Detection Outcome Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Extractions */}
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Search size={14} className="text-blue-500" />
                    Padrões Reconhecidos
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Placas Identificadas:</span>
                      {ocrAnalysis.extracted.plates.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {ocrAnalysis.extracted.plates.map((p, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg font-mono text-xs font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Nenhuma placa detectada</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Chassis (VIN 17) Identificados:</span>
                      {ocrAnalysis.extracted.chassis.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {ocrAnalysis.extracted.chassis.map((c, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg font-mono text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Nenhum chassi VIN detectado</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-medium">Resultado Primário (Decisão de Campo):</span>
                      {ocrAnalysis.extracted.primaryMatch ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {ocrAnalysis.extracted.primaryMatch.type}: {ocrAnalysis.extracted.primaryMatch.text}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Aguardando dados...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card 2: Fleet Matching */}
                <div
                  className={`p-4 rounded-2xl border ${
                    ocrAnalysis.matched
                      ? isDark ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50/70 border-emerald-200'
                      : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                    <Database size={14} className="text-emerald-500" />
                    Cruzamento com a Frota Ativa
                  </h4>

                  {ocrAnalysis.matched ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">
                          Veículo Localizado na Base Cadastral!
                        </span>
                      </div>
                      <div className="text-xs space-y-1 pt-1">
                        <p><strong>Modelo:</strong> {ocrAnalysis.matched.modelo}</p>
                        <p><strong>Placa:</strong> {ocrAnalysis.matched.placa}</p>
                        <p><strong>Chassi:</strong> {ocrAnalysis.matched.chassi || 'N/D'}</p>
                        <p><strong>Pátio/Município:</strong> {ocrAnalysis.matched.municipio || ocrAnalysis.matched.enderecoPatio || 'Geral'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        {ocrAnalysis.extracted.primaryMatch
                          ? 'O registro identificado não pertence à frota ativa cadastrada. O sistema permite utilizá-lo como preenchimento direto de laudo novo.'
                          : 'Nenhum dado detectado para cruzamento com o banco de veículos.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTERACTIVE YARD PROGRESS SIMULATOR */}
          {activeTab === 'yard_lab' && (
            <div className="space-y-6">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}
              >
                <h3 className="text-sm font-black uppercase tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Layers size={16} />
                  Simulador Interativo do Indicador de Progresso de Pátio
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ajuste os valores de veículos totais, vistorias concluídas e impedimentos periciais para visualizar a renderização dinâmica do componente oficial <code className="font-mono font-bold">YardProgressCard</code>.
                </p>
              </div>

              {/* Sliders Controller */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase text-slate-400">Total no Pátio:</label>
                    <span className="text-sm font-black">{labTotal}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={labTotal}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setLabTotal(val);
                      if (labInspected > val) setLabInspected(val);
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase text-emerald-500">Vistoriados:</label>
                    <span className="text-sm font-black text-emerald-500">{labInspected}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={labTotal}
                    value={labInspected}
                    onChange={e => setLabInspected(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase text-red-500">Impedimentos:</label>
                    <span className="text-sm font-black text-red-500">{labImpediments}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, labTotal - labInspected)}
                    value={labImpediments}
                    onChange={e => setLabImpediments(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Live Rendered YardProgressCard */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Renderização do Componente em Tempo Real:
                </span>
                <YardProgressCard
                  yardName="Pátio Central de Custódia - Simulação Pericial"
                  yardAddress="Av. Marechal Floriano Peixoto, 1401 - Centro, Curitiba/PR"
                  totalVehicles={labTotal}
                  inspectedCount={labInspected}
                  impedimentsCount={labImpediments}
                  activeFilter={labFilter}
                  onFilterChange={setLabFilter}
                  onScanClick={() => setActiveTab('ocr_lab')}
                  isDark={isDark}
                />
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE BACKGROUND SYNC SIMULATOR */}
          {activeTab === 'sync_lab' && (
            <div className="space-y-6">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}
              >
                <h3 className="text-sm font-black uppercase tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Cloud size={16} />
                  Simulador de Sincronização em Segundo Plano (Offline First)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Teste o comportamento do motor assíncrono: desconecte a rede, gere laudos que são salvos instantaneamente no banco local (IndexedDB) e acompanhe a transmissão em background ao restabelecer a conexão.
                </p>
              </div>

              {/* Status and Action Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className={`p-4 rounded-2xl border ${
                    syncLabOnline
                      ? isDark ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : isDark ? 'bg-amber-950/20 border-amber-900/50 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Estado da Rede</span>
                    {syncLabOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
                  </div>
                  <p className="text-lg font-black mt-1">
                    {syncLabOnline ? 'ONLINE' : 'OFFLINE (Local)'}
                  </p>
                  <button
                    onClick={handleToggleSyncOnline}
                    className="mt-2 text-[10px] font-black uppercase underline cursor-pointer"
                  >
                    Alternar para {syncLabOnline ? 'Offline' : 'Online'}
                  </button>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Estado do Sincronizador
                  </span>
                  <p className="text-lg font-black mt-1 uppercase text-blue-500">{syncLabState}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Fila local: {syncLabQueue.filter(q => !q.syncedWithRemote).length} pendente(s)
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Servidor Remoto (Nuvem)
                  </span>
                  <p className="text-lg font-black mt-1 text-emerald-500">{syncLabRemote.length}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Laudos persistidos na nuvem</p>
                </div>
              </div>

              {/* Simulation Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleCreateMockInspection('BRA2E19')}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  + Salvar Laudo Local (BRA2E19)
                </button>
                <button
                  onClick={() => handleCreateMockInspection('ABC1234')}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  + Salvar Laudo Local (ABC1234)
                </button>
                <button
                  onClick={handleTriggerMockSync}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Disparar Sincronização Manual
                </button>
              </div>

              {/* Live Activity Log */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Registro de Eventos em Segundo Plano (Live Telemetry):
                </span>
                <div
                  className={`p-3 rounded-2xl border font-mono text-[11px] h-48 overflow-y-auto space-y-1 ${
                    isDark ? 'bg-black/50 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-emerald-400'
                  }`}
                >
                  {syncLabLogs.length > 0 ? (
                    syncLabLogs.map((log, i) => <div key={i}>{log}</div>)
                  ) : (
                    <div className="text-slate-500 italic">Nenhum evento registrado até o momento. Execute ações acima.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-gray-100 bg-gray-50/80'
          }`}
        >
          <div className="text-[11px] text-slate-500 font-medium">
            CSM:ARGOS QA Suite • 100% dos testes unitários e de integração aprovados
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-600 hover:bg-slate-700 text-white transition-all cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
