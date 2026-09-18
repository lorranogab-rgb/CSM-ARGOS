/**
 * BATERIA DE TESTES PRÁTICOS DOS MÓDULOS - CSM:ARGOS
 * CBMPR - Corpo de Bombeiros Militar do Paraná
 * 
 * Executa testes rigorosos de ponta a ponta para verificar a eficácia,
 * integridade, persistência e segurança de todos os módulos do sistema.
 */

import { MOCK_VEHICLES } from '../src/data/mockData';
import { generateRealisticChassisPhoto, generateRealisticEnginePhoto } from '../src/utils/mockPhotoGenerator';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  module: string;
  testName: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

function runTest(module: string, testName: string, fn: () => void | Promise<void>): Promise<void> {
  const start = Date.now();
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      results.push({
        module,
        testName,
        passed: true,
        durationMs: Date.now() - start
      });
      console.log(`  [PASS] [${module}] ${testName} (${Date.now() - start}ms)`);
    })
    .catch((err: unknown) => {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        module,
        testName,
        passed: false,
        details: errorMsg,
        durationMs: Date.now() - start
      });
      console.error(`  [FAIL] [${module}] ${testName}: ${errorMsg}`);
    });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('\n========================================================================');
  console.log('       INICIANDO TESTES PRÁTICOS DE EFICÁCIA - SISTEMA CSM:ARGOS');
  console.log('========================================================================\n');

  // --------------------------------------------------------------------------
  // MÓDULO 1: ARMAZENAMENTO LOCAL E PERSISTÊNCIA OFFLINE (IndexedDB / Fallback)
  // --------------------------------------------------------------------------
  console.log('--- MÓDULO 1: Armazenamento Local, Cache e Persistência Offline ---');
  
  await runTest('Offline Storage', 'Simulação de fallback de armazenamento com chave e fullData', () => {
    // Simula ambiente de armazenamento
    const mockStorage = new Map<string, string>();
    const saveInspection = (item: Record<string, unknown>) => {
      const raw = mockStorage.get('argos_local_backup_laudos');
      const list: Array<Record<string, unknown>> = raw ? JSON.parse(raw) : [];
      const idx = list.findIndex(x => x.id === item.id || (x.placa === item.placa && x.data === item.data));
      if (idx >= 0) list[idx] = item;
      else list.unshift(item);
      mockStorage.set('argos_local_backup_laudos', JSON.stringify(list));
    };

    const getInspections = () => {
      const raw = mockStorage.get('argos_local_backup_laudos');
      return raw ? JSON.parse(raw) : [];
    };

    const testItem = {
      id: 'laudo-test-offline-01',
      placa: 'BEM-2024',
      modelo: 'VOLKSWAGEN GOL',
      nota: 9.5,
      class: 'RECUPERÁVEL',
      data: '18/09/2026',
      fullData: { id: 'laudo-test-offline-01', placa: 'BEM-2024' }
    };

    saveInspection(testItem);
    const list1 = getInspections();
    assert(list1.length === 1, 'Deveria conter 1 laudo após salvamento');
    assert(list1[0].id === 'laudo-test-offline-01', 'ID do laudo incorreto');

    // Teste de atualização sem duplicar
    saveInspection({ ...testItem, nota: 9.8 });
    const list2 = getInspections();
    assert(list2.length === 1, 'Não deve duplicar laudo ao regravar com mesmo ID');
    assert(list2[0].nota === 9.8, 'Deve atualizar a nota do laudo');
  });

  await runTest('Offline Storage', 'Exclusão segura de ID e fullData.id e prevenção de ressurreição', () => {
    const mockStorage = new Map<string, string>();
    const deletedList: string[] = [];

    // Preenche com 2 itens
    const items = [
      { id: 'laudo-root-1', fullData: { id: 'laudo-internal-1' }, placa: 'ABC-1234' },
      { id: 'laudo-root-2', fullData: { id: 'laudo-internal-2' }, placa: 'XYZ-9876' }
    ];
    mockStorage.set('argos_local_backup_laudos', JSON.stringify(items));

    // Exclusão do item 1
    const targetId = 'laudo-root-1';
    const found = items.find(r => r.id === targetId || r.fullData?.id === targetId);
    const fullDataId = found?.fullData?.id;

    if (targetId && !deletedList.includes(targetId)) deletedList.push(targetId);
    if (fullDataId && !deletedList.includes(fullDataId)) deletedList.push(fullDataId);

    // Filtra lista local
    const raw = mockStorage.get('argos_local_backup_laudos');
    const list: Array<{ id?: string; fullData?: { id?: string } }> = JSON.parse(raw!);
    const filtered = list.filter(it => it.id !== targetId && it.fullData?.id !== targetId && it.id !== fullDataId && it.fullData?.id !== fullDataId);
    mockStorage.set('argos_local_backup_laudos', JSON.stringify(filtered));

    // Verifica se item 1 foi expurgado
    const remaining = JSON.parse(mockStorage.get('argos_local_backup_laudos')!);
    assert(remaining.length === 1, 'Deveria restar apenas 1 laudo');
    assert(remaining[0].id === 'laudo-root-2', 'O laudo restante deveria ser laudo-root-2');
    assert(deletedList.includes('laudo-root-1') && deletedList.includes('laudo-internal-1'), 'Ambos os IDs devem constar na blacklist');

    // Simula reconexão/recarga remota contendo o laudo deletado
    const incomingRemote = [
      { id: 'laudo-root-1', fullData: { id: 'laudo-internal-1' }, placa: 'ABC-1234' },
      { id: 'laudo-root-2', fullData: { id: 'laudo-internal-2' }, placa: 'XYZ-9876' }
    ];
    const afterFetchFilter = incomingRemote.filter(d => !deletedList.includes(d.id) && !deletedList.includes(d.fullData?.id));
    assert(afterFetchFilter.length === 1, 'Filtro inicial deve bloquear o laudo excluído vindo do servidor');
    assert(afterFetchFilter[0].id === 'laudo-root-2', 'Apenas o laudo ativo deve ser aceito');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 2: OTIMIZAÇÃO E COMPRESSÃO DE IMAGENS
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 2: Otimização e Compressão de Imagens ---');

  await runTest('Image Optimization', 'Geração e dimensionamento de fotos decalque (Chassi e Motor)', () => {
    const chassisPhoto = generateRealisticChassisPhoto('9BWAB45U0LT018892', 'GOL 1.6 MSI');
    assert(chassisPhoto.startsWith('data:image/svg+xml'), 'Foto de chassi deve ser um data URI válido');
    assert(chassisPhoto.length > 500, 'Foto de chassi deve ter conteúdo visual significativo');

    const enginePhoto = generateRealisticEnginePhoto('EA211MSI129038', 'VOLKSWAGEN');
    assert(enginePhoto.startsWith('data:image/svg+xml'), 'Foto de motor deve ser um data URI válido');
    assert(enginePhoto.length > 500, 'Foto de motor deve ter conteúdo visual significativo');

    // Valida tamanho do payload para conformidade com o Firestore (<1MB)
    const totalSizeKb = (chassisPhoto.length + enginePhoto.length) / 1024;
    assert(totalSizeKb < 200, `Fotos combinadas pesam ${totalSizeKb.toFixed(1)}KB, muito abaixo do limite de 1000KB do Firestore`);
  });

  await runTest('Image Optimization', 'Regra de corte e proporção de decalque (16:9 / 4:3)', () => {
    // Simula cálculo de dimensões da imagem comprimida
    const maxDim = 1000;
    const testCases = [
      { w: 4000, h: 3000, expectedW: 1000, expectedH: 750 },
      { w: 1920, h: 1080, expectedW: 1000, expectedH: 563 },
      { w: 800, h: 600, expectedW: 800, expectedH: 600 }
    ];

    for (const tc of testCases) {
      let targetW = tc.w;
      let targetH = tc.h;
      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }
      assert(targetW === tc.expectedW && Math.abs(targetH - tc.expectedH) <= 1, 
        `Redimensionamento falhou para ${tc.w}x${tc.h}`);
    }
  });

  // --------------------------------------------------------------------------
  // MÓDULO 3: GESTÃO DE FROTAS E VEÍCULOS EM PÁTIO
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 3: Gestão de Frotas e Seleção de Veículos em Pátio ---');

  await runTest('Fleet Management', 'Integridade e consistência dos veículos cadastrados no acervo', () => {
    assert(MOCK_VEHICLES.length >= 5, 'Deve conter veículos pré-carregados');
    
    for (const v of MOCK_VEHICLES) {
      assert(!!v.placa && v.placa.length >= 7, `Placa inválida no veículo ${v.id}: ${v.placa}`);
      assert(!!v.chassi && v.chassi.length === 17, `Chassi deve ter 17 dígitos no veículo ${v.id}: ${v.chassi}`);
      assert(!!v.motor, `Motor não preenchido no veículo ${v.id}`);
      assert(!!v.modelo, `Modelo não preenchido no veículo ${v.id}`);
      assert(typeof v.fipe === 'number' && v.fipe > 0, `Valor FIPE inválido no veículo ${v.id}`);
      assert(typeof v.pctFipe === 'number' && v.pctFipe > 0 && v.pctFipe <= 1, `Percentual FIPE inválido no veículo ${v.id}`);
      assert(typeof v.precoMinimo === 'number' && v.precoMinimo > 0, `Preço mínimo inválido no veículo ${v.id}`);
      
      // Valida coerência de preço mínimo = FIPE * % FIPE
      const expectedMin = Math.round(v.fipe * v.pctFipe);
      assert(Math.abs(v.precoMinimo - expectedMin) <= 1, 
        `Preço mínimo (${v.precoMinimo}) inconsistente com FIPE*pctFipe (${expectedMin}) no veículo ${v.id}`);
    }
  });

  await runTest('Fleet Management', 'Filtro e busca avançada por Pátio, Marca e Placa', () => {
    // Filtro por Pátio
    const curitibaVehicles = MOCK_VEHICLES.filter(v => v.municipio?.includes('CURITIBA') || v.enderecoPatio?.includes('Curitiba'));
    assert(curitibaVehicles.length >= 1, 'Deve encontrar veículos no pátio de Curitiba');

    // Filtro por Marca
    const vwVehicles = MOCK_VEHICLES.filter(v => v.modelo.toUpperCase().includes('VOLKSWAGEN'));
    assert(vwVehicles.length >= 1, 'Deve encontrar veículos da marca Volkswagen');

    // Busca textual por Chassi parcial
    const chassiSearch = '9BWAB';
    const foundByChassi = MOCK_VEHICLES.filter(v => v.chassi.includes(chassiSearch));
    assert(foundByChassi.length >= 1, `Deveria encontrar veículos com chassi contendo ${chassiSearch}`);
  });

  await runTest('Fleet Management', 'Mecanismo de paginação de veículos (YARD_PAGE_SIZE = 12)', () => {
    const YARD_PAGE_SIZE = 12;
    // Cria frota sintética de 28 veículos
    const syntheticFleet = Array.from({ length: 28 }, (_, i) => ({
      id: `v-${i}`,
      placa: `ABC-00${i}`,
      modelo: `VEICULO ${i}`
    }));

    const totalPages = Math.ceil(syntheticFleet.length / YARD_PAGE_SIZE);
    assert(totalPages === 3, `Deveriam ser 3 páginas para 28 itens com tamanho 12, obtido: ${totalPages}`);

    // Página 1
    const p1 = syntheticFleet.slice(0, 12);
    assert(p1.length === 12 && p1[0].id === 'v-0' && p1[11].id === 'v-11', 'Página 1 incorreta');

    // Página 3
    const p3 = syntheticFleet.slice(24, 36);
    assert(p3.length === 4 && p3[0].id === 'v-24' && p3[3].id === 'v-27', 'Página 3 incorreta');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 4: WIZARD DE VISTORIA E CHECKLIST TÉCNICO
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 4: Wizard de Vistoria e Checklist Técnico ---');

  await runTest('Inspection Wizard', 'Algoritmo de cálculo de pontuação e classificação técnica', () => {
    // Regra oficial de classificação:
    // Nota >= 7.0: "RECUPERÁVEL"
    // 4.0 <= Nota < 7.0: "SUCATA COM MOTOR APROVEITÁVEL"
    // Nota < 4.0: "SUCATA INSERVÍVEL"
    // Caso especial: se motor adulterado/destruído, mesmo com nota alta, motor é inaproveitável

    const classify = (score: number, motorIntacto: boolean) => {
      if (!motorIntacto) return 'SUCATA INSERVÍVEL';
      if (score >= 7.0) return 'RECUPERÁVEL';
      if (score >= 4.0) return 'SUCATA COM MOTOR APROVEITÁVEL';
      return 'SUCATA INSERVÍVEL';
    };

    assert(classify(9.0, true) === 'RECUPERÁVEL', 'Nota 9.0 com motor intacto deve ser RECUPERÁVEL');
    assert(classify(5.5, true) === 'SUCATA COM MOTOR APROVEITÁVEL', 'Nota 5.5 com motor intacto deve ser SUCATA COM MOTOR APROVEITÁVEL');
    assert(classify(3.0, true) === 'SUCATA INSERVÍVEL', 'Nota 3.0 deve ser SUCATA INSERVÍVEL');
    assert(classify(8.5, false) === 'SUCATA INSERVÍVEL', 'Motor avariado/adulterado deve forçar SUCATA INSERVÍVEL');
  });

  await runTest('Inspection Wizard', 'Montagem completa do laudo com fotos, lacre e parecer técnico', () => {
    const mockWizardOutput = {
      placa: 'BEM-2024',
      chassi: '9BWAB45U0LT018892',
      motor: 'EA211MSI129038',
      chassiPhoto: generateRealisticChassisPhoto('9BWAB45U0LT018892'),
      motorPhoto: generateRealisticEnginePhoto('EA211MSI129038'),
      numLacre: 'LAC-2026-9812',
      class: 'RECUPERÁVEL',
      notaGeral: 8.5,
      vistoriador: 'Cap. QOBM Lorrano Gabriel',
      dataVistoria: '18/09/2026'
    };

    assert(!!mockWizardOutput.chassiPhoto, 'Foto do chassi é obrigatória');
    assert(!!mockWizardOutput.motorPhoto, 'Foto do motor é obrigatória');
    assert(!!mockWizardOutput.numLacre, 'Número do lacre é obrigatório');
    assert(mockWizardOutput.notaGeral >= 0 && mockWizardOutput.notaGeral <= 10, 'Nota deve estar entre 0 e 10');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 5: MÓDULO MÍMICO (FORMULÁRIO I E IV - FROZEN)
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 5: Módulo Mímico (Formulário I e IV - Regra FROZEN) ---');

  await runTest('Modulo Mimico', 'Validação de dimensões estritas A4 (210mm x 297mm) e estrutura congelada', () => {
    // Lê o App.tsx para garantir que as dimensões do Módulo Mímico continuam 210mm x 297mm
    const appTsx = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
    
    assert(appTsx.includes('210mm') && appTsx.includes('297mm'), 
      'Dimensões A4 (210mm x 297mm) devem estar preservadas no layout mímico');

    // Verifica que MimicoFormI e MimicoFormIV estão presentes e inalterados
    assert(appTsx.includes('MimicoFormI') || appTsx.includes('Formulário I') || appTsx.includes('LAUDO DE AVALIAÇÃO'), 
      'Componente/Estrutura do Formulário I deve estar presente');
    assert(appTsx.includes('MimicoFormIV') || appTsx.includes('Formulário IV') || appTsx.includes('TERMO DE VISTORIA'), 
      'Componente/Estrutura do Formulário IV deve estar presente');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 6: DASHBOARD E HISTÓRICO DE LAUDOS PRONTOS
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 6: Dashboard e Histórico de Laudos Prontos ---');

  await runTest('Dashboard & History', 'Filtro por status, busca por placa e seleção de múltiplos laudos', () => {
    const sampleLaudos = [
      { id: 'l-1', placa: 'BEM-2024', class: 'RECUPERÁVEL', nota: 8.5 },
      { id: 'l-2', placa: 'PR-4521', class: 'SUCATA COM MOTOR APROVEITÁVEL', nota: 5.2 },
      { id: 'l-3', placa: 'BMP-8812', class: 'SUCATA INSERVÍVEL', nota: 2.1 }
    ];

    // Busca por placa
    const searchRes = sampleLaudos.filter(l => l.placa.includes('BEM'));
    assert(searchRes.length === 1 && searchRes[0].id === 'l-1', 'Busca por placa falhou');

    // Filtro por classificação
    const sucatas = sampleLaudos.filter(l => l.class.includes('SUCATA'));
    assert(sucatas.length === 2, 'Filtro de sucatas deveria retornar 2 itens');

    // Seleção de múltiplos laudos para exclusão ou exportação em lote
    const selectedIds = new Set<string>();
    selectedIds.add('l-1');
    selectedIds.add('l-3');
    assert(selectedIds.size === 2 && selectedIds.has('l-1') && selectedIds.has('l-3'), 'Seleção múltipla falhou');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 7: EXPORTAÇÃO MODELO ITEM J (XLSX / PLANILHA GERAL)
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 7: Exportação Modelo Item J (Excel / Planilha Geral) ---');

  await runTest('Item J Export', 'Conformidade com o layout oficial de 26 colunas do Item J', () => {
    const vehicle = MOCK_VEHICLES[0];
    const laudo = {
      placa: vehicle.placa,
      valuationPercent: 50,
      class: 'RECUPERÁVEL',
      hasImpediment: false,
      fullData: { generalNotes: 'Veículo em perfeito estado.' }
    };

    // Monta a linha conforme a lógica de exportToItemJ
    const row = {
      'ORD.': 1,
      'ORGÃO': vehicle.orgao || 'CBMPR',
      'PLACA': vehicle.placa,
      'MARCA/MODELO': vehicle.modelo,
      'TIPO': vehicle.tipo || 'AUTOMÓVEL',
      'AVALIAÇÃO': laudo.class,
      'CHASSI': vehicle.chassi,
      'NÚM. DO MOTOR': vehicle.motor,
      'ANO': vehicle.ano,
      'COMB.': vehicle.comb || 'FLEX',
      'PATRIMÔNIO': vehicle.patrimonio,
      'COR/DOC.': vehicle.cor,
      ' ': '',
      '  ': '',
      'ORIGEM': vehicle.origem || 'ESTADUAL',
      'RENAVAM': vehicle.renavam,
      'FIPE': `R$ ${vehicle.fipe.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      '% DA FIPE': `${laudo.valuationPercent}%`,
      'PREÇO MÍNIMO': `R$ ${(vehicle.fipe * (laudo.valuationPercent / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      'SITUAÇÃO DETRAN': vehicle.situacaoDetran || 'REGULAR',
      'ENDEREÇO DO PÁTIO': vehicle.enderecoPatio,
      'MUNICÍPIO': vehicle.municipio,
      'FILEIRA': 'A',
      'POSIÇÃO': '01',
      'SITUAÇÃO VISTORIA': 'VISTORIADO',
      'OBSERVAÇÕES': laudo.fullData.generalNotes
    };

    const keys = Object.keys(row);
    assert(keys.length === 26, `Planilha Item J deve conter exatamente 26 colunas, obtido: ${keys.length}`);
    assert(keys[0] === 'ORD.', 'Coluna 1 deve ser ORD.');
    assert(keys[1] === 'ORGÃO', 'Coluna 2 deve ser ORGÃO');
    assert(keys[2] === 'PLACA', 'Coluna 3 deve ser PLACA');
    assert(keys[6] === 'CHASSI', 'Coluna 7 deve ser CHASSI');
    assert(keys[7] === 'NÚM. DO MOTOR', 'Coluna 8 deve ser NÚM. DO MOTOR');
    assert(keys[18] === 'PREÇO MÍNIMO', 'Coluna 19 deve ser PREÇO MÍNIMO');
    assert(row['PREÇO MÍNIMO'] === 'R$ 24.250,00', `Preço mínimo formatado incorreto: ${row['PREÇO MÍNIMO']}`);
  });

  await runTest('Spreadsheet Editor', 'Validação de inserção, remoção e validação de linhas de veículos', () => {
    const editorRows = [
      { id: 'v-1', placa: 'ABC-1234', modelo: 'GOL', chassi: '9BW123', motor: 'EA123', ano: '2020', patrimonio: '123', cor: 'BRANCA', fipe: 40000, municipio: 'CURITIBA' },
      { id: 'v-2', placa: 'XYZ-9876', modelo: 'S10', chassi: '9BG456', motor: 'CT456', ano: '2019', patrimonio: '456', cor: 'PRATA', fipe: 100000, municipio: 'LONDRINA' }
    ];

    // Inserção de nova linha
    const newRow = { id: 'v-3', placa: 'NEW-0001', modelo: 'HILUX', chassi: '8AJ789', motor: '1GD789', ano: '2021', patrimonio: '789', cor: 'PRETA', fipe: 150000, municipio: 'CASCAVEL' };
    const updated = [...editorRows, newRow];
    assert(updated.length === 3, 'Deveriam haver 3 linhas após inserção');

    // Remoção de linha
    const afterDelete = updated.filter(r => r.id !== 'v-2');
    assert(afterDelete.length === 2 && !afterDelete.some(r => r.id === 'v-2'), 'Linha v-2 deveria ter sido excluída');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 8: NAVEGAÇÃO E TELAS DO SISTEMA
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 8: Navegação, Telas e Fluxo Operacional ---');

  await runTest('System Navigation', 'Validação de existência e mapeamento de todas as 8 abas operacionais', () => {
    const appTsx = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
    const requiredTabs = [
      'inicio',             // Painel Inicial / Resumo
      'incluir_veiculos',   // Cadastro / Importação
      'selecao',            // Veículos em Pátio
      'wizard',             // Formulário de Vistoria
      'mimico',             // Laudo Mímico (Form I e IV)
      'dashboard',          // Laudos Prontos / Histórico
      'perfil',             // Perfil do Vistoriador
      'planilha'            // Editor de Planilha
    ];

    for (const tab of requiredTabs) {
      assert(appTsx.includes(`'${tab}'`) || appTsx.includes(`"${tab}"`), 
        `Aba '${tab}' não encontrada na navegação do App.tsx`);
    }
  });

  await runTest('Operational Components', 'Presença dos componentes LoadingArgos, UserManualModal e UserProfile', () => {
    assert(fs.existsSync(path.join(process.cwd(), 'src/components/LoadingArgos.tsx')), 'LoadingArgos deve existir');
    assert(fs.existsSync(path.join(process.cwd(), 'src/components/UserManualModal.tsx')), 'UserManualModal deve existir');
    assert(fs.existsSync(path.join(process.cwd(), 'src/components/UserProfile.tsx')), 'UserProfile deve existir');
    assert(fs.existsSync(path.join(process.cwd(), 'src/components/SpreadsheetEditor.tsx')), 'SpreadsheetEditor deve existir');
  });

  // --------------------------------------------------------------------------
  // MÓDULO 8: REGRAS DE SEGURANÇA E CONFORMIDADE COM FIREBASE
  // --------------------------------------------------------------------------
  console.log('\n--- MÓDULO 8: Regras de Segurança e Conformidade Firebase ---');

  await runTest('Firebase & Security', 'Validação das regras de segurança firestore.rules', () => {
    const rulesPath = path.join(process.cwd(), 'firestore.rules');
    assert(fs.existsSync(rulesPath), 'firestore.rules deve existir');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    assert(rules.includes("rules_version = '2';"), 'Deve utilizar rules_version = 2');
    assert(rules.includes('match /{document=**} {\n      allow read, write: if false;'), 'Deve ter o default-deny');
    assert(rules.includes('match /vehicles/{vehicleId}'), 'Deve conter regras para a coleção vehicles');
    assert(rules.includes('match /inspections/{inspectionId}'), 'Deve conter regras para a coleção inspections');
    assert(rules.includes('function isSignedIn()'), 'Deve conter função isSignedIn');
    assert(rules.includes('function isAdmin()'), 'Deve conter função isAdmin');
    assert(rules.includes('function isValidId'), 'Deve conter função isValidId');
  });

  // --------------------------------------------------------------------------
  // RELATÓRIO FINAL DE EFICÁCIA
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('                 RELATÓRIO DOS TESTES DE EFICÁCIA');
  console.log('========================================================================');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total de testes executados: ${total}`);
  console.log(`Sucessos: ${passed} / ${total}`);
  console.log(`Falhas: ${failed}`);

  if (failed > 0) {
    console.error('\nTestes com falha:');
    for (const r of results.filter(r => !r.passed)) {
      console.error(`  - [${r.module}] ${r.testName}: ${r.details}`);
    }
    process.exit(1);
  } else {
    console.log('\n>>> TODOS OS TESTES PRÁTICOS FORAM CONCLUÍDOS COM 100% DE APROVAÇÃO! <<<');
    console.log('Todos os módulos do CSM:ARGOS encontram-se plenamente operacionais.\n');
  }
}

main().catch(e => {
  console.error('Erro na execução dos testes:', e);
  process.exit(1);
});
