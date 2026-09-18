import { Vehicle } from '../types';

export interface TestCaseResult {
  id: string;
  name: string;
  module: 'SCANNER_OCR' | 'YARD_PROGRESS' | 'BACKGROUND_SYNC';
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs: number;
  input: unknown;
  expected: unknown;
  actual: unknown;
  error?: string;
  details?: string;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestCaseResult[];
}

// -------------------------------------------------------------
// MODULE 1: OCR & QR CODE EXTRACTION HELPERS & LOGIC
// -------------------------------------------------------------
export const OCR_REGEX = {
  MERCOSUL: /[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/g,
  STANDARD: /[A-Z]{3}-?[0-9]{4}/g,
  CHASSIS: /[A-HJ-NPR-Z0-9]{17}/g,
};

export interface QrPayloadData {
  placa?: string;
  chassi?: string;
  [key: string]: unknown;
}

export function extractVehicleDataFromText(rawText: string): {
  plates: string[];
  chassis: string[];
  qrPayload?: QrPayloadData | null;
  primaryMatch?: { text: string; type: 'PLATE' | 'CHASSIS' | 'QR' };
} {
  const cleanUpper = rawText.toUpperCase().replace(/[\r\n\t]+/g, ' ').trim();
  const plates: string[] = [];
  const chassis: string[] = [];

  // 1. Check for QR payload formatted as JSON or query string
  let qrPayload: QrPayloadData | null = null;
  if (cleanUpper.startsWith('{') && cleanUpper.endsWith('}')) {
    try {
      qrPayload = JSON.parse(rawText) as QrPayloadData;
    } catch {
      // not valid json
    }
  }

  // 2. Extract Mercosul plates
  const mercosulMatches = cleanUpper.match(OCR_REGEX.MERCOSUL) || [];
  for (const m of mercosulMatches) {
    if (!plates.includes(m)) plates.push(m);
  }

  // 3. Extract Standard plates (normalize by removing hyphens)
  const standardMatches = cleanUpper.match(OCR_REGEX.STANDARD) || [];
  for (const s of standardMatches) {
    const norm = s.replace('-', '');
    if (!plates.includes(norm)) plates.push(norm);
  }

  // 4. Extract Chassis VIN (17 chars)
  const chassisMatches = cleanUpper.match(OCR_REGEX.CHASSIS) || [];
  for (const c of chassisMatches) {
    if (!chassis.includes(c)) chassis.push(c);
  }

  let primaryMatch: { text: string; type: 'PLATE' | 'CHASSIS' | 'QR' } | undefined;
  if (qrPayload) {
    primaryMatch = {
      text: qrPayload.placa || qrPayload.chassi || rawText,
      type: 'QR'
    };
  } else if (plates.length > 0) {
    primaryMatch = { text: plates[0], type: 'PLATE' };
  } else if (chassis.length > 0) {
    primaryMatch = { text: chassis[0], type: 'CHASSIS' };
  }

  return { plates, chassis, qrPayload, primaryMatch };
}

export function matchVehicleInFleet(identifier: string, fleet: Vehicle[]): Vehicle | null {
  const clean = identifier.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (!clean) return null;

  return fleet.find(v => {
    const vPlaca = (v.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const vChassi = (v.chassi || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return vPlaca === clean || vChassi === clean;
  }) || null;
}

// -------------------------------------------------------------
// MODULE 2: YARD PROGRESS CALCULATOR
// -------------------------------------------------------------
export interface YardStats {
  total: number;
  inspected: number;
  pending: number;
  impediments: number;
  percent: number;
  isComplete: boolean;
}

export function computeYardProgress(
  totalVehicles: number,
  inspectedCount: number,
  impedimentsCount = 0
): YardStats {
  const total = Math.max(0, totalVehicles);
  const inspected = Math.min(total, Math.max(0, inspectedCount));
  const impediments = Math.max(0, impedimentsCount);
  const pending = Math.max(0, total - inspected - impediments);
  const percent = total > 0 ? Math.round((inspected / total) * 100) : 0;
  const isComplete = total > 0 && inspected >= total;

  return {
    total,
    inspected,
    pending,
    impediments,
    percent,
    isComplete
  };
}

export function filterFleetByYardStatus(
  vehicles: Vehicle[],
  inspectedPlacas: string[],
  impedimentPlacas: string[],
  filter: 'ALL' | 'PENDING' | 'INSPECTED' | 'IMPEDIMENTS'
): Vehicle[] {
  if (filter === 'ALL') return vehicles;
  if (filter === 'INSPECTED') {
    return vehicles.filter(v => inspectedPlacas.includes(v.placa));
  }
  if (filter === 'IMPEDIMENTS') {
    return vehicles.filter(v => impedimentPlacas.includes(v.placa));
  }
  if (filter === 'PENDING') {
    return vehicles.filter(v => !inspectedPlacas.includes(v.placa) && !impedimentPlacas.includes(v.placa));
  }
  return vehicles;
}

// -------------------------------------------------------------
// MODULE 3: BACKGROUND SYNC & LOCAL PERSISTENCE SIMULATION
// -------------------------------------------------------------
export interface MockSyncQueueItem {
  id: string;
  vehiclePlaca: string;
  syncedWithRemote: boolean;
  createdAt: string;
}

export class MockSyncEngine {
  public queue: MockSyncQueueItem[] = [];
  public remoteDb: MockSyncQueueItem[] = [];
  public isOnline = true;
  public state: 'synced' | 'syncing' | 'saved_locally' | 'offline' = 'synced';
  public lastSyncTime: Date | null = new Date();

  public saveInspectionOffline(placa: string): MockSyncQueueItem {
    const item: MockSyncQueueItem = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      vehiclePlaca: placa,
      syncedWithRemote: false,
      createdAt: new Date().toISOString()
    };
    this.queue.push(item);
    this.state = this.isOnline ? 'saved_locally' : 'offline';
    return item;
  }

  public async triggerSync(): Promise<{ syncedCount: number; remaining: number }> {
    if (!this.isOnline) {
      this.state = 'offline';
      return { syncedCount: 0, remaining: this.queue.filter(q => !q.syncedWithRemote).length };
    }

    const pending = this.queue.filter(q => !q.syncedWithRemote);
    if (pending.length === 0) {
      this.state = 'synced';
      this.lastSyncTime = new Date();
      return { syncedCount: 0, remaining: 0 };
    }

    this.state = 'syncing';
    // Simulate async sync operation
    await new Promise(res => setTimeout(res, 20));

    for (const item of pending) {
      const remoteRecord = { ...item, syncedWithRemote: true, id: item.id.replace('local-', 'remote-') };
      this.remoteDb.push(remoteRecord);
      item.syncedWithRemote = true;
    }

    this.state = 'synced';
    this.lastSyncTime = new Date();
    return { syncedCount: pending.length, remaining: 0 };
  }
}

// -------------------------------------------------------------
// TEST SUITE DEFINITIONS & RUNNER
// -------------------------------------------------------------
export async function runAllFeatureTests(): Promise<TestSuiteSummary> {
  const results: TestCaseResult[] = [];
  const overallStart = Date.now();

  const sampleFleet: Vehicle[] = [
    { id: 'v1', placa: 'BRA2E19', chassi: '9BWZZZ377VT004251', modelo: 'Toyota Hilux 4x4', motor: '1GD12345', ano: '2022', patrimonio: '001', cor: 'BRANCA', fipe: 210000, municipio: 'CURITIBA', enderecoPatio: 'PÁTIO CENTRAL' },
    { id: 'v2', placa: 'ABC1234', chassi: '8AFZZZ377VT009999', modelo: 'Ford Ranger XLT', motor: '32L99999', ano: '2021', patrimonio: '002', cor: 'PRETA', fipe: 180000, municipio: 'CURITIBA', enderecoPatio: 'PÁTIO CENTRAL' },
    { id: 'v3', placa: 'XYZ9876', chassi: '9BDZZZ377VT008888', modelo: 'Chevrolet S10', motor: '28D88888', ano: '2020', patrimonio: '003', cor: 'PRATA', fipe: 150000, municipio: 'LONDRINA', enderecoPatio: 'PÁTIO NORTE' },
    { id: 'v4', placa: 'KLL5566', chassi: '9BGZZZ377VT007777', modelo: 'Renault Duster', motor: '16M77777', ano: '2019', patrimonio: '004', cor: 'CINZA', fipe: 85000, municipio: 'MARINGÁ', enderecoPatio: 'PÁTIO OESTE' },
  ];

  // Helper to record test
  const record = (
    id: string,
    name: string,
    module: TestCaseResult['module'],
    input: unknown,
    expected: unknown,
    fn: () => unknown
  ) => {
    const t0 = performance.now();
    try {
      const actual = fn();
      const t1 = performance.now();
      const durationMs = Math.round((t1 - t0) * 100) / 100;
      const passed = JSON.stringify(actual) === JSON.stringify(expected);
      results.push({
        id,
        name,
        module,
        status: passed ? 'PASSED' : 'FAILED',
        durationMs,
        input,
        expected,
        actual,
        error: passed ? undefined : `Esperado: ${JSON.stringify(expected)} | Obtido: ${JSON.stringify(actual)}`
      });
    } catch (err: unknown) {
      const t1 = performance.now();
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        id,
        name,
        module,
        status: 'FAILED',
        durationMs: Math.round((t1 - t0) * 100) / 100,
        input,
        expected,
        actual: null,
        error: errorMsg
      });
    }
  };

  // Helper for async test
  const recordAsync = async (
    id: string,
    name: string,
    module: TestCaseResult['module'],
    input: unknown,
    expected: unknown,
    fn: () => Promise<unknown>
  ) => {
    const t0 = performance.now();
    try {
      const actual = await fn();
      const t1 = performance.now();
      const durationMs = Math.round((t1 - t0) * 100) / 100;
      const passed = JSON.stringify(actual) === JSON.stringify(expected);
      results.push({
        id,
        name,
        module,
        status: passed ? 'PASSED' : 'FAILED',
        durationMs,
        input,
        expected,
        actual,
        error: passed ? undefined : `Esperado: ${JSON.stringify(expected)} | Obtido: ${JSON.stringify(actual)}`
      });
    } catch (err: unknown) {
      const t1 = performance.now();
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        id,
        name,
        module,
        status: 'FAILED',
        durationMs: Math.round((t1 - t0) * 100) / 100,
        input,
        expected,
        actual: null,
        error: errorMsg
      });
    }
  };

  // ============================================================
  // MODULE 1: SCANNER OCR & QR CODE TESTS
  // ============================================================
  record(
    'OCR-01',
    'Extração de Placa Padrão Mercosul em Texto Sujo',
    'SCANNER_OCR',
    { text: 'DETRAN-PR VEICULO OFICIAL BRASIL PLACA BRA2E19 EM TRANSITO' },
    { plates: ['BRA2E19'], primaryType: 'PLATE', primaryText: 'BRA2E19' },
    () => {
      const res = extractVehicleDataFromText('DETRAN-PR VEICULO OFICIAL BRASIL PLACA BRA2E19 EM TRANSITO');
      return { plates: res.plates, primaryType: res.primaryMatch?.type, primaryText: res.primaryMatch?.text };
    }
  );

  record(
    'OCR-02',
    'Extração e Normalização de Placa Padrão Antigo com Hífen',
    'SCANNER_OCR',
    { text: 'PLACA DO PATIO: ABC-1234 CONFORME GUIA' },
    { plates: ['ABC1234'], primaryType: 'PLATE', primaryText: 'ABC1234' },
    () => {
      const res = extractVehicleDataFromText('PLACA DO PATIO: ABC-1234 CONFORME GUIA');
      return { plates: res.plates, primaryType: res.primaryMatch?.type, primaryText: res.primaryMatch?.text };
    }
  );

  record(
    'OCR-03',
    'Identificação de Chassi VIN de 17 Caracteres',
    'SCANNER_OCR',
    { text: 'GRAVAÇÃO DO CHASSI DO MOTOR: 9BWZZZ377VT004251 OK' },
    { chassis: ['9BWZZZ377VT004251'], primaryType: 'CHASSIS', primaryText: '9BWZZZ377VT004251' },
    () => {
      const res = extractVehicleDataFromText('GRAVAÇÃO DO CHASSI DO MOTOR: 9BWZZZ377VT004251 OK');
      return { chassis: res.chassis, primaryType: res.primaryMatch?.type, primaryText: res.primaryMatch?.text };
    }
  );

  record(
    'OCR-04',
    'Decodificação de Payload QR Code Estruturado em JSON',
    'SCANNER_OCR',
    { text: '{"placa":"BRA2E19","chassi":"9BWZZZ377VT004251","patio":"CENTRAL"}' },
    { primaryType: 'QR', primaryText: 'BRA2E19', hasPayload: true },
    () => {
      const res = extractVehicleDataFromText('{"placa":"BRA2E19","chassi":"9BWZZZ377VT004251","patio":"CENTRAL"}');
      return { primaryType: res.primaryMatch?.type, primaryText: res.primaryMatch?.text, hasPayload: !!res.qrPayload };
    }
  );

  record(
    'OCR-05',
    'Cruzamento Automático com Base de Veículos da Frota',
    'SCANNER_OCR',
    { searchPlate: 'BRA2E19', fleetCount: sampleFleet.length },
    { matched: true, vehicleId: 'v1', modelo: 'Toyota Hilux 4x4' },
    () => {
      const match = matchVehicleInFleet('BRA2E19', sampleFleet);
      return { matched: !!match, vehicleId: match?.id, modelo: match?.modelo };
    }
  );

  record(
    'OCR-06',
    'Cruzamento por Chassi no Banco de Frota Ativa',
    'SCANNER_OCR',
    { searchChassis: '9BWZZZ377VT004251', fleetCount: sampleFleet.length },
    { matched: true, vehicleId: 'v1', placa: 'BRA2E19' },
    () => {
      const match = matchVehicleInFleet('9BWZZZ377VT004251', sampleFleet);
      return { matched: !!match, vehicleId: match?.id, placa: match?.placa };
    }
  );

  record(
    'OCR-07',
    'Tratamento Seguro de Veículo Não Cadastrado na Frota',
    'SCANNER_OCR',
    { searchPlate: 'ZZZ9999' },
    { matched: false },
    () => {
      const match = matchVehicleInFleet('ZZZ9999', sampleFleet);
      return { matched: !!match };
    }
  );

  // ============================================================
  // MODULE 2: YARD PROGRESS CALCULATOR TESTS
  // ============================================================
  record(
    'YARD-01',
    'Cálculo de Pátio com Vistorias Parciais e Pendências',
    'YARD_PROGRESS',
    { total: 50, inspected: 20, impediments: 5 },
    { total: 50, inspected: 20, pending: 25, impediments: 5, percent: 40, isComplete: false },
    () => {
      return computeYardProgress(50, 20, 5);
    }
  );

  record(
    'YARD-02',
    'Cálculo de Pátio 100% Concluído (Gatilho de Status)',
    'YARD_PROGRESS',
    { total: 30, inspected: 30, impediments: 0 },
    { total: 30, inspected: 30, pending: 0, impediments: 0, percent: 100, isComplete: true },
    () => {
      return computeYardProgress(30, 30, 0);
    }
  );

  record(
    'YARD-03',
    'Resiliência a Pátio Vazio ou Dados Zerados (Divisão por Zero)',
    'YARD_PROGRESS',
    { total: 0, inspected: 0, impediments: 0 },
    { total: 0, inspected: 0, pending: 0, impediments: 0, percent: 0, isComplete: false },
    () => {
      return computeYardProgress(0, 0, 0);
    }
  );

  record(
    'YARD-04',
    'Filtro de Listagem: Apenas Veículos Vistoriados',
    'YARD_PROGRESS',
    { filter: 'INSPECTED', inspectedPlacas: ['BRA2E19'] },
    { count: 1, placas: ['BRA2E19'] },
    () => {
      const filtered = filterFleetByYardStatus(sampleFleet, ['BRA2E19'], [], 'INSPECTED');
      return { count: filtered.length, placas: filtered.map(v => v.placa) };
    }
  );

  record(
    'YARD-05',
    'Filtro de Listagem: Apenas Veículos Pendentes',
    'YARD_PROGRESS',
    { filter: 'PENDING', inspectedPlacas: ['BRA2E19'], impediments: ['ABC1234'] },
    { count: 2, placas: ['XYZ9876', 'KLL5566'] },
    () => {
      const filtered = filterFleetByYardStatus(sampleFleet, ['BRA2E19'], ['ABC1234'], 'PENDING');
      return { count: filtered.length, placas: filtered.map(v => v.placa) };
    }
  );

  record(
    'YARD-06',
    'Filtro de Listagem: Apenas Veículos com Impedimento Pericial',
    'YARD_PROGRESS',
    { filter: 'IMPEDIMENTS', impedimentPlacas: ['ABC1234'] },
    { count: 1, placas: ['ABC1234'] },
    () => {
      const filtered = filterFleetByYardStatus(sampleFleet, ['BRA2E19'], ['ABC1234'], 'IMPEDIMENTS');
      return { count: filtered.length, placas: filtered.map(v => v.placa) };
    }
  );

  // ============================================================
  // MODULE 3: BACKGROUND SYNC & LOCAL PERSISTENCE TESTS
  // ============================================================
  await recordAsync(
    'SYNC-01',
    'Salvamento de Laudo no Modo Offline (IndexedDB Mock)',
    'BACKGROUND_SYNC',
    { placa: 'BRA2E19', networkOnline: false },
    { state: 'offline', queueLength: 1, syncedWithRemote: false },
    async () => {
      const engine = new MockSyncEngine();
      engine.isOnline = false;
      const item = engine.saveInspectionOffline('BRA2E19');
      return {
        state: engine.state,
        queueLength: engine.queue.length,
        syncedWithRemote: item.syncedWithRemote
      };
    }
  );

  await recordAsync(
    'SYNC-02',
    'Tentativa de Sincronização em Background sem Conexão',
    'BACKGROUND_SYNC',
    { attemptSyncWhileOffline: true },
    { syncedCount: 0, remaining: 1, finalState: 'offline' },
    async () => {
      const engine = new MockSyncEngine();
      engine.isOnline = false;
      engine.saveInspectionOffline('BRA2E19');
      const res = await engine.triggerSync();
      return {
        syncedCount: res.syncedCount,
        remaining: res.remaining,
        finalState: engine.state
      };
    }
  );

  await recordAsync(
    'SYNC-03',
    'Transmissão e Descarregamento da Fila ao Reconectar Online',
    'BACKGROUND_SYNC',
    { queueSize: 3, transitionToOnline: true },
    { syncedCount: 3, remaining: 0, finalState: 'synced', remoteDbCount: 3 },
    async () => {
      const engine = new MockSyncEngine();
      engine.isOnline = false;
      engine.saveInspectionOffline('BRA2E19');
      engine.saveInspectionOffline('ABC1234');
      engine.saveInspectionOffline('XYZ9876');

      // Network reconnects
      engine.isOnline = true;
      const res = await engine.triggerSync();

      return {
        syncedCount: res.syncedCount,
        remaining: res.remaining,
        finalState: engine.state,
        remoteDbCount: engine.remoteDb.length
      };
    }
  );

  await recordAsync(
    'SYNC-04',
    'Idempotência do Sincronizador com Fila Vazia',
    'BACKGROUND_SYNC',
    { queueSize: 0, networkOnline: true },
    { syncedCount: 0, remaining: 0, state: 'synced' },
    async () => {
      const engine = new MockSyncEngine();
      engine.isOnline = true;
      const res = await engine.triggerSync();
      return {
        syncedCount: res.syncedCount,
        remaining: res.remaining,
        state: engine.state
      };
    }
  );

  const overallEnd = Date.now();
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  return {
    total: results.length,
    passed,
    failed,
    durationMs: overallEnd - overallStart,
    results
  };
}
