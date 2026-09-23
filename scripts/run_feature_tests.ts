import { runAllFeatureTests } from '../src/utils/featureTestSuites';

async function main() {
  console.log('\n=============================================================');
  console.log('  CSM:ARGOS - SUÍTE DE TESTES E VALIDAÇÃO DAS NOVAS FUNÇÕES  ');
  console.log('=============================================================\n');
  console.log('Executando bateria de testes automatizados...\n');

  const summary = await runAllFeatureTests();

  const moduleNames: Record<string, string> = {
    SCANNER_OCR: 'Módulo 1: Leitor Câmera / OCR & QR Code',
    YARD_PROGRESS: 'Módulo 2: Indicador Visual de Progresso por Pátio',
    BACKGROUND_SYNC: 'Módulo 3: Sincronização em Segundo Plano (Offline First)',
    AUTO_SAVE_DRAFT: 'Módulo 4: Salvamento Automático & Persistência de Vistorias'
  };

  let currentModule = '';
  for (const result of summary.results) {
    const modTitle = moduleNames[result.module] || result.module;
    if (modTitle !== currentModule) {
      console.log(`\n--- [${modTitle}] ---`);
      currentModule = modTitle;
    }
    const icon = result.status === 'PASSED' ? '✓ [PASS]' : '✗ [FAIL]';
    console.log(`${icon} (${result.id}) ${result.name} - ${result.durationMs}ms`);
    if (result.error) {
      console.error(`      Erro: ${result.error}`);
    }
  }

  console.log('\n=============================================================');
  console.log('                      RESUMO DOS TESTES                      ');
  console.log('=============================================================');
  console.log(`Total de Casos de Teste : ${summary.total}`);
  console.log(`Testes Aprovados        : ${summary.passed} (${Math.round((summary.passed / summary.total) * 100)}%)`);
  console.log(`Testes com Falha        : ${summary.failed}`);
  console.log(`Tempo Total de Execução : ${summary.durationMs}ms`);
  console.log('=============================================================\n');

  if (summary.failed > 0) {
    console.error('Falha na suíte de testes!');
    process.exit(1);
  } else {
    console.log('Status: TODOS OS TESTES PASSARAM COM SUCESSO!\n');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Erro inesperado na execução dos testes:', err);
  process.exit(1);
});
