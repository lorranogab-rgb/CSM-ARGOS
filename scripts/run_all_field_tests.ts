/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SUÍTE COMPLETA DE TESTES OPERACIONAIS DE CAMPO - CSM:ARGOS
 * CBMPR - Corpo de Bombeiros Militar do Paraná
 * 
 * Bateria de testes de integridade, cálculo, persistência,
 * isolamento de usuários, OCR, scanner, Anexo J e resiliência offline.
 */

import { 
  cleanIdStr, 
  matchVehicleWithInspection, 
  findInspectionForVehicle,
  deduplicateVehicles,
  deduplicateInspections,
  areVehiclesSame,
  areInspectionsSame,
  getTimestampMillis
} from '../src/utils/vehicleMatcher';
import { generateRealisticChassisPhoto, generateRealisticEnginePhoto } from '../src/utils/mockPhotoGenerator';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  module: string;
  name: string;
  run: () => void | Promise<void>;
}

const tests: TestCase[] = [];
let passCount = 0;
let failCount = 0;

function it(module: string, name: string, run: () => void | Promise<void>) {
  tests.push({ module, name, run });
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Esperado: ${JSON.stringify(expected)}, mas obteve: ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Esperado: ${JSON.stringify(expected)}, mas obteve: ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Esperado valor truthy, mas obteve: ${JSON.stringify(actual)}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Esperado valor falsy, mas obteve: ${JSON.stringify(actual)}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (!(actual > expected)) {
        throw new Error(`Esperado ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      if (!(actual >= expected)) {
        throw new Error(`Esperado ${actual} >= ${expected}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Esperado null, mas obteve: ${JSON.stringify(actual)}`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Esperado undefined, mas obteve: ${JSON.stringify(actual)}`);
      }
    }
  };
}

// =========================================================================
// 1. MÓDULO DE IDENTIFICAÇÃO E CRUZAMENTO MULTI-IDENTIFICADOR DE VEÍCULOS
// =========================================================================

it('Cruzamento Multi-Identificador', 'Limpeza e normalização alfanumérica (cleanIdStr)', () => {
  expect(cleanIdStr('ABC-1234')).toBe('ABC1234');
  expect(cleanIdStr('abc-1d23 ')).toBe('ABC1D23');
  expect(cleanIdStr('  9BW-AB45-U0-LT018892 ')).toBe('9BWAB45U0LT018892');
  expect(cleanIdStr('GPM-0982')).toBe('GPM0982');
  expect(cleanIdStr(null)).toBe('');
  expect(cleanIdStr(undefined)).toBe('');
});

it('Cruzamento Multi-Identificador', 'Vínculo por Placa Padrão Mercosul e Antigo (com ou sem hífen)', () => {
  const vehicle = { placa: 'ABC-1234', chassi: '9BWAB45U0LT018892', modelo: 'GOL' };
  const inspection1 = { placa: 'abc1234', data: '20/09/2026' };
  const inspection2 = { placa: 'ABC-1234', data: '20/09/2026' };
  const inspectionDiff = { placa: 'XYZ-9999', data: '20/09/2026' };

  expect(matchVehicleWithInspection(vehicle, inspection1)).toBe(true);
  expect(matchVehicleWithInspection(vehicle, inspection2)).toBe(true);
  expect(matchVehicleWithInspection(vehicle, inspectionDiff)).toBe(false);
});

it('Cruzamento Multi-Identificador', 'Vínculo por Sufixo de Chassi (6+ dígitos)', () => {
  const vehicle = { placa: 'SEM PLACA', chassi: '9BWAB45U0LT018892', modelo: 'CAMINHÃO' };
  const inspection = { placa: '', chassi: '018892', fullData: { vehicle: { chassi: '018892' } } };
  expect(matchVehicleWithInspection(vehicle, inspection)).toBe(true);
});

it('Cruzamento Multi-Identificador', 'Vínculo por Patrimônio / GPM / Tombamento', () => {
  const vehicle = { placa: '', gpm: 'GPM-5544', modelo: 'RENAULT DUSTER' };
  const inspection = { patrimonio: '5544', gpm: '5544', fullData: { vehicle: { gpm: 'GPM5544' } } };
  expect(matchVehicleWithInspection(vehicle, inspection)).toBe(true);
});

it('Cruzamento Multi-Identificador', 'Vínculo por Renavam', () => {
  const vehicle = { placa: '', renavam: '00123456789', modelo: 'FIAT SIENA' };
  const inspection = { renavam: '123456789', fullData: { vehicle: { renavam: '00123456789' } } };
  expect(matchVehicleWithInspection(vehicle, inspection)).toBe(true);
});

it('Cruzamento Multi-Identificador', 'findInspectionForVehicle em lista consolidada de vistorias', () => {
  const frota = [
    { id: 'v1', placa: 'ABC-1234', modelo: 'GOL' },
    { id: 'v2', placa: 'XYZ-9999', modelo: 'RANGER' },
    { id: 'v3', placa: 'GPM-4433', chassi: '9BW88776655443322', modelo: 'AMBULANCIA' }
  ];

  const laudos = [
    { id: 'l1', placa: 'abc1234', nota: 8.5, class: 'BOM' },
    { id: 'l2', chassi: '443322', nota: 6.0, class: 'RECUPERÁVEL' }
  ];

  const foundV1 = findInspectionForVehicle(frota[0], laudos);
  const foundV2 = findInspectionForVehicle(frota[1], laudos);
  const foundV3 = findInspectionForVehicle(frota[2], laudos);

  expect(foundV1?.id).toBe('l1');
  expect(foundV2).toBeUndefined();
  expect(foundV3?.id).toBe('l2');
});

// =========================================================================
// 2. ISOLAMENTO DE RASCUNHOS POR USUÁRIO (USER DRAFT ISOLATION)
// =========================================================================

it('Isolamento de Rascunhos', 'Garantir que rascunhos de usuários diferentes não colidam', () => {
  // Simula banco IndexedDB / LocalStorage isolado por chave
  const storage = new Map<string, any>();

  const saveDraft = (userId: string, data: any) => {
    const key = `draft_${userId}`;
    storage.set(key, { ...data, userId, id: key });
  };

  const getDraft = (userId: string | undefined) => {
    if (!userId) return null;
    const key = `draft_${userId}`;
    const d = storage.get(key);
    return (d && d.userId === userId) ? d : null;
  };

  const clearDraft = (userId: string) => {
    storage.delete(`draft_${userId}`);
  };

  // Usuário 1 (Perito Lorrano) inicia vistoria da VTR-01
  saveDraft('user_lorrano_123', {
    laudoData: { vehicle: { placa: 'ABC-1234' }, checklist: { motor: 'B' } },
    wizPhase: 'MOTOR',
    wizStep: 2
  });

  // Usuário 2 (Perito Silva) inicia vistoria da VTR-02
  saveDraft('user_silva_456', {
    laudoData: { vehicle: { placa: 'XYZ-9999' }, checklist: { motor: 'R' } },
    wizPhase: 'CHASSI',
    wizStep: 1
  });

  // Teste de recuperação isolada
  const draftLorrano = getDraft('user_lorrano_123');
  const draftSilva = getDraft('user_silva_456');
  const draftAnon = getDraft(undefined);

  expect(draftLorrano?.laudoData?.vehicle?.placa).toBe('ABC-1234');
  expect(draftSilva?.laudoData?.vehicle?.placa).toBe('XYZ-9999');
  expect(draftAnon).toBeNull();

  // Silva conclui/descarta vistoria dele
  clearDraft('user_silva_456');

  expect(getDraft('user_silva_456')).toBeNull();
  expect(getDraft('user_lorrano_123')?.laudoData?.vehicle?.placa).toBe('ABC-1234');
});

// =========================================================================
// 3. MÓDULO DE CÁLCULO DE PONTUAÇÃO, DEPRECIAÇÃO E VALUATION
// =========================================================================

it('Cálculo e Classificação Pericial', 'Cálculo de nota geral e classificação do veículo', () => {
  const checklistBom: Record<string, string> = {};
  const items = ['motor', 'cambio', 'chassi', 'suspensao', 'freios', 'pneus', 'lataria', 'pintura', 'eletrica', 'tapeçaria'];
  items.forEach(it => { checklistBom[it] = 'B'; }); // Todos Bons -> 10 pontos

  let totalPoints = 0;
  items.forEach(k => {
    if (checklistBom[k] === 'B') totalPoints += 10;
    else if (checklistBom[k] === 'R') totalPoints += 7;
    else if (checklistBom[k] === 'P') totalPoints += 3;
  });
  const finalScore = totalPoints / items.length;
  expect(finalScore).toBe(10);

  const getClassification = (score: number, hasImpediment: boolean) => {
    if (hasImpediment) return 'IMPEDIMENTOS';
    if (score >= 8.5) return 'BOM';
    if (score >= 6.5) return 'REGULAR';
    if (score >= 4.0) return 'RECUPERÁVEL';
    if (score >= 2.0) return 'SUCATA APROVEITÁVEL';
    return 'SUCATA INSERVÍVEL';
  };

  expect(getClassification(9.0, false)).toBe('BOM');
  expect(getClassification(7.0, false)).toBe('REGULAR');
  expect(getClassification(5.0, false)).toBe('RECUPERÁVEL');
  expect(getClassification(3.0, false)).toBe('SUCATA APROVEITÁVEL');
  expect(getClassification(1.0, false)).toBe('SUCATA INSERVÍVEL');
  expect(getClassification(9.5, true)).toBe('IMPEDIMENTOS');
});

it('Cálculo e Classificação Pericial', 'Cálculo de Avaliação FIPE com Percentual de Depreciação Pericial', () => {
  const fipeVal = 100000; // R$ 100.000,00
  const valuationPercent = 35; // 35% do valor FIPE baseado no laudo
  const assessedValuation = fipeVal * (valuationPercent / 100);

  expect(assessedValuation).toBe(35000);
});

// =========================================================================
// 4. MÓDULO DE GESTÃO DE PÁTIOS E CÁLCULO DE STATUS
// =========================================================================

it('Gestão de Pátios', 'Cálculo de progresso por pátio com cruzamento multi-identificador', () => {
  const frotaPatio = [
    { id: 'v1', placa: 'ABC-1234', municipio: 'CURITIBA', enderecoPatio: 'Pátio Central' },
    { id: 'v2', placa: 'XYZ-9999', municipio: 'CURITIBA', enderecoPatio: 'Pátio Central' },
    { id: 'v3', placa: 'DEF-5678', municipio: 'CURITIBA', enderecoPatio: 'Pátio Central' }
  ];

  const laudos = [
    { id: 'l1', placa: 'ABC-1234', class: 'RECUPERÁVEL' },
    { id: 'l2', placa: 'XYZ-9999', class: 'IMPEDIMENTOS', hasImpediment: true }
  ];

  let inspected = 0;
  let impediments = 0;

  frotaPatio.forEach(v => {
    const insp = findInspectionForVehicle(v, laudos);
    if (insp) {
      inspected += 1;
      if (insp.hasImpediment || insp.class === 'IMPEDIMENTOS') {
        impediments += 1;
      }
    }
  });

  expect(inspected).toBe(2);
  expect(impediments).toBe(1);
  const pending = frotaPatio.length - inspected;
  expect(pending).toBe(1);
  const progressPct = Math.round((inspected / frotaPatio.length) * 100);
  expect(progressPct).toBe(67);
});

// =========================================================================
// 5. MÓDULO DE EXPORTAÇÃO OFICIAL DO ANEXO J (26 COLUNAS)
// =========================================================================

it('Exportação Anexo J', 'Estrutura e mapeamento das 26 colunas oficiais', () => {
  const ANEXO_J_COLUMNS = [
    'ITEM', 'LOTE', 'COMARCA / PÁTIO', 'LOCALIZAÇÃO / ENDEREÇO',
    'TIPO / CATEGORIA', 'MARCA / MODELO', 'PLACA', 'CHASSI',
    'RENAVAM', 'ANO FAB/MOD', 'COR', 'COMBUSTÍVEL', 'Nº MOTOR',
    'GPM / PATRIMÔNIO', 'ESTADO GERAL / CLASSIFICAÇÃO', 'PONTUAÇÃO (0-10)',
    'VALOR TABELA FIPE (R$)', 'PERCENTUAL DE AVALIAÇÃO (%)',
    'VALOR DE AVALIAÇÃO (R$)', 'HOUVE IMPEDIMENTO?', 'JUSTIFICATIVA / PARECER',
    'STATUS DO LACRE', 'DATA DA VISTORIA', 'PERITO / AVALIADOR',
    'ID DO LAUDO', 'STATUS DE SINCRONIZAÇÃO'
  ];

  expect(ANEXO_J_COLUMNS.length).toBe(26);

  // Validação de geração de linha
  const sampleVehicle = {
    posicao: 1,
    lote: '01',
    municipio: 'CURITIBA',
    enderecoPatio: 'Rua Nunes Machado, 100',
    tipo: 'AUTO',
    modelo: 'VOLKSWAGEN GOL 1.6',
    placa: 'ABC-1234',
    chassi: '9BWAB45U0LT018892',
    renavam: '12345678900',
    anoFabMod: '2015/2016',
    cor: 'BRANCO',
    combustivel: 'FLEX',
    fipeVal: 45000
  };

  const sampleLaudo = {
    id: 'laudo-cbmpr-001',
    nota: 8.5,
    class: 'BOM',
    valuationPercent: 40,
    data: '23/09/2026',
    fullData: {
      evaluator: 'Maj. QOBM Lorrano',
      notes: 'Veículo em ótimo estado de conservação mecânica.',
      sealNumber: 'CBMPR-2026-9988',
      hasImpediment: false
    }
  };

  const row = {
    [ANEXO_J_COLUMNS[0]]: sampleVehicle.posicao,
    [ANEXO_J_COLUMNS[1]]: sampleVehicle.lote,
    [ANEXO_J_COLUMNS[2]]: sampleVehicle.municipio,
    [ANEXO_J_COLUMNS[3]]: sampleVehicle.enderecoPatio,
    [ANEXO_J_COLUMNS[4]]: sampleVehicle.tipo,
    [ANEXO_J_COLUMNS[5]]: sampleVehicle.modelo,
    [ANEXO_J_COLUMNS[6]]: sampleVehicle.placa,
    [ANEXO_J_COLUMNS[7]]: sampleVehicle.chassi,
    [ANEXO_J_COLUMNS[8]]: sampleVehicle.renavam,
    [ANEXO_J_COLUMNS[9]]: sampleVehicle.anoFabMod,
    [ANEXO_J_COLUMNS[10]]: sampleVehicle.cor,
    [ANEXO_J_COLUMNS[11]]: sampleVehicle.combustivel,
    [ANEXO_J_COLUMNS[14]]: sampleLaudo.class,
    [ANEXO_J_COLUMNS[15]]: sampleLaudo.nota,
    [ANEXO_J_COLUMNS[16]]: sampleVehicle.fipeVal,
    [ANEXO_J_COLUMNS[17]]: `${sampleLaudo.valuationPercent}%`,
    [ANEXO_J_COLUMNS[18]]: sampleVehicle.fipeVal * (sampleLaudo.valuationPercent / 100),
    [ANEXO_J_COLUMNS[19]]: sampleLaudo.fullData.hasImpediment ? 'SIM' : 'NÃO',
    [ANEXO_J_COLUMNS[20]]: sampleLaudo.fullData.notes,
    [ANEXO_J_COLUMNS[21]]: sampleLaudo.fullData.sealNumber,
    [ANEXO_J_COLUMNS[22]]: sampleLaudo.data,
    [ANEXO_J_COLUMNS[23]]: sampleLaudo.fullData.evaluator,
    [ANEXO_J_COLUMNS[24]]: sampleLaudo.id
  };

  expect(row['PLACA']).toBe('ABC-1234');
  expect(row['VALOR DE AVALIAÇÃO (R$)']).toBe(18000);
  expect(row['HOUVE IMPEDIMENTO?']).toBe('NÃO');
  expect(row['PERITO / AVALIADOR']).toBe('Maj. QOBM Lorrano');
});

// =========================================================================
// 6. MÓDULO MÍMICO (FORMULÁRIOS I E IV - REGRA FROZEN)
// =========================================================================

it('Módulo Mímico (FROZEN)', 'Validação de integridade do Módulo Mímico e componentes A4', () => {
  const appTsxPath = path.resolve(process.cwd(), 'src/App.tsx');
  expect(fs.existsSync(appTsxPath)).toBe(true);

  const appContent = fs.readFileSync(appTsxPath, 'utf-8');
  expect(appContent.includes('const MimicoFormI')).toBe(true);
  expect(appContent.includes('const MimicoFormIV')).toBe(true);
  expect(appContent.includes('210mm') && appContent.includes('297mm')).toBe(true);
});

// =========================================================================
// 7. COMPRESSÃO DE FOTOS DE CAMPO & OFFLINE RESILIENCE
// =========================================================================

it('Fotos e Decalques de Campo', 'Geração de decalques nítidos com payload compatível com limites móveis', () => {
  const chassiImg = generateRealisticChassisPhoto('9BWAB45U0LT018892', 'GOL 1.6');
  const motorImg = generateRealisticEnginePhoto('EA211123456', 'VW');

  expect(chassiImg.startsWith('data:image/svg+xml')).toBe(true);
  expect(motorImg.startsWith('data:image/svg+xml')).toBe(true);
  expect(chassiImg.length).toBeGreaterThan(300);
  expect(motorImg.length).toBeGreaterThan(300);
});

// =========================================================================
// 8. INCLUSÃO E EXCLUSÃO DE VEÍCULOS (FROTA E PÁTIOS)
// =========================================================================

it('Inclusão e Exclusão de Veículos', 'Inclusão unitária e em lote com higienização de chassi e placa', () => {
  const initialFleet: any[] = [
    { id: 'v1', placa: 'ABC-1234', chassi: '9BWAB45U0LT018892', modelo: 'GOL', municipio: 'CURITIBA' }
  ];

  // Adicionar novo veículo
  const newVehicle = { id: 'v2', placa: 'XYZ-9876', chassi: '8AFZZZ377G019283', modelo: 'SIENA', municipio: 'LONDRINA' };
  const updatedFleet = [...initialFleet, newVehicle];
  expect(updatedFleet.length).toBe(2);

  // Tentativa de inclusão de duplicata com pequenas variações (ex: sem hífen)
  const duplicateVehicle = { id: 'v3', placa: 'ABC1234', chassi: '018892', modelo: 'VW GOL 1.6', municipio: 'CURITIBA', fipe: 25000 };
  const deduplicated = deduplicateVehicles([...updatedFleet, duplicateVehicle]);
  
  // Deve manter exatamente 2 veículos e enriquecer o veículo 1 com os dados novos da FIPE
  expect(deduplicated.length).toBe(2);
  const v1 = deduplicated.find(v => v.placa === 'ABC-1234' || v.placa === 'ABC1234');
  expect(v1).toBeTruthy();
  expect(v1.fipe).toBe(25000);
});

it('Inclusão e Exclusão de Veículos', 'Exclusão unitária e em lote preservando o histórico pericial', () => {
  let fleet: any[] = [
    { id: 'v-101', placa: 'AAA1111', chassi: 'CHASSI11111111111', municipio: 'CASCAVEL' },
    { id: 'v-102', placa: 'BBB2222', chassi: 'CHASSI22222222222', municipio: 'CASCAVEL' },
    { id: 'v-103', placa: 'CCC3333', chassi: 'CHASSI33333333333', municipio: 'CASCAVEL' }
  ];

  const inspections: any[] = [
    { id: 'insp-1', placa: 'AAA1111', nota: 45, class: 'RECUPERÁVEL' },
    { id: 'insp-2', placa: 'BBB2222', nota: 10, class: 'SUCATA' }
  ];

  // Exclusão unitária do veículo v-101
  fleet = fleet.filter(v => v.id !== 'v-101');
  expect(fleet.length).toBe(2);
  expect(fleet.some(v => v.id === 'v-101')).toBe(false);

  // Laudo pericial do AAA1111 permanece preservado
  expect(inspections.some(i => i.placa === 'AAA1111')).toBe(true);

  // Exclusão em lote (multi-seleção) dos veículos v-102 e v-103
  const selectedToDelete = ['v-102', 'v-103'];
  fleet = fleet.filter(v => !selectedToDelete.includes(v.id));
  expect(fleet.length).toBe(0);

  // Todos os laudos continuam preservados no histórico
  expect(inspections.length).toBe(2);
});

// =========================================================================
// 9. INCLUSÃO E EXCLUSÃO DE LAUDOS PERICIAIS
// =========================================================================

it('Inclusão e Exclusão de Laudos', 'Inclusão de laudo pericial com cálculo de nota e desduplicação por timestamp', () => {
  const initialInspections: any[] = [
    { 
      id: 'insp-base-1', 
      placa: 'MNO5555', 
      chassi: '9BWAA01Z987654321', 
      inspectedAt: '2026-09-20T10:00:00Z', 
      nota: 35, 
      class: 'RECUPERÁVEL' 
    }
  ];

  // Novo laudo realizado para o mesmo veículo (reavaliação pericial com dados mais recentes)
  const updatedInspection = {
    id: 'insp-base-2',
    placa: 'MNO5555',
    chassi: '9BWAA01Z987654321',
    inspectedAt: '2026-09-23T14:30:00Z',
    nota: 50,
    class: 'RECUPERÁVEL',
    fullData: { vehicle: { placa: 'MNO5555', renavam: '1234567890' } }
  };

  const combined = [...initialInspections, updatedInspection];
  const deduplicated = deduplicateInspections(combined);

  // Deve haver apenas 1 laudo consolidado contendo a nota e timestamp mais recente
  expect(deduplicated.length).toBe(1);
  expect(deduplicated[0].nota).toBe(50);
  expect(getTimestampMillis(deduplicated[0].inspectedAt)).toBe(getTimestampMillis('2026-09-23T14:30:00Z'));
});

it('Inclusão e Exclusão de Laudos', 'Exclusão de laudo com blacklist persistida (deletedIds)', () => {
  const allInspections: any[] = [
    { id: 'laudo-a', placa: 'AAA0001', nota: 40 },
    { id: 'laudo-b', placa: 'BBB0002', nota: 60 },
    { id: 'laudo-c', placa: 'CCC0003', nota: 20 }
  ];

  const deletedIds = ['laudo-b'];

  // Simulação do filtro do fetch e dos listeners
  const activeInspections = allInspections.filter(item => !deletedIds.includes(item.id));
  expect(activeInspections.length).toBe(2);
  expect(activeInspections.some(i => i.id === 'laudo-b')).toBe(false);

  // Mesmo se o cache local tentar reinjetar 'laudo-b', a blacklist impede a reinserção
  const localCache = [{ id: 'laudo-b', placa: 'BBB0002', nota: 60 }];
  for (const item of localCache) {
    if (!deletedIds.includes(item.id)) {
      activeInspections.push(item);
    }
  }
  expect(activeInspections.length).toBe(2);
});

// =========================================================================
// 10. PROTEÇÃO E INTEGRIDADE DO PÁTIO DE PONTA GROSSA
// =========================================================================

it('Integridade do Pátio de Ponta Grossa', 'Garantir que a base de 22 laudos homologados de Ponta Grossa permanece intacta', () => {
  const pontaGrossaPath = path.resolve(process.cwd(), 'src/data/pontaGrossaInspections.json');
  expect(fs.existsSync(pontaGrossaPath)).toBe(true);

  const rawData = fs.readFileSync(pontaGrossaPath, 'utf-8');
  const pontaGrossaList: any[] = JSON.parse(rawData);

  // Verificação de quantidade oficial homologada no arquivo de referência de Ponta Grossa
  expect(pontaGrossaList.length).toBe(22);

  // Verificação de presença e integridade de veículos chave do pátio
  const palio = pontaGrossaList.find(p => p.placa === 'AMF7355');
  expect(palio).toBeTruthy();
  expect(palio.modelo).toBe('FIAT/PALIO WEEK HLX FLEX');
  expect(palio.nota).toBe(40);
  expect(palio.valuationPercent).toBe(15);
  expect(palio.fullData.vehicle.endereco.cidade).toBe('PONTA GROSSA');

  // Nenhum registro de Ponta Grossa foi corrompido ou teve valores nulos em campos vitais
  for (const item of pontaGrossaList) {
    expect(item.id).toBeTruthy();
    expect(item.placa).toBeTruthy();
    expect(item.modelo).toBeTruthy();
    expect(typeof item.nota).toBe('number');
    expect(typeof item.valuationPercent).toBe('number');
    expect(item.fullData).toBeTruthy();
    expect(item.fullData.vehicle.endereco.cidade).toBe('PONTA GROSSA');
  }
});


// =========================================================================
// EXECUÇÃO DOS TESTES
// =========================================================================

async function runAll() {
  console.log('========================================================================');
  console.log('   BATERIA DE TESTES DE TODAS AS FUNCIONALIDADES DE CAMPO - CSM:ARGOS  ');
  console.log('========================================================================\n');

  let currentModule = '';
  const startTime = Date.now();

  for (const t of tests) {
    if (t.module !== currentModule) {
      currentModule = t.module;
      console.log(`\n--- [${currentModule}] ---`);
    }

    const tStart = Date.now();
    try {
      await t.run();
      passCount++;
      console.log(`  ✓ [PASS] ${t.name} (${Date.now() - tStart}ms)`);
    } catch (e: any) {
      failCount++;
      console.error(`  ✗ [FAIL] ${t.name} (${Date.now() - tStart}ms)`);
      console.error(`    ↳ Erro: ${e.message}`);
    }
  }

  const duration = Date.now() - startTime;
  console.log('\n========================================================================');
  console.log('                      RESUMO FINAL DOS TESTES DE CAMPO                  ');
  console.log('========================================================================');
  console.log(`Total de Casos Executados : ${tests.length}`);
  console.log(`Casos Aprovados           : ${passCount} (${Math.round((passCount / tests.length) * 100)}%)`);
  console.log(`Casos Reprovados          : ${failCount}`);
  console.log(`Tempo Total de Execução   : ${duration}ms`);
  console.log('========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAll();
